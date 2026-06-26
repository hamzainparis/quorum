import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { ChatMessage, Player } from '@quorum/shared-domain';
import { Avatar, Card } from '@quorum/web-ui';

interface ChatRow {
  id: number;
  isSystem: boolean;
  text: string;
  mine: boolean;
  authorName: string;
  color: string;
  displayName: string;
}

@Component({
  selector: 'qrm-chat',
  imports: [Card, Avatar],
  templateUrl: './chat.html',
  styleUrl: './chat.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Chat {
  messages = input.required<ChatMessage[]>();
  players = input.required<Player[]>();
  currentPlayerId = input.required<string>();
  isFacilitator = input(false);
  muted = input(false);

  readonly send = output<string>();
  readonly toggleMute = output<void>();

  private readonly scrollEl = viewChild<ElementRef<HTMLDivElement>>('scrollEl');

  readonly draft = signal('');
  readonly chatLocked = computed(() => this.muted() && !this.isFacilitator());
  readonly muteLabel = computed(() => (this.muted() ? '🔇 Muted' : '🔊 Mute'));

  readonly rows = computed<ChatRow[]>(() =>
    this.messages().map((m) => {
      if (m.system) {
        return { id: m.id, isSystem: true, text: m.text, mine: false, authorName: '', color: '', displayName: '' };
      }
      const author = this.players().find((p) => p.id === m.who);
      const mine = m.who === this.currentPlayerId();
      return {
        id: m.id,
        isSystem: false,
        text: m.text,
        mine,
        authorName: author?.name ?? m.who,
        color: author?.color ?? 'var(--qrm-text-8)',
        displayName: mine ? 'You' : author?.name.split(' ')[0] ?? m.who,
      };
    })
  );

  constructor() {
    afterRenderEffect(() => {
      const el = this.scrollEl()?.nativeElement;
      if (!el || this.rows().length === 0) return;
      el.scrollTop = el.scrollHeight;
    });
  }

  onDraftInput(event: Event): void {
    this.draft.set((event.target as HTMLInputElement).value);
  }

  sendDraft(): void {
    const text = this.draft().trim();
    if (!text) return;
    this.send.emit(text);
    this.draft.set('');
  }
}
