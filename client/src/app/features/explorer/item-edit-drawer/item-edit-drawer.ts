import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { Item } from '../../../core/models/item.model';
import { ExplorerStore } from '../explorer.store';

@Component({
  selector: 'app-item-edit-drawer',
  imports: [
    DatePipe,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSlideToggleModule,
  ],
  templateUrl: './item-edit-drawer.html',
  styleUrl: './item-edit-drawer.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ItemEditDrawer {
  protected readonly item = inject<Item>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<ItemEditDrawer, Item>);
  private readonly store = inject(ExplorerStore);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly saving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly form = new FormGroup({
    price: new FormControl(formatEnglishPrice(this.item.price), {
      nonNullable: true,
      validators: [Validators.required, priceTextValidator],
    }),
    available: new FormControl(this.item.available, { nonNullable: true }),
  });

  constructor() {
    this.form.controls.price.valueChanges.pipe(takeUntilDestroyed()).subscribe((value) => {
      const normalized = toEnglishNumber(value);
      if (normalized !== value) {
        this.form.controls.price.setValue(normalized, { emitEvent: false });
      }
    });
  }

  protected save(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    const price = Number(toEnglishNumber(this.form.controls.price.value));
    if (!Number.isFinite(price)) {
      throw new Error('Price is required.');
    }
    this.saving.set(true);
    this.errorMessage.set(null);
    this.store
      .updateItem(this.item.id, { price, available: this.form.controls.available.value })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.saving.set(false);
          this.dialogRef.close(updated);
        },
        error: (err: unknown) => {
          this.saving.set(false);
          this.errorMessage.set(readUpdateError(err));
        },
      });
  }

  protected close(): void {
    this.dialogRef.close();
  }
}

function formatEnglishPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    useGrouping: false,
    maximumFractionDigits: 2,
  }).format(price);
}

function toEnglishNumber(value: string): string {
  const arabic = '٠١٢٣٤٥٦٧٨٩';
  const persian = '۰۱۲۳۴۵۶۷۸۹';
  let normalized = '';
  let dot = false;
  for (const char of value.trim()) {
    const arabicIndex = arabic.indexOf(char);
    const persianIndex = persian.indexOf(char);
    if (arabicIndex >= 0) {
      normalized += String(arabicIndex);
    } else if (persianIndex >= 0) {
      normalized += String(persianIndex);
    } else if (char >= '0' && char <= '9') {
      normalized += char;
    } else if ((char === '.' || char === '٫') && !dot) {
      normalized += '.';
      dot = true;
    }
  }
  return normalized;
}

function priceTextValidator(control: AbstractControl<string>): ValidationErrors | null {
  const value = toEnglishNumber(control.value ?? '');
  if (value === '' || value === '.') {
    return null;
  }
  const price = Number(value);
  if (!Number.isFinite(price)) {
    return { number: true };
  }
  if (price <= 0) {
    return { min: true };
  }
  if (price > 10000) {
    return { max: true };
  }
  const cents = price * 100;
  if (Math.abs(cents - Math.round(cents)) > 1e-6) {
    return { decimalPlaces: true };
  }
  return null;
}

function readUpdateError(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    const body = err.error as { message?: unknown } | null;
    if (body && typeof body === 'object' && typeof body.message === 'string' && body.message) {
      return body.message;
    }
    if (err.message) {
      return err.message;
    }
  }
  if (typeof err === 'object' && err !== null && 'message' in err && typeof err.message === 'string' && err.message) {
    return err.message;
  }
  return 'The item could not be saved. Check the price and try again.';
}
