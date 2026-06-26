import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AuthService, ClientIdService, RoomSocketService } from '@quorum/web-data-access';
import { Lobby } from './lobby';

describe('Lobby', () => {
  let fixture: ComponentFixture<Lobby>;
  let component: Lobby;
  let roomSocket: { join: jest.Mock };
  let clientId: { getOrCreate: jest.Mock };
  let auth: { signInWithGoogle: jest.Mock };

  beforeEach(async () => {
    roomSocket = { join: jest.fn() };
    clientId = { getOrCreate: jest.fn(() => 'client-1') };
    auth = { signInWithGoogle: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [Lobby],
      providers: [
        { provide: RoomSocketService, useValue: roomSocket },
        { provide: ClientIdService, useValue: clientId },
        { provide: AuthService, useValue: auth },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Lobby);
    fixture.componentRef.setInput('roomCode', 'ABCD');
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('joins with the trimmed name when submitted', () => {
    component.nameDraft.set('  Jordan Lee  ');
    component.join();
    expect(roomSocket.join).toHaveBeenCalledWith({
      roomCode: 'ABCD',
      clientId: 'client-1',
      name: 'Jordan Lee',
    });
  });

  it('defaults to Guest when no name is entered', () => {
    component.join();
    expect(roomSocket.join).toHaveBeenCalledWith({
      roomCode: 'ABCD',
      clientId: 'client-1',
      name: 'Guest',
    });
  });

  it('joins on Enter key press', () => {
    const spy = jest.spyOn(component, 'join');
    component.onNameKey({ key: 'Enter' } as KeyboardEvent);
    expect(spy).toHaveBeenCalled();
  });

  it('joins with the Google profile on successful sign-in', async () => {
    auth.signInWithGoogle.mockResolvedValue({
      name: 'Alex Rivera',
      email: 'alex@example.com',
      picture: 'https://example.com/p.png',
    });
    await component.googleSignIn();
    expect(roomSocket.join).toHaveBeenCalledWith({
      roomCode: 'ABCD',
      clientId: 'client-1',
      name: 'Alex Rivera',
      email: 'alex@example.com',
      picture: 'https://example.com/p.png',
    });
    expect(component.errorMessage()).toBeNull();
  });

  it('surfaces an error message when Google sign-in fails', async () => {
    auth.signInWithGoogle.mockRejectedValue(new Error('Google sign-in was dismissed.'));
    await component.googleSignIn();
    expect(roomSocket.join).not.toHaveBeenCalled();
    expect(component.errorMessage()).toBe('Google sign-in was dismissed.');
  });
});
