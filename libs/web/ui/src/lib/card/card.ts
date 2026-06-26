import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type CardVariant = 'panel' | 'gradient' | 'elevated';

const DEFAULT_RADIUS: Record<CardVariant, number> = {
  panel: 18,
  gradient: 18,
  elevated: 28,
};

@Component({
  selector: 'qrm-card',
  template: '<ng-content></ng-content>',
  styleUrl: './card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'qrm-card',
    '[class.qrm-card--panel]': "variant() === 'panel'",
    '[class.qrm-card--gradient]': "variant() === 'gradient'",
    '[class.qrm-card--elevated]': "variant() === 'elevated'",
    '[class.qrm-card--animated]': 'animated()',
    '[style.border-radius]': 'borderRadius()',
    '[style.padding]': 'padding()',
  },
})
export class Card {
  variant = input<CardVariant>('panel');
  radius = input<number | undefined>(undefined);
  padding = input('0');
  animated = input(false);

  borderRadius = computed(() => `${this.radius() ?? DEFAULT_RADIUS[this.variant()]}px`);
}
