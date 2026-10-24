import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { EMPTY, catchError, switchMap, tap } from 'rxjs';
import { ItemsApiService } from '../../core/api/items-api.service';
import { Item, ItemsQuery, Meta } from '../../core/models/item.model';

@Injectable()
export class ExplorerStore {
  private readonly api = inject(ItemsApiService);

  readonly search = signal('');
  readonly restaurantId = signal<string | null>(null);
  readonly branchId = signal<string | null>(null);
  readonly category = signal<string | null>(null);
  readonly available = signal<boolean | null>(null);
  readonly minPrice = signal<number | null>(null);
  readonly maxPrice = signal<number | null>(null);
  readonly sortBy = signal<ItemsQuery['sortBy']>('name');
  readonly sortOrder = signal<ItemsQuery['sortOrder']>('asc');
  readonly page = signal(1);
  readonly pageSize = signal(25);

  readonly items = signal<Item[]>([]);
  readonly total = signal(0);
  readonly status = signal<'idle' | 'loading' | 'success' | 'error'>('idle');
  readonly error = signal<string | null>(null);
  readonly meta = signal<Meta | null>(null);

  private readonly reloadTick = signal(0);

  readonly query = computed<ItemsQuery>(() => {
    this.reloadTick();

    const query: ItemsQuery = {
      sortBy: this.sortBy(),
      sortOrder: this.sortOrder(),
      page: this.page(),
      pageSize: this.pageSize(),
    };

    const search = this.search().trim();
    if (search) {
      query.search = search;
    }
    const restaurantId = this.restaurantId();
    if (restaurantId) {
      query.restaurantId = restaurantId;
    }
    const branchId = this.branchId();
    if (branchId) {
      query.branchId = branchId;
    }
    const category = this.category();
    if (category) {
      query.category = category;
    }
    const available = this.available();
    if (available !== null) {
      query.available = available;
    }
    const minPrice = this.minPrice();
    if (minPrice !== null) {
      query.minPrice = minPrice;
    }
    const maxPrice = this.maxPrice();
    if (maxPrice !== null) {
      query.maxPrice = maxPrice;
    }

    return query;
  });

  constructor() {
    // switchMap unsubscribes the previous getItems call, so an older response cannot overwrite a newer query.
    toObservable(this.query)
      .pipe(
        tap(() => {
          this.status.set('loading');
          this.error.set(null);
        }),
        switchMap((query) =>
          this.api.getItems(query).pipe(
            catchError((err: unknown) => {
              this.status.set('error');
              this.error.set(this.readError(err));
              return EMPTY;
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((result) => {
        this.items.set(result.data);
        this.total.set(result.total);
        this.status.set('success');
      });

    this.api
      .getMeta()
      .pipe(takeUntilDestroyed())
      .subscribe((meta) => this.meta.set(meta));
  }

  setSearch(search: string): void {
    this.search.set(search);
    this.page.set(1);
  }

  setRestaurantId(restaurantId: string | null): void {
    this.restaurantId.set(restaurantId);
    this.branchId.set(null);
    this.page.set(1);
  }

  setBranchId(branchId: string | null): void {
    this.branchId.set(branchId);
    this.page.set(1);
  }

  setCategory(category: string | null): void {
    this.category.set(category);
    this.page.set(1);
  }

  setAvailable(available: boolean | null): void {
    this.available.set(available);
    this.page.set(1);
  }

  setMinPrice(minPrice: number | null): void {
    this.minPrice.set(minPrice);
    this.page.set(1);
  }

  setMaxPrice(maxPrice: number | null): void {
    this.maxPrice.set(maxPrice);
    this.page.set(1);
  }

  setSort(sortBy: ItemsQuery['sortBy'], sortOrder: ItemsQuery['sortOrder'] | ''): void {
    this.sortBy.set(sortBy);
    this.sortOrder.set(sortOrder === 'desc' ? 'desc' : 'asc');
    this.page.set(1);
  }

  setPage(page: number, pageSize: number): void {
    this.page.set(page);
    this.pageSize.set(pageSize);
  }

  reset(): void {
    this.search.set('');
    this.restaurantId.set(null);
    this.branchId.set(null);
    this.category.set(null);
    this.available.set(null);
    this.minPrice.set(null);
    this.maxPrice.set(null);
    this.sortBy.set('name');
    this.sortOrder.set('asc');
    this.page.set(1);
    this.pageSize.set(25);
  }

  retry(): void {
    this.reloadTick.update((tick) => tick + 1);
  }

  private readError(err: unknown): string {
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
    return 'Failed to load items';
  }
}
