import React, { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from './Icon';
import { colors } from '../theme';
import { EQUIPMENT, EXERCISES, Equipment } from '../data/exercises';
import { GROUPS, GroupKey } from '../data/muscleModel';
import { groupOf } from '../data/volume';
import { cleanName, isCustom, nameTaken } from '../data/customExercises';
import { useAppState } from '../state/AppState';

const MUSCLE_GROUPS: Record<string, GroupKey[]> = {
  Chest: ['chest'], Back: ['lats', 'upper_back', 'lower_back'], Shoulders: ['shoulders'], Traps: ['traps'],
  Biceps: ['biceps'], Triceps: ['triceps'], Forearms: ['forearms'], Core: ['abs', 'obliques'],
  Quads: ['quads'], Hamstrings: ['hamstrings'], Glutes: ['glutes'], Adductors: ['adductors'], Calves: ['calves'],
};
const ALL_GROUPS = Object.keys(GROUPS) as GroupKey[];

type Props = { visible: boolean; onClose: () => void; onAdd: (names: string[]) => void };

export default function ExercisePicker({ visible, onClose, onAdd }: Props) {
  const { addCustomExercise, version } = useAppState();
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState('All');
  const [equip, setEquip] = useState<Equipment | 'All'>('All');
  const [picked, setPicked] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  const list = useMemo(() => {
    const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return EXERCISES.filter((x) =>
      (group === 'All' || MUSCLE_GROUPS[group].includes(groupOf(x.primary))) &&
      (equip === 'All' || x.equipment === equip) &&
      terms.every((t) => `${x.name} ${GROUPS[groupOf(x.primary)]} ${EQUIPMENT[x.equipment]}`.toLowerCase().includes(t)),
    ).sort((a, b) => a.name.localeCompare(b.name));
  }, [query, group, equip, version]);

  const toggle = (n: string) => setPicked((p) => (p.includes(n) ? p.filter((x) => x !== n) : [...p, n]));
  const reset = () => { setPicked([]); setQuery(''); setCreating(false); };
  const close = () => { reset(); onClose(); };
  const add = () => { onAdd(picked); reset(); };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={creating ? () => setCreating(false) : close}>
      <SafeAreaView style={s.root} edges={['top', 'bottom']}>
        {creating ? (
          <CreateExercise
            initialName={query}
            onCancel={() => setCreating(false)}
            onCreate={(x) => {
              addCustomExercise(x);
              setPicked((p) => [...p, x.name]); setQuery(x.name); setGroup('All'); setEquip('All'); setCreating(false);
            }}
          />
        ) : (
          <>
            <View style={s.head}>
              <Text style={s.title}>Add Exercise</Text>
              <Pressable onPress={close} style={s.iconBtn} accessibilityLabel="Close">
                <Icon name="x" size={18} color={colors.ink2} />
              </Pressable>
            </View>

            <View style={s.search}>
              <Icon name="search" size={18} color={colors.ink3} />
              <TextInput
                value={query} onChangeText={setQuery} placeholder={`Search ${EXERCISES.length} exercises`}
                placeholderTextColor={colors.ink3} style={s.searchInput} autoCorrect={false}
              />
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipRow} contentContainerStyle={s.chipGap}>
              {['All', ...Object.keys(MUSCLE_GROUPS)].map((g) => (
                <Pressable key={g} onPress={() => setGroup(g)} style={[s.chip, group === g && s.chipOn]}>
                  <Text style={[s.chipText, group === g && s.chipTextOn]}>{g === 'All' ? 'All Muscles' : g}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipRow} contentContainerStyle={s.chipGap}>
              {(['All', ...Object.keys(EQUIPMENT)] as (Equipment | 'All')[]).map((k) => (
                <Pressable key={k} onPress={() => setEquip(k)} style={[s.chip, equip === k && s.chipOn]}>
                  <Text style={[s.chipText, equip === k && s.chipTextOn]}>{k === 'All' ? 'All Equipment' : EQUIPMENT[k]}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={s.count}>{list.length} exercises</Text>

            <FlatList
              data={list}
              keyExtractor={(x) => x.name}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={<Text style={s.empty}>No matches. Try another name, clear the filters, or create it below.</Text>}
              ListFooterComponent={
                <Pressable onPress={() => setCreating(true)} style={s.createRow}>
                  <Icon name="plus" size={18} color={colors.blue} />
                  <Text style={s.createText}>{query.trim() && !list.length ? `Create “${cleanName(query)}”` : 'Create Custom Exercise'}</Text>
                </Pressable>
              }
              renderItem={({ item }) => {
                const on = picked.includes(item.name);
                return (
                  <Pressable onPress={() => toggle(item.name)} style={s.item}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.itemName}>{item.name}</Text>
                      <Text style={s.itemSub} numberOfLines={1}>
                        {EQUIPMENT[item.equipment]} · {GROUPS[groupOf(item.primary)]}{isCustom(item.name) ? ' · Custom' : ''}
                      </Text>
                    </View>
                    <View style={[s.tick, on && s.tickOn]}>{on && <Icon name="check" size={13} color="#fff" strokeWidth={3} />}</View>
                  </Pressable>
                );
              }}
            />

            <View style={s.foot}>
              <Pressable onPress={add} disabled={!picked.length} style={[s.addBtn, !picked.length && s.addBtnOff]}>
                <Text style={[s.addText, !picked.length && { color: colors.ink3 }]}>
                  {picked.length ? `Add ${picked.length} Exercise${picked.length === 1 ? '' : 's'}` : 'Select Exercises'}
                </Text>
              </Pressable>
            </View>
          </>
        )}
      </SafeAreaView>
    </Modal>
  );
}

/** Form for an exercise that isn't in the list: name, equipment, main muscle and helper muscles. */
function CreateExercise({ initialName, onCancel, onCreate }: {
  initialName: string; onCancel: () => void;
  onCreate: (x: { name: string; equipment: Equipment; primary: GroupKey; secondary: GroupKey[] }) => void;
}) {
  const [name, setName] = useState(cleanName(initialName));
  const [equipment, setEquipment] = useState<Equipment>('M');
  const [primary, setPrimary] = useState<GroupKey | null>(null);
  const [secondary, setSecondary] = useState<GroupKey[]>([]);
  const [err, setErr] = useState('');

  const save = () => {
    const n = cleanName(name);
    if (!n) return setErr('Give the exercise a name.');
    if (nameTaken(n)) return setErr('An exercise with that name already exists. Search for it instead.');
    if (!primary) return setErr('Pick the main muscle it works.');
    onCreate({ name: n, equipment, primary, secondary: secondary.filter((g) => g !== primary) });
  };
  const chips = <T extends string>(items: T[], label: (k: T) => string, on: (k: T) => boolean, press: (k: T) => void) => (
    <View style={s.wrap}>
      {items.map((k) => (
        <Pressable key={k} onPress={() => press(k)} style={[s.chip, on(k) && s.chipOn]}>
          <Text style={[s.chipText, on(k) && s.chipTextOn]}>{label(k)}</Text>
        </Pressable>
      ))}
    </View>
  );

  return (
    <>
      <View style={s.head}>
        <Pressable onPress={onCancel} hitSlop={10}><Text style={s.createText}>Back</Text></Pressable>
        <Text style={[s.title, { fontSize: 17 }]}>New Exercise</Text>
        <Pressable onPress={save} hitSlop={10}><Text style={[s.createText, { fontWeight: '600' }]}>Save</Text></Pressable>
      </View>
      <ScrollView contentContainerStyle={s.form} keyboardShouldPersistTaps="handled">
        <Text style={s.label}>Name</Text>
        <TextInput style={s.field} value={name} onChangeText={(t) => { setName(t); setErr(''); }} placeholder="e.g. Belt Squat" placeholderTextColor={colors.ink3} maxLength={50} />
        <Text style={s.label}>Equipment</Text>
        {chips(Object.keys(EQUIPMENT) as Equipment[], (k) => EQUIPMENT[k], (k) => k === equipment, setEquipment)}
        <Text style={s.label}>Main muscle</Text>
        {chips(ALL_GROUPS, (k) => GROUPS[k], (k) => k === primary, (k) => { setPrimary(k); setSecondary((p) => p.filter((g) => g !== k)); setErr(''); })}
        <Text style={s.label}>Helper muscles (optional, count as half a set)</Text>
        {chips(ALL_GROUPS.filter((k) => k !== primary), (k) => GROUPS[k], (k) => secondary.includes(k), (k) => setSecondary((p) => (p.includes(k) ? p.filter((g) => g !== k) : [...p, k])))}
        {!!err && <Text style={s.err}>{err}</Text>}
        <Pressable style={[s.addBtn, { marginTop: 20 }]} onPress={save}><Text style={s.addText}>Create Exercise</Text></Pressable>
      </ScrollView>
    </>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
  title: { color: colors.ink, fontSize: 20, fontWeight: '700' },
  iconBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.card2, alignItems: 'center', justifyContent: 'center' },
  search: { marginHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.card, borderRadius: 10, paddingHorizontal: 10 },
  searchInput: { flex: 1, color: colors.ink, fontSize: 16, paddingVertical: 9 },
  chipRow: { flexGrow: 0, marginTop: 10 },
  chipGap: { gap: 6, paddingHorizontal: 16 },
  chip: { backgroundColor: colors.card, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  chipOn: { backgroundColor: colors.ink },
  chipText: { color: colors.ink, fontSize: 14 },
  chipTextOn: { color: '#000', fontWeight: '600' },
  count: { color: colors.ink2, fontSize: 13, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.sep },
  itemName: { color: colors.ink, fontSize: 16 },
  itemSub: { color: colors.ink2, fontSize: 13, marginTop: 1 },
  tick: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: colors.ink3, alignItems: 'center', justifyContent: 'center' },
  tickOn: { backgroundColor: colors.blue, borderColor: colors.blue },
  empty: { color: colors.ink3, textAlign: 'center', paddingVertical: 30 },
  createRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.sep },
  createText: { color: colors.blue, fontSize: 16 },
  foot: { position: 'absolute', left: 16, right: 16, bottom: 28 },
  addBtn: { backgroundColor: colors.green, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  addBtnOff: { backgroundColor: colors.card2 },
  addText: { color: '#002a0c', fontWeight: '600', fontSize: 16 },
  form: { paddingHorizontal: 16, paddingBottom: 60 },
  label: { color: colors.ink2, fontSize: 13, marginTop: 18, marginBottom: 8 },
  field: { backgroundColor: colors.card, borderRadius: 10, color: colors.ink, fontSize: 17, paddingHorizontal: 14, paddingVertical: 12 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  err: { color: colors.red, fontSize: 14, marginTop: 14 },
});
