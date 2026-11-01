import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';
import Card from '../components/Card';
import MuscleMap from '../components/MuscleMap';
import ScoreRings, { COMPONENT_COLORS, ComponentRow } from '../components/ScoreRings';
import VolumeChart from '../components/VolumeChart';
import ProfileSheet from '../components/ProfileSheet';
import { colors, type } from '../theme';
import { LiftRow, RangeKey, summarise } from '../data/ranges';
import { WEIGHTS } from '../data/score';
import { useAppState } from '../state/AppState';
import { longDate, today } from '../data/dates';

const RANGE_LABELS: [RangeKey, string][] = [['day', 'Day'], ['week', 'Week'], ['month', 'Month'], ['year', 'Year']];
const CHANGE_COLOR: Record<LiftRow['status'], string> = { best: colors.green, gain: colors.green, matched: colors.ink2, slight: colors.orange, drop: colors.orange };

// Full-screen background lit from the top-right corner: a green glow in the corner, a wider
// soft indigo halo from the same point, over a dark base that fades diagonally to black.
// Fixed behind the scrolling cards.
function Background({ color }: { color: string }) {
  const { width, height } = useWindowDimensions();
  return (
    <Svg style={StyleSheet.absoluteFill} width={width} height={height} pointerEvents="none">
      <Defs>
        <LinearGradient id="base" x1="1" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#0d1017" />
          <Stop offset="0.45" stopColor="#07080b" />
          <Stop offset="1" stopColor="#040406" />
        </LinearGradient>
        <RadialGradient id="halo" cx="100%" cy="0%" rx="160%" ry="90%">
          <Stop offset="0" stopColor="#5e5ce6" stopOpacity={0.14} />
          <Stop offset="0.45" stopColor="#0a84ff" stopOpacity={0.05} />
          <Stop offset="1" stopColor="#000" stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id="light" cx="100%" cy="0%" rx="95%" ry="50%">
          <Stop offset="0" stopColor={color} stopOpacity={0.3} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect x={0} y={0} width={width} height={height} fill="url(#base)" />
      <Rect x={0} y={0} width={width} height={height} fill="url(#halo)" />
      <Rect x={0} y={0} width={width} height={height} fill="url(#light)" />
    </Svg>
  );
}

function Section({ color, title, value, children }: { color: string; title: string; value: number | null; children: React.ReactNode }) {
  return (
    <View style={st.bdSec}>
      <View style={st.bdHead}>
        <View style={[st.dot, { backgroundColor: color }]} />
        <Text style={st.bdTitle}>{title}</Text>
        <Text style={st.bdValue}>{value ?? '—'}</Text>
      </View>
      {children}
    </View>
  );
}

export default function DashboardScreen() {
  const { profile, saveProfile, profileSet, version, sample, setSample } = useAppState();
  const navigation = useNavigation<{ navigate: (tab: string) => void }>();
  const [range, setRange] = useState<RangeKey>('week');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const sum = useMemo(() => summarise(range, profile), [range, profile, version]);
  const sc = sum.score;
  const w = range === 'day' ? WEIGHTS.day : WEIGHTS.range;

  return (
    <SafeAreaView style={st.root} edges={['top']}>
      <Background color={colors.green} />
      <ScrollView contentContainerStyle={st.pad}>
        <View style={st.top}>
          <View>
            <Text style={type.date}>{longDate(today())}</Text>
            <Text style={type.largeTitle}>Summary</Text>
          </View>
          <Pressable style={st.avatar} onPress={() => setEditing(true)} accessibilityLabel="Edit profile">
            <Text style={st.avatarText}>{profile.name[0]}</Text>
          </Pressable>
        </View>

        {sample && (
          <View style={st.banner}>
            <Text style={st.bannerText}>Showing sample data with your workouts</Text>
            <Pressable onPress={() => setSample(false)} hitSlop={8}><Text style={st.link}>Turn off</Text></Pressable>
          </View>
        )}

        {sum.empty ? (
          <View style={st.stack}>
            <Card icon="ring" label="Workout Score" color={colors.green}>
              <Text style={st.welcome}>Welcome{profileSet ? `, ${profile.name}` : ''}</Text>
              <Text style={st.welcomeText}>Log your first workout and your score, muscle map and progress will build from there.</Text>
              <Pressable style={st.cta} onPress={() => navigation.navigate('Log')}><Text style={st.ctaText}>Log a Workout</Text></Pressable>
              <Pressable style={st.cta2} onPress={() => setSample(true)}><Text style={st.link}>Explore with Sample Data</Text></Pressable>
            </Card>
            <Card icon="body" label="Muscle Coverage" color={colors.coral} when="This week">
              <MuscleMap sets={sum.map.sets} brightness={1} mode="week" legend={['0', 'Target 10–20 sets this week', '20+']} attnLabel="" attn={[]} emptyNote="Muscles light up as you log sets." />
            </Card>
          </View>
        ) : (<>
        <View style={st.seg} accessibilityRole="tablist">
          {RANGE_LABELS.map(([k, l]) => (
            <Pressable key={k} onPress={() => setRange(k)} style={[st.segBtn, range === k && st.segOn]} accessibilityRole="tab" accessibilityState={{ selected: range === k }}>
              <Text style={st.segText}>{l}</Text>
            </Pressable>
          ))}
        </View>

        <View style={st.stack}>
          <Card icon="ring" label="Workout Score" color={colors.green} when={sum.when} style={{ paddingBottom: 0 }}>
            <Pressable onPress={() => setOpen((o) => !o)} accessibilityLabel="Show score breakdown" accessibilityState={{ expanded: open }}>
              <ScoreRings comps={sc.comps} overall={sc.overall} label={sc.label} />
            </Pressable>
            <Text style={[st.delta, sc.down && { color: colors.orange }]}>{sc.delta}</Text>
            <ComponentRow comps={sc.comps} />

            {open && (
              <View style={st.breakdown}>
                <Section color={COMPONENT_COLORS.overload} title="Progressive overload" value={sc.comps.overload}>
                  <Text style={st.bdNote}>{sc.overloadNote}</Text>
                  {sc.lifts.map((l) => (
                    <View key={l.name} style={st.lift}>
                      <Text style={st.liftName}>{l.name}</Text>
                      <Text style={st.liftVal}>{l.value}</Text>
                      <Text style={[st.liftChg, { color: CHANGE_COLOR[l.status] }]}>{l.change}</Text>
                    </View>
                  ))}
                  <Text style={st.bdFoot}>Estimated one-rep max vs your best in the previous 4 weeks. New exercises and deload weeks aren't counted.</Text>
                </Section>
                <Section color={COMPONENT_COLORS.consistency} title="Consistency" value={sc.comps.consistency}>
                  {sc.consistency.map((t) => <Text key={t} style={st.bullet}>•  {t}</Text>)}
                </Section>
                <Section color={COMPONENT_COLORS.longevity} title="Longevity" value={sc.comps.longevity}>
                  {sc.longevity.map((t) => <Text key={t} style={st.bullet}>•  {t}</Text>)}
                  <Text style={st.bdFoot}>Based on research linking strength training to healthier ageing. It isn't a medical measurement, and cardio isn't included yet.</Text>
                </Section>
                <Text style={st.weights}>Score = {w.o * 100}% overload + {w.c * 100}% consistency + {w.l * 100}% longevity</Text>
              </View>
            )}
            <Pressable style={st.toggle} onPress={() => setOpen((o) => !o)}>
              <Text style={st.toggleText}>{open ? 'Hide breakdown' : 'Show breakdown'}</Text>
            </Pressable>
          </Card>

          <Card icon="body" label="Muscle Coverage" color={colors.coral} when={sum.when}>
            <MuscleMap
              sets={sum.map.sets} brightness={sum.map.brightness}
              mode={range === 'day' ? 'day' : range === 'week' ? 'week' : 'avg'}
              legend={sum.map.legend} attnLabel={sum.map.attnLabel} attn={sum.map.attn}
            />
          </Card>

          <Card icon="log" label="Volume" color={colors.blue} when={sum.when}>
            {sum.volume ? (
              <>
                <Text style={type.value}>{sum.volume.total[0]}<Text style={type.unit}> {sum.volume.total[1]}</Text></Text>
                {!!sum.volume.sub && <Text style={type.sub}>{sum.volume.sub}</Text>}
                <VolumeChart {...sum.volume} />
              </>
            ) : <Text style={type.sub}>{sum.volumeEmpty}</Text>}
          </Card>
        </View>

        {sum.highlights.length > 0 && <Text style={type.section}>Highlights</Text>}
        <View style={st.stack}>
          {sum.highlights.map((h) => (
            <Card key={h.title} icon={h.icon} label={h.title} color={colors[h.color]}>
              <Text style={st.hl}>{h.text}</Text>
              {h.big && <Text style={[type.value, { marginTop: 8 }]}>{h.big[0]}<Text style={type.unit}> {h.big[1]}</Text></Text>}
            </Card>
          ))}
        </View>
        </>)}
      </ScrollView>

      <ProfileSheet
        visible={!profileSet || editing} firstRun={!profileSet} profile={profile}
        sample={sample} onSample={setSample}
        onSave={(p) => { saveProfile(p); setEditing(false); }} onClose={() => setEditing(false)}
      />
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  pad: { paddingHorizontal: 16, paddingBottom: 40 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: 20, paddingBottom: 14 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.card2, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.ink, fontWeight: '600', fontSize: 15 },
  seg: { flexDirection: 'row', backgroundColor: colors.glass, borderRadius: 9, padding: 2, marginBottom: 14 },
  segBtn: { flex: 1, paddingVertical: 6, borderRadius: 7, alignItems: 'center' },
  segOn: { backgroundColor: colors.ink3 },
  segText: { color: colors.ink, fontSize: 13, fontWeight: '600' },
  stack: { gap: 12 },
  delta: { textAlign: 'center', color: colors.green, fontSize: 14, fontWeight: '600', marginTop: 10 },
  breakdown: { marginHorizontal: -16, paddingHorizontal: 16, paddingBottom: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.sep },
  bdSec: { paddingTop: 14, gap: 4 },
  bdHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 9, height: 9, borderRadius: 5 },
  bdTitle: { flex: 1, color: colors.ink, fontSize: 15, fontWeight: '600' },
  bdValue: { color: colors.ink, fontSize: 17, fontWeight: '700' },
  bdNote: { color: colors.ink2, fontSize: 14 },
  lift: { flexDirection: 'row', alignItems: 'baseline', gap: 10, paddingVertical: 5 },
  liftName: { flex: 1, color: colors.ink, fontSize: 14 },
  liftVal: { color: colors.ink2, fontSize: 14, fontVariant: ['tabular-nums'] },
  liftChg: { width: 78, textAlign: 'right', fontSize: 14, fontWeight: '600', fontVariant: ['tabular-nums'] },
  bullet: { color: colors.ink2, fontSize: 14, lineHeight: 20 },
  bdFoot: { color: colors.ink3, fontSize: 12, lineHeight: 17, marginTop: 4 },
  weights: { color: colors.ink3, fontSize: 12, marginTop: 14, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.sep },
  toggle: { marginHorizontal: -16, paddingVertical: 11, alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.sep },
  toggleText: { color: colors.blue, fontSize: 15 },
  hl: { color: colors.ink, fontSize: 15, lineHeight: 21 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.glass, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9, marginBottom: 12 },
  bannerText: { flex: 1, color: colors.ink2, fontSize: 13 },
  link: { color: colors.blue, fontSize: 15 },
  welcome: { color: colors.ink, fontSize: 22, fontWeight: '700', marginTop: 4 },
  welcomeText: { color: colors.ink2, fontSize: 15, lineHeight: 21, marginTop: 6 },
  cta: { backgroundColor: colors.green, borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginTop: 16 },
  ctaText: { color: '#002a0c', fontWeight: '600', fontSize: 16 },
  cta2: { paddingTop: 14, alignItems: 'center' },
});
