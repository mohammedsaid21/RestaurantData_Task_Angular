import { HttpErrorResponse } from '@angular/common/http';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Observable, Subject, of, throwError } from 'rxjs';
import { ItemsApiService } from '../../core/api/items-api.service';
import { Item, ItemsQuery, PagedResult } from '../../core/models/item.model';
import { StatsStore } from '../dashboard/stats.store';
import { ExplorerStore } from './explorer.store';

describe('ExplorerStore', () => {
  let getItems: ReturnType<typeof vi.fn<(query: ItemsQuery) => Observable<PagedResult<Item>>>>;
  let updateItem: ReturnType<typeof vi.fn<(id: string, patch: unknown) => Observable<Item>>>;
  let getMeta: ReturnType<typeof vi.fn<() => Observable<{ restaurants: []; categories: [] }>>>;
  let load: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    getItems = vi.fn<(query: ItemsQuery) => Observable<PagedResult<Item>>>(
      () => new Subject<PagedResult<Item>>().asObservable(),
    );
    updateItem = vi.fn<(id: string, patch: unknown) => Observable<Item>>();
    getMeta = vi.fn(() => of({ restaurants: [], categories: [] }));
    load = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        ExplorerStore,
        {
          provide: ItemsApiService,
          useValue: {
            getItems,
            updateItem,
            getStats: vi.fn(),
            getMeta,
          },
        },
        {
          provide: StatsStore,
          useValue: { load },
        },
      ],
    });
  });

  function flushQueries(): void {
    TestBed.flushEffects();
    TestBed.inject(ApplicationRef).tick();
  }

  function createStore(): ExplorerStore {
    const store = TestBed.inject(ExplorerStore);
    flushQueries();
    return store;
  }

  it('sends combined filters and pagination, then resets page when a filter changes', () => {
    const store = createStore();

    store.setSearch('burger');
    store.setCategory('Burgers');
    flushQueries();

    store.setPage(2, 25);
    flushQueries();

    const paged = getItems.mock.calls.at(-1)?.[0];
    expect(paged).toEqual({
      search: 'burger',
      category: 'Burgers',
      sortBy: 'name',
      sortOrder: 'asc',
      page: 2,
      pageSize: 25,
    });

    store.setCategory('Pizza');
    flushQueries();

    const reset = getItems.mock.calls.at(-1)?.[0];
    expect(reset).toEqual({
      search: 'burger',
      category: 'Pizza',
      sortBy: 'name',
      sortOrder: 'asc',
      page: 1,
      pageSize: 25,
    });
    expect(store.page()).toBe(1);
    expect(getMeta).toHaveBeenCalledTimes(1);
  });

  it('replaces a matching item after a successful update and keeps items when the update fails', () => {
    const first = createItem({ id: 'item-1', price: 12.5, available: true });
    const second = createItem({ id: 'item-2', name: 'Garden Salad', price: 8, available: true });
    getItems.mockReturnValue(of(createPage([first, second], 2)));

    const store = createStore();
    expect(store.items()).toEqual([first, second]);

    const updated = { ...first, price: 15, lastUpdated: '2026-02-01T00:00:00.000Z' };
    updateItem.mockReturnValue(of(updated));

    let received: Item | undefined;
    store.updateItem(first.id, { price: 15 }).subscribe((item) => {
      received = item;
    });

    expect(received).toEqual(updated);
    expect(store.items()).toEqual([updated, second]);
    expect(load).toHaveBeenCalledTimes(1);
    expect(store.status()).toBe('success');

    const failure = new HttpErrorResponse({
      error: { message: 'Price is invalid' },
      status: 400,
      statusText: 'Bad Request',
    });
    updateItem.mockReturnValue(throwError(() => failure));

    let caught: unknown;
    store.updateItem(first.id, { price: -1 }).subscribe({
      error: (err: unknown) => {
        caught = err;
      },
    });

    expect(caught).toBe(failure);
    expect(store.items()).toEqual([updated, second]);
    expect(load).toHaveBeenCalledTimes(1);

    getItems.mockReturnValue(of(createPage([updated, second], 2)));
    store.setAvailable(true);
    flushQueries();
    expect(store.itemMatchesFilters(updated)).toBe(true);
    expect(store.itemMatchesFilters({ ...updated, available: false })).toBe(false);

    const reload = new Subject<PagedResult<Item>>();
    getItems.mockReturnValue(reload.asObservable());
    const callsBeforeReload = getItems.mock.calls.length;
    const hidden = { ...updated, available: false };
    updateItem.mockReturnValue(of(hidden));

    store.updateItem(updated.id, { available: false }).subscribe();

    expect(store.items()).toEqual([updated, second]);
    flushQueries();
    expect(getItems.mock.calls.length).toBe(callsBeforeReload + 1);
    expect(getItems.mock.calls.at(-1)?.[0]).toEqual(
      expect.objectContaining({ available: true, page: 1 }),
    );
    expect(store.items()).toEqual([updated, second]);
    expect(store.status()).toBe('loading');
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('keeps the newer response when an older query resolves later', () => {
    const sent: { query: ItemsQuery; subject: Subject<PagedResult<Item>> }[] = [];
    getItems.mockImplementation((query: ItemsQuery) => {
      const subject = new Subject<PagedResult<Item>>();
      sent.push({ query, subject });
      return subject.asObservable();
    });

    const store = createStore();
    store.setSearch('alpha');
    flushQueries();
    store.setSearch('beta');
    flushQueries();

    const queryA = sent.filter((entry) => entry.query.search === 'alpha');
    const queryB = sent.filter((entry) => entry.query.search === 'beta');
    expect(queryA).toHaveLength(1);
    expect(queryB).toHaveLength(1);

    queryB[0].subject.next(createPage([createItem({ id: 'new', name: 'Beta' })], 8));
    queryA[0].subject.next(createPage([createItem({ id: 'old', name: 'Alpha' })], 99));

    expect(store.items().map((item) => item.id)).toEqual(['new']);
    expect(store.total()).toBe(8);
    expect(store.status()).toBe('success');
  });

  it('sets an error from getItems and recovers on retry', () => {
    getItems.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            error: { message: 'Database unavailable' },
            status: 500,
            statusText: 'Server Error',
          }),
      ),
    );

    const store = createStore();
    expect(store.status()).toBe('error');
    expect(store.error()).toBe('Database unavailable');
    expect(store.items()).toEqual([]);

    const item = createItem();
    getItems.mockReturnValue(of(createPage([item], 1)));
    store.retry();
    flushQueries();

    expect(store.status()).toBe('success');
    expect(store.error()).toBeNull();
    expect(store.items()).toEqual([item]);
    expect(store.total()).toBe(1);
  });

  it('matches items against the active filters', () => {
    const store = createStore();
    const item = createItem();

    expect(store.itemMatchesFilters(item)).toBe(true);

    store.setSearch('SOUP');
    expect(store.itemMatchesFilters(item)).toBe(true);
    store.setSearch('pizza');
    expect(store.itemMatchesFilters(item)).toBe(false);

    store.setSearch('   ');
    flushQueries();
    expect(getItems.mock.calls.at(-1)?.[0].search).toBeUndefined();

    store.setRestaurantId('restaurant-1');
    store.setBranchId('branch-1-1');
    store.setRestaurantId('restaurant-2');
    expect(store.branchId()).toBeNull();
    expect(store.page()).toBe(1);
    expect(store.itemMatchesFilters(item)).toBe(false);

    store.setRestaurantId(item.restaurantId);
    store.setBranchId(item.branchId);
    store.setCategory(item.category);
    store.setAvailable(false);
    store.setMinPrice(10);
    store.setMaxPrice(20);
    flushQueries();

    expect(getItems.mock.calls.at(-1)?.[0]).toEqual(
      expect.objectContaining({
        restaurantId: item.restaurantId,
        branchId: item.branchId,
        category: item.category,
        available: false,
        minPrice: 10,
        maxPrice: 20,
        page: 1,
      }),
    );
    expect(store.itemMatchesFilters(item)).toBe(false);
    expect(store.itemMatchesFilters({ ...item, available: false, price: 10 })).toBe(true);
    expect(store.itemMatchesFilters({ ...item, available: false, price: 9.99 })).toBe(false);
    expect(store.itemMatchesFilters({ ...item, available: false, price: 20.01 })).toBe(false);

    store.setSort('price', '');
    expect(store.sortBy()).toBe('price');
    expect(store.sortOrder()).toBe('asc');
    expect(store.page()).toBe(1);

    store.setPage(3, 50);
    store.reset();
    expect(store.page()).toBe(1);
    expect(store.pageSize()).toBe(25);
    expect(store.sortBy()).toBe('name');
    expect(store.sortOrder()).toBe('asc');
    expect(store.category()).toBeNull();
    expect(store.minPrice()).toBeNull();
  });
});

function createItem(overrides: Partial<Item> = {}): Item {
  return {
    id: 'item-1',
    name: 'Tomato Soup',
    restaurantId: 'restaurant-1',
    restaurantName: 'Sharkhood Grill',
    branchId: 'branch-1-1',
    branchName: 'Austin Branch',
    category: 'Soups',
    price: 12.5,
    available: true,
    lastUpdated: '2026-01-15T12:00:00.000Z',
    ...overrides,
  };
}

function createPage(data: Item[], total = data.length): PagedResult<Item> {
  return { data, total, page: 1, pageSize: 25 };
}
