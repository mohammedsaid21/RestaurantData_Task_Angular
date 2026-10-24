import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { PageHeader } from '../../layout/page-header/page-header';
import { ExplorerStore } from './explorer.store';
import { FiltersBar } from './filters-bar/filters-bar';
import { ItemsTable } from './items-table/items-table';

@Component({
  selector: 'app-explorer-page',
  imports: [MatButtonModule, PageHeader, FiltersBar, ItemsTable],
  templateUrl: './explorer.page.html',
  styleUrl: './explorer.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ExplorerStore],
})
export class ExplorerPage {
  protected readonly store = inject(ExplorerStore);
  protected readonly density = signal<'comfortable' | 'compact'>('comfortable');
  protected readonly skeletonRows = [0, 1, 2, 3, 4, 5, 6, 7];
  private readonly filters = viewChild(FiltersBar);

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

  protected clearFilters(): void {
    this.filters()?.clearAll();
  }
}
