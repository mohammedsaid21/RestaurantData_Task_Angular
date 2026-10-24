import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CategoryChart } from './category-chart/category-chart';
import { StatsStore } from './stats.store';

@Component({
  selector: 'app-dashboard-page',
  imports: [DecimalPipe, MatButtonModule, MatCardModule, MatProgressSpinnerModule, CategoryChart],
  templateUrl: './dashboard.page.html',
  styleUrl: './dashboard.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage {
  protected readonly statsStore = inject(StatsStore);

  constructor() {
    const status = this.statsStore.status();
    if (status === 'idle' || status === 'error') {
      this.statsStore.load();
    }
  }
}
