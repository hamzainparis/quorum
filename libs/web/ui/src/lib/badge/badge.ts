import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type BadgeSize = 'xs' | 'sm';
export type BadgeShape = 'pill' | 'square';

@Component({
  selector: 'qrm-badge',
  templateUrl: './badge.html',
  styleUrl: './badge.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Badge {
  color = input.required<string>();
  background = input<string>('transparent');
  size = input<BadgeSize>('sm');
  shape = input<BadgeShape>('pill');
}
