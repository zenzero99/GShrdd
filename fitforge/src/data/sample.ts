// Sample data: a year of training ending today, with a top set per exercise. Seeded, so it's the same
// every time. Shown only when "Sample data" is switched on, so new users can explore the dashboard.
import { EXERCISE_BY_NAME } from './exercises';
import type { LoggedExercise } from './volume';
import type { TopSet } from './score';
import { addDays, dateKey, shortDate, weekStart, weekdayShort } from './dates';

export type SampleSession = {
  id: string; sample: true; d: Date; date: string; day: string; name: string; mins: number; vol: number;
  exercises: LoggedExercise[]; perf: Record<string, TopSet>; deload: boolean; startedAt: number;
};

const PLANS: Record<number, [string, number, number, LoggedExercise[]]> = {
  1: ['Upper', 58, 6200, [['Barbell Bench Press', 3], ['Lat Pulldown', 3], ['Seated Dumbbell Shoulder Press', 3], ['Chest-Supported Dumbbell Row', 3], ['EZ-Bar Curl', 2], ['Barbell Wrist Curl', 2]]],
  2: ['Arms & Core', 40, 3150, [['Incline Dumbbell Curl', 3], ['Rope Pushdown', 3], ['Overhead Cable Extension', 3], ['Hanging Leg Raise', 3]]],
  3: ['Legs', 65, 9750, [['Barbell Back Squat', 4], ['Romanian Deadlift', 4], ['45° Leg Press', 3], ['Lying Leg Curl', 3], ['Leg Extension', 3], ['Standing Calf Raise Machine', 3]]],
  4: ['Pull', 48, 6050, [['Pull-Up', 4], ['Barbell Bent-Over Row', 4], ['Seated Cable Row', 3], ['Face Pull', 3], ['Hammer Curl', 3]]],
  5: ['Push', 52, 6850, [['Barbell Bench Press', 4], ['Incline Dumbbell Press', 3], ['Machine Shoulder Press', 3], ['Cable Lateral Raise', 3], ['Pec Deck Fly', 2], ['Triceps Dip', 3]]],
  6: ['Legs B', 55, 8600, [['Hack Squat', 4], ['Hip Thrust Machine', 3], ['Seated Leg Curl', 3], ['Bulgarian Split Squat', 3], ['Seated Calf Raise', 3], ['Dumbbell Shrug', 3], ['Cable Crunch', 3]]],
};
// Current estimated 1RM (kg) and working reps per exercise; bodyweight exercises list reps only.
const BASE: Record<string, [number, number]> = {
  'Barbell Bench Press': [101, 6], 'Lat Pulldown': [86, 10], 'Seated Dumbbell Shoulder Press': [34, 10], 'Chest-Supported Dumbbell Row': [40, 10],
  'EZ-Bar Curl': [46, 10], 'Barbell Wrist Curl': [52, 15], 'Incline Dumbbell Curl': [19, 12], 'Rope Pushdown': [42, 12], 'Overhead Cable Extension': [35, 12],
  'Barbell Back Squat': [142, 5], 'Romanian Deadlift': [136, 8], '45° Leg Press': [262, 10], 'Lying Leg Curl': [60, 12], 'Leg Extension': [86, 12],
  'Standing Calf Raise Machine': [122, 12], 'Barbell Bent-Over Row': [102, 8], 'Seated Cable Row': [92, 10], 'Face Pull': [36, 15], 'Hammer Curl': [23, 10],
  'Incline Dumbbell Press': [40, 10], 'Machine Shoulder Press': [82, 10], 'Cable Lateral Raise': [13, 15], 'Pec Deck Fly': [76, 12],
  'Hack Squat': [182, 10], 'Hip Thrust Machine': [162, 10], 'Seated Leg Curl': [66, 12], 'Bulgarian Split Squat': [34, 10], 'Seated Calf Raise': [82, 15],
  'Dumbbell Shrug': [46, 12], 'Cable Crunch': [62, 15],
};
const BW_REPS: Record<string, number> = { 'Pull-Up': 11, 'Triceps Dip': 14, 'Hanging Leg Raise': 15 };

function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const halfKg = (v: number) => Math.round(v * 2) / 2;

let cache: { key: string; list: SampleSession[] } | null = null;

/** One year of sample workouts ending on `end`. Sundays are rest days; this week is a strong week. */
export function sampleHistory(end: Date): SampleSession[] {
  const key = dateKey(end);
  if (cache?.key === key) return cache.list;
  const R = rng(42), thisWeekStart = weekStart(end);
  const out: SampleSession[] = [];
  for (let i = 364; i >= 0; i--) {
    const d = addDays(end, -i), dow = d.getDay(), prog = 1 - i / 364;
    const thisWeek = +d >= +thisWeekStart;
    const deload = !thisWeek && Math.floor(i / 7) % 7 === 3; // one lighter week every 7 weeks
    if (dow === 0) continue;
    if (!thisWeek) {
      if (dow === 6 && R() > 0.3) continue;
      if (dow !== 6 && R() < 0.1) continue;
    }
    const [name, mins, base, exercises] = PLANS[dow];
    const perf: Record<string, TopSet> = {};
    exercises.forEach(([ex]) => {
      const noise = thisWeek ? 1 + R() * 0.03 : 1 + (R() - 0.5) * 0.045;
      const level = (0.82 + 0.18 * prog) * noise * (deload ? 0.88 : 1);
      if (EXERCISE_BY_NAME[ex]?.equipment === 'W') {
        perf[ex] = { kg: 0, reps: Math.max(3, Math.round(BW_REPS[ex] * level)) };
      } else {
        const [e1, reps] = BASE[ex];
        perf[ex] = { kg: halfKg((e1 * level) / (1 + reps / 30)), reps };
      }
    });
    out.push({
      id: `sample-${dateKey(d)}`, sample: true, d, date: shortDate(d), day: weekdayShort(d), name, exercises, perf, deload,
      startedAt: +d + 18 * 36e5,
      mins: thisWeek ? mins : Math.round(mins + (R() - 0.5) * 14),
      vol: thisWeek ? base : Math.round((base * (0.78 + 0.22 * prog) * (0.93 + R() * 0.14) * (deload ? 0.75 : 1)) / 10) * 10,
    });
  }
  cache = { key, list: out };
  return out;
}
