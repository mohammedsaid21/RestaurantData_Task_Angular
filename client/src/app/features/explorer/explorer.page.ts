import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal, viewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Item } from '../../core/models/item.model';
import { PageHeader } from '../../layout/page-header/page-header';
import { ExplorerStore } from './explorer.store';
import { FiltersBar } from './filters-bar/filters-bar';
import { ItemEditDrawer } from './item-edit-drawer/item-edit-drawer';
import { ItemsTable } from './items-table/items-table';

@Component({
  selector: 'app-explorer-page',
  imports: [MatButtonModule, MatSidenavModule, PageHeader, FiltersBar, ItemsTable, ItemEditDrawer],
  templateUrl: './explorer.page.html',
  styleUrl: './explorer.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ExplorerStore],
})
export class ExplorerPage {
  protected readonly store = inject(ExplorerStore);
  protected readonly density = signal<'comfortable' | 'compact'>('comfortable');
  protected readonly skeletonRows = [0, 1, 2, 3, 4, 5, 6, 7];
  protected readonly editing = signal<Item | null>(null);
  protected readonly highlightedId = signal<string | null>(null);
  private readonly filters = viewChild(FiltersBar);
  private readonly drawer = viewChild.required(MatSidenav);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);
  private highlightTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => {
      if (this.highlightTimer) {
        clearTimeout(this.highlightTimer);
      }
    });
  }

  protected readonly rangeLabel = computed(() => {
    const total = this.store.total();
    if (total === 0) {
      return '0 items';
    }
    const start = (this.store.page() - 1) * this.store.pageSize() + 1;
    const end = Math.min(this.store.page() * this.store.pageSize(), total);
    return `${start.toLocaleString('en-US')}–${end.toLocaleString('en-US')} of ${total.toLocaleString('en-US')} items`;
  });

  protected setDensity(density: 'comfortable' | 'compact'): void {
    this.density.set(density);
  }

  protected onDensityKey(event: KeyboardEvent): void {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
      return;
    }
    event.preventDefault();
    this.density.set(this.density() === 'comfortable' ? 'compact' : 'comfortable');
  }

  protected clearFilters(): void {
    this.filters()?.clearAll();
  }

  protected closeEditor(): void {
    void this.drawer().close();
  }

  protected openEditor(item: Item): void {
    this.editing.set(item);
    void this.drawer().open();
  }

  protected onSaved(item: Item): void {
    void this.drawer().close();
    this.snackBar.open('Item updated', undefined, { duration: 2500 });
    this.highlightedId.set(item.id);
    if (this.highlightTimer) {
      clearTimeout(this.highlightTimer);
    }
    this.highlightTimer = setTimeout(() => this.highlightedId.set(null), 1500);
  }
}
