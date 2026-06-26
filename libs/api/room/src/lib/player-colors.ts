export const PLAYER_COLORS = [
  '#6D5EF6',
  '#FF6B57',
  '#38B6A0',
  '#F2A03D',
  '#E45C9A',
  '#3D8BF2',
];

export function colorForIndex(index: number): string {
  return PLAYER_COLORS[index % PLAYER_COLORS.length];
}
