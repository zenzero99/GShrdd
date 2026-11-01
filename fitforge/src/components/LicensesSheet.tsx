import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from './Icon';
import { colors } from '../theme';

// Open-source notices the app has to show. The muscle map artwork is adapted from MuscleMap (MIT).
const NOTICES: { name: string; use: string; url: string; text: string }[] = [
  {
    name: 'MuscleMap',
    use: 'Male and female muscle map artwork, adapted and restyled.',
    url: 'github.com/melihcolpan/MuscleMap',
    text: "MIT License\n\nCopyright (c) 2026 Melih Colpan\n\nPermission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the \"Software\"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:\n\nThe above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.\n\nTHE SOFTWARE IS PROVIDED \"AS IS\", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.",
  },
];

export default function LicensesSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={st.root} edges={['top', 'bottom']}>
        <View style={st.head}>
          <Text style={st.title}>Open-Source Licences</Text>
          <Pressable onPress={onClose} style={st.close} accessibilityLabel="Close"><Icon name="x" size={14} color={colors.ink2} strokeWidth={2.6} /></Pressable>
        </View>
        <ScrollView contentContainerStyle={st.body}>
          {NOTICES.map((n) => (
            <View key={n.name} style={st.card}>
              <Text style={st.name}>{n.name}</Text>
              <Text style={st.use}>{n.use}</Text>
              <Text style={st.url}>{n.url}</Text>
              <Text style={st.text}>{n.text}</Text>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
  title: { color: colors.ink, fontSize: 20, fontWeight: '700' },
  close: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.card2, alignItems: 'center', justifyContent: 'center' },
  body: { paddingHorizontal: 16, paddingBottom: 40, gap: 12 },
  card: { backgroundColor: colors.card, borderRadius: 12, padding: 14, gap: 4 },
  name: { color: colors.ink, fontSize: 16, fontWeight: '600' },
  use: { color: colors.ink2, fontSize: 14 },
  url: { color: colors.blue, fontSize: 14 },
  text: { color: colors.ink2, fontSize: 12, lineHeight: 17, marginTop: 8 },
});
