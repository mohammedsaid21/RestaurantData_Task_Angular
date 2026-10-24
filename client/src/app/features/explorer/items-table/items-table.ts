import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { Item, ItemsQuery } from '../../../core/models/item.model';
import { ExplorerStore } from '../explorer.store';

@Component({
  selector: 'app-items-table',
  imports: [DatePipe, DecimalPipe, MatPaginatorModule, MatSortModule, MatTableModule],
  templateUrl: './items-table.html',
  styleUrl: './items-table.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ItemsTable {
  protected readonly store = inject(ExplorerStore);

  protected readonly displayedColumns = [
    'name',
    'restaurantName',
    'branchName',
    'category',
    'price',
    'available',
    'lastUpdated',
  ];

  protected readonly pageSizeOptions = [10, 25, 50];

  protected trackById(_index: number, item: Item): string {
    return item.id;
  }

  protected onSort(event: Sort): void {
    const sortBy = event.active;
    if (sortBy !== 'name' && sortBy !== 'price' && sortBy !== 'lastUpdated') {
      throw new Error(`Cannot sort by ${sortBy}`);
    }
    const direction: ItemsQuery['sortOrder'] | '' = event.direction === '' ? '' : event.direction;
    this.store.setSort(sortBy, direction);
  }

  protected onPage(event: PageEvent): void {
    this.store.setPage(event.pageIndex + 1, event.pageSize);
  }
}
