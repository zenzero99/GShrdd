export type Sex = 'male' | 'female';
export type Profile = { name: string; age: number; sex: Sex; bodyweight: number };

// Starting values for the profile form; the user fills in their own on first launch.
export const DEFAULT_PROFILE: Profile = { name: '', age: 26, sex: 'male', bodyweight: 78 };
