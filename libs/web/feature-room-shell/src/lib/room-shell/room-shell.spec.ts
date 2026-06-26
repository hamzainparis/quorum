import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { ErrorPayload, JoinedPayload, RoomSnapshot } from '@quorum/shared-domain';
import {
  AuthService,
  ClientIdService,
  JiraImportService,
  RoomSocketService,
  UserProfileService,
} from '@quorum/web-data-access';
import { RoomShell } from './room-shell';

function buildSnapshot(overrides: Partial<RoomSnapshot> = {}): RoomSnapshot {
  return {
    roomCode: 'ABCD',
    facilitatorId: 'client-1',
    players: [
      { id: 'client-1', name: 'Jordan Lee', color: '#6D5EF6', connected: true },
      { id: 'client-2', name: 'Maya Chen', color: '#FF6B57', connected: true },
    ],
    tickets: [],
    activeTicketId: null,
    votes: {},
    votedPlayerIds: [],
    revealed: false,
    chat: [],
    chatMuted: false,
    stats: null,
    ...overrides,
  };
}

describe('RoomShell', () => {
  let fixture: ComponentFixture<RoomShell>;
  let component: RoomShell;
  let roomSocket: {
    join: jest.Mock;
    vote: jest.Mock;
    reveal: jest.Mock;
    reset: jest.Mock;
    skip: jest.Mock;
    selectTicket: jest.Mock;
    assignEstimate: jest.Mock;
    sendChat: jest.Mock;
    toggleMute: jest.Mock;
    makeFacilitator: jest.Mock;
    deleteTicket: jest.Mock;
    disconnect: jest.Mock;
    state$: Subject<RoomSnapshot>;
    joined$: Subject<JoinedPayload>;
    error$: Subject<ErrorPayload>;
  };

  beforeEach(async () => {
    localStorage.clear();
    roomSocket = {
      join: jest.fn(),
      vote: jest.fn(),
      reveal: jest.fn(),
      reset: jest.fn(),
      skip: jest.fn(),
      selectTicket: jest.fn(),
      assignEstimate: jest.fn(),
      sendChat: jest.fn(),
      toggleMute: jest.fn(),
      makeFacilitator: jest.fn(),
      deleteTicket: jest.fn(),
      disconnect: jest.fn(),
      state$: new Subject<RoomSnapshot>(),
      joined$: new Subject<JoinedPayload>(),
      error$: new Subject<ErrorPayload>(),
    };

    await TestBed.configureTestingModule({
      imports: [RoomShell],
      providers: [
        { provide: RoomSocketService, useValue: roomSocket },
        { provide: ClientIdService, useValue: { getOrCreate: jest.fn(() => 'client-1') } },
        { provide: AuthService, useValue: { signInWithGoogle: jest.fn() } },
        { provide: JiraImportService, useValue: { importBacklog: jest.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RoomShell);
    fixture.componentRef.setInput('roomCode', 'ABCD');
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('shows the lobby before joining', () => {
    expect(fixture.nativeElement.querySelector('qrm-lobby')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.qrm-room')).toBeFalsy();
  });

  it('switches to the room view once joined and a snapshot arrives', () => {
    roomSocket.state$.next(buildSnapshot());
    roomSocket.joined$.next({ playerId: 'client-1' });
    fixture.detectChanges();

    expect(component.joined()).toBe(true);
    expect(fixture.nativeElement.querySelector('.qrm-room')).toBeTruthy();
  });

  it('derives isFacilitator from the snapshot facilitatorId', () => {
    roomSocket.state$.next(buildSnapshot({ facilitatorId: 'client-1' }));
    expect(component.isFacilitator()).toBe(true);

    roomSocket.state$.next(buildSnapshot({ facilitatorId: 'someone-else' }));
    expect(component.isFacilitator()).toBe(false);
  });

  it('delegates panel actions to the room socket', () => {
    component.vote(5);
    component.reveal();
    component.resetVotes();
    component.skip();
    component.selectTicket('t1');
    component.assignEstimate(8);
    component.sendChat('hello');
    component.toggleMute();

    expect(roomSocket.vote).toHaveBeenCalledWith(5);
    expect(roomSocket.reveal).toHaveBeenCalled();
    expect(roomSocket.reset).toHaveBeenCalled();
    expect(roomSocket.skip).toHaveBeenCalled();
    expect(roomSocket.selectTicket).toHaveBeenCalledWith('t1');
    expect(roomSocket.assignEstimate).toHaveBeenCalledWith(8);
    expect(roomSocket.sendChat).toHaveBeenCalledWith('hello');
    expect(roomSocket.toggleMute).toHaveBeenCalled();
  });

  it('toggles the Jira import modal', () => {
    expect(component.showImport()).toBe(false);
    component.openImport();
    expect(component.showImport()).toBe(true);
    component.closeImport();
    expect(component.showImport()).toBe(false);
  });

  it('switches the active mobile panel', () => {
    component.selectPanel('chat');
    expect(component.activePanel()).toBe('chat');
  });

  it('surfaces the error message from the room socket', () => {
    roomSocket.error$.next({ message: 'Room is full' });
    expect(component.errorMessage()).toBe('Room is full');
  });

  it('copies the invite link to the clipboard', async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

    await component.copyInviteLink();

    expect(writeText).toHaveBeenCalledWith(`${location.origin}/r/ABCD`);
    expect(component.inviteCopied()).toBe(true);
  });

  it('toggles between the classic and realistic card themes', () => {
    expect(component.isRealisticTheme()).toBe(false);
    component.toggleCardTheme();
    expect(component.isRealisticTheme()).toBe(true);
    component.toggleCardTheme();
    expect(component.isRealisticTheme()).toBe(false);
  });

  it('disconnects the socket when destroyed', () => {
    fixture.destroy();
    expect(roomSocket.disconnect).toHaveBeenCalled();
  });

  it('delegates deleteTicket to the room socket', () => {
    component.deleteTicket('t1');
    expect(roomSocket.deleteTicket).toHaveBeenCalledWith('t1');
  });

  it('disconnects and returns to the lobby when the user confirms leaving the room', () => {
    jest.spyOn(window, 'confirm').mockReturnValue(true);
    const userProfile = TestBed.inject(UserProfileService);
    userProfile.save({ name: 'Jordan Lee' });
    roomSocket.state$.next(buildSnapshot());
    roomSocket.joined$.next({ playerId: 'client-1' });
    fixture.detectChanges();

    component.leaveRoom();

    expect(roomSocket.disconnect).toHaveBeenCalled();
    expect(userProfile.profile()).toBeNull();
    expect(component.joined()).toBe(false);
    expect(component.snapshot()).toBeNull();
  });

  it('stays connected when the user cancels the leave confirmation', () => {
    jest.spyOn(window, 'confirm').mockReturnValue(false);
    roomSocket.state$.next(buildSnapshot());
    roomSocket.joined$.next({ playerId: 'client-1' });
    fixture.detectChanges();

    component.leaveRoom();

    expect(roomSocket.disconnect).not.toHaveBeenCalled();
    expect(component.joined()).toBe(true);
  });
});
