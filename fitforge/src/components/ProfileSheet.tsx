import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from './Icon';
import LicensesSheet from './LicensesSheet';
import { colors } from '../theme';
import type { Profile, Sex } from '../data/profile';

// Name, plus age, sex and bodyweight (used only to score relative strength in the longevity metric).
// Also holds the sample-data switch.
export default function ProfileSheet({ visible, profile, firstRun, sample, onSample, onSave, onClose }: {
  visible: boolean; profile: Profile; firstRun: boolean; sample: boolean; onSample: (on: boolean) => void;
  onSave: (p: Profile) => void; onClose: () => void;
}) {
  const [name, setName] = useState(firstRun ? '' : profile.name);
  const [age, setAge] = useState(String(profile.age));
  const [bw, setBw] = useState(String(profile.bodyweight));
  const [sex, setSex] = useState<Sex>(profile.sex);
  const [err, setErr] = useState('');
  const [licences, setLicences] = useState(false);
  useEffect(() => { if (visible) { setName(firstRun ? '' : profile.name); setAge(String(profile.age)); setBw(String(profile.bodyweight)); setSex(profile.sex); setErr(''); } }, [visible, profile, firstRun]);

  const save = () => {
    const a = Number(age), b = Number(bw.replace(',', '.')), n = name.trim();
    if (!n) { setErr('Enter your name.'); return; }
    if (!(a >= 13 && a <= 100) || !(b >= 30 && b <= 250)) { setErr('Enter an age from 13 to 100 and a bodyweight from 30 to 250 kg.'); return; }
    onSave({ ...profile, name: n.slice(0, 30), age: Math.round(a), bodyweight: b, sex });
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={firstRun ? save : onClose}>
      <SafeAreaView style={st.root} edges={['top', 'bottom']}>
        <View style={st.head}>
          <Text style={st.title}>{firstRun ? 'About You' : 'Profile'}</Text>
          {!firstRun && <Pressable onPress={onClose} style={st.close} accessibilityLabel="Close"><Icon name="x" size={14} color={colors.ink2} strokeWidth={2.6} /></Pressable>}
        </View>
        <ScrollView contentContainerStyle={st.body} keyboardShouldPersistTaps="handled">
          <View style={st.field}>
            <Text style={st.label}>Name</Text>
            <TextInput style={st.input} value={name} onChangeText={setName} placeholder="Your first name" placeholderTextColor={colors.ink3} autoCapitalize="words" maxLength={30} />
          </View>
          <Text style={st.note}>Your longevity score compares your strength with people of the same sex and age, relative to bodyweight.</Text>
          <View style={st.field}>
            <Text style={st.label}>Age</Text>
            <TextInput style={st.input} value={age} onChangeText={setAge} keyboardType="number-pad" maxLength={3} />
          </View>
          <View style={st.field}>
            <Text style={st.label}>Sex</Text>
            <View style={st.seg}>
              {(['male', 'female'] as Sex[]).map((x) => (
                <Pressable key={x} onPress={() => setSex(x)} style={[st.segBtn, sex === x && st.segOn]} accessibilityRole="tab" accessibilityState={{ selected: sex === x }}>
                  <Text style={st.segText}>{x === 'male' ? 'Male' : 'Female'}</Text>
                </Pressable>
              ))}
            </View>
          </View>
          <View style={st.field}>
            <Text style={st.label}>Bodyweight (kg)</Text>
            <TextInput style={st.input} value={bw} onChangeText={setBw} keyboardType="decimal-pad" maxLength={5} />
          </View>
          {!!err && <Text style={st.err}>{err}</Text>}
          <Pressable style={st.save} onPress={save}><Text style={st.saveText}>{firstRun ? 'Continue' : 'Save'}</Text></Pressable>
          {!firstRun && (
            <View style={st.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={st.switchT}>Sample data</Text>
                <Text style={st.label}>Show a year of example workouts alongside yours. Your own workouts are never changed.</Text>
              </View>
              <Switch value={sample} onValueChange={onSample} trackColor={{ true: colors.green, false: colors.card2 }} />
            </View>
          )}
          {!firstRun && (
            <Pressable style={st.linkRow} onPress={() => setLicences(true)}>
              <Text style={st.switchT}>Open-Source Licences</Text>
              <Icon name="chev" size={16} color={colors.ink3} />
            </Pressable>
          )}
        </ScrollView>
        <LicensesSheet visible={licences} onClose={() => setLicences(false)} />
      </SafeAreaView>
    </Modal>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
  title: { color: colors.ink, fontSize: 20, fontWeight: '700' },
  close: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.card2, alignItems: 'center', justifyContent: 'center' },
  body: { paddingHorizontal: 16, gap: 16, paddingBottom: 40 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderRadius: 12, padding: 14, marginTop: 8 },
  switchT: { color: colors.ink, fontSize: 16, marginBottom: 2 },
  linkRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.card, borderRadius: 12, padding: 14 },
  note: { color: colors.ink2, fontSize: 14, lineHeight: 20 },
  field: { gap: 6 },
  label: { color: colors.ink2, fontSize: 13 },
  input: { backgroundColor: colors.card, borderRadius: 10, color: colors.ink, fontSize: 17, paddingHorizontal: 14, paddingVertical: 12 },
  seg: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: 9, padding: 2 },
  segBtn: { flex: 1, paddingVertical: 9, borderRadius: 7, alignItems: 'center' },
  segOn: { backgroundColor: colors.ink3 },
  segText: { color: colors.ink, fontWeight: '600' },
  err: { color: colors.red, fontSize: 14 },
  save: { backgroundColor: colors.green, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  saveText: { color: '#002a0c', fontWeight: '600', fontSize: 16 },
});

