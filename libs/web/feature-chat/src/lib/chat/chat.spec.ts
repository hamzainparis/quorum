import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChatMessage, Player } from '@quorum/shared-domain';
import { Chat } from './chat';

const players: Player[] = [
  { id: 'p1', name: 'Ada Lovelace', color: '#6D5EF6', connected: true },
  { id: 'p2', name: 'Grace Hopper', color: '#FF6B57', connected: true },
];

const messages: ChatMessage[] = [
  { id: 1, who: 'sys', text: 'Maya joined the room', system: true, ts: 0 },
  { id: 2, who: 'p2', text: 'Does it include reconnection handling?', system: false, ts: 1 },
  { id: 3, who: 'p1', text: 'Yes it does', system: false, ts: 2 },
];

describe('Chat', () => {
  let fixture: ComponentFixture<Chat>;
  let component: Chat;

  function setup(overrides: Partial<{ isFacilitator: boolean; muted: boolean }> = {}) {
    fixture = TestBed.createComponent(Chat);
    fixture.componentRef.setInput('messages', messages);
    fixture.componentRef.setInput('players', players);
    fixture.componentRef.setInput('currentPlayerId', 'p1');
    fixture.componentRef.setInput('isFacilitator', overrides.isFacilitator ?? false);
    fixture.componentRef.setInput('muted', overrides.muted ?? false);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Chat] }).compileComponents();
  });

  it('renders system messages and resolves the short author name for others', () => {
    setup();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Maya joined the room');
    expect(text).toContain('Grace');
    expect(text).toContain('Does it include reconnection handling?');
  });

  it('labels my own messages as "You" and marks the row as mine', () => {
    setup();
    const rows: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('.qrm-chat__row'));
    const mine = rows.find((r) => r.className.includes('--mine'));
    expect(mine?.textContent).toContain('You');
    expect(mine?.textContent).toContain('Yes it does');
  });

  it('sends the trimmed draft on Enter and clears it, but ignores empty input', () => {
    setup();
    const spy = jest.fn();
    component.send.subscribe(spy);

    const input: HTMLInputElement = fixture.nativeElement.querySelector('.qrm-chat__input');
    input.value = '  hello team  ';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    fixture.detectChanges();

    expect(spy).toHaveBeenCalledWith('hello team');
    expect(component.draft()).toBe('');

    component.draft.set('   ');
    component.sendDraft();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('hides the mute control for non-facilitators and emits toggleMute when clicked by a facilitator', () => {
    setup({ isFacilitator: false });
    expect(fixture.nativeElement.querySelector('.qrm-chat__mute')).toBeNull();

    setup({ isFacilitator: true });
    const spy = jest.fn();
    component.toggleMute.subscribe(spy);
    fixture.nativeElement.querySelector('.qrm-chat__mute').click();
    expect(spy).toHaveBeenCalled();
  });

  it('locks the composer for muted participants but keeps it open for the facilitator', () => {
    setup({ isFacilitator: false, muted: true });
    expect(fixture.nativeElement.querySelector('.qrm-chat__locked')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.qrm-chat__input')).toBeNull();

    setup({ isFacilitator: true, muted: true });
    expect(fixture.nativeElement.querySelector('.qrm-chat__locked')).toBeNull();
    expect(fixture.nativeElement.querySelector('.qrm-chat__input')).not.toBeNull();
  });
});
