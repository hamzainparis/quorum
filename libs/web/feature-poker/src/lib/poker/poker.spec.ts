import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Player, Ticket, VoteStats, VoteValue } from '@quorum/shared-domain';
import { Poker } from './poker';

const tickets: Ticket[] = [
  { id: 't1', key: 'SPR-101', type: 'story', title: 'OAuth login', desc: 'Add Google sign-in', priority: 'High', estimate: null },
];

const players: Player[] = [
  { id: 'p1', name: 'Ada Lovelace', color: '#6D5EF6', connected: true },
  { id: 'p2', name: 'Grace Hopper', color: '#FF6B57', connected: true },
  { id: 'p3', name: 'Alan Turing', color: '#38B6A0', connected: true },
];

describe('Poker', () => {
  let fixture: ComponentFixture<Poker>;
  let component: Poker;

  function setup(
    overrides: Partial<{
      revealed: boolean;
      stats: VoteStats | null;
      isFacilitator: boolean;
      votes: Record<string, VoteValue>;
      votedPlayerIds: string[];
    }> = {}
  ) {
    fixture = TestBed.createComponent(Poker);
    fixture.componentRef.setInput('tickets', tickets);
    fixture.componentRef.setInput('activeTicketId', 't1');
    fixture.componentRef.setInput('players', players);
    fixture.componentRef.setInput('votes', overrides.votes ?? {});
    fixture.componentRef.setInput('votedPlayerIds', overrides.votedPlayerIds ?? ['p1', 'p2']);
    fixture.componentRef.setInput('currentPlayerId', 'p1');
    fixture.componentRef.setInput('revealed', overrides.revealed ?? false);
    fixture.componentRef.setInput('stats', overrides.stats ?? null);
    fixture.componentRef.setInput('isFacilitator', overrides.isFacilitator ?? false);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Poker] }).compileComponents();
  });

  it('shows the active ticket key and title', () => {
    setup();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('SPR-101');
    expect(text).toContain('OAuth login');
  });

  it('renders voted, not-voted, and "you" player card states before reveal', () => {
    setup();
    const cards: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('.qrm-poker__card'));
    expect(cards.filter((c) => c.className.includes('--voted')).length).toBe(2);
    expect(cards.filter((c) => c.className.includes('--pending')).length).toBe(1);
    expect(cards.some((c) => c.className.includes('--revealed'))).toBe(false);

    const names: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('.qrm-poker__player-name'));
    expect(names.map((n) => n.textContent?.trim())).toEqual(['You', 'Grace', 'Alan']);
  });

  it('reveals real vote faces once revealed is true', () => {
    setup({ revealed: true, votes: { p1: 5, p2: '?' } });
    const cards: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('.qrm-poker__card'));
    expect(cards.filter((c) => c.className.includes('--revealed')).length).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('5');
  });

  it('shows the gray placeholder consensus block when revealed with no stats', () => {
    setup({ revealed: true, stats: null });
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('CONSENSUS');
    expect(text).toContain('–');
  });

  it('shows real consensus values when stats are provided', () => {
    setup({
      revealed: true,
      stats: { avg: '5', spread: '0', consensusLabel: 'CONSENSUS 🎉', consensusText: 'Everyone agrees on 5', consensusLevel: 'consensus' },
    });
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('CONSENSUS 🎉');
    expect(text).toContain('Everyone agrees on 5');
  });

  it('has no card selected before voting, then marks my pick as selected and emits vote on deck click', () => {
    setup({ votedPlayerIds: [] });
    const cards: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('.qrm-poker__deck-card'));
    expect(cards.some((c) => c.className.includes('--selected'))).toBe(false);

    const spy = jest.fn();
    component.vote.subscribe(spy);
    const fiveCard = cards.find((c) => c.textContent?.trim() === '5');
    fiveCard?.click();
    fixture.detectChanges();

    expect(spy).toHaveBeenCalledWith(5);
    expect(fiveCard?.className).toContain('--selected');
  });

  it('clears my selected card once the server confirms a new voting round started', () => {
    setup({ votedPlayerIds: [] });
    const cards: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('.qrm-poker__deck-card'));
    cards.find((c) => c.textContent?.trim() === '5')?.click();
    fixture.componentRef.setInput('votedPlayerIds', ['p1']);
    fixture.detectChanges();

    fixture.componentRef.setInput('votedPlayerIds', []);
    fixture.detectChanges();

    const refreshed: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('.qrm-poker__deck-card'));
    expect(refreshed.some((c) => c.className.includes('--selected'))).toBe(false);
  });

  it('hides facilitator controls for non-facilitators', () => {
    setup({ isFacilitator: false });
    expect(fixture.nativeElement.querySelector('.qrm-poker__controls')).toBeNull();
  });

  it('lets the facilitator reveal, reset, and skip', () => {
    setup({ isFacilitator: true });
    const revealSpy = jest.fn();
    const resetSpy = jest.fn();
    const skipSpy = jest.fn();
    component.reveal.subscribe(revealSpy);
    component.resetVotes.subscribe(resetSpy);
    component.skip.subscribe(skipSpy);

    fixture.nativeElement.querySelector('.qrm-poker__reveal').click();
    fixture.nativeElement.querySelector('.qrm-poker__reset').click();
    fixture.nativeElement.querySelector('.qrm-poker__skip').click();

    expect(revealSpy).toHaveBeenCalled();
    expect(resetSpy).toHaveBeenCalled();
    expect(skipSpy).toHaveBeenCalled();
  });

  it('shows assign cards with the mode of votes suggested once revealed', () => {
    setup({ isFacilitator: true, revealed: true, votes: { p1: 5, p2: '?' } });
    const assignCards: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('.qrm-poker__assign-card'));
    const suggested = assignCards.find((c) => c.className.includes('--suggested'));
    expect(suggested?.textContent?.trim()).toBe('5');

    const spy = jest.fn();
    component.assignEstimate.subscribe(spy);
    suggested?.click();
    expect(spy).toHaveBeenCalledWith(5);
  });
});
