// Exercises the user adds themselves. They join the built-in list (EXERCISES / EXERCISE_BY_NAME),
// so the picker, the muscle map and the score treat them like any other exercise.
import { EXERCISES, EXERCISE_BY_NAME, Equipment } from './exercises';
import type { GroupKey } from './muscleModel';

export type CustomExercise = { name: string; equipment: Equipment; primary: GroupKey; secondary: GroupKey[] };

const custom: CustomExercise[] = [];
export const isCustom = (name: string) => custom.some((x) => x.name === name);
export const customList = () => [...custom];
export const cleanName = (n: string) => n.trim().replace(/\s+/g, ' ');
/** An exercise with this name already exists (case-insensitive). */
export const nameTaken = (n: string) => EXERCISES.some((x) => x.name.toLowerCase() === cleanName(n).toLowerCase());

export function registerCustom(list: CustomExercise[]) {
  list.forEach((x) => {
    if (EXERCISE_BY_NAME[x.name]) return;
    const ex = { name: x.name, equipment: x.equipment, primary: x.primary, secondary: x.secondary.filter((g) => g !== x.primary) };
    EXERCISES.push(ex);
    EXERCISE_BY_NAME[x.name] = ex;
    custom.push(x);
  });
}
