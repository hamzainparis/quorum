import { TestBed } from '@angular/core/testing';
import { SOCKET_EVENTS } from '@quorum/shared-domain';
import { io } from 'socket.io-client';
import { QUORUM_APP_CONFIG } from './app-config.token';
import { RoomSocketService } from './room-socket.service';

jest.mock('socket.io-client', () => ({ io: jest.fn() }));

const ioMock = io as jest.Mock;

function fakeSocket() {
  const handlers: Record<string, (payload: unknown) => void> = {};
  return {
    on: jest.fn((event: string, cb: (payload: unknown) => void) => {
      handlers[event] = cb;
    }),
    emit: jest.fn(),
    disconnect: jest.fn(),
    _trigger: (event: string, payload: unknown) => handlers[event](payload),
  };
}

describe('RoomSocketService', () => {
  let socket: ReturnType<typeof fakeSocket>;
  let service: RoomSocketService;

  beforeEach(() => {
    ioMock.mockReset();
    socket = fakeSocket();
    ioMock.mockReturnValue(socket);
    TestBed.configureTestingModule({
      providers: [
        {
          provide: QUORUM_APP_CONFIG,
          useValue: { apiUrl: 'http://x/api', socketUrl: 'http://x', googleClientId: '' },
        },
      ],
    });
    service = TestBed.inject(RoomSocketService);
  });

  it('connects lazily on the first join call', () => {
    expect(ioMock).not.toHaveBeenCalled();
    service.join({ roomCode: 'ABCD', clientId: 'p1', name: 'Alex' });
    expect(ioMock).toHaveBeenCalledWith('http://x');
    expect(socket.emit).toHaveBeenCalledWith(SOCKET_EVENTS.join, {
      roomCode: 'ABCD',
      clientId: 'p1',
      name: 'Alex',
    });
  });

  it('reuses the same socket connection for later calls', () => {
    service.join({ roomCode: 'ABCD', clientId: 'p1', name: 'Alex' });
    service.vote(5);
    expect(ioMock).toHaveBeenCalledTimes(1);
    expect(socket.emit).toHaveBeenCalledWith(SOCKET_EVENTS.vote, { value: 5 });
  });

  it('forwards inbound state events through state$', (done) => {
    service.join({ roomCode: 'ABCD', clientId: 'p1', name: 'Alex' });
    service.state$.subscribe((snapshot) => {
      expect(snapshot).toMatchObject({ roomCode: 'ABCD' });
      done();
    });
    socket._trigger(SOCKET_EVENTS.state, { roomCode: 'ABCD' });
  });

  it('forwards error events through error$', (done) => {
    service.join({ roomCode: 'ABCD', clientId: 'p1', name: 'Alex' });
    service.error$.subscribe((err) => {
      expect(err.message).toBe('boom');
      done();
    });
    socket._trigger(SOCKET_EVENTS.error, { message: 'boom' });
  });
});
