import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, G, LinearGradient, Path, Stop } from 'react-native-svg';
import { colors, heatColor, HEAT_ZERO, type } from '../theme';
import { BODIES, Figure as FigureData } from '../data/bodies';
import { useAppState } from '../state/AppState';
import { GROUPS, GroupKey } from '../data/muscleModel';
import { GroupSets, fmtSets } from '../data/volume';
import { lastTrainedText } from '../data/ranges';

type Props = {
  sets: GroupSets;             // sets per muscle for the range (per week, or today)
  brightness: number;          // multiplier onto the 0–20 colour ramp (today: 8 sets = full)
  mode: 'day' | 'week' | 'avg';
  legend: [string, string, string];
  attnLabel: string;
  attn: GroupKey[];
  emptyNote?: string;          // shown instead of the attention list when it's empty
};

const EDGE = colors.silhouette;
// Stroke widths in the body art's units (figures are about 1300 units tall)
const OUTLINE = 26, SEPARATOR = 4, SELECTED = 5.5;

function Figure({ id, fig, sets, brightness, selected, onSelect }: {
  id: string; fig: FigureData; sets: GroupSets; brightness: number; selected: GroupKey; onSelect: (k: GroupKey) => void;
}) {
  return (
    <Svg viewBox={fig.viewBox} width="100%" height={300}>
      <Defs>
        {/* soft highlight at the top of each muscle only, so the heat colour stays true */}
        <LinearGradient id={`${id}-shade`} x1="0" y1="0" x2="0.25" y2="1">
          <Stop offset="0" stopColor="#fff" stopOpacity={0.115} />
          <Stop offset="0.33" stopColor="#fff" stopOpacity={0} />
          <Stop offset="1" stopColor="#fff" stopOpacity={0} />
        </LinearGradient>
      </Defs>

      {/* bold outline around the whole body (the anime look); head, hair, hands, knees and feet stay solid */}
      {[...fig.body, ...fig.muscles.map(([, d]) => d)].map((d, i) => (
        <Path key={`o${i}`} d={d} fill={EDGE} stroke={EDGE} strokeWidth={OUTLINE} strokeLinejoin="round" />
      ))}

      {/* muscles: heat colour, then the shading layer (in the same group, so it never blocks a tap) */}
      {fig.muscles.map(([k, d], i) => {
        const on = k === selected;
        return (
          <G key={i} opacity={on ? 1 : 0.8} onPress={() => onSelect(k)}>
            <Path d={d} fill={heatColor(sets[k] * brightness)} stroke={on ? '#ffffff' : EDGE} strokeWidth={on ? SELECTED : SEPARATOR} strokeLinejoin="round" />
            <Path d={d} fill={`url(#${id}-shade)`} />
          </G>
        );
      })}
    </Svg>
  );
}

export default function MuscleMap({ sets, brightness, mode, legend, attnLabel, attn, emptyNote }: Props) {
  const [selected, setSelected] = useState<GroupKey>('chest');
  const body = BODIES[useAppState().profile.sex];
  const s = sets[selected];
  const status = mode === 'day'
    ? (s ? { t: 'Trained', c: colors.green } : null)
    : s < 10 ? { t: 'Below target', c: colors.orange } : s <= 20 ? { t: 'On target', c: colors.green } : { t: 'Above target', c: colors.blue };
  const subline = mode === 'day'
    ? (s ? `${fmtSets(s)} sets today` : `Not trained today · ${lastTrainedText(selected)}`)
    : `${fmtSets(s)} sets ${mode === 'week' ? 'this week' : 'per week'} · ${lastTrainedText(selected)}`;

  return (
    <View>
      <View style={st.row}>
        <View style={st.fig}><Figure id="front" fig={body.front} sets={sets} brightness={brightness} selected={selected} onSelect={setSelected} /></View>
        <View style={st.fig}><Figure id="back" fig={body.back} sets={sets} brightness={brightness} selected={selected} onSelect={setSelected} /></View>
      </View>

      <View style={st.pick}>
        <View style={{ flex: 1 }}>
          <Text style={st.pickName}>{GROUPS[selected]}</Text>
          <Text style={type.sub}>{subline}</Text>
        </View>
        {status && <Text style={[st.status, { color: status.c }]}>{status.t}</Text>}
      </View>

      <View style={st.legend}>
        <View style={[st.legendSeg, { flex: 1, backgroundColor: HEAT_ZERO }]} />
        {Array.from({ length: 20 }, (_, i) => <View key={i} style={[st.legendSeg, { flex: 1.2, backgroundColor: heatColor(i + 1) }]} />)}
      </View>
      <View style={st.legendLabels}>
        {legend.map((l) => <Text key={l} style={st.legendText}>{l}</Text>)}
      </View>

      <View style={st.attn}>
        {attn.length ? (
          <Text style={type.sub}>
            {attnLabel}:{' '}
            {attn.map((g, i) => (
              <Text key={g} style={{ color: colors.ink, fontWeight: '600' }} onPress={() => setSelected(g)}>
                {GROUPS[g]}{i < attn.length - 1 ? ', ' : ''}
              </Text>
            ))}
          </Text>
        ) : <Text style={type.sub}>{emptyNote ?? (mode === 'day' ? 'Rest day.' : 'Every muscle group is on target.')}</Text>}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6, marginTop: 8 },
  fig: { flex: 1 },
  pick: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 14, gap: 12 },
  pickName: { color: colors.ink, fontSize: 17, fontWeight: '600' },
  status: { fontSize: 14, fontWeight: '600' },
  legend: { flexDirection: 'row', height: 6, borderRadius: 3, overflow: 'hidden', marginTop: 14 },
  legendSeg: { height: 6 },
  legendLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  legendText: { color: colors.ink3, fontSize: 12 },
  attn: { marginTop: 14, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.sep },
});
