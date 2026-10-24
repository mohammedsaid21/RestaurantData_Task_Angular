import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
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
  readonly item = input.required<Item>();
  readonly saved = output<Item>();
  readonly cancelled = output<void>();

  private readonly store = inject(ExplorerStore);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly saving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly form = new FormGroup({
    price: new FormControl<number | null>(null, {
      validators: [Validators.required, priceValidator],
    }),
    available: new FormControl(true, { nonNullable: true }),
  });

  constructor() {
    effect(() => {
      const item = this.item();
      this.form.setValue({ price: item.price, available: item.available });
      this.errorMessage.set(null);
    });
  }

  protected save(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    const price = this.form.controls.price.value;
    if (price === null) {
      throw new Error('Price is required.');
    }
    this.saving.set(true);
    this.errorMessage.set(null);
    this.store
      .updateItem(this.item().id, { price, available: this.form.controls.available.value })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.saving.set(false);
          this.saved.emit(updated);
        },
        error: (err: unknown) => {
          this.saving.set(false);
          this.errorMessage.set(readUpdateError(err));
        },
      });
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
  return 'The item could not be saved. Check the price and try again.';
}
