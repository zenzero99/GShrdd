// Bundled (esbuild → global `FF`) into the design preview so it runs the app's real data and score logic.
export { GROUPS, HEADS } from '../src/data/muscleModel';
export { EXERCISES, EXERCISE_BY_NAME, EQUIPMENT } from '../src/data/exercises';
export { tallyGroups, groupOf, fmtSets, emptyGroupSets } from '../src/data/volume';
export {
  history, loadHistory, upsertWorkout, removeWorkout, setHistoryProfile, setSampleData, getRecord, getRecords, newId,
  thisWeek, weeklyGroupSets, lastTrained, sessionSets, lastSets, bestE1rm, isBodyweight, topSet,
} from '../src/data/history';
export * as DATES from '../src/data/dates';
export { registerCustom, customList, nameTaken, cleanName, isCustom } from '../src/data/customExercises';
export { summarise, lastTrainedText, volText, joinList } from '../src/data/ranges';
export { scoreSession, e1rm } from '../src/data/score';
export { DEFAULT_PROFILE } from '../src/data/profile';
export { BODIES } from '../src/data/bodies';
export { heatColor, HEAT_ZERO } from '../src/theme';
