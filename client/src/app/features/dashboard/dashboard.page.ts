import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { PageHeader } from '../../layout/page-header/page-header';
import { CategoryChart } from './category-chart/category-chart';
import { MenuHealth } from './menu-health/menu-health';
import { StatsStore } from './stats.store';

@Component({
  selector: 'app-dashboard-page',
  imports: [MatButtonModule, PageHeader, MenuHealth, CategoryChart],
  templateUrl: './dashboard.page.html',
  styleUrl: './dashboard.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage {
  protected readonly statsStore = inject(StatsStore);
  protected readonly skeletonRows = [0, 1, 2];

  constructor() {
    const status = this.statsStore.status();
    if (status === 'idle' || status === 'error') {
      this.statsStore.load();
    }
  }
}
