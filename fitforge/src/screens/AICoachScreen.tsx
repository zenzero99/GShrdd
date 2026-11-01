import React, { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '../components/Icon';
import { colors, type } from '../theme';
import { GROUPS } from '../data/muscleModel';
import { EXERCISE_BY_NAME } from '../data/exercises';
import { getRecord, history, weeklyGroupSets } from '../data/history';
import { useAppState } from '../state/AppState';
import { fmtSets, groupOf, lowestGroups } from '../data/volume';
import { addDays, dateKey, today } from '../data/dates';

// Canned replies for now. Next step: send the message plus the user's week to the Claude API.
type Message = { role: 'ai' | 'me'; text: string; logged?: { name: string; group: string; sets: number; reps: number; kg?: number } };

const EX_WORDS: [RegExp, string][] = [
  [/bench|chest press|push.?up/i, 'Barbell Bench Press'], [/squat/i, 'Barbell Back Squat'], [/dead/i, 'Barbell Deadlift'],
  [/ohp|overhead press|shoulder press/i, 'Standing Overhead Press'], [/lateral/i, 'Dumbbell Lateral Raise'], [/row/i, 'Barbell Bent-Over Row'],
  [/pull.?up|chin/i, 'Pull-Up'], [/pulldown/i, 'Lat Pulldown'], [/curl/i, 'Dumbbell Curl'], [/pushdown/i, 'Rope Pushdown'],
];
const SUGGESTIONS = ['Bench 4x8 at 80kg', 'What am I neglecting?', 'Optimise my split for aesthetics', 'Is today a rest day?'];

function reply(text: string): Message {
  const m = text.match(/(\d+)\s*[x×]\s*(\d+)(?:\s*(?:@|at)?\s*(\d+(?:\.\d+)?)\s*kg)?/i);
  const hit = EX_WORDS.find(([re]) => re.test(text));
  if (m && hit) {
    const ex = EXERCISE_BY_NAME[hit[1]];
    if (!m[3] && ex.equipment !== 'W') return { role: 'ai', text: `What weight did you use? Add it in kg, like “${text.trim()} at 60kg”, and I'll log it.` };
    return { role: 'ai', text: '', logged: { name: ex.name, group: GROUPS[groupOf(ex.primary)], sets: +m[1], reps: +m[2], kg: m[3] ? +m[3] : undefined } };
  }
  const t = text.toLowerCase();
  if (/neglect|miss|under|left out|behind/.test(t)) {
    return { role: 'ai', text: `Lowest this week: ${lowestGroups(weeklyGroupSets(), 3).map((g) => `${GROUPS[g].toLowerCase()} (${fmtSets(weeklyGroupSets()[g])} sets)`).join(', ')}. Two or three hard sets of each after your next session would close most of the gap.` };
  }
  if (/aesthetic|split|optimi/.test(t)) {
    return { role: 'ai', text: 'For aesthetics, shoulder width and arms matter most. Your side delts have had only a few sets this week, so add lateral raises on push days, start push with an incline press for the upper chest, and add one overhead triceps extension.' };
  }
  if (/rest|recover|tired/.test(t)) {
    let streak = 0;
    for (let i = 1; i <= 7; i++) { const d = addDays(today(), -i); if (history.some((s) => +s.d === +d)) streak++; else break; }
    return { role: 'ai', text: streak >= 4 ? `You've trained ${streak} days in a row. Take today as active recovery: a 30-minute walk and some mobility work.` : `You've trained ${streak} day${streak === 1 ? '' : 's'} in a row, so you're fine to train if you feel good. If you're sore, pick muscles you haven't worked in the last two days.` };
  }
  return { role: 'ai', text: 'To log a set, include the exercise, sets × reps and weight, like “row 3x10 at 60kg”.' };
}

export default function AICoachScreen() {
  const { profile, saveWorkout } = useAppState();
  const [messages, setMessages] = useState<Message[]>(() => {
    const h = new Date().getHours();
    const hello = `${h < 12 ? 'Morning' : h < 17 ? 'Afternoon' : 'Evening'}${profile.name ? `, ${profile.name}` : ''}.`;
    if (!history.length) return [{ role: 'ai', text: `${hello} Once you've logged a few workouts I'll point out what's behind. Ask me anything, or log a set like “squat 4x6 at 120kg”.` }];
    const [a, b] = lowestGroups(weeklyGroupSets(), 2);
    return [{ role: 'ai', text: `${hello} ${GROUPS[a]} and ${GROUPS[b].toLowerCase()} are behind this week. Log a set here, like “squat 4x6 at 120kg”, or ask me anything.` }];
  });
  const [input, setInput] = useState('');
  const scroll = useRef<ScrollView>(null);

  const send = (text: string) => {
    const t = text.trim();
    if (!t) return;
    const r = reply(t);
    if (r.logged) {
      // Sets logged here go into today's "Coach log" workout, so they count like any other workout
      const id = `coach-${dateKey(today())}`, prev = getRecord(id), l = r.logged;
      const exercises = prev ? prev.exercises.map((x) => ({ ...x, sets: [...x.sets] })) : [];
      let ex = exercises.find((x) => x.name === l.name);
      if (!ex) { ex = { name: l.name, sets: [] }; exercises.push(ex); }
      for (let i = 0; i < l.sets; i++) ex.sets.push({ kg: l.kg ?? 0, reps: l.reps });
      saveWorkout({ id, date: dateKey(today()), startedAt: prev?.startedAt ?? Date.now(), name: 'Coach Log', mins: prev?.mins ?? 1, exercises });
    }
    setMessages((prev) => [...prev, { role: 'me', text: t }, r]);
    setInput('');
  };

  return (
    <SafeAreaView style={st.root} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView ref={scroll} contentContainerStyle={st.pad} onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}>
          <View style={st.top}>
            <Text style={type.date}>AI Coach</Text>
            <Text style={type.largeTitle}>Coach</Text>
          </View>
          <View style={{ gap: 8 }}>
            {messages.map((msg, i) => msg.logged ? (
              <View key={i} style={st.logCard}>
                <Text style={st.logT}>Logged {msg.logged.name}</Text>
                <Text style={type.sub}>
                  {msg.logged.group}{msg.logged.kg ? ` · ${(msg.logged.sets * msg.logged.reps * msg.logged.kg).toLocaleString()} kg volume` : ''} · saved to today's Coach Log
                </Text>
                <Text style={[type.value, { fontSize: 26, marginTop: 6 }]}>
                  {msg.logged.sets} × {msg.logged.reps}<Text style={type.unit}> {msg.logged.kg ? `${msg.logged.kg} kg` : 'bodyweight'}</Text>
                </Text>
              </View>
            ) : (
              <View key={i} style={[st.bubble, msg.role === 'me' ? st.me : st.ai]}>
                <Text style={st.bubbleText}>{msg.text}</Text>
              </View>
            ))}
          </View>
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={st.sugs} keyboardShouldPersistTaps="handled">
          {SUGGESTIONS.map((s) => (
            <Pressable key={s} style={st.sug} onPress={() => send(s)}><Text style={st.sugText}>{s}</Text></Pressable>
          ))}
        </ScrollView>
        <View style={st.composer}>
          <TextInput
            style={st.input} value={input} onChangeText={setInput} placeholder="Log a set or ask anything"
            placeholderTextColor={colors.ink3} onSubmitEditing={() => send(input)} returnKeyType="send"
          />
          <Pressable style={st.round} accessibilityLabel="Voice log" onPress={() => { /* TODO: record and transcribe */ }}>
            <Icon name="mic" size={18} color={colors.ink2} />
          </Pressable>
          <Pressable style={[st.round, st.go]} onPress={() => send(input)} accessibilityLabel="Send">
            <Icon name="send" size={18} color="#fff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  pad: { paddingHorizontal: 16, paddingBottom: 16 },
  top: { paddingTop: 20, paddingBottom: 14 },
  bubble: { maxWidth: '82%', paddingHorizontal: 13, paddingVertical: 9, borderRadius: 18 },
  ai: { backgroundColor: colors.card2, alignSelf: 'flex-start' },
  me: { backgroundColor: colors.blue, alignSelf: 'flex-end' },
  bubbleText: { color: colors.ink, fontSize: 16, lineHeight: 21 },
  logCard: { alignSelf: 'flex-start', width: '82%', backgroundColor: colors.card, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 12 },
  logT: { color: colors.ink, fontSize: 15, fontWeight: '600' },
  sugs: { gap: 6, paddingHorizontal: 16, paddingBottom: 8 },
  sug: { backgroundColor: colors.card, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  sugText: { color: colors.ink, fontSize: 14 },
  composer: { flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: 16, marginBottom: 10, backgroundColor: colors.card, borderRadius: 22, paddingLeft: 14, padding: 4 },
  input: { flex: 1, color: colors.ink, fontSize: 16, paddingVertical: 7 },
  round: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  go: { backgroundColor: colors.blue },
});
