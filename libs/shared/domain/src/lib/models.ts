export type TicketType = 'story' | 'bug' | 'task';
export type Priority = 'High' | 'Med' | 'Low';
export type Role = 'facilitator' | 'participant';
export type VoteValue = number | '?';

export const FIBONACCI_DECK: VoteValue[] = [1, 2, 3, 5, 8, 13, 21, '?'];

/** Where a ticket originated. 'jira' tickets were imported live via the Jira REST API
 * and carry a real Jira issue key, so their story points can be synced back to Jira. */
export type TicketSource = 'jira';

export interface Ticket {
  id: string;
  key: string;
  type: TicketType;
  title: string;
  desc: string;
  priority: Priority;
  estimate: number | null;
  source?: TicketSource;
}

export interface Player {
  id: string;
  name: string;
  color: string;
  email?: string;
  picture?: string;
  connected: boolean;
}

export interface ChatMessage {
  id: number;
  who: string;
  text: string;
  system: boolean;
  ts: number;
}

export interface VoteStats {
  avg: string;
  spread: string;
  consensusLabel: string;
  consensusText: string;
  consensusLevel: 'none' | 'consensus' | 'close' | 'discuss';
}

export interface RoomSnapshot {
  roomCode: string;
  facilitatorId: string | null;
  players: Player[];
  tickets: Ticket[];
  activeTicketId: string | null;
  votes: Record<string, VoteValue>;
  votedPlayerIds: string[];
  revealed: boolean;
  chat: ChatMessage[];
  chatMuted: boolean;
  stats: VoteStats | null;
}
