// Saves everything on the phone with AsyncStorage. Each key holds JSON with a version number,
// so the format can change later (and move to Supabase) without losing data.
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Profile } from '../data/profile';
import type { WorkoutRecord } from '../data/history';
import type { CustomExercise } from '../data/customExercises';

export type Settings = { sample: boolean };
export type Saved = {
  profile: Profile | null;       // null until the user has filled it in once
  workouts: WorkoutRecord[];
  custom: CustomExercise[];
  settings: Settings;
};

const KEYS = { profile: 'fitforge.profile', workouts: 'fitforge.workouts', custom: 'fitforge.customExercises', settings: 'fitforge.settings', draft: 'fitforge.draft' } as const;
const VERSION = 1;

async function read<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed?.v === VERSION ? (parsed.data as T) : fallback;
  } catch {
    return fallback; // unreadable data shouldn't stop the app opening
  }
}
async function write(key: string, data: unknown) {
  try { await AsyncStorage.setItem(key, JSON.stringify({ v: VERSION, data })); } catch (e) { console.warn('FitForge: could not save', key, e); }
}

export async function loadAll(): Promise<Saved> {
  const [profile, workouts, custom, settings] = await Promise.all([
    read<Profile | null>(KEYS.profile, null),
    read<WorkoutRecord[]>(KEYS.workouts, []),
    read<CustomExercise[]>(KEYS.custom, []),
    read<Settings>(KEYS.settings, { sample: false }),
  ]);
  return { profile, workouts: Array.isArray(workouts) ? workouts : [], custom: Array.isArray(custom) ? custom : [], settings };
}

export const saveProfile = (p: Profile) => write(KEYS.profile, p);
export const saveWorkouts = (w: WorkoutRecord[]) => write(KEYS.workouts, w);
export const saveCustom = (c: CustomExercise[]) => write(KEYS.custom, c);
export const saveSettings = (s: Settings) => write(KEYS.settings, s);

// The workout in progress, so closing the app mid-workout doesn't lose it.
export const loadDraft = <T,>() => read<T | null>(KEYS.draft, null);
export const saveDraft = (d: unknown) => (d ? write(KEYS.draft, d) : AsyncStorage.removeItem(KEYS.draft).catch(() => {}));
