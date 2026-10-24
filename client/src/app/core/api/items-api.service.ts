import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Item, ItemPatch, ItemsQuery, Meta, PagedResult, Stats } from '../models/item.model';

@Injectable({ providedIn: 'root' })
export class ItemsApiService {
  private readonly http = inject(HttpClient);

  getItems(query: ItemsQuery): Observable<PagedResult<Item>> {
    return this.http.get<PagedResult<Item>>('/api/items', {
      params: toParams(query),
    });
  }

  updateItem(id: string, patch: ItemPatch): Observable<Item> {
    return this.http.patch<Item>(`/api/items/${id}`, patch);
  }

  getStats(): Observable<Stats> {
    return this.http.get<Stats>('/api/stats');
  }

  getMeta(): Observable<Meta> {
    return this.http.get<Meta>('/api/meta');
  }
}

function toParams(query: ItemsQuery): HttpParams {
  let params = new HttpParams();
  for (const key of Object.keys(query) as (keyof ItemsQuery)[]) {
    const value = query[key];
    if (value == null || value === '') {
      continue;
    }
    params = params.set(key, value);
  }
  return params;
}
