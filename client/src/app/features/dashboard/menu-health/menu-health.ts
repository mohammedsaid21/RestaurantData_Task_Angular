import { DecimalPipe, PercentPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Stats } from '../../../core/models/item.model';

@Component({
  selector: 'app-menu-health',
  imports: [DecimalPipe, PercentPipe],
  templateUrl: './menu-health.html',
  styleUrl: './menu-health.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MenuHealth {
  readonly stats = input.required<Stats>();

  protected readonly availableShare = computed(() => this.share(this.stats().available));
  protected readonly unavailableShare = computed(() => this.share(this.stats().unavailable));

  private share(count: number): number {
    const total = this.stats().total;
    if (total === 0) {
      return 0;
    }
    return count / total;
  }
}
