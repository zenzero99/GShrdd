import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '../components/Icon';
import Card from '../components/Card';
import ExercisePicker from '../components/ExercisePicker';
import { colors, heatColor, type } from '../theme';
import { EQUIPMENT, EXERCISE_BY_NAME } from '../data/exercises';
import { GROUPS, GroupKey } from '../data/muscleModel';
import {
  LoggedSession, WorkoutRecord, bestE1rm, getRecord, history, isBodyweight, lastSets, newId, sessionSets, weeklyGroupSets,
} from '../data/history';
import { TopSet, e1rm, scoreSession } from '../data/score';
import ScoreRings, { ComponentRow } from '../components/ScoreRings';
import { useAppState } from '../state/AppState';
import { loadDraft, saveDraft } from '../state/storage';
import { fmtSets, groupOf, tallyGroups } from '../data/volume';
import { dateKey, fromKey, longDate, relativeDay, today } from '../data/dates';

// A set being logged. prevKg/prevReps come from the last time this exercise was done.
type SetEntry = { kg: string; reps: string; done: boolean; prevKg?: number; prevReps?: number; pr?: boolean };
type DraftExercise = { name: string; sets: SetEntry[] };
// A workout on screen: a new one in progress, or a saved one being edited (editId set).
type Draft = { name: string; startedAt: number; exercises: DraftExercise[]; editId?: string; date?: string; mins?: number };
type PRToast = { name: string; text: string };

const REST_SECONDS = 90;
const RECENT = 5;

const TEMPLATES: [string, string[]][] = [
  ['Push', ['Barbell Bench Press', 'Incline Dumbbell Press', 'Seated Dumbbell Shoulder Press', 'Dumbbell Lateral Raise', 'Rope Pushdown']],
  ['Pull', ['Pull-Up', 'Barbell Bent-Over Row', 'Seated Cable Row', 'Face Pull', 'EZ-Bar Curl']],
  ['Legs', ['Barbell Back Squat', 'Romanian Deadlift', '45° Leg Press', 'Lying Leg Curl', 'Standing Calf Raise Machine']],
  ['Upper', ['Barbell Bench Press', 'Lat Pulldown', 'Machine Shoulder Press', 'Chest-Supported Dumbbell Row', 'Hammer Curl', 'Overhead Cable Extension']],
];

/** A new exercise card, with last time's sets as the "Previous" column and placeholders. */
function makeExercise(name: string, skipId?: string): DraftExercise {
  const prev = lastSets(name, skipId);
  return {
    name,
    sets: Array.from({ length: Math.max(3, prev.length) }, (_, i) => {
      const p = prev[i] ?? prev[prev.length - 1];
      return { kg: '', reps: '', done: false, prevKg: p?.kg, prevReps: p?.reps };
    }),
  };
}

/** A saved workout, opened for editing: every set is shown as completed. */
function draftFrom(r: WorkoutRecord): Draft {
  return {
    name: r.name, startedAt: r.startedAt, editId: r.id, date: r.date, mins: r.mins,
    exercises: r.exercises.map((x) => {
      const prev = lastSets(x.name, r.id);
      return { name: x.name, sets: x.sets.map((s, i) => ({ kg: String(s.kg), reps: String(s.reps), done: true, prevKg: prev[i]?.kg, prevReps: prev[i]?.reps })) };
    }),
  };
}

const num = (v: string, fallback?: number) => { const n = v !== '' ? Number(v) : fallback ?? 0; return Number.isFinite(n) ? n : 0; };
const setValues = (s: SetEntry): TopSet => ({ kg: num(s.kg, s.prevKg), reps: Math.round(num(s.reps, s.prevReps)) });
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;
const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

/** Flag the one completed set per exercise that beats the all-time best (if any). Run after every change,
 *  so the trophy follows edits and undos. */
function markPRs(d: Draft, bw: number) {
  d.exercises.forEach((x) => {
    const allTime = bestE1rm(x.name, bw, d.editId);
    let top = -1, topE = 0;
    x.sets.forEach((s, i) => { s.pr = false; if (s.done) { const e = e1rm(x.name, setValues(s), bw); if (setValues(s).reps > 0 && e > topE) { topE = e; top = i; } } });
    if (allTime > 0 && top >= 0 && topE > allTime + 0.05) x.sets[top].pr = true;
  });
}

export default function LogScreen() {
  const { profile, saveWorkout, deleteWorkout, version } = useAppState();
  const bw = profile.bodyweight;
  const weekSets = useMemo(() => weeklyGroupSets(), [version]);
  const recent = useMemo(() => [...history].reverse(), [version]);
  const [showAll, setShowAll] = useState(false);
  const [session, setSession] = useState<Draft | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [restEnd, setRestEnd] = useState<number | null>(null);
  const [toast, setToast] = useState<PRToast | null>(null);
  const [armed, setArmed] = useState<'discard' | 'delete' | null>(null);
  const armTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const restored = useRef(false);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const editing = !!session?.editId;

  // Restore a workout that was in progress when the app closed, then keep the draft saved.
  useEffect(() => {
    loadDraft<Draft>().then((d) => {
      if (d && !d.editId && Array.isArray(d.exercises)) setSession((cur) => cur ?? d);
      restored.current = true; setDraftLoaded(true);
    });
  }, []);
  useEffect(() => { if (restored.current) saveDraft(session && !session.editId ? session : null); }, [session]);

  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const restLeft = restEnd ? Math.max(0, Math.round((restEnd - now) / 1000)) : 0;
  useEffect(() => { if (restEnd && restLeft === 0) setRestEnd(null); }, [restEnd, restLeft]);
  useEffect(() => () => { clearTimeout(armTimer.current); clearTimeout(toastTimer.current); }, []);

  const doneList = useMemo(
    () => (session?.exercises ?? []).map((x): [string, number] => [x.name, x.sets.filter((s) => s.done).length]).filter(([, n]) => n > 0),
    [session],
  );
  const totals = useMemo(() => {
    let sets = 0, volume = 0;
    session?.exercises.forEach((x) => x.sets.forEach((s) => { if (s.done) { const v = setValues(s); sets++; volume += v.kg * v.reps; } }));
    return { sets, volume };
  }, [session]);
  const worked = useMemo(() => {
    const t = tallyGroups(doneList);
    return (Object.keys(t) as GroupKey[]).filter((g) => t[g] > 0).sort((a, b) => t[b] - t[a]).map((g): [GroupKey, number] => [g, t[g]]);
  }, [doneList]);

  const update = (fn: (s: Draft) => void) => setSession((prev) => {
    if (!prev) return prev;
    const next: Draft = { ...prev, exercises: prev.exercises.map((x) => ({ ...x, sets: x.sets.map((s) => ({ ...s })) })) };
    fn(next);
    markPRs(next, bw);
    return next;
  });
  const start = (name: string, exercises: string[]) => setSession({ name, startedAt: Date.now(), exercises: exercises.map((n) => makeExercise(n)) });
  const close = () => { setSession(null); setRestEnd(null); setSummaryOpen(false); setArmed(null); setToast(null); };

  const showToast = (t: PRToast) => {
    setToast(t);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  };

  /** Complete or un-complete a set. A completed set that beats the all-time best is flagged as a PR. */
  const toggleDone = (xi: number, si: number) => {
    const x = session?.exercises[xi], cur = x?.sets[si];
    if (!x || !cur) return;
    if (!cur.done) {
      const v = setValues(cur);
      if (!v.reps) return; // needs reps before it can be completed
      if (!editing) setRestEnd(Date.now() + REST_SECONDS * 1000);
      const allTime = bestE1rm(x.name, bw, session?.editId);
      const e = e1rm(x.name, v, bw);
      const inSession = Math.max(0, ...x.sets.filter((s, i) => i !== si && s.done).map((s) => e1rm(x.name, setValues(s), bw)));
      const isPR = allTime > 0 && e > allTime + 0.05 && e > inSession;
      update((s) => {
        const set = s.exercises[xi].sets[si];
        if (set.kg === '' && set.prevKg !== undefined) set.kg = String(set.prevKg);
        if (set.reps === '' && set.prevReps !== undefined) set.reps = String(set.prevReps);
        set.done = true;
      });
      if (isPR) {
        const bwLift = isBodyweight(x.name);
        const reps = (v1: number) => Math.round((v1 / bw - 1) * 30);
        showToast({
          name: x.name,
          text: bwLift ? `${reps(e)} reps estimated max, up ${reps(e) - reps(allTime)} on your best`
            : `Estimated 1RM ${Math.round(e)} kg, up ${Math.round((e - allTime) * 2) / 2} kg on your best`,
        });
      }
      return;
    }
    update((s) => { s.exercises[xi].sets[si].done = false; });
  };

  const arm = (what: 'discard' | 'delete', action: () => void) => {
    if (armed === what) { clearTimeout(armTimer.current); setArmed(null); action(); return; }
    setArmed(what);
    clearTimeout(armTimer.current);
    armTimer.current = setTimeout(() => setArmed(null), 3000);
  };

  // The workout as it will be saved: completed sets only
  const record = useMemo((): WorkoutRecord | null => {
    if (!session) return null;
    const exercises = session.exercises
      .map((x) => ({ name: x.name, sets: x.sets.filter((s) => s.done).map(setValues).filter((v) => v.reps > 0) }))
      .filter((x) => x.sets.length);
    return {
      id: session.editId ?? newId(), date: session.date ?? dateKey(today()), startedAt: session.startedAt,
      name: session.name.trim() || 'Workout', mins: session.mins ?? Math.max(1, Math.round((Date.now() - session.startedAt) / 60000)), exercises,
    };
  }, [session]);

  // The score it would get, for the finish screen
  const scored = useMemo(() => {
    if (!summaryOpen || !record) return null;
    const perf: Record<string, TopSet> = {};
    record.exercises.forEach((x) => x.sets.forEach((t) => { if (!perf[x.name] || e1rm(x.name, t, bw) > e1rm(x.name, perf[x.name], bw)) perf[x.name] = t; }));
    const s = { d: fromKey(record.date), name: record.name, exercises: doneList, perf, deload: false };
    const prior = history.filter((h) => h.id !== record.id && +h.d <= +s.d);
    return { ...scoreSession(s, prior, profile), perf };
  }, [summaryOpen, record, doneList, profile, bw]);

  const save = () => {
    if (record && record.exercises.length) saveWorkout(record);
    close();
  };

  const addExercises = (names: string[]) => {
    if (session) update((s) => { s.exercises.push(...names.map((n) => makeExercise(n, s.editId))); });
    else start('Workout', names);
    setPickerOpen(false);
  };

  const openSaved = (s: LoggedSession) => {
    const r = getRecord(s.id);
    if (r) setSession(draftFrom(r));
  };

  const elapsed = session ? Math.floor((now - session.startedAt) / 1000) : 0;
  const picker = <ExercisePicker visible={pickerOpen} onClose={() => setPickerOpen(false)} onAdd={addExercises} />;

  if (!draftLoaded) return <SafeAreaView style={st.root} edges={['top']} />;

  /* ---------- no workout open ---------- */
  if (!session) {
    const list = recent.slice(0, showAll ? 60 : RECENT);
    return (
      <SafeAreaView style={st.root} edges={['top']}>
        <ScrollView contentContainerStyle={[st.pad, { paddingBottom: 40 }]}>
          <View style={st.top}>
            <Text style={type.date}>{longDate(today())}</Text>
            <Text style={type.largeTitle}>Log</Text>
          </View>
          <Pressable style={st.primary} onPress={() => setPickerOpen(true)}>
            <Text style={st.primaryText}>Start Empty Workout</Text>
          </Pressable>

          <Text style={type.section}>Templates</Text>
          <View style={st.list}>
            {TEMPLATES.map(([n, exs], i) => (
              <Pressable key={n} style={[st.li, i > 0 && st.liSep]} onPress={() => start(n, exs)}>
                <View style={{ flex: 1 }}>
                  <Text style={st.liT}>{n}</Text>
                  <Text style={st.liS} numberOfLines={1}>{exs.slice(0, 3).join(', ')}…</Text>
                </View>
                <Text style={st.liR}>{exs.length}</Text>
                <Icon name="chev" size={16} color={colors.ink3} />
              </Pressable>
            ))}
          </View>

          <Text style={type.section}>History</Text>
          {list.length ? (
            <View style={st.list}>
              {list.map((s, i) => {
                const own = !s.sample;
                return (
                  <Pressable key={s.id} disabled={!own} onPress={() => openSaved(s)} style={[st.li, i > 0 && st.liSep]}
                    accessibilityLabel={own ? `Edit ${s.name}, ${relativeDay(s.d)}` : undefined}>
                    <View style={{ flex: 1 }}>
                      <Text style={st.liT}>{s.name}{s.sample ? <Text style={st.tag}>  Sample</Text> : null}</Text>
                      <Text style={st.liS}>{relativeDay(s.d)} · {s.mins} min · score {s.score}</Text>
                    </View>
                    <Text style={st.liR}>{plural(sessionSets(s), 'set')}</Text>
                    {own && <Icon name="chev" size={16} color={colors.ink3} />}
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <Text style={[type.sub, { paddingHorizontal: 4 }]}>Your workouts will appear here. Tap one to edit or delete it.</Text>
          )}
          {recent.length > RECENT && (
            <Pressable onPress={() => setShowAll((v) => !v)} style={{ padding: 12, alignItems: 'center' }}>
              <Text style={st.blueText}>{showAll ? 'Show Less' : 'Show More'}</Text>
            </Pressable>
          )}
        </ScrollView>
        {picker}
      </SafeAreaView>
    );
  }

  /* ---------- workout in progress, or a saved workout being edited ---------- */
  return (
    <SafeAreaView style={st.root} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={[st.pad, { paddingBottom: 140 }]} keyboardShouldPersistTaps="handled">
          <View style={[st.top, st.topRow]}>
            <View style={{ flex: 1 }}>
              {editing && <Text style={type.date}>Editing · {relativeDay(fromKey(session.date!))}</Text>}
              <TextInput style={st.nameInput} value={session.name} onChangeText={(t) => update((s) => { s.name = t; })} />
              <Text style={type.sub}>
                {!editing && <Text style={{ color: colors.ink, fontWeight: '600' }}>{clock(elapsed)} · </Text>}
                {plural(totals.sets, 'set')} · {Math.round(totals.volume).toLocaleString()} kg
              </Text>
            </View>
            <Pressable disabled={!record?.exercises.length} onPress={() => (editing ? save() : setSummaryOpen(true))} hitSlop={10}>
              <Text style={[st.finish, !record?.exercises.length && { color: colors.ink3 }]}>{editing ? 'Save' : 'Finish'}</Text>
            </Pressable>
          </View>

          <View style={{ gap: 12 }}>
            {session.exercises.map((x, xi) => {
              const ex = EXERCISE_BY_NAME[x.name];
              return (
                <View key={`${x.name}-${xi}`} style={st.exCard}>
                  <View style={st.exHead}>
                    <View style={{ flex: 1 }}>
                      <Text style={st.exName}>{x.name}</Text>
                      {ex && <Text style={st.liS}>{EQUIPMENT[ex.equipment]} · {GROUPS[groupOf(ex.primary)]}</Text>}
                    </View>
                    <Pressable onPress={() => update((s) => { s.exercises.splice(xi, 1); })} hitSlop={10} accessibilityLabel={`Remove ${x.name}`}>
                      <Icon name="x" size={16} color={colors.ink3} />
                    </Pressable>
                  </View>

                  <View style={st.setRow}>
                    <Text style={[st.hdr, { width: 28, textAlign: 'center' }]}>Set</Text>
                    <Text style={[st.hdr, { flex: 1 }]}>Previous</Text>
                    <Text style={[st.hdr, { width: 64, textAlign: 'center' }]}>{isBodyweight(x.name) ? '+kg' : 'kg'}</Text>
                    <Text style={[st.hdr, { width: 54, textAlign: 'center' }]}>Reps</Text>
                    <View style={{ width: 34 }} />
                  </View>
                  {x.sets.map((s, si) => (
                    <View key={si} style={[st.setRow, s.done && st.setDone]}>
                      {s.pr ? <View style={st.setNBox}><Icon name="trophy" size={17} color={colors.orange} /></View> : <Text style={st.setN}>{si + 1}</Text>}
                      <Text style={st.prev}>{s.prevReps !== undefined ? `${s.prevKg} kg × ${s.prevReps}` : '—'}</Text>
                      <TextInput
                        style={[st.input, { width: 64 }, s.done && st.inputDone]} keyboardType="decimal-pad"
                        value={s.kg} placeholder={s.prevKg !== undefined ? String(s.prevKg) : '0'} placeholderTextColor={colors.ink3}
                        onChangeText={(t) => update((ss) => { ss.exercises[xi].sets[si].kg = t.replace(',', '.').replace(/[^0-9.]/g, ''); })}
                      />
                      <TextInput
                        style={[st.input, { width: 54 }, s.done && st.inputDone]} keyboardType="number-pad"
                        value={s.reps} placeholder={s.prevReps !== undefined ? String(s.prevReps) : '0'} placeholderTextColor={colors.ink3}
                        onChangeText={(t) => update((ss) => {
                          const set = ss.exercises[xi].sets[si];
                          set.reps = t.replace(/[^0-9]/g, '');
                          if (set.done && !Number(set.reps)) set.done = false; // a completed set needs reps
                        })}
                      />
                      <Pressable onPress={() => toggleDone(xi, si)} style={[st.check, s.done && st.checkOn]} accessibilityLabel={`${s.done ? 'Undo' : 'Complete'} set ${si + 1}`}>
                        <Icon name="check" size={16} strokeWidth={2.6} color={s.done ? '#002a0c' : colors.ink3} />
                      </Pressable>
                    </View>
                  ))}
                  <View style={st.setBtns}>
                    {x.sets.length > 1 && (
                      <Pressable style={st.addSet} onPress={() => update((ss) => { ss.exercises[xi].sets.pop(); })}>
                        <Text style={[st.blueText, { color: colors.ink2 }]}>Remove Set</Text>
                      </Pressable>
                    )}
                    <Pressable style={st.addSet} onPress={() => update((ss) => {
                      const sets = ss.exercises[xi].sets, last = sets[sets.length - 1];
                      sets.push({ kg: last?.kg ?? '', reps: last?.reps ?? '', done: false, prevKg: last?.prevKg, prevReps: last?.prevReps });
                    })}>
                      <Text style={st.blueText}>Add Set</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}

            <Pressable style={st.addEx} onPress={() => setPickerOpen(true)}>
              <Icon name="plus" size={18} color={colors.blue} />
              <Text style={[st.blueText, { fontWeight: '600', fontSize: 16 }]}>Add Exercise</Text>
            </Pressable>
            {editing ? (
              <>
                <Pressable onPress={close} style={st.textBtn}><Text style={{ color: colors.ink2, fontSize: 15 }}>Cancel Editing</Text></Pressable>
                <Pressable onPress={() => arm('delete', () => { deleteWorkout(session.editId!); close(); })} style={st.textBtn}>
                  <Text style={{ color: colors.red, fontSize: 15 }}>{armed === 'delete' ? 'Tap Again to Delete' : 'Delete Workout'}</Text>
                </Pressable>
              </>
            ) : (
              <Pressable onPress={() => arm('discard', close)} style={st.textBtn}>
                <Text style={{ color: colors.red, fontSize: 15 }}>{armed === 'discard' ? 'Tap Again to Discard' : 'Discard Workout'}</Text>
              </Pressable>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {toast && (
        <Pressable style={st.toast} onPress={() => setToast(null)}>
          <Icon name="trophy" size={22} color={colors.orange} />
          <View style={{ flex: 1 }}>
            <Text style={st.toastT}>New personal best · {toast.name}</Text>
            <Text style={st.liS}>{toast.text}</Text>
          </View>
        </Pressable>
      )}

      {restEnd && (
        <View style={st.rest}>
          <Text style={st.restT}>{clock(restLeft)}</Text>
          <Text style={[type.sub, { flex: 1 }]}>Rest</Text>
          {[['−15', -15000], ['+15', 15000]].map(([l, d]) => (
            <Pressable key={l as string} style={st.pill} onPress={() => setRestEnd((e) => (e ?? Date.now()) + (d as number))}><Text style={st.pillText}>{l}</Text></Pressable>
          ))}
          <Pressable style={st.pill} onPress={() => setRestEnd(null)}><Text style={st.pillText}>Skip</Text></Pressable>
          <View style={[st.restBar, { width: `${Math.min(1, restLeft / REST_SECONDS) * 100}%` }]} />
        </View>
      )}

      {picker}

      <Modal visible={summaryOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSummaryOpen(false)}>
        <SafeAreaView style={st.root} edges={['top', 'bottom']}>
          <ScrollView contentContainerStyle={[st.pad, { paddingBottom: 120, gap: 12 }]}>
            <View style={[st.topRow, { paddingTop: 16 }]}>
              <Text style={{ color: colors.ink, fontSize: 20, fontWeight: '700' }}>Workout Complete</Text>
              <Pressable onPress={() => setSummaryOpen(false)} hitSlop={10}><Icon name="x" size={18} color={colors.ink2} /></Pressable>
            </View>
            {scored && record && (
              <Card icon="ring" label="Workout Score" color={colors.green} style={{ paddingBottom: 0 }}>
                <ScoreRings comps={scored.comps} overall={scored.overall} label="Score" size={170} />
                <Text style={[type.sub, { textAlign: 'center', marginTop: 8 }]}>{record.mins} min · {plural(totals.sets, 'set')} · {Math.round(totals.volume).toLocaleString()} kg</Text>
                <ComponentRow comps={scored.comps} />
              </Card>
            )}
            {scored && record && (
              <View style={st.list}>
                {record.exercises.map((x, i) => {
                  const r = scored.results.find((y) => y.name === x.name), t = scored.perf[x.name];
                  const pr = session.exercises.some((d) => d.name === x.name && d.sets.some((s) => s.pr));
                  const label = pr ? 'All-time best' : !r ? 'First time' : r.status === 'best' ? 'New best' : r.status === 'matched' ? 'Matched' : r.status === 'slight' ? 'Slightly down' : 'Down';
                  const c = pr ? colors.orange : !r ? colors.ink2 : r.status === 'best' ? colors.green : r.status === 'matched' ? colors.ink2 : colors.orange;
                  return (
                    <View key={x.name} style={[st.li, i > 0 && st.liSep]}>
                      <View style={{ flex: 1 }}>
                        <Text style={st.liT}>{x.name}</Text>
                        <Text style={st.liS}>Top set {t.kg} kg × {t.reps}</Text>
                      </View>
                      {pr && <Icon name="trophy" size={16} color={colors.orange} />}
                      <Text style={[st.liR, { color: c, fontWeight: '600' }]}>{label}</Text>
                    </View>
                  );
                })}
              </View>
            )}
            <View style={st.list}>
              {worked.map(([g, v], i) => (
                <View key={g} style={[st.li, i > 0 && st.liSep]}>
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: heatColor(weekSets[g] + v) }} />
                  <View style={{ flex: 1 }}>
                    <Text style={st.liT}>{GROUPS[g]}</Text>
                    <Text style={st.liS}>{fmtSets(weekSets[g] + v)} sets this week</Text>
                  </View>
                  <Text style={st.liR}>+{fmtSets(v)}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
          <View style={{ position: 'absolute', left: 16, right: 16, bottom: 28 }}>
            <Pressable style={st.primary} onPress={save}><Text style={st.primaryText}>Save Workout</Text></Pressable>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  pad: { paddingHorizontal: 16 },
  top: { paddingTop: 20, paddingBottom: 14 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  primary: { backgroundColor: colors.green, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  primaryText: { color: '#002a0c', fontWeight: '600', fontSize: 16 },
  list: { backgroundColor: colors.card, borderRadius: 14, overflow: 'hidden' },
  li: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  liSep: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.sep, marginLeft: 16, paddingLeft: 0 },
  liT: { color: colors.ink, fontSize: 16 },
  liS: { color: colors.ink2, fontSize: 13, marginTop: 1 },
  liR: { color: colors.ink2, fontSize: 15 },
  tag: { color: colors.ink3, fontSize: 12 },
  nameInput: { color: colors.ink, fontSize: 28, fontWeight: '700', padding: 0 },
  finish: { color: colors.green, fontSize: 17, fontWeight: '600' },
  exCard: { backgroundColor: colors.card, borderRadius: 14, paddingHorizontal: 12, paddingTop: 14, paddingBottom: 4 },
  exHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingHorizontal: 4, marginBottom: 8 },
  exName: { color: colors.blue, fontSize: 17, fontWeight: '600' },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 3, paddingHorizontal: 4, borderRadius: 8 },
  setDone: { backgroundColor: 'rgba(48,209,88,0.12)' },
  hdr: { color: colors.ink3, fontSize: 12, fontWeight: '600' },
  setN: { width: 28, textAlign: 'center', color: colors.ink2, fontWeight: '600', fontSize: 15 },
  setNBox: { width: 28, alignItems: 'center' },
  prev: { flex: 1, color: colors.ink3, fontSize: 14, fontVariant: ['tabular-nums'] },
  input: { backgroundColor: colors.card2, borderRadius: 7, color: colors.ink, textAlign: 'center', fontSize: 16, fontWeight: '600', paddingVertical: 6 },
  inputDone: { backgroundColor: 'transparent' },
  check: { width: 30, height: 30, marginLeft: 4, borderRadius: 7, backgroundColor: colors.card2, alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: colors.green },
  setBtns: { flexDirection: 'row', justifyContent: 'center', gap: 24 },
  addSet: { paddingVertical: 10, alignItems: 'center' },
  blueText: { color: colors.blue, fontSize: 15 },
  addEx: { flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card, borderRadius: 14, padding: 14 },
  textBtn: { padding: 14, alignItems: 'center' },
  toast: {
    position: 'absolute', left: 12, right: 12, top: 56, flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(44,44,46,0.98)', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12,
    borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,159,10,0.5)',
  },
  toastT: { color: colors.ink, fontSize: 15, fontWeight: '600' },
  rest: {
    position: 'absolute', left: 12, right: 12, bottom: 10, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(44,44,46,0.97)', borderRadius: 14, padding: 10, paddingLeft: 16, overflow: 'hidden',
  },
  restT: { color: colors.ink, fontSize: 22, fontWeight: '700', minWidth: 56, fontVariant: ['tabular-nums'] },
  restBar: { position: 'absolute', left: 0, bottom: 0, height: 3, backgroundColor: colors.blue },
  pill: { backgroundColor: colors.card2, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  pillText: { color: colors.ink, fontSize: 14, fontWeight: '600' },
});
