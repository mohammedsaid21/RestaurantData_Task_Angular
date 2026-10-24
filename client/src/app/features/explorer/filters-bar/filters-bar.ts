import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Subject, debounceTime, distinctUntilChanged, repeat, takeUntil } from 'rxjs';
import { ExplorerStore } from '../explorer.store';

@Component({
  selector: 'app-filters-bar',
  imports: [ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  templateUrl: './filters-bar.html',
  styleUrl: './filters-bar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FiltersBar {
  protected readonly store = inject(ExplorerStore);

  private readonly cancelSearch = new Subject<void>();

  protected readonly form = new FormGroup({
    search: new FormControl('', { nonNullable: true }),
    restaurantId: new FormControl<string | null>(null),
    branchId: new FormControl<string | null>({ value: null, disabled: true }),
    category: new FormControl<string | null>(null),
    available: new FormControl<boolean | null>(null),
    minPrice: new FormControl<number | null>(null),
    maxPrice: new FormControl<number | null>(null),
  });

  protected readonly branches = computed(() => {
    const restaurantId = this.store.restaurantId();
    if (!restaurantId) {
      return [];
    }
    return this.store.meta()?.restaurants.find((restaurant) => restaurant.id === restaurantId)?.branches ?? [];
  });

  constructor() {
    this.form.controls.search.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.cancelSearch),
        repeat(),
        takeUntilDestroyed(),
      )
      .subscribe((search) => this.store.setSearch(search));

    this.form.controls.restaurantId.valueChanges.pipe(takeUntilDestroyed()).subscribe((restaurantId) => {
      this.form.controls.branchId.setValue(null, { emitEvent: false });
      if (restaurantId) {
        this.form.controls.branchId.enable({ emitEvent: false });
      } else {
        this.form.controls.branchId.disable({ emitEvent: false });
      }
      this.store.setRestaurantId(restaurantId);
    });

    this.form.controls.branchId.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((branchId) => this.store.setBranchId(branchId));

    this.form.controls.category.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((category) => this.store.setCategory(category));

    this.form.controls.available.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((available) => this.store.setAvailable(available));

    this.form.controls.minPrice.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((minPrice) => this.store.setMinPrice(minPrice));

    this.form.controls.maxPrice.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((maxPrice) => this.store.setMaxPrice(maxPrice));
  }

  protected reset(): void {
    this.cancelSearch.next();
    this.form.reset(
      {
        search: '',
        restaurantId: null,
        branchId: null,
        category: null,
        available: null,
        minPrice: null,
        maxPrice: null,
      },
      { emitEvent: false },
    );
    this.form.controls.branchId.disable({ emitEvent: false });
    this.store.reset();
  }
}
