import { colors } from '../theme/colors';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Currency, useCurrency } from '../../context/CurrencyContext';
import { RootStackParamList } from '../navigation/types';
import { CURRENCY_INFO } from '../utils/currency';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const CURRENCIES: Currency[] = ['BRL', 'USD', 'EUR', 'GBP', 'NZD', 'ARS', 'CLP', 'COP', 'MXN'];

const INK = colors.text;
const INK2 = colors.textSecondary;
const INK3 = colors.textMuted;
const PINK = colors.primary;
const CREAM = colors.pinkBg3;
const LINE = colors.border;
const SHADOW = {
  shadowColor: INK,
  shadowOffset: { width: 0, height: 2 } as const,
  shadowOpacity: 0.07,
  shadowRadius: 8,
  elevation: 3,
};

export const CurrencySettingsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { currency, setCurrency } = useCurrency();

  const handleSelect = (nextCurrency: Currency) => {
    void setCurrency(nextCurrency);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color={INK} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.title}>Moeda</Text>
          <Text style={styles.subtitle}>Escolha a moeda usada nos valores do app</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.card}>
          {CURRENCIES.map((item, index) => {
            const selected = item === currency;
            const info = CURRENCY_INFO[item];

            return (
              <TouchableOpacity
                key={item}
                style={[styles.row, index > 0 && styles.rowBorder]}
                onPress={() => handleSelect(item)}
                activeOpacity={0.75}
              >
                <View style={styles.icon}>
                  <Text style={styles.symbol}>{info.symbol}</Text>
                </View>
                <View style={styles.rowText}>
                  <Text style={styles.currencyName}>{info.name}</Text>
                  <Text style={styles.currencyCode}>{item}</Text>
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
  content: { paddingHorizontal: 18, paddingBottom: 40 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    overflow: 'hidden',
    ...SHADOW,
  },
  row: {
    minHeight: 68,
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
    backgroundColor: colors.pinkBg2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  symbol: { fontSize: 15, fontWeight: '800', color: PINK },
  rowText: { flex: 1 },
  currencyName: { fontSize: 14.5, fontWeight: '700', color: INK },
  currencyCode: { fontSize: 12.5, fontWeight: '600', color: INK2, marginTop: 2 },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: PINK,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
