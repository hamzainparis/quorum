import { Injectable, inject } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import {
  AddTicketPayload,
  ErrorPayload,
  ImportTicketsPayload,
  JoinedPayload,
  JoinPayload,
  RoomSnapshot,
  SOCKET_EVENTS,
  Ticket,
  VoteValue,
} from '@quorum/shared-domain';
import { QUORUM_APP_CONFIG } from './app-config.token';

@Injectable({ providedIn: 'root' })
export class RoomSocketService {
  private readonly config = inject(QUORUM_APP_CONFIG);
  private socket: Socket | null = null;

  private readonly stateSubject = new Subject<RoomSnapshot>();
  private readonly joinedSubject = new Subject<JoinedPayload>();
  private readonly errorSubject = new Subject<ErrorPayload>();

  readonly state$: Observable<RoomSnapshot> = this.stateSubject.asObservable();
  readonly joined$: Observable<JoinedPayload> = this.joinedSubject.asObservable();
  readonly error$: Observable<ErrorPayload> = this.errorSubject.asObservable();

  join(payload: JoinPayload): void {
    this.ensureConnected().emit(SOCKET_EVENTS.join, payload);
  }

  vote(value: VoteValue): void {
    this.socket?.emit(SOCKET_EVENTS.vote, { value });
  }

  reveal(): void {
    this.socket?.emit(SOCKET_EVENTS.reveal);
  }

  reset(): void {
    this.socket?.emit(SOCKET_EVENTS.reset);
  }

  skip(): void {
    this.socket?.emit(SOCKET_EVENTS.skip);
  }

  selectTicket(ticketId: string): void {
    this.socket?.emit(SOCKET_EVENTS.selectTicket, { ticketId });
  }

  reorderTickets(ticketIds: string[]): void {
    this.socket?.emit(SOCKET_EVENTS.reorderTickets, { ticketIds });
  }

  assignEstimate(value: number): void {
    this.socket?.emit(SOCKET_EVENTS.assignEstimate, { value });
  }

  setEstimate(ticketId: string, value: number | null): void {
    this.socket?.emit(SOCKET_EVENTS.setEstimate, { ticketId, value });
  }

  sendChat(text: string): void {
    this.socket?.emit(SOCKET_EVENTS.sendChat, { text });
  }

  toggleMute(): void {
    this.socket?.emit(SOCKET_EVENTS.toggleMute);
  }

  makeFacilitator(playerId: string): void {
    this.socket?.emit(SOCKET_EVENTS.makeFacilitator, { playerId });
  }

  claimFacilitator(): void {
    this.socket?.emit(SOCKET_EVENTS.claimFacilitator);
  }

  importTickets(tickets: Ticket[]): void {
    const payload: ImportTicketsPayload = { tickets };
    this.socket?.emit(SOCKET_EVENTS.importTickets, payload);
  }

  addTicket(payload: AddTicketPayload): void {
    this.socket?.emit(SOCKET_EVENTS.addTicket, payload);
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  private ensureConnected(): Socket {
    if (!this.socket) {
      const socket = this.config.socketUrl ? io(this.config.socketUrl) : io();
      socket.on(SOCKET_EVENTS.state, (snapshot: RoomSnapshot) => this.stateSubject.next(snapshot));
      socket.on(SOCKET_EVENTS.joined, (payload: JoinedPayload) => this.joinedSubject.next(payload));
      socket.on(SOCKET_EVENTS.error, (payload: ErrorPayload) => this.errorSubject.next(payload));
      this.socket = socket;
    }
    return this.socket;
  }
}
