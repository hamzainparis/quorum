import { Priority, TicketType, VoteStats } from '@quorum/shared-domain';

export const TICKET_TYPE_META: Record<TicketType, { color: string; icon: string }> = {
  story: { color: 'var(--qrm-type-story)', icon: 'S' },
  bug: { color: 'var(--qrm-type-bug)', icon: 'B' },
  task: { color: 'var(--qrm-type-task)', icon: 'T' },
};

export const TICKET_PRIORITY_META: Record<Priority, { color: string; background: string }> = {
  High: { color: 'var(--qrm-danger)', background: 'var(--qrm-danger-bg)' },
  Med: { color: 'var(--qrm-warning)', background: 'var(--qrm-warning-bg)' },
  Low: { color: 'var(--qrm-low)', background: 'var(--qrm-success-bg)' },
};

export const CONSENSUS_META: Record<VoteStats['consensusLevel'], { color: string; background: string; border: string }> = {
  none: { color: 'var(--qrm-text-8)', background: 'var(--qrm-surface)', border: 'var(--qrm-border-3)' },
  consensus: { color: 'var(--qrm-success)', background: 'var(--qrm-success-bg)', border: 'var(--qrm-success-border)' },
  close: { color: 'var(--qrm-warning)', background: 'var(--qrm-warning-bg)', border: 'var(--qrm-warning-border)' },
  discuss: { color: 'var(--qrm-danger)', background: 'var(--qrm-danger-bg)', border: 'var(--qrm-danger-border)' },
};
