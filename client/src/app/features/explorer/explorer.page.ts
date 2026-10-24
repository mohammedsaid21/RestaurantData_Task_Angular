import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ExplorerStore } from './explorer.store';
import { FiltersBar } from './filters-bar/filters-bar';
import { ItemsTable } from './items-table/items-table';

@Component({
  selector: 'app-explorer-page',
  imports: [FiltersBar, ItemsTable, MatButtonModule, MatProgressSpinnerModule],
  templateUrl: './explorer.page.html',
  styleUrl: './explorer.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ExplorerStore],
})
export class ExplorerPage {
  protected readonly store = inject(ExplorerStore);
}
