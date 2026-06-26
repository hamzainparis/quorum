import { VoteStats, VoteValue } from './models';

export function computeVoteStats(votes: Record<string, VoteValue>): VoteStats | null {
  const numeric = Object.values(votes).filter((v): v is number => typeof v === 'number');
  if (!numeric.length) return null;

  const avg = numeric.reduce((a, b) => a + b, 0) / numeric.length;
  const hi = Math.max(...numeric);
  const lo = Math.min(...numeric);
  const spread = hi - lo;
  const uniq = [...new Set(numeric)];

  if (uniq.length === 1) {
    return {
      avg: (Math.round(avg * 10) / 10).toString(),
      spread: spread.toString(),
      consensusLevel: 'consensus',
      consensusLabel: 'CONSENSUS \u{1F389}',
      consensusText: `Everyone agrees on ${uniq[0]}`,
    };
  }
  if (spread <= 2) {
    return {
      avg: (Math.round(avg * 10) / 10).toString(),
      spread: spread.toString(),
      consensusLevel: 'close',
      consensusLabel: 'CLOSE',
      consensusText: 'Nearly aligned',
    };
  }
  return {
    avg: (Math.round(avg * 10) / 10).toString(),
    spread: spread.toString(),
    consensusLevel: 'discuss',
    consensusLabel: 'DISCUSS',
    consensusText: 'Wide spread — talk it out',
  };
}

export function suggestedEstimate(votes: Record<string, VoteValue>): number | null {
  const numeric = Object.values(votes).filter((v): v is number => typeof v === 'number');
  if (!numeric.length) return null;
  const freq = new Map<number, number>();
  numeric.forEach((v) => freq.set(v, (freq.get(v) ?? 0) + 1));
  return [...freq.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0][0];
}
