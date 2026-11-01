import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors } from '../theme';
import type { Components } from '../data/score';

// The workout score as three nested rings (overload outside, consistency, longevity inside), with the
// overall score in the middle, Apple Activity style.
export const COMPONENT_COLORS = { overload: '#30d158', consistency: '#64d2ff', longevity: '#bf5af2' } as const;
const RINGS: [keyof Components, number][] = [['overload', 90], ['consistency', 71], ['longevity', 52]];
const LABELS: Record<keyof Components, string> = { overload: 'Overload', consistency: 'Consistency', longevity: 'Longevity' };
const STROKE = 15;

export default function ScoreRings({ comps, overall, label, size = 200 }: { comps: Components; overall: number; label: string; size?: number }) {
  return (
    <View style={[st.wrap, { width: size, height: size }]} accessible accessibilityLabel={`${label} ${overall}`}>
      <Svg width={size} height={size} viewBox="0 0 200 200" style={{ transform: [{ rotate: '-90deg' }] }}>
        {RINGS.map(([k, r]) => {
          const c = 2 * Math.PI * r, v = Math.max(0, Math.min(100, comps[k] ?? 0));
          return (
            <React.Fragment key={k}>
              <Circle cx={100} cy={100} r={r} fill="none" stroke={COMPONENT_COLORS[k]} strokeOpacity={0.18} strokeWidth={STROKE} />
              {v > 0 && (
                <Circle cx={100} cy={100} r={r} fill="none" stroke={COMPONENT_COLORS[k]} strokeWidth={STROKE}
                  strokeLinecap="round" strokeDasharray={`${(c * v) / 100} ${c}`} />
              )}
            </React.Fragment>
          );
        })}
      </Svg>
      <View style={st.center} pointerEvents="none">
        <Text style={[st.num, { fontSize: size * 0.2 }]}>{overall}</Text>
        <Text style={[st.label, { fontSize: Math.max(9, size * 0.05) }]}>{label.toUpperCase()}</Text>
      </View>
    </View>
  );
}

/** The three components as a row under the rings: coloured dot, value, name. */
export function ComponentRow({ comps }: { comps: Components }) {
  return (
    <View style={st.row}>
      {RINGS.map(([k], i) => (
        <View key={k} style={[st.comp, i > 0 && st.compSep]}>
          <View style={[st.dot, { backgroundColor: COMPONENT_COLORS[k] }]} />
          <View>
            <Text style={st.compV}>{comps[k] ?? '—'}</Text>
            <Text style={st.compL}>{LABELS[k]}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { alignSelf: 'center', marginTop: 6 },
  center: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  num: { color: colors.ink, fontWeight: '700', fontVariant: ['tabular-nums'] },
  label: { color: colors.ink2, fontWeight: '600', letterSpacing: 0.8, marginTop: 2 },
  row: { flexDirection: 'row', marginTop: 14, marginHorizontal: -16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.sep },
  comp: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-start', gap: 8, paddingTop: 12, paddingBottom: 10 },
  compSep: { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: colors.sep },
  dot: { width: 9, height: 9, borderRadius: 5, marginTop: 7 },
  compV: { color: colors.ink, fontSize: 20, fontWeight: '700', fontVariant: ['tabular-nums'] },
  compL: { color: colors.ink2, fontSize: 12 },
});
