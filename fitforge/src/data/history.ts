// The user's training history: their saved workouts, plus the sample year when that's switched on.
// Screens read `history` (sorted oldest first, every session scored); AppState changes it through
// loadHistory / upsertWorkout / removeWorkout / setHistoryProfile / setSampleData.
import type { GroupKey } from './muscleModel';
import { EXERCISE_BY_NAME } from './exercises';
import { LoggedExercise, emptyGroupSets, tallyGroups } from './volume';
import { Components, ExerciseResult, TopSet, e1rm, scoreSession } from './score';
import { DEFAULT_PROFILE, Profile } from './profile';
import { fromKey, shortDate, today, weekStart, weekdayShort } from './dates';
import { sampleHistory } from './sample';

/** One set as saved: kg is the load (added load for bodyweight exercises). */
export type SetRecord = { kg: number; reps: number };
export type ExerciseRecord = { name: string; sets: SetRecord[] };
/** A workout as it's stored on the phone. */
export type WorkoutRecord = { id: string; date: string; startedAt: number; name: string; mins: number; exercises: ExerciseRecord[] };

export type LoggedSession = {
  id: string; sample?: boolean; startedAt: number;
  d: Date; date: string; day: string; name: string; mins: number; vol: number;
  exercises: LoggedExercise[];          // [exercise, completed sets]
  detail?: ExerciseRecord[];            // every set (saved workouts only; sample data has top sets)
  perf: Record<string, TopSet>;         // best set per exercise, by estimated 1RM
  deload: boolean;
  score: number; comps: Components; results: ExerciseResult[];
};

export const history: LoggedSession[] = [];
let records: WorkoutRecord[] = [];
let withSample = false;
let profile: Profile = DEFAULT_PROFILE;

export const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
export const setVolume = (sets: SetRecord[]) => sets.reduce((a, s) => a + s.kg * s.reps, 0);

/** Best set of an exercise by estimated 1RM. */
export function topSet(name: string, sets: SetRecord[], bw: number): TopSet | null {
  let best: TopSet | null = null;
  sets.forEach((s) => { if (s.reps > 0 && (!best || e1rm(name, s, bw) > e1rm(name, best, bw))) best = { kg: s.kg, reps: s.reps }; });
  return best;
}

function toSession(r: WorkoutRecord, bw: number): LoggedSession {
  const d = fromKey(r.date);
  const ex = r.exercises.filter((x) => x.sets.length);
  const perf: Record<string, TopSet> = {};
  ex.forEach((x) => { const t = topSet(x.name, x.sets, bw); if (t) perf[x.name] = t; });
  return {
    id: r.id, startedAt: r.startedAt, d, date: shortDate(d), day: weekdayShort(d), name: r.name, mins: r.mins,
    vol: ex.reduce((a, x) => a + setVolume(x.sets), 0), exercises: ex.map((x): LoggedExercise => [x.name, x.sets.length]),
    detail: ex, perf, deload: false, score: 0, comps: { overload: null, consistency: 0, longevity: 0 }, results: [],
  };
}

/** Score every session in order (a score depends on the history before it and on the profile). */
function rescore() {
  history.forEach((s, i) => {
    const r = scoreSession(s, history.slice(0, i), profile);
    s.score = r.overall; s.comps = r.comps; s.results = r.results;
  });
}

function rebuild() {
  const real = records.map((r) => toSession(r, profile.bodyweight));
  const list: LoggedSession[] = withSample ? [...(sampleHistory(today()) as unknown as LoggedSession[]), ...real] : real;
  list.sort((a, b) => +a.d - +b.d || a.startedAt - b.startedAt);
  history.splice(0, history.length, ...list);
  rescore();
}

/** Drops anything malformed from saved data, so one bad record can't stop the app loading. */
function clean(list: WorkoutRecord[]): WorkoutRecord[] {
  const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
  return (Array.isArray(list) ? list : [])
    .filter((r) => r && typeof r.id === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r.date) && Array.isArray(r.exercises))
    .map((r) => ({
      id: r.id, date: r.date, startedAt: n(r.startedAt), name: String(r.name ?? 'Workout'), mins: n(r.mins),
      exercises: r.exercises.filter((x) => x && typeof x.name === 'string' && Array.isArray(x.sets))
        .map((x) => ({ name: x.name, sets: x.sets.map((q) => ({ kg: n(q?.kg), reps: Math.round(n(q?.reps)) })).filter((q) => q.reps > 0) })),
    }));
}

export function loadHistory(opts: { records: WorkoutRecord[]; sample: boolean; profile: Profile }) {
  records = clean(opts.records); withSample = opts.sample; profile = opts.profile;
  rebuild();
}
export const getRecords = () => records;
export const getRecord = (id: string) => records.find((r) => r.id === id);
export const hasOwnWorkouts = () => records.length > 0;
export const sampleOn = () => withSample;

/** Add a new workout or replace an edited one. Returns the new list to save. */
export function upsertWorkout(r: WorkoutRecord) {
  const i = records.findIndex((x) => x.id === r.id);
  records = i >= 0 ? records.map((x) => (x.id === r.id ? r : x)) : [...records, r];
  rebuild();
  return records;
}
export function removeWorkout(id: string) {
  records = records.filter((x) => x.id !== id);
  rebuild();
  return records;
}
export function setHistoryProfile(p: Profile) { profile = p; rebuild(); }
export function setSampleData(on: boolean) { withSample = on; rebuild(); }

/* ---------------- queries ---------------- */
export const between = (a: Date, b: Date) => history.filter((s) => s.d >= a && s.d <= b);
export const sessionSets = (s: { exercises: LoggedExercise[] }) => s.exercises.reduce((a, [, n]) => a + n, 0);
export const thisWeek = () => between(weekStart(today()), today());
export const weeklyGroupSets = () => thisWeek().reduce((acc, s) => tallyGroups(s.exercises, acc), emptyGroupSets());
export function lastTrained(): Partial<Record<GroupKey, Date>> {
  const out: Partial<Record<GroupKey, Date>> = {};
  history.forEach((s) => { const t = tallyGroups(s.exercises); (Object.keys(t) as GroupKey[]).forEach((g) => { if (t[g] > 0) out[g] = s.d; }); });
  return out;
}

/** Index to search back from: the whole history, or only workouts before the one being edited. */
const searchEnd = (beforeId?: string) => { const i = beforeId ? history.findIndex((s) => s.id === beforeId) : -1; return i >= 0 ? i : history.length; };

/** The sets from the last time this exercise was done (before `beforeId`, when editing a saved workout). */
export function lastSets(name: string, beforeId?: string): SetRecord[] {
  for (let i = searchEnd(beforeId) - 1; i >= 0; i--) {
    const s = history[i];
    const x = s.detail?.find((e) => e.name === name);
    if (x) return x.sets;
    const top = s.perf[name];
    if (top) return Array.from({ length: s.exercises.find(([n]) => n === name)?.[1] ?? 1 }, () => ({ ...top }));
  }
  return [];
}

/** Best estimated 1RM logged for an exercise (before `beforeId`, when editing), or 0 if never done. */
export function bestE1rm(name: string, bw: number, beforeId?: string) {
  let best = 0;
  history.slice(0, searchEnd(beforeId)).forEach((s) => {
    if (s.deload) return;
    const t = s.perf[name];
    if (t) best = Math.max(best, e1rm(name, t, bw));
  });
  return best;
}

export const isBodyweight = (name: string) => EXERCISE_BY_NAME[name]?.equipment === 'W';
