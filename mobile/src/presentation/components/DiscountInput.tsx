import { colors } from '../theme/colors';
import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import type { DiscountType } from '../utils/discount';
import { useCurrency } from '../../context/CurrencyContext';
import { CURRENCY_INFO } from '../utils/currency';

interface DiscountInputProps {
  type: DiscountType;
  value: string;
  onChangeType: (type: DiscountType) => void;
  onChangeValue: (value: string) => void;
  label?: string;
  compact?: boolean;
}

const sanitizeValue = (raw: string, type: DiscountType): string => {
  if (type === 'percent') {
    const digits = raw.replace(/[^0-9]/g, '').slice(0, 3);
    return Number(digits) > 100 ? '100' : digits;
  }
  const cleaned = raw.replace(/[^0-9.,]/g, '').replace(/\./g, ',');
  const parts = cleaned.split(',');
  const v = parts.length > 2 ? parts[0] + ',' + parts.slice(1).join('') : cleaned;
  const commaIdx = v.indexOf(',');
  return commaIdx >= 0 && v.length - commaIdx > 3 ? v.slice(0, commaIdx + 3) : v;
};

export const DiscountInput: React.FC<DiscountInputProps> = ({
  type,
  value,
  onChangeType,
  onChangeValue,
  label = 'Desconto (opcional)',
  compact = false,
}) => {
  const { currency } = useCurrency();
  const symbol = CURRENCY_INFO[currency].symbol;

  return (
    <View style={styles.field}>
      {!!label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.row}>
        <View style={styles.toggle}>
          <TouchableOpacity
            style={[styles.toggleBtn, type === 'fixed' && styles.toggleBtnActive]}
            onPress={() => onChangeType('fixed')}
            activeOpacity={0.8}
          >
            <Text style={[styles.toggleText, type === 'fixed' && styles.toggleTextActive]}>{symbol}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, type === 'percent' && styles.toggleBtnActive]}
            onPress={() => onChangeType('percent')}
            activeOpacity={0.8}
          >
            <Text style={[styles.toggleText, type === 'percent' && styles.toggleTextActive]}>%</Text>
          </TouchableOpacity>
        </View>
        <View style={[styles.input, compact && styles.inputCompact]}>
          <TextInput
            style={styles.inputText}
            value={value}
            onChangeText={(raw) => onChangeValue(sanitizeValue(raw, type))}
            placeholder={type === 'percent' ? '10' : '5,00'}
            placeholderTextColor={colors.textMuted}
            keyboardType={type === 'percent' ? 'number-pad' : 'decimal-pad'}
          />
          {type === 'percent' && <Text style={styles.suffix}>%</Text>}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  field: { gap: 7 },
  label: { fontSize: 13, fontWeight: '700', color: colors.text, marginLeft: 2 },
  row: { flexDirection: 'row', gap: 8 },
  toggle: {
    flexDirection: 'row', backgroundColor: '#F5EBF0', borderRadius: 12, padding: 3,
  },
  toggleBtn: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 9 },
  toggleBtnActive: { backgroundColor: colors.primary },
  toggleText: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
  toggleTextActive: { color: '#fff' },
  input: {
    flex: 1, backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 15, paddingVertical: 12,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    shadowColor: colors.text, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
  },
  inputCompact: { paddingVertical: 9 },
  inputText: { flex: 1, fontSize: 15, color: colors.text, padding: 0 },
  suffix: { color: colors.textSecondary, fontWeight: '700', fontSize: 13 },
});
