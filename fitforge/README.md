# FitForge

A workout tracker that shows which muscles you've trained, scores each workout (progressive overload,
consistency, longevity) and tracks your progress. Built with Expo (SDK 57) and React Native.

## Run it on your phone

1. Install [Node.js](https://nodejs.org) (LTS) and the **Expo Go** app on your phone.
2. In this folder, run:

   ```bash
   npm install
   npx expo start
   ```

3. Scan the QR code with your phone's camera (iPhone) or the Expo Go app (Android).

Workouts, your profile and custom exercises are saved on the phone.

## Where things are

| Folder | What's in it |
| --- | --- |
| `App.tsx` | The three tabs: Summary, Log and Coach |
| `src/screens` | The screens |
| `src/components` | Muscle map, score rings, volume chart, exercise picker, profile and licences sheets |
| `src/data` | Muscle groups, exercises, scoring, date ranges, workout history and sample data |
| `src/state` | App-wide state and on-phone storage |
| `scripts` | Tools that generate data files (body artwork, design preview bundle) |

## Checks

```bash
npx tsc --noEmit          # typecheck
npx expo export --platform android   # make sure the app bundles
```

## Credits

The male and female muscle map artwork is adapted from [MuscleMap](https://github.com/melihcolpan/MuscleMap)
by Melih Colpan (MIT licence). The licence is shown in the app under Profile → Open-Source Licences.
