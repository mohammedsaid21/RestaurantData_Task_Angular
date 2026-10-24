import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { Item } from '../../../core/models/item.model';
import { ExplorerStore } from '../explorer.store';

@Component({
  selector: 'app-items-table',
  imports: [DatePipe, DecimalPipe, MatButtonModule, MatIconModule, MatPaginatorModule, MatSortModule, MatTableModule],
  templateUrl: './items-table.html',
  styleUrl: './items-table.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ItemsTable {
  readonly density = input<'comfortable' | 'compact'>('comfortable');
  readonly highlightedId = input<string | null>(null);
  readonly editItem = output<Item>();

  protected readonly store = inject(ExplorerStore);

  protected readonly displayedColumns = ['name', 'category', 'price', 'available', 'lastUpdated', 'actions'];
  protected readonly pageSizeOptions = [10, 25, 50, 100];

  protected trackById(_index: number, item: Item): string {
    return item.id;
  }

  protected onSort(event: Sort): void {
    const sortBy = event.active;
    if (sortBy !== 'name' && sortBy !== 'price' && sortBy !== 'lastUpdated') {
      throw new Error(`Cannot sort by ${sortBy}`);
    }
    this.store.setSort(sortBy, event.direction);
  }

  protected onPage(event: PageEvent): void {
    this.store.setPage(event.pageIndex + 1, event.pageSize);
  }

  protected edit(item: Item): void {
    this.editItem.emit(item);
  }

  protected relative(iso: string): string {
    const then = new Date(iso).getTime();
    if (Number.isNaN(then)) {
      return iso;
    }
    const minutes = Math.round((Date.now() - then) / 60000);
    const hours = Math.round(minutes / 60);
    const days = Math.round(hours / 24);
    if (Math.abs(minutes) < 1) {
      return 'just now';
    }
    if (Math.abs(minutes) < 60) {
      return minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`;
    }
    if (Math.abs(hours) < 24) {
      return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
    }
    if (Math.abs(days) < 30) {
      return days === 1 ? '1 day ago' : `${days} days ago`;
    }
    const months = Math.round(days / 30);
    if (Math.abs(months) < 12) {
      return months === 1 ? '1 month ago' : `${months} months ago`;
    }
    const years = Math.round(days / 365);
    return years === 1 ? '1 year ago' : `${years} years ago`;
  }
}
