// Turns logged sets into weekly sets per muscle group.
// A set counts fully for its main muscle and half for each helper muscle group.
// (Exercises are also tagged with the muscle head they emphasise; that detail is kept for coaching, not shown on the map.)
import { GROUPS, GroupKey, HEADS, TargetKey } from './muscleModel';
import { EXERCISE_BY_NAME } from './exercises';

export type LoggedExercise = [name: string, sets: number];
export type GroupSets = Record<GroupKey, number>;

export const groupOf = (k: TargetKey): GroupKey => (k in HEADS ? HEADS[k as keyof typeof HEADS][0] : (k as GroupKey));

export const emptyGroupSets = (): GroupSets =>
  Object.fromEntries(Object.keys(GROUPS).map((k) => [k, 0])) as GroupSets;

export function tallyGroups(exercises: LoggedExercise[], into: GroupSets = emptyGroupSets()): GroupSets {
  exercises.forEach(([name, sets]) => {
    const ex = EXERCISE_BY_NAME[name];
    if (!ex) return;
    const main = groupOf(ex.primary);
    into[main] += sets;
    new Set(ex.secondary.map(groupOf)).forEach((g) => { if (g !== main) into[g] += sets * 0.5; });
  });
  return into;
}

export const fmtSets = (v: number) => { const r = Math.round(v * 10) / 10; return r % 1 ? r.toFixed(1) : String(r); };

export const lowestGroups = (sets: GroupSets, n: number) =>
  (Object.keys(sets) as GroupKey[]).sort((a, b) => sets[a] - sets[b]).slice(0, n);

export const highestGroup = (sets: GroupSets) =>
  (Object.keys(sets) as GroupKey[]).sort((a, b) => sets[b] - sets[a])[0];
