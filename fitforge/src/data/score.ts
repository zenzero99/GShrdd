// FitForge score: progressive overload, consistency and longevity (strength-only for now).
//
//  Overload     each exercise's estimated 1RM vs its best in the previous 4 weeks
//               (new best 100 · matched 75 · slight drop 50 · clear drop 25), weighted by sets.
//               New exercises and deload sessions are left out.
//  Consistency  60% workouts done vs plan over 4 weeks + 40% muscle coverage over the last 7 days
//               (10–20 sets per group and trained on 2+ days).
//  Longevity    research-based, not a medical measurement: 35% strength days/week (goal 2+, no extra
//               credit beyond), 30% all 7 major muscle areas worked weekly (WHO), 35% relative strength
//               (squat and bench vs bodyweight, adjusted for sex and age).
//  Overall      Day: 50/25/25 · Week, Month, Year: 40/35/25.
import { GROUPS, GroupKey } from './muscleModel';
import { EXERCISE_BY_NAME } from './exercises';
import { LoggedExercise, tallyGroups } from './volume';
import type { Profile } from './profile';
import { addDays } from './dates';

export type TopSet = { kg: number; reps: number };
export type ScoredSession = {
  d: Date; name: string; exercises: LoggedExercise[]; perf: Record<string, TopSet>; deload: boolean;
};
export type Components = { overload: number | null; consistency: number; longevity: number };
export type ExerciseResult = { name: string; e1rm: number; best: number; status: 'best' | 'matched' | 'slight' | 'drop' };

export const PLANNED_PER_WEEK = 5;
export const WEIGHTS = { day: { o: 0.5, c: 0.25, l: 0.25 }, range: { o: 0.4, c: 0.35, l: 0.25 } };
const round = Math.round;

/** Estimated one-rep max (Epley). Bodyweight exercises count bodyweight plus any added load. */
export function e1rm(name: string, set: TopSet, bodyweight: number) {
  const load = set.kg + (EXERCISE_BY_NAME[name]?.equipment === 'W' ? bodyweight : 0);
  return load * (1 + set.reps / 30);
}

const within = <T extends { d: Date }>(list: T[], from: number, to: number) => list.filter((s) => +s.d >= from && +s.d <= to);

/* ---------------- progressive overload ---------------- */
export function overloadResults(s: ScoredSession, prior: ScoredSession[], bw: number): ExerciseResult[] {
  if (s.deload) return [];
  const window = within(prior, +addDays(s.d, -28), +s.d - 1).filter((p) => !p.deload);
  const out: ExerciseResult[] = [];
  s.exercises.forEach(([name]) => {
    const top = s.perf[name];
    const past = window.filter((p) => p.perf[name]).map((p) => e1rm(name, p.perf[name], bw)).filter((v) => v > 0);
    if (!top || !past.length) return; // new exercise (or only zero-weight entries): no baseline yet
    const cur = e1rm(name, top, bw), best = Math.max(...past), r = cur / best;
    out.push({ name, e1rm: cur, best, status: r >= 1.01 ? 'best' : r >= 0.99 ? 'matched' : r >= 0.95 ? 'slight' : 'drop' });
  });
  return out;
}
const POINTS = { best: 100, matched: 75, slight: 50, drop: 25 };
export function overloadScore(s: ScoredSession, results: ExerciseResult[]): number | null {
  if (!results.length) return null;
  const sets = (n: string) => s.exercises.find(([x]) => x === n)?.[1] ?? 1;
  const w = results.reduce((a, r) => a + sets(r.name), 0);
  return round(results.reduce((a, r) => a + POINTS[r.status] * sets(r.name), 0) / w);
}

/* ---------------- consistency ---------------- */
const MAJOR: GroupKey[] = Object.keys(GROUPS) as GroupKey[];
export function consistencyAt(date: Date, hist: ScoredSession[]) {
  const last28 = within(hist, +addDays(date, -27), +date);
  const days28 = new Set(last28.map((s) => +s.d)).size;
  const adherence = Math.min(1, days28 / (PLANNED_PER_WEEK * 4));
  const last7 = within(hist, +addDays(date, -6), +date);
  const sets = last7.reduce((acc, s) => tallyGroups(s.exercises, acc), Object.fromEntries(MAJOR.map((k) => [k, 0])) as Record<GroupKey, number>);
  const daysHit = Object.fromEntries(MAJOR.map((k) => [k, new Set<number>()])) as Record<GroupKey, Set<number>>;
  last7.forEach((s) => { const t = tallyGroups(s.exercises); MAJOR.forEach((k) => { if (t[k] > 0) daysHit[k].add(+s.d); }); });
  let onTarget = 0;
  const coverage = MAJOR.reduce((a, k) => {
    const v = sets[k], setScore = v >= 10 && v <= 25 ? 1 : v >= 5 && v < 35 ? 0.5 : 0;
    const freq = daysHit[k].size >= 2 ? 1 : daysHit[k].size === 1 ? 0.5 : 0;
    if (setScore === 1 && freq === 1) onTarget++;
    return a + 0.6 * setScore + 0.4 * freq;
  }, 0) / MAJOR.length;
  return { score: round(100 * (0.6 * adherence + 0.4 * coverage)), workouts: days28, planned: PLANNED_PER_WEEK * 4, onTarget, groups: MAJOR.length };
}

/* ---------------- longevity (strength-only) ---------------- */
// WHO: muscle-strengthening activity on 2+ days a week involving all major muscle groups
export const WHO_AREAS: [string, GroupKey[]][] = [
  ['Legs', ['quads', 'hamstrings', 'calves']], ['Hips', ['glutes', 'adductors']], ['Back', ['lats', 'upper_back', 'lower_back']],
  ['Core', ['abs', 'obliques']], ['Chest', ['chest']], ['Shoulders', ['shoulders', 'traps']], ['Arms', ['biceps', 'triceps', 'forearms']],
];
// Relative-strength standards: estimated 1RM ÷ bodyweight reaching [fair, good, excellent]
const STANDARDS = {
  male: { squat: [1.0, 1.5, 2.0], bench: [0.75, 1.0, 1.25] },
  female: { squat: [0.75, 1.1, 1.5], bench: [0.5, 0.7, 0.9] },
};
function standardScore(ratio: number, [fair, good, great]: number[]) {
  if (ratio >= great) return 1;
  if (ratio >= good) return 0.8 + 0.2 * (ratio - good) / (great - good);
  if (ratio >= fair) return 0.5 + 0.3 * (ratio - fair) / (good - fair);
  return 0.5 * ratio / fair;
}
export function longevityAt(date: Date, hist: ScoredSession[], p: Profile) {
  const last28 = within(hist, +addDays(date, -27), +date);
  const daysPerWeek = new Set(last28.map((s) => +s.d)).size / 4;
  const freq = Math.min(1, daysPerWeek / 2);
  const sets = last28.reduce((acc, s) => tallyGroups(s.exercises, acc), Object.fromEntries(MAJOR.map((k) => [k, 0])) as Record<GroupKey, number>);
  const areas = WHO_AREAS.map(([label, keys]) => ({ label, perWeek: keys.reduce((a, k) => a + sets[k], 0) / 4 }));
  const coverage = areas.reduce((a, x) => a + Math.min(1, x.perWeek / 2), 0) / areas.length;
  const ageAdj = p.age >= 55 ? 0.8 : p.age >= 40 ? 0.9 : 1;
  const last56 = within(hist, +addDays(date, -55), +date);
  const best = (names: string[]) => Math.max(0, ...last56.flatMap((s) => names.filter((n) => s.perf[n]).map((n) => e1rm(n, s.perf[n], p.bodyweight))));
  const squat = best(['Barbell Back Squat', 'Front Squat', 'Pause Squat', 'Box Squat']);
  const bench = best(['Barbell Bench Press', 'Paused Bench Press', 'Smith Machine Bench Press']);
  const std = STANDARDS[p.sex];
  const lifts = [
    squat ? { label: 'Squat', ratio: squat / p.bodyweight, score: standardScore(squat / p.bodyweight, std.squat.map((x) => x * ageAdj)) } : null,
    bench ? { label: 'Bench', ratio: bench / p.bodyweight, score: standardScore(bench / p.bodyweight, std.bench.map((x) => x * ageAdj)) } : null,
  ].filter(Boolean) as { label: string; ratio: number; score: number }[];
  const strength = lifts.length ? lifts.reduce((a, l) => a + l.score, 0) / lifts.length : null;
  const score = strength === null
    ? round(100 * (0.54 * freq + 0.46 * coverage))
    : round(100 * (0.35 * freq + 0.30 * coverage + 0.35 * strength));
  return { score, daysPerWeek, areas, lifts };
}

/* ---------------- a session's score ---------------- */
export function scoreSession(s: ScoredSession, prior: ScoredSession[], p: Profile) {
  const results = overloadResults(s, prior, p.bodyweight);
  const withS = [...prior, s];
  const c = consistencyAt(s.d, withS), l = longevityAt(s.d, withS, p);
  const comps: Components = { overload: overloadScore(s, results), consistency: c.score, longevity: l.score };
  return { comps, overall: combine(comps, 'day'), results };
}

export function combine(c: Components, kind: 'day' | 'range') {
  const w = WEIGHTS[kind];
  if (c.overload === null) return round((c.consistency * w.c + c.longevity * w.l) / (w.c + w.l));
  return round(c.overload * w.o + c.consistency * w.c + c.longevity * w.l);
}

