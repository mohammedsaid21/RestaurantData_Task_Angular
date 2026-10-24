import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, Injector, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { Item, ItemsQuery } from '../../../core/models/item.model';
import { ExplorerStore } from '../explorer.store';
import { ItemEditDialog } from '../item-edit-dialog/item-edit-dialog';

@Component({
  selector: 'app-items-table',
  imports: [
    DatePipe,
    DecimalPipe,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatPaginatorModule,
    MatSortModule,
    MatTableModule,
  ],
  templateUrl: './items-table.html',
  styleUrl: './items-table.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ItemsTable {
  protected readonly store = inject(ExplorerStore);
  private readonly dialog = inject(MatDialog);
  private readonly injector = inject(Injector);

  protected readonly displayedColumns = [
    'name',
    'restaurantName',
    'branchName',
    'category',
    'price',
    'available',
    'lastUpdated',
    'actions',
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

  protected edit(item: Item): void {
    this.dialog.open(ItemEditDialog, {
      data: { item },
      injector: this.injector,
      width: '480px',
    });
  }
}
