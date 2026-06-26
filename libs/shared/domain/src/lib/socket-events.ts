import { Priority, RoomSnapshot, Ticket, TicketType, VoteValue } from './models';

export const SOCKET_EVENTS = {
  join: 'room:join',
  vote: 'room:vote',
  reveal: 'room:reveal',
  reset: 'room:reset',
  skip: 'room:skip',
  selectTicket: 'room:selectTicket',
  reorderTickets: 'room:reorderTickets',
  assignEstimate: 'room:assignEstimate',
  setEstimate: 'room:setEstimate',
  sendChat: 'room:sendChat',
  toggleMute: 'room:toggleMute',
  makeFacilitator: 'room:makeFacilitator',
  claimFacilitator: 'room:claimFacilitator',
  importTickets: 'room:importTickets',
  addTicket: 'room:addTicket',
  deleteTicket: 'room:deleteTicket',
  state: 'room:state',
  joined: 'room:joined',
  error: 'room:error',
} as const;

export interface JoinPayload {
  roomCode: string;
  clientId: string;
  name: string;
  email?: string;
  picture?: string;
}

export interface VotePayload {
  value: VoteValue;
}

export interface SelectTicketPayload {
  ticketId: string;
}

export interface ReorderTicketsPayload {
  ticketIds: string[];
}

export interface AssignEstimatePayload {
  value: number;
}

export interface SetEstimatePayload {
  ticketId: string;
  value: number | null;
}

export interface SendChatPayload {
  text: string;
}

export interface MakeFacilitatorPayload {
  playerId: string;
}

export interface JoinedPayload {
  playerId: string;
}

export interface ErrorPayload {
  message: string;
}

export interface ImportTicketsPayload {
  tickets: Ticket[];
}

export interface AddTicketPayload {
  title: string;
  type: TicketType;
  priority: Priority;
  desc: string;
}

export interface DeleteTicketPayload {
  ticketId: string;
}

export interface ImportTicketsResult {
  roomCode: string;
  tickets: Ticket[];
}

export type RoomState = RoomSnapshot;
