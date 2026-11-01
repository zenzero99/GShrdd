// Everything the Summary screen shows, computed for one time range (day / week / month / year)
// from the user's history. Works from the first workout on: every section handles missing data.
import { GROUPS, GroupKey } from './muscleModel';
import { EXERCISES, EXERCISE_BY_NAME } from './exercises';
import { LoggedSession, between, history, lastTrained, sessionSets, weeklyGroupSets } from './history';
import { GroupSets, emptyGroupSets, fmtSets, groupOf, tallyGroups } from './volume';
import { Components, ExerciseResult, combine, consistencyAt, e1rm, longevityAt } from './score';
import type { Profile } from './profile';
import {
  addDays, daysBetween, monthEnd, monthName, monthStart, rangeLabel, shortDate, today, weekStart,
} from './dates';

export type RangeKey = 'day' | 'week' | 'month' | 'year';
export type Point = { x: number; y: number; tip: string };
export type Highlight = { color: 'orange' | 'coral' | 'blue'; icon: 'up' | 'alert' | 'cal' | 'body'; title: string; text: string; big?: [string, string] };
export type LiftRow = { name: string; value: string; change: string; status: ExerciseResult['status'] | 'gain' };

type RangeDef = { when: string; a: Date; b: Date; pa?: Date; pb?: Date; curName: string; prevName?: string; noun: string };
export function rangeDef(range: RangeKey, t = today()): RangeDef {
  if (range === 'day') return { when: 'Today', a: t, b: t, curName: 'Today', noun: 'today' };
  if (range === 'week') {
    const a = weekStart(t);
    return { when: rangeLabel(a, addDays(a, 6)), a, b: addDays(a, 6), pa: addDays(a, -7), pb: addDays(a, -1), curName: 'This week', prevName: 'last week', noun: 'this week' };
  }
  if (range === 'month') {
    const prev = new Date(t.getFullYear(), t.getMonth() - 1, 1);
    return { when: monthName(t), a: monthStart(t), b: monthEnd(t), pa: prev, pb: monthEnd(prev), curName: monthName(t), prevName: monthName(prev), noun: 'this month' };
  }
  const a = new Date(t.getFullYear(), t.getMonth() - 11, 1);
  const my = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  return { when: `${my(a)} – ${my(t)}`, a, b: monthEnd(t), curName: 'Monthly volume', noun: 'in the last 12 months' };
}

const fmt1 = fmtSets;
const avg = (a: number[]) => (a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : 0);
const pct = (a: number, b: number) => (b ? Math.round((a / b - 1) * 100) : 0);
export const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '±0');
const signedKg = (n: number) => `${n >= 0 ? '+' : '−'}${fmt1(Math.abs(Math.round(n * 2) / 2))} kg`;
export const volText = (kg: number): [string, string] =>
  kg >= 10000 ? [kg >= 100000 ? Math.round(kg / 1000).toLocaleString() : fmt1(kg / 1000), 't'] : [Math.round(kg).toLocaleString(), 'kg'];
const volStr = (kg: number) => volText(kg).join(' ');
/** "a", "a and b", "a, b and c" */
export const joinList = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

export function lastTrainedText(g: GroupKey) {
  const d = lastTrained()[g];
  if (!d) return 'not trained yet';
  const days = daysBetween(d, today());
  return 'last trained ' + (days === 0 ? 'today' : days === 1 ? 'yesterday' : days < 7 ? d.toLocaleDateString('en-US', { weekday: 'long' }) : shortDate(d));
}

/* ---------- score for a range ---------- */
function rangeComps(S: LoggedSession[]): Components {
  const o = S.map((s) => s.comps.overload).filter((v): v is number => v !== null);
  return { overload: o.length ? avg(o) : null, consistency: avg(S.map((s) => s.comps.consistency)), longevity: avg(S.map((s) => s.comps.longevity)) };
}
const liftName = (n: string) => n.replace(/^Barbell /, '');
// Bodyweight lifts are shown in reps; everything else as estimated 1RM in kg
const isBW = (n: string) => EXERCISE_BY_NAME[n]?.equipment === 'W';
const repsFrom = (e1: number, bw: number) => Math.round((e1 / bw - 1) * 30);
function liftRow(r: ExerciseResult, bw: number, status: LiftRow['status'] = r.status): LiftRow {
  const bwLift = isBW(r.name);
  const value = bwLift ? `${repsFrom(r.e1rm, bw)} reps` : `${Math.round(r.e1rm)} kg`;
  const diff = bwLift ? repsFrom(r.e1rm, bw) - repsFrom(r.best, bw) : r.e1rm - r.best;
  const diffText = bwLift ? `${diff >= 0 ? '+' : '−'}${Math.abs(diff)} rep${Math.abs(diff) === 1 ? '' : 's'}` : signedKg(diff);
  return { name: r.name, value, status, change: r.status === 'matched' ? 'Matched' : diffText };
}
function rangeRows(range: RangeKey, S: LoggedSession[], bw: number): LiftRow[] {
  if (range !== 'year') { // this week / month: the biggest new bests
    const seen = new Set<string>();
    return S.flatMap((s) => s.results).filter((x) => x.status === 'best').sort((a, b) => (b.e1rm - b.best) / b.best - (a.e1rm - a.best) / a.best)
      .filter((x) => (seen.has(x.name) ? false : (seen.add(x.name), true))).slice(0, 4).map((x) => liftRow(x, bw));
  }
  // biggest estimated-1RM gains between each lift's first and last appearance in the range
  const first: Record<string, number> = {}, last: Record<string, number> = {};
  S.filter((s) => !s.deload).forEach((s) => Object.entries(s.perf).forEach(([n, t]) => {
    const v = e1rm(n, t, bw); if (!(n in first)) first[n] = v; last[n] = v;
  }));
  return Object.keys(first).map((n) => ({ n, g: last[n] - first[n] })).filter((x) => x.g > 0.5).sort((a, b) => b.g / first[b.n] - a.g / first[a.n]).slice(0, 4)
    .map(({ n, g }) => ({ name: n, value: isBW(n) ? `${repsFrom(last[n], bw)} reps` : `${Math.round(last[n])} kg`, change: isBW(n) ? `+${repsFrom(last[n], bw) - repsFrom(first[n], bw)} reps` : signedKg(g), status: 'gain' as const }));
}

export type ScoreBlock = {
  overall: number; comps: Components; label: string; delta: string; down: boolean;
  overloadNote: string; lifts: LiftRow[]; consistency: string[]; longevity: string[];
};
function scoreBlock(range: RangeKey, r: RangeDef, S: LoggedSession[], P: LoggedSession[] | null, p: Profile): ScoreBlock {
  const t = today();
  const end = new Date(Math.min(+r.b, +t));
  const c = consistencyAt(end, history), l = longevityAt(end, history, p);
  const consistency = [
    `${c.workouts} of ${c.planned} planned workouts in the last 4 weeks`,
    `${c.onTarget} of ${c.groups} muscle groups got 10–20 sets and 2+ sessions in the last 7 days`,
  ];
  const areasMet = l.areas.filter((a) => a.perWeek >= 2).length;
  const longevity = [
    `Strength training ${fmt1(Math.round(l.daysPerWeek * 10) / 10)} days a week (goal: 2 or more)`,
    areasMet === l.areas.length ? `All ${l.areas.length} major muscle areas trained every week` : `${areasMet} of ${l.areas.length} major muscle areas trained every week (missing: ${l.areas.filter((a) => a.perWeek < 2).map((a) => a.label.toLowerCase()).join(', ')})`,
    ...(l.lifts.length ? [l.lifts.map((x) => `${x.label} ${fmt1(Math.round(x.ratio * 100) / 100)}× bodyweight`).join(' · ')] : ['Log a squat or bench press to add relative strength']),
  ];
  const none: Components = { overload: null, consistency: 0, longevity: 0 };
  if (range === 'day') {
    const s = S[S.length - 1];
    if (!s) return { overall: 0, comps: none, label: 'Score', delta: history.length ? 'Rest day' : 'No workouts yet', down: false, overloadNote: 'No workout today.', lifts: [], consistency, longevity };
    const last7 = history.filter((x) => x.d < t && x.d >= addDays(t, -7)).map((x) => x.score);
    const diff = s.score - avg(last7);
    const counts = { best: 0, matched: 0, slight: 0, drop: 0 };
    s.results.forEach((x) => counts[x.status]++);
    return {
      overall: s.score, comps: s.comps, label: 'Score', down: last7.length > 0 && diff < 0,
      delta: last7.length ? `${signed(diff)} vs your 7-day average` : 'Your first workout this week',
      overloadNote: s.deload ? 'Deload session: not counted.' : s.results.length ? `${counts.best} new best${counts.best === 1 ? '' : 's'}, ${counts.matched} matched, ${counts.slight + counts.drop} down vs your 4-week best.` : 'No earlier sessions of these exercises to compare with yet.',
      lifts: s.results.map((x) => liftRow(x, p.bodyweight)), consistency, longevity,
    };
  }
  if (!S.length) return { overall: 0, comps: none, label: 'Average', delta: `No workouts ${r.noun}`, down: false, overloadNote: `No workouts ${r.noun}.`, lifts: [], consistency, longevity };
  const comps = rangeComps(S), overall = combine(comps, 'range');
  const prevOverall = P && P.length ? combine(rangeComps(P), 'range') : null;
  const all = S.flatMap((s) => s.results), n = (k: ExerciseResult['status']) => all.filter((x) => x.status === k).length;
  const w = `${S.length} workout${S.length === 1 ? '' : 's'}`;
  return {
    overall, comps, label: 'Average', down: prevOverall !== null && overall < prevOverall,
    delta: prevOverall !== null ? `${signed(overall - prevOverall)} vs ${r.prevName}` : `across ${w}`,
    overloadNote: all.length ? `${n('best')} new bests, ${n('matched')} matched, ${n('slight') + n('drop')} down across ${w}.` : 'Repeat an exercise within 4 weeks to start tracking overload.',
    lifts: rangeRows(range, S, p.bodyweight), consistency, longevity,
  };
}

/* ---------- volume series ---------- */
// Sample data only stores top sets, so its session volume is spread across sets by a rough weight
const EX_WEIGHT: Record<string, number> = { 'Barbell Bench Press': 1.5, 'Incline Dumbbell Press': 1.1, 'Cable Lateral Raise': 0.25, 'Pec Deck Fly': 0.6, 'Triceps Dip': 0.7 };
function sessionSeries(s: LoggedSession): Point[] {
  const pts: Point[] = [{ x: 0, y: 0, tip: 'Start' }];
  let acc = 0;
  if (s.detail) {
    s.detail.forEach((x) => x.sets.forEach((set) => {
      acc += set.kg * set.reps;
      pts.push({ x: pts.length, y: acc, tip: `Set ${pts.length} · ${x.name}\n${set.kg} kg × ${set.reps} · ${volStr(acc)} so far` });
    }));
    return pts;
  }
  const sets = s.exercises.flatMap(([n, k]) => Array<string>(k).fill(n));
  const w = sets.map((n) => EX_WEIGHT[n] ?? 1), tot = w.reduce((a, b) => a + b, 0);
  sets.forEach((n, i) => { acc += (s.vol * w[i]) / tot; pts.push({ x: i + 1, y: acc, tip: `Set ${i + 1} · ${n}\n${volStr(acc)} so far` }); });
  return pts;
}
function cumulativeByDay(sessions: LoggedSession[], start: Date, days: number, until?: Date): Point[] {
  const out: Point[] = [];
  let acc = 0;
  for (let i = 0; i < days; i++) {
    const d = addDays(start, i);
    if (until && d > until) break;
    const add = sessions.filter((s) => +s.d === +d).reduce((a, s) => a + s.vol, 0);
    acc += add;
    out.push({ x: i, y: acc, tip: `${d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} · ${add ? '+' + volStr(add) : 'rest'}\n${volStr(acc)} so far` });
  }
  return out;
}

export type RangeSummary = {
  when: string;
  empty: boolean;                        // nothing logged yet at all
  score: ScoreBlock;
  map: { sets: GroupSets; brightness: number; legend: [string, string, string]; attnLabel: string; attn: GroupKey[] };
  volume: { total: [string, string]; sub: string; cur: Point[]; prev?: Point[]; curName: string; prevName?: string; xMax: number; xTicks: [number, string][] } | null;
  volumeEmpty: string;
  highlights: Highlight[];
};

export function summarise(range: RangeKey, profile: Profile): RangeSummary {
  const t = today();
  const r = rangeDef(range, t);
  const S = between(r.a, r.b);
  const P = r.pa && r.pb ? between(r.pa, r.pb) : null;
  const raw = S.reduce((acc, s) => tallyGroups(s.exercises, acc), emptyGroupSets());

  // muscle map: today's sets, or sets per week averaged over the part of the range so far
  const weeks = range === 'day' || range === 'week' ? 1 : (daysBetween(r.a, new Date(Math.min(+r.b, +t))) + 1) / 7;
  const sets = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, v / weeks])) as GroupSets;
  const keys = Object.keys(GROUPS) as GroupKey[];
  const asc = [...keys].sort((a, b) => sets[a] - sets[b]);
  const map = range === 'day'
    ? { sets, brightness: 20 / 8, legend: ['0 sets', 'Sets today', '8+'] as [string, string, string], attnLabel: 'Trained today', attn: keys.filter((k) => sets[k] >= 1).sort((a, b) => sets[b] - sets[a]) }
    : { sets, brightness: 1, legend: ['0', `Target 10–20 sets ${range === 'week' ? 'this week' : 'per week'}`, '20+'] as [string, string, string], attnLabel: 'Needs attention', attn: asc.slice(0, 3).filter((k) => sets[k] < 10) };

  const score = scoreBlock(range, r, S, P, profile);

  // volume
  let volume: RangeSummary['volume'] = null;
  if (range === 'day') {
    const s = S[S.length - 1];
    if (s) {
      const prev = history.filter((x) => x.name === s.name && x.d < t).pop();
      const cur = sessionSeries(s), pv = prev && sessionSeries(prev);
      volume = { total: volText(s.vol), sub: prev && prev.vol ? `${signed(pct(s.vol, prev.vol))}% vs your last ${s.name.toLowerCase()} session` : '',
        cur, prev: pv, curName: 'Today', prevName: prev ? `Last ${s.name.toLowerCase()} (${prev.date})` : undefined,
        xMax: Math.max(cur.length, pv?.length ?? 0) - 1, xTicks: [[0, 'Start'], [cur.length - 1, `${cur.length - 1} sets`]] };
    }
  } else if (range === 'year') {
    const months = Array.from({ length: 12 }, (_, i) => new Date(r.a.getFullYear(), r.a.getMonth() + i, 1));
    const cur = months.map((m, i) => {
      const y = between(m, monthEnd(m)).reduce((a, s) => a + s.vol, 0);
      return { x: i, y, tip: `${m.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}\n${volStr(y)}` };
    });
    const total = cur.reduce((a, p) => a + p.y, 0);
    const active = cur.slice(0, 11).filter((p) => p.y > 0);
    if (total > 0) volume = { total: volText(total), sub: active.length ? `${volStr(avg(active.map((p) => p.y)))} a month on average` : 'Your first month of training',
      cur, curName: r.curName, xMax: 11, xTicks: months.map((m, i): [number, string] => [i, m.toLocaleDateString('en-US', { month: 'narrow' })]) };
  } else {
    const days = daysBetween(r.a, r.b) + 1;
    const cur = cumulativeByDay(S, r.a, days, t);
    const prev = cumulativeByDay(P ?? [], r.pa!, daysBetween(r.pa!, r.pb!) + 1);
    const total = cur[cur.length - 1].y, same = prev[Math.min(cur.length - 1, prev.length - 1)].y;
    if (total > 0 || prev[prev.length - 1].y > 0) volume = {
      total: volText(total), sub: same ? `${signed(pct(total, same))}% vs ${r.prevName} at this point` : `Nothing logged ${r.prevName} by this point`, cur, prev,
      curName: r.curName, prevName: r.prevName && r.prevName[0].toUpperCase() + r.prevName.slice(1), xMax: days - 1,
      xTicks: range === 'week' ? ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((l, i): [number, string] => [i, l]) : [0, 7, 14, 21, 28].map((i): [number, string] => [i, String(i + 1)]),
    };
  }
  const volumeEmpty = range === 'day' ? (history.length ? 'Rest day. No volume logged.' : 'No volume logged yet.') : `No volume logged ${r.noun}.`;

  // highlights
  const low = asc[0], top = asc[asc.length - 1];
  const pick = EXERCISES.find((x) => groupOf(x.primary) === low && x.equipment === 'C') ?? EXERCISES.find((x) => groupOf(x.primary) === low);
  const bestPR = S.flatMap((s) => s.results).filter((x) => x.status === 'best').sort((a, b) => (b.e1rm - b.best) / b.best - (a.e1rm - a.best) / a.best)[0];
  const prCard: Highlight | null = bestPR
    ? isBW(bestPR.name)
      ? { color: 'orange', icon: 'up', title: liftName(bestPR.name), text: `New best: ${repsFrom(bestPR.e1rm, profile.bodyweight) - repsFrom(bestPR.best, profile.bodyweight)} more reps than your 4-week best.`, big: [String(repsFrom(bestPR.e1rm, profile.bodyweight)), 'reps'] }
      : { color: 'orange', icon: 'up', title: liftName(bestPR.name), text: `New best: your estimated one-rep max is up ${signedKg(bestPR.e1rm - bestPR.best).replace('+', '')} on your 4-week best.`, big: [String(Math.round(bestPR.e1rm)), 'kg'] }
    : null;
  const lowCard = (text: string): Highlight => ({ color: 'coral', icon: 'alert', title: GROUPS[low], text });
  let highlights: (Highlight | null)[] = [];
  if (range === 'day') {
    const s = S[S.length - 1];
    if (s) {
      const trained = map.attn.slice(0, 3).map((k) => GROUPS[k].toLowerCase());
      const week = weeklyGroupSets(), lowWeek = [...keys].sort((a, b) => week[a] - week[b])[0];
      highlights = [prCard, trained.length ? { color: 'coral', icon: 'body', title: "Today's Focus", text: `${s.name}: you worked ${joinList(trained)}. Lowest this week is ${GROUPS[lowWeek].toLowerCase()} (${lastTrainedText(lowWeek)}).` } : null];
    }
  } else if (S.length) {
    const tip = pick ? ` Try adding ${pick.name.toLowerCase()} to your next session.` : '';
    if (range === 'week') {
      highlights = [prCard, lowCard(`${GROUPS[low]} got ${fmt1(sets[low])} sets this week, the fewest of any muscle. ${GROUPS[top]} got the most, with ${fmt1(sets[top])}.${tip}`)];
    } else if (range === 'month') {
      const prevSame = (P ?? []).filter((s) => s.d.getDate() <= t.getDate()).length;
      const d = S.length - prevSame;
      highlights = [
        { color: 'blue', icon: 'cal', title: 'Consistency', text: prevSame ? `${S.length} workouts so far this month, ${d === 0 ? 'the same as' : `${Math.abs(d)} ${d > 0 ? 'more' : 'fewer'} than`} ${r.prevName} at this point.` : `${S.length} workout${S.length === 1 ? '' : 's'} so far this month.`, big: [String(S.length), S.length === 1 ? 'workout' : 'workouts'] },
        lowCard(`This month ${GROUPS[low].toLowerCase()} averaged ${fmt1(sets[low])} sets a week, the lowest of any muscle.${pick ? ` Adding ${pick.name.toLowerCase()} twice a week would bring it into range.` : ''}`),
      ];
    } else {
      // average session volume: first month with workouts vs the latest
      const months = Array.from({ length: 12 }, (_, i) => new Date(r.a.getFullYear(), r.a.getMonth() + i, 1)).map((m) => ({ m, s: between(m, monthEnd(m)) })).filter((x) => x.s.length);
      const first = months[0], last = months[months.length - 1];
      const perSession = (x: typeof first) => x.s.reduce((a, s) => a + s.vol, 0) / x.s.length;
      const up = months.length > 1 ? pct(perSession(last), perSession(first)) : null;
      highlights = [
        up !== null ? { color: 'blue', icon: 'up', title: 'Progress', text: `Your average session ${up >= 0 ? `now moves ${up}% more` : `moves ${Math.abs(up)}% less`} weight than it did in ${monthName(first.m)}.`, big: [signed(up), '%'] } : null,
        lowCard(`Across the year, ${GROUPS[low].toLowerCase()} averaged ${fmt1(sets[low])} sets a week, the lowest of any muscle. ${GROUPS[top]} led with ${fmt1(sets[top])}.`),
      ];
    }
  }

  return { when: r.when, empty: history.length === 0, score, map, volume, volumeEmpty, highlights: highlights.filter(Boolean) as Highlight[] };
}

export { sessionSets };
