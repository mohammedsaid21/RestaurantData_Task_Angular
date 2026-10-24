import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Chart, ChartData, ChartOptions, Plugin } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { CategoryCount } from '../../../core/models/item.model';

const valueLabels: Plugin<'bar'> = {
  id: 'categoryValueLabels',
  afterDatasetsDraw(chart) {
    const { ctx } = chart;
    const meta = chart.getDatasetMeta(0);
    const dataset = chart.data.datasets[0];
    ctx.save();
    ctx.fillStyle = '#11262c';
    ctx.font = '12px Instrument Sans, Segoe UI, sans-serif';
    ctx.textBaseline = 'middle';
    meta.data.forEach((bar, index) => {
      const value = dataset.data[index];
      const point = bar as { x: number; y: number };
      ctx.fillText(String(value), point.x + 8, point.y);
    });
    ctx.restore();
  },
};

Chart.register(valueLabels);

function readToken(name: string, fallback: string): string {
  if (typeof document === 'undefined') {
    return fallback;
  }
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

@Component({
  selector: 'app-category-chart',
  imports: [BaseChartDirective],
  templateUrl: './category-chart.html',
  styleUrl: './category-chart.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryChart {
  readonly counts = input.required<CategoryCount[]>();

  protected readonly sorted = computed(() => this.counts().slice().sort((a, b) => b.count - a.count));

  protected readonly chartType = 'bar' as const;

  protected readonly chartHeight = computed(() => Math.max(220, this.sorted().length * 36));

  protected readonly chartData = computed<ChartData<'bar'>>(() => ({
    labels: this.sorted().map((count) => count.category),
    datasets: [
      {
        data: this.sorted().map((count) => count.count),
        label: 'Items',
        backgroundColor: readToken('--sh-primary', '#0e5a63'),
        borderRadius: 4,
        maxBarThickness: 18,
        categoryPercentage: 0.7,
        barPercentage: 0.85,
      },
    ],
  }));

  protected readonly options: ChartOptions<'bar'> = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: { right: 48 } },
    plugins: { legend: { display: false } },
    scales: {
      x: {
        beginAtZero: true,
        grid: { color: readToken('--sh-line', '#d9e2e4') },
        ticks: { color: readToken('--sh-muted', '#5b7077'), precision: 0 },
      },
      y: {
        grid: { display: false },
        ticks: { color: readToken('--sh-ink', '#11262c') },
      },
    },
  };
}
