import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ChartData, ChartOptions } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';

@Component({
  selector: 'app-category-chart',
  imports: [BaseChartDirective],
  templateUrl: './category-chart.html',
  styleUrl: './category-chart.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryChart {
  readonly counts = input.required<{ category: string; count: number }[]>();

  readonly chartType = 'bar' as const;

  readonly labels = computed(() => this.counts().map((count) => count.category));

  readonly datasets = computed(() => [
    {
      data: this.counts().map((count) => count.count),
      label: 'Items',
    },
  ]);

  readonly chartData = computed<ChartData<'bar'>>(() => ({
    labels: this.labels(),
    datasets: this.datasets(),
  }));

  readonly options: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };
}
