// FitForge design tokens: clean dark theme in the spirit of Apple Health.
export const colors = {
  bg: '#000000',
  card: '#1c1c1e',
  card2: '#2c2c2e',
  sep: '#38383a',
  ink: '#ffffff',
  ink2: '#8e8e93',
  ink3: '#636366',
  green: '#30d158',
  blue: '#0a84ff',
  orange: '#ff9f0a',
  coral: '#ff6a55',
  red: '#ff453a',
  silhouette: '#0b0b0c',
  glass: 'rgba(28,28,30,0.78)', // translucent card over the background glow
};


// Muscle heat: brightness scales smoothly from 0 to 20+ weekly sets.
export const HEAT_ZERO = '#3a3a3c';
const HEAT_STOPS: [number, [number, number, number]][] = [[0, [88, 26, 30]], [0.5, [191, 44, 43]], [1, [255, 108, 90]]]; // original coral scale with a touch more red

export function heatColor(sets: number): string {
  if (!sets || sets <= 0) return HEAT_ZERO;
  const t = Math.min(sets / 20, 1);
  const i = t <= 0.5 ? 0 : 1;
  const [t0, a] = HEAT_STOPS[i];
  const [t1, b] = HEAT_STOPS[i + 1];
  const f = (t - t0) / (t1 - t0);
  return `rgb(${a.map((c, j) => Math.round(c + (b[j] - c) * f)).join(',')})`;
}

export const type = {
  largeTitle: { fontSize: 34, fontWeight: '700' as const, letterSpacing: -0.5, color: colors.ink },
  date: { fontSize: 13, fontWeight: '600' as const, color: colors.ink2, textTransform: 'uppercase' as const },
  section: { fontSize: 20, fontWeight: '700' as const, color: colors.ink, marginTop: 26, marginBottom: 10 },
  value: { fontSize: 34, fontWeight: '700' as const, color: colors.ink, fontVariant: ['tabular-nums' as const] },
  unit: { fontSize: 15, fontWeight: '600' as const, color: colors.ink2 },
  body: { fontSize: 15, color: colors.ink },
  sub: { fontSize: 14, color: colors.ink2 },
};
