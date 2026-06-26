import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type AvatarSize = 'xs' | 'sm' | 'md';

const SIZE_PX: Record<AvatarSize, number> = { xs: 18, sm: 28, md: 32 };
const FONT_PX: Record<AvatarSize, number> = { xs: 8.5, sm: 10.5, md: 12 };

@Component({
  selector: 'qrm-avatar',
  templateUrl: './avatar.html',
  styleUrl: './avatar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Avatar {
  name = input.required<string>();
  color = input.required<string>();
  size = input<AvatarSize>('md');
  bordered = input(false);

  initials = computed(() =>
    this.name()
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0].toUpperCase())
      .join('')
  );

  dimension = computed(() => `${SIZE_PX[this.size()]}px`);
  fontSize = computed(() => `${FONT_PX[this.size()]}px`);
}
