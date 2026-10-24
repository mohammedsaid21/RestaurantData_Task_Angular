import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { Item } from '../../../core/models/item.model';
import { ExplorerStore } from '../explorer.store';

export interface ItemEditDialogData {
  item: Item;
}

@Component({
  selector: 'app-item-edit-dialog',
  imports: [
    DatePipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSlideToggleModule,
  ],
  templateUrl: './item-edit-dialog.html',
  styleUrl: './item-edit-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ItemEditDialog {
  private readonly dialogRef = inject(MatDialogRef<ItemEditDialog, Item>);
  private readonly data = inject<ItemEditDialogData>(MAT_DIALOG_DATA);
  private readonly store = inject(ExplorerStore);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly item = this.data.item;
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly form = new FormGroup({
    price: new FormControl<number | null>(this.item.price, {
      validators: [Validators.required, priceValidator],
    }),
    available: new FormControl(this.item.available, { nonNullable: true }),
  });

  protected save(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }

    const price = this.form.controls.price.value;
    if (price === null) {
      return;
    }

    this.saving.set(true);
    this.errorMessage.set(null);
    this.store
      .updateItem(this.item.id, { price, available: this.form.controls.available.value })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => this.dialogRef.close(updated),
        error: (err: unknown) => {
          this.saving.set(false);
          this.errorMessage.set(readUpdateError(err));
        },
      });
  }

  protected cancel(): void {
    this.dialogRef.close();
  }
}

function priceValidator(control: AbstractControl<number | null>): ValidationErrors | null {
  const value = control.value;
  if (value === null) {
    return null;
  }
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return { number: true };
  }
  if (value <= 0) {
    return { min: true };
  }
  if (value > 10000) {
    return { max: true };
  }
  const cents = value * 100;
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
  return 'Failed to update item';
}
