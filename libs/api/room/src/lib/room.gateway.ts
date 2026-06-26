import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import {
  AssignEstimatePayload,
  AddTicketPayload,
  DeleteTicketPayload,
  ErrorPayload,
  ImportTicketsPayload,
  JoinPayload,
  MakeFacilitatorPayload,
  ReorderTicketsPayload,
  SelectTicketPayload,
  SendChatPayload,
  SetEstimatePayload,
  SOCKET_EVENTS,
  VotePayload,
} from '@quorum/shared-domain';
import { RoomStateService } from './room-state.service';
import { RoomError } from './room-errors';

interface SocketData {
  roomCode: string;
  playerId: string;
}

@WebSocketGateway({ cors: { origin: true } })
export class RoomGateway implements OnGatewayInit, OnGatewayDisconnect {
  private readonly logger = new Logger(RoomGateway.name);

  @WebSocketServer()
  private server!: Server;

  constructor(private readonly roomState: RoomStateService) {}

  afterInit(): void {
    this.roomState.updates$.subscribe(({ roomCode, snapshot }) => {
      this.server.to(roomCode).emit(SOCKET_EVENTS.state, snapshot);
    });
  }

  handleDisconnect(client: Socket): void {
    this.roomState.leaveBySocket(client.id);
  }

  @SubscribeMessage(SOCKET_EVENTS.join)
  handleJoin(@ConnectedSocket() client: Socket, @MessageBody() payload: JoinPayload): void {
    if (!payload?.roomCode || !payload?.clientId || !payload?.name) {
      this.sendError(client, 'roomCode, clientId and name are required to join');
      return;
    }
    client.data = { roomCode: payload.roomCode, playerId: payload.clientId } as SocketData;
    client.join(payload.roomCode);
    this.roomState.join(payload, client.id);
    client.emit(SOCKET_EVENTS.joined, { playerId: payload.clientId });
  }

  @SubscribeMessage(SOCKET_EVENTS.vote)
  handleVote(@ConnectedSocket() client: Socket, @MessageBody() payload: VotePayload): void {
    this.withContext(client, ({ roomCode, playerId }) =>
      this.roomState.vote(roomCode, playerId, payload.value)
    );
  }

  @SubscribeMessage(SOCKET_EVENTS.reveal)
  handleReveal(@ConnectedSocket() client: Socket): void {
    this.withContext(client, ({ roomCode, playerId }) => this.roomState.reveal(roomCode, playerId));
  }

  @SubscribeMessage(SOCKET_EVENTS.reset)
  handleReset(@ConnectedSocket() client: Socket): void {
    this.withContext(client, ({ roomCode, playerId }) => this.roomState.reset(roomCode, playerId));
  }

  @SubscribeMessage(SOCKET_EVENTS.skip)
  handleSkip(@ConnectedSocket() client: Socket): void {
    this.withContext(client, ({ roomCode, playerId }) => this.roomState.skip(roomCode, playerId));
  }

  @SubscribeMessage(SOCKET_EVENTS.selectTicket)
  handleSelectTicket(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: SelectTicketPayload
  ): void {
    this.withContext(client, ({ roomCode, playerId }) =>
      this.roomState.selectTicket(roomCode, playerId, payload.ticketId)
    );
  }

  @SubscribeMessage(SOCKET_EVENTS.reorderTickets)
  handleReorderTickets(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: ReorderTicketsPayload
  ): void {
    this.withContext(client, ({ roomCode, playerId }) =>
      this.roomState.reorderTickets(roomCode, playerId, payload.ticketIds)
    );
  }

  @SubscribeMessage(SOCKET_EVENTS.assignEstimate)
  handleAssignEstimate(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: AssignEstimatePayload
  ): void {
    this.withContext(client, ({ roomCode, playerId }) =>
      this.roomState.assignEstimate(roomCode, playerId, payload.value)
    );
  }

  @SubscribeMessage(SOCKET_EVENTS.setEstimate)
  handleSetEstimate(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: SetEstimatePayload
  ): void {
    this.withContext(client, ({ roomCode, playerId }) =>
      this.roomState.setEstimate(roomCode, playerId, payload.ticketId, payload.value)
    );
  }

  @SubscribeMessage(SOCKET_EVENTS.sendChat)
  handleSendChat(@ConnectedSocket() client: Socket, @MessageBody() payload: SendChatPayload): void {
    this.withContext(client, ({ roomCode, playerId }) =>
      this.roomState.sendChat(roomCode, playerId, payload.text)
    );
  }

  @SubscribeMessage(SOCKET_EVENTS.toggleMute)
  handleToggleMute(@ConnectedSocket() client: Socket): void {
    this.withContext(client, ({ roomCode, playerId }) =>
      this.roomState.toggleMute(roomCode, playerId)
    );
  }

  @SubscribeMessage(SOCKET_EVENTS.makeFacilitator)
  handleMakeFacilitator(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: MakeFacilitatorPayload
  ): void {
    this.withContext(client, ({ roomCode, playerId }) =>
      this.roomState.makeFacilitator(roomCode, playerId, payload.playerId)
    );
  }

  @SubscribeMessage(SOCKET_EVENTS.claimFacilitator)
  handleClaimFacilitator(@ConnectedSocket() client: Socket): void {
    this.withContext(client, ({ roomCode, playerId }) =>
      this.roomState.claimFacilitator(roomCode, playerId)
    );
  }

  @SubscribeMessage(SOCKET_EVENTS.importTickets)
  handleImportTickets(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: ImportTicketsPayload
  ): void {
    this.withContext(client, ({ roomCode, playerId }) =>
      this.roomState.socketImportTickets(roomCode, playerId, payload?.tickets ?? [])
    );
  }

  @SubscribeMessage(SOCKET_EVENTS.addTicket)
  handleAddTicket(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: AddTicketPayload
  ): void {
    this.withContext(client, ({ roomCode, playerId }) =>
      this.roomState.addTicket(roomCode, playerId, payload)
    );
  }

  @SubscribeMessage(SOCKET_EVENTS.deleteTicket)
  handleDeleteTicket(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: DeleteTicketPayload
  ): void {
    this.withContext(client, ({ roomCode, playerId }) =>
      this.roomState.deleteTicket(roomCode, playerId, payload.ticketId)
    );
  }

  private withContext(client: Socket, fn: (ctx: SocketData) => void): void {
    const ctx = client.data as SocketData | undefined;
    if (!ctx?.roomCode || !ctx?.playerId) {
      this.sendError(client, 'Join a room before sending that event');
      return;
    }
    try {
      fn(ctx);
    } catch (err) {
      if (err instanceof RoomError) {
        this.sendError(client, err.message);
      } else {
        this.logger.error(err);
        this.sendError(client, 'Something went wrong');
      }
    }
  }

  private sendError(client: Socket, message: string): void {
    const payload: ErrorPayload = { message };
    client.emit(SOCKET_EVENTS.error, payload);
  }
}
