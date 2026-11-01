import React, { useState } from 'react';
import { GestureResponderEvent, LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Stop, Text as SvgText } from 'react-native-svg';
import { colors } from '../theme';
import type { Point } from '../data/ranges';
import { fmtSets } from '../data/volume';

// Training volume over the range: a smooth line with a gradient fading down from it, the previous period
// as a dashed line, and a crosshair with a tooltip while you drag across it.
type Props = { cur: Point[]; prev?: Point[]; curName: string; prevName?: string; xMax: number; xTicks: [number, string][] };

const W = 340, H = 170, L = 38, R = 12, T = 12, B = 24;

/** Monotone cubic interpolation (no overshoot), as an SVG path through the points. */
function monotonePath(pts: [number, number][]) {
  if (pts.length < 2) return pts.length ? `M${pts[0][0]} ${pts[0][1]}` : '';
  const n = pts.length, dx: number[] = [], m: number[] = [], t: number[] = [];
  for (let i = 0; i < n - 1; i++) { dx[i] = pts[i + 1][0] - pts[i][0]; m[i] = (pts[i + 1][1] - pts[i][1]) / dx[i]; }
  t[0] = m[0]; t[n - 1] = m[n - 2];
  for (let i = 1; i < n - 1; i++) t[i] = m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) { t[i] = t[i + 1] = 0; continue; }
    const a = t[i] / m[i], b = t[i + 1] / m[i], h = a * a + b * b;
    if (h > 9) { const k = 3 / Math.sqrt(h); t[i] = k * a * m[i]; t[i + 1] = k * b * m[i]; }
  }
  const f = (v: number) => v.toFixed(1);
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < n - 1; i++) {
    d += ` C${f(pts[i][0] + dx[i] / 3)} ${f(pts[i][1] + (t[i] * dx[i]) / 3)} ${f(pts[i + 1][0] - dx[i] / 3)} ${f(pts[i + 1][1] - (t[i + 1] * dx[i]) / 3)} ${f(pts[i + 1][0])} ${f(pts[i + 1][1])}`;
  }
  return d;
}
const niceMax = (v: number) => { const p = 10 ** Math.floor(Math.log10(Math.max(v, 1))), f = v / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p; };
const axisLabel = (v: number) => (v >= 1000 ? `${fmtSets(v / 1000)}t` : String(Math.round(v)));

export default function VolumeChart({ cur, prev, curName, prevName, xMax: xMaxIn, xTicks }: Props) {
  const [width, setWidth] = useState(0);
  const [hover, setHover] = useState<Point | null>(null);
  const xMax = Math.max(xMaxIn, 1);
  const yMax = niceMax(Math.max(...cur.map((p) => p.y), ...(prev ?? []).map((p) => p.y), 1) * 1.05);
  const X = (x: number) => L + (x / xMax) * (W - L - R);
  const Y = (y: number) => T + (1 - y / yMax) * (H - T - B);
  const cp = cur.map((p): [number, number] => [X(p.x), Y(p.y)]);
  const line = monotonePath(cp);
  const end = cp[cp.length - 1];
  const scale = width / W;

  const track = (e: GestureResponderEvent) => {
    if (!width) return;
    const sx = e.nativeEvent.locationX / scale;
    setHover(cur.reduce((best, q) => (Math.abs(X(q.x) - sx) < Math.abs(X(best.x) - sx) ? q : best), cur[0]));
  };
  const [tipA, tipB] = hover ? hover.tip.split('\n') : ['', ''];

  return (
    <View>
      <View style={st.legend}>
        <View style={st.legendItem}><View style={st.lgCur} /><Text style={st.legendText}>{curName}</Text></View>
        {prev && <View style={st.legendItem}><View style={st.lgPrev} /><Text style={st.legendText}>{prevName}</Text></View>}
      </View>
      <View
        style={st.chart} onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => true} onMoveShouldSetResponder={() => true}
        onResponderGrant={track} onResponderMove={track} onResponderRelease={() => setHover(null)} onResponderTerminate={() => setHover(null)}
        accessibilityLabel="Training volume chart"
      >
        {width > 0 && (
          <Svg width={width} height={H * scale} viewBox={`0 0 ${W} ${H}`}>
            <Defs>
              <LinearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={colors.blue} stopOpacity={0.5} />
                <Stop offset="1" stopColor={colors.blue} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            {[0, 0.5, 1].map((f) => (
              <G key={f}>
                <Line x1={L} x2={W - R} y1={Y(yMax * f)} y2={Y(yMax * f)} stroke={colors.card2} strokeWidth={1} />
                <SvgText x={L - 6} y={Y(yMax * f) + 3.5} fill={colors.ink3} fontSize={10.5} textAnchor="end">{axisLabel(yMax * f)}</SvgText>
              </G>
            ))}
            {xTicks.map(([x, l]) => (
              <SvgText key={`${x}-${l}`} x={X(x)} y={H - 6} fill={colors.ink3} fontSize={10.5} textAnchor={x === 0 ? 'start' : x === xMax ? 'end' : 'middle'}>{l}</SvgText>
            ))}
            {prev && <Path d={monotonePath(prev.map((p) => [X(p.x), Y(p.y)]))} fill="none" stroke="#8e8e93" strokeWidth={1.5} strokeDasharray="4 4" opacity={0.7} />}
            <Path d={`${line} L${end[0].toFixed(1)} ${Y(0)} L${cp[0][0].toFixed(1)} ${Y(0)} Z`} fill="url(#volGrad)" />
            <Path d={line} fill="none" stroke={colors.blue} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
            <Circle cx={end[0]} cy={end[1]} r={4.5} fill={colors.blue} stroke={colors.card} strokeWidth={2.5} />
            {hover && (
              <G>
                <Line x1={X(hover.x)} x2={X(hover.x)} y1={T} y2={H - B} stroke="#8e8e93" strokeWidth={1} strokeDasharray="2 3" />
                <Circle cx={X(hover.x)} cy={Y(hover.y)} r={4.5} fill="#fff" stroke={colors.blue} strokeWidth={2.5} />
              </G>
            )}
          </Svg>
        )}
        {hover && width > 0 && (
          <View pointerEvents="none" style={[st.tip, {
            left: Math.max(4, Math.min(width - 144, X(hover.x) * scale - 70)), top: Math.max(0, Y(hover.y) * scale - 52),
          }]}>
            <Text style={st.tipA} numberOfLines={1}>{tipA}</Text>
            {!!tipB && <Text style={st.tipB} numberOfLines={1}>{tipB}</Text>}
          </View>
        )}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  legend: { flexDirection: 'row', gap: 14, marginTop: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendText: { color: colors.ink2, fontSize: 12 },
  lgCur: { width: 14, height: 3, borderRadius: 2, backgroundColor: colors.blue },
  lgPrev: { width: 14, height: 0, borderTopWidth: 2, borderStyle: 'dashed', borderColor: '#8e8e93' },
  chart: { marginTop: 6 },
  tip: { position: 'absolute', width: 140, backgroundColor: 'rgba(58,58,60,0.97)', borderRadius: 9, paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center' },
  tipA: { color: colors.ink2, fontSize: 12 },
  tipB: { color: colors.ink, fontSize: 14, fontWeight: '700' },
});
