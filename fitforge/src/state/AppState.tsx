import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { DEFAULT_PROFILE, Profile } from '../data/profile';
import { WorkoutRecord, loadHistory, removeWorkout, setHistoryProfile, setSampleData, upsertWorkout } from '../data/history';
import { CustomExercise, customList, registerCustom } from '../data/customExercises';
import * as storage from './storage';

// App-wide state. Data lives on the phone (see storage.ts); `version` goes up after every change so
// screens that read the shared history recompute.
type AppState = {
  ready: boolean;                    // false while saved data is loading
  profile: Profile;
  profileSet: boolean;               // false until the user has filled in their profile once
  sample: boolean;                   // showing the sample year alongside their own workouts
  version: number;
  saveProfile: (p: Profile) => void;
  saveWorkout: (w: WorkoutRecord) => void;   // new or edited
  deleteWorkout: (id: string) => void;
  addCustomExercise: (x: CustomExercise) => void;
  setSample: (on: boolean) => void;
};

const Ctx = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [profileSet, setProfileSet] = useState(false);
  const [sample, setSampleState] = useState(false);
  const [version, setVersion] = useState(0);
  const bump = () => setVersion((v) => v + 1);

  useEffect(() => {
    let live = true;
    storage.loadAll().then((saved) => {
      if (!live) return;
      try {
        registerCustom(saved.custom.filter((x) => x && typeof x.name === 'string'));
        const p = saved.profile ?? DEFAULT_PROFILE;
        const sampleOn = !!saved.settings?.sample;
        loadHistory({ records: saved.workouts, sample: sampleOn, profile: p });
        setProfile(p); setProfileSet(!!saved.profile); setSampleState(sampleOn);
      } catch (e) {
        console.warn('FitForge: saved data could not be read', e);
        loadHistory({ records: [], sample: false, profile: DEFAULT_PROFILE });
      }
      setReady(true); bump();
    }).catch(() => { if (live) { loadHistory({ records: [], sample: false, profile: DEFAULT_PROFILE }); setReady(true); bump(); } });
    return () => { live = false; };
  }, []);

  const saveProfile = useCallback((p: Profile) => {
    setHistoryProfile(p); setProfile(p); setProfileSet(true); bump();
    storage.saveProfile(p);
  }, []);
  const saveWorkout = useCallback((w: WorkoutRecord) => { storage.saveWorkouts(upsertWorkout(w)); bump(); }, []);
  const deleteWorkout = useCallback((id: string) => { storage.saveWorkouts(removeWorkout(id)); bump(); }, []);
  const addCustomExercise = useCallback((x: CustomExercise) => {
    registerCustom([x]); storage.saveCustom(customList()); bump();
  }, []);
  const setSample = useCallback((on: boolean) => { setSampleData(on); setSampleState(on); storage.saveSettings({ sample: on }); bump(); }, []);

  const value = useMemo(
    () => ({ ready, profile, profileSet, sample, version, saveProfile, saveWorkout, deleteWorkout, addCustomExercise, setSample }),
    [ready, profile, profileSet, sample, version, saveProfile, saveWorkout, deleteWorkout, addCustomExercise, setSample],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppState() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAppState must be used inside AppStateProvider');
  return v;
}
