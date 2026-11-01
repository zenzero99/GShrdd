// The muscle model: 16 muscle groups (what the map and score use) and the heads exercises are tagged with.
export type GroupKey = 'chest' | 'shoulders' | 'traps' | 'upper_back' | 'lats' | 'lower_back' | 'biceps' | 'triceps' | 'forearms' | 'abs' | 'obliques' | 'glutes' | 'quads' | 'hamstrings' | 'adductors' | 'calves';
export type HeadKey = 'chest_upper' | 'chest_lower' | 'delt_front' | 'delt_side' | 'delt_rear' | 'traps_upper' | 'traps_mid' | 'traps_lower' | 'teres' | 'lats' | 'erectors' | 'biceps_long' | 'biceps_short' | 'triceps_long' | 'triceps_lateral' | 'brachioradialis' | 'forearm_flexors' | 'forearm_extensors' | 'abs' | 'obliques' | 'glute_max' | 'glute_med' | 'rectus_femoris' | 'vastus_lateralis' | 'vastus_medialis' | 'biceps_femoris' | 'semitendinosus' | 'adductors' | 'calf_gastroc' | 'calf_soleus' | 'tibialis';
export type TargetKey = GroupKey | HeadKey;

export const GROUPS: Record<GroupKey, string> = {
  chest: 'Chest',
  shoulders: 'Shoulders',
  traps: 'Traps',
  upper_back: 'Upper back',
  lats: 'Lats',
  lower_back: 'Lower back',
  biceps: 'Biceps',
  triceps: 'Triceps',
  forearms: 'Forearms',
  abs: 'Abs',
  obliques: 'Obliques',
  glutes: 'Glutes',
  quads: 'Quads',
  hamstrings: 'Hamstrings',
  adductors: 'Adductors',
  calves: 'Calves',
};

// Each head belongs to one group (head -> [group, label])
export const HEADS: Record<HeadKey, [GroupKey, string]> = {
  chest_upper: ['chest', 'Upper chest'],
  chest_lower: ['chest', 'Mid & lower chest'],
  delt_front: ['shoulders', 'Front delts'],
  delt_side: ['shoulders', 'Side delts'],
  delt_rear: ['shoulders', 'Rear delts'],
  traps_upper: ['traps', 'Upper traps'],
  traps_mid: ['upper_back', 'Mid traps & rhomboids'],
  traps_lower: ['upper_back', 'Lower traps'],
  teres: ['upper_back', 'Teres & infraspinatus'],
  lats: ['lats', 'Lats'],
  erectors: ['lower_back', 'Spinal erectors'],
  biceps_long: ['biceps', 'Biceps long head'],
  biceps_short: ['biceps', 'Biceps short head'],
  triceps_long: ['triceps', 'Triceps long head'],
  triceps_lateral: ['triceps', 'Triceps lateral head'],
  brachioradialis: ['forearms', 'Brachioradialis'],
  forearm_flexors: ['forearms', 'Wrist flexors'],
  forearm_extensors: ['forearms', 'Wrist extensors'],
  abs: ['abs', 'Abs'],
  obliques: ['obliques', 'Obliques'],
  glute_max: ['glutes', 'Glute max'],
  glute_med: ['glutes', 'Glute med'],
  rectus_femoris: ['quads', 'Rectus femoris'],
  vastus_lateralis: ['quads', 'Outer quad'],
  vastus_medialis: ['quads', 'Teardrop (VMO)'],
  biceps_femoris: ['hamstrings', 'Outer hamstring'],
  semitendinosus: ['hamstrings', 'Inner hamstring'],
  adductors: ['adductors', 'Adductors'],
  calf_gastroc: ['calves', 'Gastrocnemius'],
  calf_soleus: ['calves', 'Soleus'],
  tibialis: ['calves', 'Tibialis'],
};
