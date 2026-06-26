import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal, untracked } from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import { FIBONACCI_DECK, Ticket } from '@quorum/shared-domain';
import { Badge, Card, RichText, TICKET_PRIORITY_META, TICKET_TYPE_META } from '@quorum/web-ui';

export interface SetEstimateEvent {
  ticketId: string;
  value: number | null;
}

@Component({
  selector: 'qrm-board',
  imports: [Card, Badge, RichText, TitleCasePipe],
  templateUrl: './board.html',
  styleUrl: './board.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Board {
  tickets = input.required<Ticket[]>();
  activeTicketId = input<string | null>(null);
  isFacilitator = input(false);

  readonly selectTicket = output<string>();
  readonly reorderTickets = output<string[]>();
  readonly openImport = output<void>();
  readonly openCreate = output<void>();
  readonly setEstimate = output<SetEstimateEvent>();
  readonly deleteTicket = output<string>();

  readonly typeMeta = TICKET_TYPE_META;
  readonly priorityMeta = TICKET_PRIORITY_META;
  readonly fibValues = FIBONACCI_DECK.filter((v): v is number => typeof v === 'number');

  readonly estimatedCount = computed(
    () => this.tickets().filter((t) => t.estimate != null).length
  );

  readonly pointsDone = computed(() =>
    this.tickets().reduce((sum, t) => sum + (t.estimate ?? 0), 0)
  );

  readonly progressPct = computed(() => {
    const total = this.tickets().length;
    return total === 0 ? 0 : Math.round((this.estimatedCount() / total) * 100);
  });

  // Reordering is optimistic: the dragged-to order is shown immediately and
  // superseded once the server echoes back the confirmed ticket order.
  private readonly localOrder = signal<Ticket[] | null>(null);
  readonly draggingId = signal<string | null>(null);

  readonly displayTickets = computed(() => this.localOrder() ?? this.tickets());

  readonly viewingTicket = signal<Ticket | null>(null);

  constructor() {
    effect(() => {
      this.tickets();
      // Only the genuine input (tracked above) should trigger this; reading
      // draggingId untracked lets us skip clearing mid-drag without making
      // drag-end itself (which also touches draggingId) re-run the effect.
      if (!untracked(this.draggingId)) {
        this.localOrder.set(null);
      }
    });
  }

  onEstimateChange(ticket: Ticket, event: Event): void {
    event.stopPropagation();
    const raw = (event.target as HTMLSelectElement).value;
    const value = raw === '' ? null : parseInt(raw, 10);
    this.setEstimate.emit({ ticketId: ticket.id, value });
  }

  onTicketClick(ticket: Ticket): void {
    if (this.isFacilitator()) {
      this.selectTicket.emit(ticket.id);
    } else {
      this.viewingTicket.set(ticket);
    }
  }

  closeDetail(): void {
    this.viewingTicket.set(null);
  }

  onDeleteTicket(event: Event, ticket: Ticket): void {
    event.stopPropagation();
    if (!confirm(`Delete ticket ${ticket.key}? This can't be undone.`)) return;
    this.deleteTicket.emit(ticket.id);
  }

  onDragStart(ticket: Ticket): void {
    if (!this.isFacilitator()) return;
    this.draggingId.set(ticket.id);
  }

  onDragOver(event: DragEvent, target: Ticket): void {
    const sourceId = this.draggingId();
    if (!sourceId || sourceId === target.id) return;
    event.preventDefault();

    const current = this.localOrder() ?? this.tickets();
    const from = current.findIndex((t) => t.id === sourceId);
    const to = current.findIndex((t) => t.id === target.id);
    if (from === -1 || to === -1 || from === to) return;

    const next = [...current];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    this.localOrder.set(next);
  }

  onDragEnd(): void {
    const order = this.localOrder();
    this.draggingId.set(null);
    if (order) {
      this.reorderTickets.emit(order.map((t) => t.id));
    }
  }
}
