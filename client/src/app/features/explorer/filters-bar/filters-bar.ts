import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Subject, debounceTime, distinctUntilChanged, repeat, takeUntil } from 'rxjs';
import { ExplorerStore } from '../explorer.store';

@Component({
  selector: 'app-filters-bar',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
  ],
  templateUrl: './filters-bar.html',
  styleUrl: './filters-bar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FiltersBar {
  protected readonly store = inject(ExplorerStore);
  protected readonly filtersOpen = signal(false);

  private readonly cancelSearch = new Subject<void>();

  protected readonly chips = computed(() => {
    const chips: { key: ChipKey; label: string }[] = [];
    const search = this.store.search().trim();
    if (search) {
      chips.push({ key: 'search', label: `Name: ${search}` });
    }
    const restaurantId = this.store.restaurantId();
    if (restaurantId) {
      const name =
        this.store.meta()?.restaurants.find((restaurant) => restaurant.id === restaurantId)?.name ?? restaurantId;
      chips.push({ key: 'restaurant', label: name });
    }
    const branchId = this.store.branchId();
    if (branchId) {
      const branch = this.branches().find((entry) => entry.id === branchId);
      chips.push({ key: 'branch', label: branch?.name ?? branchId });
    }
    const category = this.store.category();
    if (category) {
      chips.push({ key: 'category', label: category });
    }
    const available = this.store.available();
    if (available === true) {
      chips.push({ key: 'available', label: 'Available' });
    } else if (available === false) {
      chips.push({ key: 'available', label: 'Unavailable' });
    }
    const minPrice = this.store.minPrice();
    if (minPrice !== null) {
      chips.push({ key: 'minPrice', label: `Min ${minPrice}` });
    }
    const maxPrice = this.store.maxPrice();
    if (maxPrice !== null) {
      chips.push({ key: 'maxPrice', label: `Max ${maxPrice}` });
    }
    return chips;
  });

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

  clearAll(): void {
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

  protected clearSearch(): void {
    this.cancelSearch.next();
    this.form.controls.search.setValue('', { emitEvent: false });
    this.store.setSearch('');
  }

  protected setAvailable(available: boolean | null): void {
    this.form.controls.available.setValue(available);
  }

  protected removeChip(key: ChipKey): void {
    if (key === 'search') {
      this.clearSearch();
      return;
    }
    if (key === 'restaurant') {
      this.form.controls.restaurantId.setValue(null);
      return;
    }
    if (key === 'branch') {
      this.form.controls.branchId.setValue(null);
      return;
    }
    if (key === 'category') {
      this.form.controls.category.setValue(null);
      return;
    }
    if (key === 'available') {
      this.setAvailable(null);
      return;
    }
    if (key === 'minPrice') {
      this.form.controls.minPrice.setValue(null);
      return;
    }
    this.form.controls.maxPrice.setValue(null);
  }

  protected onAvailabilityKey(event: KeyboardEvent): void {
    const order: (boolean | null)[] = [null, true, false];
    const index = order.indexOf(this.store.available());
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      this.setAvailable(order[(index + 1) % order.length]);
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      this.setAvailable(order[(index + order.length - 1) % order.length]);
    }
  }
}

type ChipKey = 'search' | 'restaurant' | 'branch' | 'category' | 'available' | 'minPrice' | 'maxPrice';
