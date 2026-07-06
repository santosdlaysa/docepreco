import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { UNIT_SYSTEM_INFO, UnitSystem, useUnitSystem } from '../../context/UnitSystemContext';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const UNIT_SYSTEMS: UnitSystem[] = ['metric', 'imperial'];

const INK = '#3D2233';
const INK2 = '#9A7E8C';
const INK3 = '#C4B0BB';
const PINK = '#EA4B92';
const CREAM = '#FFF6F0';
const LINE = '#F1E2DA';
const SHADOW = {
  shadowColor: INK,
  shadowOffset: { width: 0, height: 2 } as const,
  shadowOpacity: 0.07,
  shadowRadius: 8,
  elevation: 3,
};

export const UnitSettingsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { unitSystem, setUnitSystem } = useUnitSystem();

  const handleSelect = (nextUnitSystem: UnitSystem) => {
    void setUnitSystem(nextUnitSystem);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color={INK} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.title}>Sistema de unidades</Text>
          <Text style={styles.subtitle}>Define as opções sugeridas para novos ingredientes</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.notice}>
          <Ionicons name="information-circle" size={18} color="#2BA7DD" />
          <Text style={styles.noticeText}>
            Ingredientes já cadastrados continuam com as unidades atuais. Esta escolha só muda os próximos cadastros.
          </Text>
        </View>

        <View style={styles.card}>
          {UNIT_SYSTEMS.map((item, index) => {
            const selected = item === unitSystem;
            const info = UNIT_SYSTEM_INFO[item];

            return (
              <TouchableOpacity
                key={item}
                style={[styles.row, index > 0 && styles.rowBorder]}
                onPress={() => handleSelect(item)}
                activeOpacity={0.75}
              >
                <View style={styles.icon}>
                  <Ionicons name={item === 'metric' ? 'scale-outline' : 'beaker-outline'} size={19} color={PINK} />
                </View>
                <View style={styles.rowText}>
                  <Text style={styles.systemName}>{info.name}</Text>
                  <Text style={styles.systemDesc}>{info.description}</Text>
                </View>
                {selected ? (
                  <View style={styles.checkCircle}>
                    <Ionicons name="checkmark" size={16} color="#fff" />
                  </View>
                ) : (
                  <Ionicons name="chevron-forward" size={16} color={INK3} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 14,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW,
  },
  headerText: { flex: 1 },
  title: { fontSize: 22, fontWeight: '800', color: INK },
  subtitle: { fontSize: 13, fontWeight: '600', color: INK2, marginTop: 2 },
  content: { paddingHorizontal: 18, paddingBottom: 40, gap: 14 },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#EEF8FD',
    borderWidth: 1,
    borderColor: '#DCF1FB',
    borderRadius: 16,
    padding: 14,
  },
  noticeText: { flex: 1, fontSize: 12.5, fontWeight: '600', lineHeight: 18, color: '#35677A' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    overflow: 'hidden',
    ...SHADOW,
  },
  row: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  rowBorder: { borderTopWidth: 1, borderTopColor: LINE },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFF0F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1 },
  systemName: { fontSize: 14.5, fontWeight: '700', color: INK },
  systemDesc: { fontSize: 12.5, fontWeight: '600', color: INK2, marginTop: 2 },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: PINK,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
