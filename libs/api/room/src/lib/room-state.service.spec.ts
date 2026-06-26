import { Ticket } from '@quorum/shared-domain';
import { NotFacilitatorError, RoomNotFoundError } from './room-errors';
import { RoomStateService } from './room-state.service';

function ticket(id: string, estimate: number | null = null): Ticket {
  return { id, key: `SPR-${id}`, type: 'story', title: id, desc: '', priority: 'Med', estimate };
}

describe('RoomStateService', () => {
  let service: RoomStateService;

  beforeEach(() => {
    service = new RoomStateService();
  });

  it('makes the first joiner the facilitator', () => {
    const snapshot = service.join(
      { roomCode: 'ABCD', clientId: 'p1', name: 'Alex' },
      'socket-1'
    );
    expect(snapshot.facilitatorId).toBe('p1');
    expect(snapshot.players).toHaveLength(1);
  });

  it('does not make later joiners facilitator', () => {
    service.join({ roomCode: 'ABCD', clientId: 'p1', name: 'Alex' }, 'socket-1');
    const snapshot = service.join({ roomCode: 'ABCD', clientId: 'p2', name: 'Maya' }, 'socket-2');
    expect(snapshot.facilitatorId).toBe('p1');
    expect(snapshot.players).toHaveLength(2);
  });

  it('hides vote values until revealed but exposes who has voted', () => {
    service.join({ roomCode: 'ABCD', clientId: 'p1', name: 'Alex' }, 'socket-1');
    service.join({ roomCode: 'ABCD', clientId: 'p2', name: 'Maya' }, 'socket-2');
    const snapshot = service.vote('ABCD', 'p2', 5);
    expect(snapshot.votes).toEqual({});
    expect(snapshot.votedPlayerIds).toEqual(['p2']);
  });

  it('reveals real values and computed stats only to the facilitator action', () => {
    service.join({ roomCode: 'ABCD', clientId: 'p1', name: 'Alex' }, 'socket-1');
    service.vote('ABCD', 'p1', 5);
    const snapshot = service.reveal('ABCD', 'p1');
    expect(snapshot.votes).toEqual({ p1: 5 });
    expect(snapshot.revealed).toBe(true);
    expect(snapshot.stats?.consensusLevel).toBe('consensus');
  });

  it('rejects privileged actions from non-facilitators', () => {
    service.join({ roomCode: 'ABCD', clientId: 'p1', name: 'Alex' }, 'socket-1');
    service.join({ roomCode: 'ABCD', clientId: 'p2', name: 'Maya' }, 'socket-2');
    expect(() => service.reveal('ABCD', 'p2')).toThrow(NotFacilitatorError);
  });

  it('throws for an unknown room', () => {
    expect(() => service.getSnapshot('NOPE')).toThrow(RoomNotFoundError);
  });

  it('advances to the next unestimated ticket after assigning an estimate', () => {
    service.join({ roomCode: 'ABCD', clientId: 'p1', name: 'Alex' }, 'socket-1');
    service.importTickets('ABCD', [ticket('t1'), ticket('t2'), ticket('t3')]);
    let snapshot = service.getSnapshot('ABCD');
    expect(snapshot.activeTicketId).toBe('t1');

    snapshot = service.assignEstimate('ABCD', 'p1', 5);
    expect(snapshot.tickets.find((t) => t.id === 't1')?.estimate).toBe(5);
    expect(snapshot.activeTicketId).toBe('t2');
    expect(snapshot.votes).toEqual({});
    expect(snapshot.revealed).toBe(false);
  });

  it('skips a ticket without setting its estimate', () => {
    service.join({ roomCode: 'ABCD', clientId: 'p1', name: 'Alex' }, 'socket-1');
    service.importTickets('ABCD', [ticket('t1'), ticket('t2')]);
    const snapshot = service.skip('ABCD', 'p1');
    expect(snapshot.tickets.find((t) => t.id === 't1')?.estimate).toBeNull();
    expect(snapshot.activeTicketId).toBe('t2');
  });

  it('reassigns facilitator to the next connected player on disconnect', () => {
    service.join({ roomCode: 'ABCD', clientId: 'p1', name: 'Alex' }, 'socket-1');
    service.join({ roomCode: 'ABCD', clientId: 'p2', name: 'Maya' }, 'socket-2');
    const update = service.leaveBySocket('socket-1');
    expect(update?.snapshot.facilitatorId).toBe('p2');
    expect(update?.snapshot.players.find((p) => p.id === 'p1')?.connected).toBe(false);
  });

  it('blocks chat from participants while muted, but allows the facilitator', () => {
    service.join({ roomCode: 'ABCD', clientId: 'p1', name: 'Alex' }, 'socket-1');
    service.join({ roomCode: 'ABCD', clientId: 'p2', name: 'Maya' }, 'socket-2');
    service.toggleMute('ABCD', 'p1');
    expect(() => service.sendChat('ABCD', 'p2', 'hi')).toThrow(NotFacilitatorError);
    const snapshot = service.sendChat('ABCD', 'p1', 'hi team');
    expect(snapshot.chat.at(-1)).toMatchObject({ who: 'p1', text: 'hi team', system: false });
  });

  it('reorders tickets to match the given order, keeping unlisted tickets at the end', () => {
    service.join({ roomCode: 'ABCD', clientId: 'p1', name: 'Alex' }, 'socket-1');
    service.importTickets('ABCD', [ticket('t1'), ticket('t2'), ticket('t3')]);

    const snapshot = service.reorderTickets('ABCD', 'p1', ['t3', 't1']);
    expect(snapshot.tickets.map((t) => t.id)).toEqual(['t3', 't1', 't2']);
  });

  it('rejects ticket reordering from non-facilitators', () => {
    service.join({ roomCode: 'ABCD', clientId: 'p1', name: 'Alex' }, 'socket-1');
    service.join({ roomCode: 'ABCD', clientId: 'p2', name: 'Maya' }, 'socket-2');
    service.importTickets('ABCD', [ticket('t1'), ticket('t2')]);

    expect(() => service.reorderTickets('ABCD', 'p2', ['t2', 't1'])).toThrow(NotFacilitatorError);
  });

  it('selecting a ticket sets it active and posts a system message', () => {
    service.join({ roomCode: 'ABCD', clientId: 'p1', name: 'Alex' }, 'socket-1');
    service.importTickets('ABCD', [ticket('t1'), ticket('t2')]);

    const snapshot = service.selectTicket('ABCD', 'p1', 't2');
    expect(snapshot.activeTicketId).toBe('t2');
    expect(snapshot.chat.at(-1)).toMatchObject({ system: true, text: 'Now estimating SPR-t2' });
  });

  it('re-selecting the already-active ticket is a no-op (no duplicate system message)', () => {
    service.join({ roomCode: 'ABCD', clientId: 'p1', name: 'Alex' }, 'socket-1');
    service.importTickets('ABCD', [ticket('t1'), ticket('t2')]);
    service.selectTicket('ABCD', 'p1', 't1');
    const chatLengthAfterFirstSelect = service.getSnapshot('ABCD').chat.length;

    const snapshot = service.selectTicket('ABCD', 'p1', 't1');
    expect(snapshot.activeTicketId).toBe('t1');
    expect(snapshot.chat.length).toBe(chatLengthAfterFirstSelect);
  });

  it('hands off facilitator to another player', () => {
    service.join({ roomCode: 'ABCD', clientId: 'p1', name: 'Alex' }, 'socket-1');
    service.join({ roomCode: 'ABCD', clientId: 'p2', name: 'Maya' }, 'socket-2');
    const snapshot = service.makeFacilitator('ABCD', 'p1', 'p2');
    expect(snapshot.facilitatorId).toBe('p2');
  });
});
