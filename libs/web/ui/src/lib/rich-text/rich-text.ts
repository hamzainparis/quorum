import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'qrm-rich-text',
  template: `
    @if (hasContent()) {
      <div class="qrm-rich-text" [innerHTML]="content()"></div>
    } @else {
      <p class="qrm-rich-text__empty">No description provided.</p>
    }
  `,
  styleUrl: './rich-text.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RichText {
  content = input('');
  readonly hasContent = computed(() => this.content().trim().length > 0);
}
