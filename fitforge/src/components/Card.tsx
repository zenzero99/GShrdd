import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import Icon, { IconName } from './Icon';
import { colors } from '../theme';

// Apple Health–style summary card: coloured category label, optional right-hand context, then content.
export default function Card({ icon, label, color, when, children, style }: {
  icon?: IconName; label?: string; color?: string; when?: string; children: React.ReactNode; style?: ViewStyle;
}) {
  return (
    <View style={[st.card, style]}>
      {label && (
        <View style={st.head}>
          {icon && <Icon name={icon} size={18} color={color ?? colors.ink} />}
          <Text style={[st.label, { color: color ?? colors.ink }]}>{label}</Text>
          {when && <Text style={st.when}>{when}</Text>}
        </View>
      )}
      {children}
    </View>
  );
}

const st = StyleSheet.create({
  card: { backgroundColor: colors.glass, borderRadius: 14, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 16 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  label: { fontSize: 15, fontWeight: '600' },
  when: { marginLeft: 'auto', color: colors.ink2, fontSize: 14 },
});
