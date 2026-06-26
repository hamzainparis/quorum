import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal } from '@angular/core';
import {
  FIBONACCI_DECK,
  Player,
  Ticket,
  VoteStats,
  VoteValue,
  suggestedEstimate,
} from '@quorum/shared-domain';
import { Avatar, Badge, Card, CONSENSUS_META, RichText, TICKET_PRIORITY_META, TICKET_TYPE_META } from '@quorum/web-ui';

type PlayerCardState = 'revealed' | 'voted' | 'pending';

interface PlayerCard {
  id: string;
  name: string;
  color: string;
  shortName: string;
  face: string;
  state: PlayerCardState;
}

interface DeckCard {
  value: VoteValue;
  selected: boolean;
}

interface AssignCard {
  value: number;
  suggested: boolean;
}

@Component({
  selector: 'qrm-poker',
  imports: [Card, Avatar, Badge, RichText],
  templateUrl: './poker.html',
  styleUrl: './poker.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Poker {
  tickets = input.required<Ticket[]>();
  activeTicketId = input<string | null>(null);
  players = input.required<Player[]>();
  votes = input.required<Record<string, VoteValue>>();
  votedPlayerIds = input.required<string[]>();
  revealed = input(false);
  stats = input<VoteStats | null>(null);
  currentPlayerId = input.required<string>();
  isFacilitator = input(false);

  readonly vote = output<VoteValue>();
  readonly reveal = output<void>();
  readonly resetVotes = output<void>();
  readonly skip = output<void>();
  readonly assignEstimate = output<number>();

  readonly typeMeta = TICKET_TYPE_META;
  readonly priorityMeta = TICKET_PRIORITY_META;

  // The server hides vote values from everyone (including the voter) until reveal,
  // so the voter's own card selection is tracked optimistically on the client and
  // cleared once the server confirms a new round has started (votedPlayerIds no
  // longer includes us after previously including us).
  private readonly myPendingVote = signal<VoteValue | null>(null);
  private hadVoted = false;

  constructor() {
    effect(() => {
      const iVoted = this.votedPlayerIds().includes(this.currentPlayerId());
      if (this.hadVoted && !iVoted) {
        this.myPendingVote.set(null);
      }
      this.hadVoted = iVoted;
    });

    // Collapse description when switching tickets
    effect(() => {
      this.activeTicketId();
      this.descExpanded.set(false);
    });
  }

  readonly activeTicket = computed<Ticket | null>(
    () => this.tickets().find((t) => t.id === this.activeTicketId()) ?? this.tickets()[0] ?? null
  );

  readonly descExpanded = signal(false);

  readonly plainDesc = computed(() => {
    const desc = this.activeTicket()?.desc ?? '';
    if (!desc) return '';
    // Strip HTML tags to produce a plain-text excerpt for the compact bar
    const plain = desc.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    return plain.length > 130 ? plain.slice(0, 128) + '…' : plain;
  });

  readonly hasDesc = computed(() => (this.activeTicket()?.desc ?? '').trim().length > 0);

  readonly votedCount = computed(() => this.votedPlayerIds().length);
  readonly voterCount = computed(() => this.players().length);
  readonly canReveal = computed(() => !this.revealed() && this.votedCount() > 0);
  readonly showAssign = computed(() => this.isFacilitator() && this.revealed());

  readonly waitingText = computed(() => {
    if (this.votedCount() === 0) return 'Waiting for votes…';
    return this.isFacilitator() ? 'Reveal when ready' : 'Waiting for facilitator to reveal…';
  });

  readonly deckLabel = computed(() => (this.revealed() ? 'Votes in' : 'Pick your estimate'));

  readonly displayStats = computed(() => {
    const stats = this.stats();
    if (stats) {
      return {
        avg: stats.avg,
        spread: stats.spread,
        label: stats.consensusLabel,
        text: stats.consensusText,
        meta: CONSENSUS_META[stats.consensusLevel],
      };
    }
    return { avg: '–', spread: '–', label: 'CONSENSUS', text: '—', meta: CONSENSUS_META.none };
  });

  readonly playerCards = computed<PlayerCard[]>(() =>
    this.players().map((p) => {
      const hasVoted = this.votedPlayerIds().includes(p.id);
      let face = '';
      let state: PlayerCardState = 'pending';
      if (this.revealed() && hasVoted) {
        face = String(this.votes()[p.id]);
        state = 'revealed';
      } else if (hasVoted) {
        face = '✓';
        state = 'voted';
      }
      return {
        id: p.id,
        name: p.name,
        color: p.color,
        shortName: p.id === this.currentPlayerId() ? 'You' : p.name.split(' ')[0],
        face,
        state,
      };
    })
  );

  readonly myVote = computed(() =>
    this.revealed() ? this.votes()[this.currentPlayerId()] : (this.myPendingVote() ?? undefined)
  );

  readonly deck = computed<DeckCard[]>(() =>
    FIBONACCI_DECK.map((value) => ({
      value,
      selected: this.myVote() === value && !this.revealed(),
    }))
  );

  selectVote(value: VoteValue): void {
    this.myPendingVote.set(value);
    this.vote.emit(value);
  }

  readonly assignCards = computed<AssignCard[]>(() => {
    const suggested = suggestedEstimate(this.votes());
    return FIBONACCI_DECK.filter((v): v is number => typeof v === 'number').map((value) => ({
      value,
      suggested: value === suggested,
    }));
  });
}
