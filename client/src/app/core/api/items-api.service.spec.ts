import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ItemsQuery } from '../models/item.model';
import { ItemsApiService } from './items-api.service';

describe('ItemsApiService', () => {
  let service: ItemsApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ItemsApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('omits empty search and sends available=false, page, and sortBy', () => {
    const query: ItemsQuery = {
      search: '',
      available: false,
      sortBy: 'price',
      sortOrder: 'asc',
      page: 2,
      pageSize: 25,
    };

    service.getItems(query).subscribe();

    const req = http.expectOne((request) => request.url === '/api/items');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.has('search')).toBe(false);
    expect(req.request.params.get('available')).toBe('false');
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('sortBy')).toBe('price');
    req.flush({ data: [], total: 0, page: 2, pageSize: 25 });
  });

  it('patches an item at /api/items/:id', () => {
    const patch = { price: 12.5, available: false };

    service.updateItem('item-1', patch).subscribe();

    const req = http.expectOne('/api/items/item-1');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual(patch);
    req.flush({ id: 'item-1' });
  });

  it('gets stats from /api/stats', () => {
    service.getStats().subscribe();

    const req = http.expectOne('/api/stats');
    expect(req.request.method).toBe('GET');
    req.flush({
      total: 0,
      available: 0,
      unavailable: 0,
      avgPrice: 0,
      byCategory: [],
    });
  });

  it('gets meta from /api/meta', () => {
    service.getMeta().subscribe();

    const req = http.expectOne('/api/meta');
    expect(req.request.method).toBe('GET');
    req.flush({ restaurants: [], categories: [] });
  });
});
