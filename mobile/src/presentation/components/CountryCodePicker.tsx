import { colors } from '../theme/colors';
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  TextInput,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { typography } from '../theme/typography';

interface Country {
  code: string;
  dial: string;
  flag: string;
}

const COUNTRIES: Country[] = [
  { code: 'BR', dial: '+55', flag: '\u{1F1E7}\u{1F1F7}' },
  { code: 'US', dial: '+1', flag: '\u{1F1FA}\u{1F1F8}' },
  { code: 'PT', dial: '+351', flag: '\u{1F1F5}\u{1F1F9}' },
  { code: 'AR', dial: '+54', flag: '\u{1F1E6}\u{1F1F7}' },
  { code: 'CL', dial: '+56', flag: '\u{1F1E8}\u{1F1F1}' },
  { code: 'CO', dial: '+57', flag: '\u{1F1E8}\u{1F1F4}' },
  { code: 'MX', dial: '+52', flag: '\u{1F1F2}\u{1F1FD}' },
  { code: 'PE', dial: '+51', flag: '\u{1F1F5}\u{1F1EA}' },
  { code: 'UY', dial: '+598', flag: '\u{1F1FA}\u{1F1FE}' },
  { code: 'PY', dial: '+595', flag: '\u{1F1F5}\u{1F1FE}' },
  { code: 'BO', dial: '+591', flag: '\u{1F1E7}\u{1F1F4}' },
  { code: 'EC', dial: '+593', flag: '\u{1F1EA}\u{1F1E8}' },
  { code: 'VE', dial: '+58', flag: '\u{1F1FB}\u{1F1EA}' },
  { code: 'CR', dial: '+506', flag: '\u{1F1E8}\u{1F1F7}' },
  { code: 'PA', dial: '+507', flag: '\u{1F1F5}\u{1F1E6}' },
  { code: 'DO', dial: '+1', flag: '\u{1F1E9}\u{1F1F4}' },
  { code: 'GT', dial: '+502', flag: '\u{1F1EC}\u{1F1F9}' },
  { code: 'HN', dial: '+504', flag: '\u{1F1ED}\u{1F1F3}' },
  { code: 'SV', dial: '+503', flag: '\u{1F1F8}\u{1F1FB}' },
  { code: 'NI', dial: '+505', flag: '\u{1F1F3}\u{1F1EE}' },
  { code: 'CU', dial: '+53', flag: '\u{1F1E8}\u{1F1FA}' },
  { code: 'ES', dial: '+34', flag: '\u{1F1EA}\u{1F1F8}' },
  { code: 'FR', dial: '+33', flag: '\u{1F1EB}\u{1F1F7}' },
  { code: 'DE', dial: '+49', flag: '\u{1F1E9}\u{1F1EA}' },
  { code: 'IT', dial: '+39', flag: '\u{1F1EE}\u{1F1F9}' },
  { code: 'GB', dial: '+44', flag: '\u{1F1EC}\u{1F1E7}' },
  { code: 'JP', dial: '+81', flag: '\u{1F1EF}\u{1F1F5}' },
  { code: 'CN', dial: '+86', flag: '\u{1F1E8}\u{1F1F3}' },
  { code: 'IN', dial: '+91', flag: '\u{1F1EE}\u{1F1F3}' },
  { code: 'AU', dial: '+61', flag: '\u{1F1E6}\u{1F1FA}' },
  { code: 'CA', dial: '+1', flag: '\u{1F1E8}\u{1F1E6}' },
  { code: 'AO', dial: '+244', flag: '\u{1F1E6}\u{1F1F4}' },
  { code: 'MZ', dial: '+258', flag: '\u{1F1F2}\u{1F1FF}' },
  { code: 'CV', dial: '+238', flag: '\u{1F1E8}\u{1F1FB}' },
  { code: 'GW', dial: '+245', flag: '\u{1F1EC}\u{1F1FC}' },
  { code: 'ST', dial: '+239', flag: '\u{1F1F8}\u{1F1F9}' },
  { code: 'TL', dial: '+670', flag: '\u{1F1F9}\u{1F1F1}' },
];

const COUNTRY_NAMES: Record<string, string> = {
  BR: 'Brasil',
  US: 'Estados Unidos',
  PT: 'Portugal',
  AR: 'Argentina',
  CL: 'Chile',
  CO: 'Col\u00f4mbia',
  MX: 'M\u00e9xico',
  PE: 'Peru',
  UY: 'Uruguai',
  PY: 'Paraguai',
  BO: 'Bol\u00edvia',
  EC: 'Equador',
  VE: 'Venezuela',
  CR: 'Costa Rica',
  PA: 'Panam\u00e1',
  DO: 'Rep. Dominicana',
  GT: 'Guatemala',
  HN: 'Honduras',
  SV: 'El Salvador',
  NI: 'Nicar\u00e1gua',
  CU: 'Cuba',
  ES: 'Espanha',
  FR: 'Fran\u00e7a',
  DE: 'Alemanha',
  IT: 'It\u00e1lia',
  GB: 'Reino Unido',
  JP: 'Jap\u00e3o',
  CN: 'China',
  IN: '\u00cdndia',
  AU: 'Austr\u00e1lia',
  CA: 'Canad\u00e1',
  AO: 'Angola',
  MZ: 'Mo\u00e7ambique',
  CV: 'Cabo Verde',
  GW: 'Guin\u00e9-Bissau',
  ST: 'S\u00e3o Tom\u00e9 e Pr\u00edncipe',
  TL: 'Timor-Leste',
};

interface CountryCodePickerProps {
  value: string;
  onChange: (dial: string) => void;
  compact?: boolean;
}

export const CountryCodePicker: React.FC<CountryCodePickerProps> = ({ value, onChange, compact }) => {
  const [visible, setVisible] = useState(false);
  const [search, setSearch] = useState('');

  const selected = COUNTRIES.find(c => c.dial === value) || COUNTRIES[0];

  const filtered = search.trim()
    ? COUNTRIES.filter(c => {
        const q = search.toLowerCase();
        return (
          c.code.toLowerCase().includes(q) ||
          c.dial.includes(q) ||
          (COUNTRY_NAMES[c.code] || '').toLowerCase().includes(q)
        );
      })
    : COUNTRIES;

  const handleSelect = (country: Country) => {
    onChange(country.dial);
    setVisible(false);
    setSearch('');
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.selector, compact && styles.selectorCompact]}
        onPress={() => setVisible(true)}
        activeOpacity={0.7}
      >
        <Text style={styles.flag}>{selected.flag}</Text>
        <Text style={styles.dial}>{selected.dial}</Text>
        <Ionicons name="chevron-down" size={14} color={colors.textMuted} />
      </TouchableOpacity>

      <Modal visible={visible} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>DDI do pa\u00eds</Text>
              <TouchableOpacity onPress={() => { setVisible(false); setSearch(''); }}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.searchWrap}>
              <Ionicons name="search" size={18} color={colors.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar pa\u00eds..."
                placeholderTextColor={colors.textMuted}
                value={search}
                onChangeText={setSearch}
                autoCorrect={false}
              />
            </View>

            <FlatList
              data={filtered}
              keyExtractor={item => item.code}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.countryRow, item.code === selected.code && styles.countryRowSelected]}
                  onPress={() => handleSelect(item)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.countryFlag}>{item.flag}</Text>
                  <Text style={styles.countryName}>{COUNTRY_NAMES[item.code] || item.code}</Text>
                  <Text style={styles.countryDial}>{item.dial}</Text>
                  {item.code === selected.code && (
                    <Ionicons name="checkmark" size={18} color={colors.primary} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  selectorCompact: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRightWidth: 0,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    marginRight: 6,
  },
  flag: { fontSize: 18 },
  dial: { ...typography.body, color: colors.text, fontWeight: '600', fontSize: 14 },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: { ...typography.h4, color: colors.text },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginVertical: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.cream,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    fontSize: 14,
    padding: 0,
  },
  countryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  countryRowSelected: {
    backgroundColor: colors.primaryLight,
  },
  countryFlag: { fontSize: 22 },
  countryName: { flex: 1, ...typography.body, color: colors.text, fontSize: 15 },
  countryDial: { ...typography.body, color: colors.textSecondary, fontSize: 14, marginRight: 4 },
});
