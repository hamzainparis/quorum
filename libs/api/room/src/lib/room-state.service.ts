import { Injectable } from '@nestjs/common';
import { Subject } from 'rxjs';
import {
  ChatMessage,
  JoinPayload,
  Player,
  Priority,
  RoomSnapshot,
  Ticket,
  TicketType,
  VoteValue,
  computeVoteStats,
} from '@quorum/shared-domain';
import { colorForIndex } from './player-colors';
import { NotFacilitatorError, PlayerNotFoundError, RoomNotFoundError } from './room-errors';

interface InternalPlayer extends Player {
  socketId: string | null;
}

interface InternalRoom {
  roomCode: string;
  facilitatorId: string | null;
  players: Map<string, InternalPlayer>;
  tickets: Ticket[];
  activeTicketId: string | null;
  votes: Record<string, VoteValue>;
  revealed: boolean;
  chat: ChatMessage[];
  chatMuted: boolean;
  nextChatId: number;
}

export interface RoomUpdate {
  roomCode: string;
  snapshot: RoomSnapshot;
}

@Injectable()
export class RoomStateService {
  private readonly rooms = new Map<string, InternalRoom>();
  private readonly updates = new Subject<RoomUpdate>();

  readonly updates$ = this.updates.asObservable();

  join(payload: JoinPayload, socketId: string): RoomSnapshot {
    const room = this.getOrCreateRoom(payload.roomCode);
    const existing = room.players.get(payload.clientId);

    if (existing) {
      existing.name = payload.name;
      existing.email = payload.email;
      existing.picture = payload.picture;
      existing.connected = true;
      existing.socketId = socketId;
    } else {
      const player: InternalPlayer = {
        id: payload.clientId,
        name: payload.name,
        color: colorForIndex(room.players.size),
        email: payload.email,
        picture: payload.picture,
        connected: true,
        socketId,
      };
      room.players.set(player.id, player);
      if (!room.facilitatorId) {
        room.facilitatorId = player.id;
      }
      this.pushSystemMessage(room, `${payload.name} joined the room`);
    }

    return this.emitUpdate(room);
  }

  leaveBySocket(socketId: string): RoomUpdate | null {
    for (const room of this.rooms.values()) {
      const player = [...room.players.values()].find((p) => p.socketId === socketId);
      if (!player) continue;

      player.connected = false;
      player.socketId = null;
      this.pushSystemMessage(room, `${player.name} left the room`);

      if (room.facilitatorId === player.id) {
        this.reassignFacilitator(room);
      }

      const snapshot = this.emitUpdate(room);
      return { roomCode: room.roomCode, snapshot };
    }
    return null;
  }

  vote(roomCode: string, playerId: string, value: VoteValue): RoomSnapshot {
    const room = this.requireRoom(roomCode);
    this.requirePlayer(room, playerId);
    if (!room.revealed) {
      room.votes[playerId] = value;
    }
    return this.emitUpdate(room);
  }

  reveal(roomCode: string, playerId: string): RoomSnapshot {
    const room = this.requireFacilitator(roomCode, playerId);
    room.revealed = true;
    return this.emitUpdate(room);
  }

  reset(roomCode: string, playerId: string): RoomSnapshot {
    const room = this.requireFacilitator(roomCode, playerId);
    room.votes = {};
    room.revealed = false;
    return this.emitUpdate(room);
  }

  skip(roomCode: string, playerId: string): RoomSnapshot {
    const room = this.requireFacilitator(roomCode, playerId);
    this.advance(room, null);
    return this.emitUpdate(room);
  }

  selectTicket(roomCode: string, playerId: string, ticketId: string): RoomSnapshot {
    const room = this.requireFacilitator(roomCode, playerId);
    const ticket = room.tickets.find((t) => t.id === ticketId);
    if (ticket && ticket.id !== room.activeTicketId) {
      room.activeTicketId = ticket.id;
      room.votes = {};
      room.revealed = false;
      this.pushSystemMessage(room, `Now estimating ${ticket.key}`);
    }
    return this.emitUpdate(room);
  }

  reorderTickets(roomCode: string, playerId: string, ticketIds: string[]): RoomSnapshot {
    const room = this.requireFacilitator(roomCode, playerId);
    const byId = new Map(room.tickets.map((t) => [t.id, t]));
    const seen = new Set<string>();
    const reordered: Ticket[] = [];
    for (const id of ticketIds) {
      const t = byId.get(id);
      if (t && !seen.has(id)) {
        reordered.push(t);
        seen.add(id);
      }
    }
    for (const t of room.tickets) {
      if (!seen.has(t.id)) reordered.push(t);
    }
    room.tickets = reordered;
    return this.emitUpdate(room);
  }

  assignEstimate(roomCode: string, playerId: string, value: number): RoomSnapshot {
    const room = this.requireFacilitator(roomCode, playerId);
    this.advance(room, value);
    this.pushSystemMessage(room, 'Estimate set · advancing');
    return this.emitUpdate(room);
  }

  setEstimate(roomCode: string, playerId: string, ticketId: string, value: number | null): RoomSnapshot {
    const room = this.requireFacilitator(roomCode, playerId);
    const ticket = room.tickets.find((t) => t.id === ticketId);
    if (ticket) {
      ticket.estimate = value;
      const msg =
        value == null ? `Estimate cleared for ${ticket.key}` : `${ticket.key} set to ${value} pts`;
      this.pushSystemMessage(room, msg);
    }
    return this.emitUpdate(room);
  }

  sendChat(roomCode: string, playerId: string, text: string): RoomSnapshot {
    const room = this.requireRoom(roomCode);
    const player = this.requirePlayer(room, playerId);
    const trimmed = text.trim();
    if (!trimmed) {
      return this.toSnapshot(room);
    }
    if (room.chatMuted && room.facilitatorId !== playerId) {
      throw new NotFacilitatorError();
    }
    room.chat.push({
      id: ++room.nextChatId,
      who: player.id,
      text: trimmed,
      system: false,
      ts: Date.now(),
    });
    return this.emitUpdate(room);
  }

  toggleMute(roomCode: string, playerId: string): RoomSnapshot {
    const room = this.requireFacilitator(roomCode, playerId);
    room.chatMuted = !room.chatMuted;
    return this.emitUpdate(room);
  }

  makeFacilitator(roomCode: string, playerId: string, targetPlayerId: string): RoomSnapshot {
    const room = this.requireFacilitator(roomCode, playerId);
    const target = room.players.get(targetPlayerId);
    if (!target) {
      throw new PlayerNotFoundError();
    }
    room.facilitatorId = target.id;
    this.pushSystemMessage(room, `${target.name} is now the facilitator`);
    return this.emitUpdate(room);
  }

  claimFacilitator(roomCode: string, playerId: string): RoomSnapshot {
    const room = this.requireRoom(roomCode);
    const player = this.requirePlayer(room, playerId);
    room.facilitatorId = player.id;
    this.pushSystemMessage(room, `${player.name} is now the facilitator`);
    return this.emitUpdate(room);
  }

  socketImportTickets(roomCode: string, playerId: string, tickets: Ticket[]): RoomSnapshot {
    this.requirePlayer(this.requireRoom(roomCode), playerId);
    return this.importTickets(roomCode, tickets);
  }

  addTicket(
    roomCode: string,
    playerId: string,
    data: { title: string; type: TicketType; priority: Priority; desc: string }
  ): RoomSnapshot {
    const room = this.requireRoom(roomCode);
    this.requirePlayer(room, playerId);
    const id = `manual-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const key = `TKT-${room.tickets.length + 1}`;
    const ticket: Ticket = {
      id,
      key,
      type: data.type,
      title: data.title.trim(),
      desc: data.desc.trim(),
      priority: data.priority,
      estimate: null,
    };
    room.tickets.push(ticket);
    if (!room.activeTicketId) {
      room.activeTicketId = ticket.id;
    }
    this.pushSystemMessage(room, `Ticket ${key} added to backlog`);
    return this.emitUpdate(room);
  }

  importTickets(roomCode: string, tickets: Ticket[]): RoomSnapshot {
    const room = this.requireRoom(roomCode);

    // Merge: update tickets that already exist (same id), append genuinely new ones
    const existingById = new Map(room.tickets.map((t) => [t.id, t]));
    let addedCount = 0;

    for (const incoming of tickets) {
      if (existingById.has(incoming.id)) {
        // Update in-place (title, desc, priority, etc. may have changed)
        Object.assign(existingById.get(incoming.id)!, incoming);
      } else {
        room.tickets.push(incoming);
        existingById.set(incoming.id, incoming);
        addedCount++;
      }
    }

    // Set active ticket to first unestimated if none is currently active
    if (!room.activeTicketId && room.tickets.length > 0) {
      const first = room.tickets.find((t) => t.estimate == null) ?? room.tickets[0];
      room.activeTicketId = first.id;
    }

    const label = addedCount === tickets.length
      ? `${addedCount} issue${addedCount === 1 ? '' : 's'} imported`
      : `${addedCount} new, ${tickets.length - addedCount} updated`;
    this.pushSystemMessage(room, label);
    return this.emitUpdate(room);
  }

  getSnapshot(roomCode: string): RoomSnapshot {
    return this.toSnapshot(this.requireRoom(roomCode));
  }

  roomExists(roomCode: string): boolean {
    return this.rooms.has(roomCode);
  }

  private getOrCreateRoom(roomCode: string): InternalRoom {
    let room = this.rooms.get(roomCode);
    if (!room) {
      room = {
        roomCode,
        facilitatorId: null,
        players: new Map(),
        tickets: [],
        activeTicketId: null,
        votes: {},
        revealed: false,
        chat: [],
        chatMuted: false,
        nextChatId: 0,
      };
      this.rooms.set(roomCode, room);
    }
    return room;
  }

  private requireRoom(roomCode: string): InternalRoom {
    const room = this.rooms.get(roomCode);
    if (!room) {
      throw new RoomNotFoundError(roomCode);
    }
    return room;
  }

  private requirePlayer(room: InternalRoom, playerId: string): InternalPlayer {
    const player = room.players.get(playerId);
    if (!player) {
      throw new PlayerNotFoundError();
    }
    return player;
  }

  private requireFacilitator(roomCode: string, playerId: string): InternalRoom {
    const room = this.requireRoom(roomCode);
    if (room.facilitatorId !== playerId) {
      throw new NotFacilitatorError();
    }
    return room;
  }

  private reassignFacilitator(room: InternalRoom): void {
    const next = [...room.players.values()].find((p) => p.connected);
    room.facilitatorId = next ? next.id : null;
    if (next) {
      this.pushSystemMessage(room, `${next.name} is now the facilitator`);
    }
  }

  private advance(room: InternalRoom, estimate: number | null): void {
    if (estimate != null && room.activeTicketId) {
      const ticket = room.tickets.find((t) => t.id === room.activeTicketId);
      if (ticket) ticket.estimate = estimate;
    }
    const curIdx = room.tickets.findIndex((t) => t.id === room.activeTicketId);
    const next =
      room.tickets.slice(curIdx + 1).find((t) => t.estimate == null) ??
      room.tickets.find((t) => t.estimate == null) ??
      null;
    room.activeTicketId = next ? next.id : room.activeTicketId;
    room.votes = {};
    room.revealed = false;
  }

  private pushSystemMessage(room: InternalRoom, text: string): void {
    room.chat.push({
      id: ++room.nextChatId,
      who: 'sys',
      text,
      system: true,
      ts: Date.now(),
    });
  }

  private emitUpdate(room: InternalRoom): RoomSnapshot {
    const snapshot = this.toSnapshot(room);
    this.updates.next({ roomCode: room.roomCode, snapshot });
    return snapshot;
  }

  private toSnapshot(room: InternalRoom): RoomSnapshot {
    const votedPlayerIds = Object.keys(room.votes);
    return {
      roomCode: room.roomCode,
      facilitatorId: room.facilitatorId,
      players: [...room.players.values()].map((player) => ({
        id: player.id,
        name: player.name,
        color: player.color,
        email: player.email,
        picture: player.picture,
        connected: player.connected,
      })),
      tickets: room.tickets,
      activeTicketId: room.activeTicketId,
      votes: room.revealed ? room.votes : {},
      votedPlayerIds,
      revealed: room.revealed,
      chat: room.chat,
      chatMuted: room.chatMuted,
      stats: room.revealed ? computeVoteStats(room.votes) : null,
    };
  }
}
