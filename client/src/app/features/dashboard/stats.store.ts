import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, Subject, catchError, switchMap, tap } from 'rxjs';
import { ItemsApiService } from '../../core/api/items-api.service';
import { Stats } from '../../core/models/item.model';

@Injectable({ providedIn: 'root' })
export class StatsStore {
  private readonly api = inject(ItemsApiService);
  private readonly loadRequests = new Subject<void>();

  readonly stats = signal<Stats | null>(null);
  readonly status = signal<'idle' | 'loading' | 'success' | 'error'>('idle');
  readonly error = signal<string | null>(null);

  constructor() {
    this.loadRequests
      .pipe(
        tap(() => {
          this.status.set('loading');
          this.error.set(null);
        }),
        switchMap(() =>
          this.api.getStats().pipe(
            catchError((err: unknown) => {
              this.status.set('error');
              this.error.set(this.readError(err));
              return EMPTY;
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((stats) => {
        this.stats.set(stats);
        this.status.set('success');
        this.error.set(null);
      });

    this.load();
  }

  load(): void {
    this.loadRequests.next();
  }

  retry(): void {
    this.load();
  }

  private readError(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      const body = err.error as { message?: unknown } | null;
      if (body && typeof body === 'object' && typeof body.message === 'string' && body.message) {
        return body.message;
      }
      return err.message || 'Failed to load stats';
    }
    if (typeof err === 'object' && err !== null && 'message' in err && typeof err.message === 'string' && err.message) {
      return err.message;
    }
    return 'Failed to load stats';
  }
}
