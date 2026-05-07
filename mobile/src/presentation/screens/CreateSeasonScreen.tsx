import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/types';
import { seasonApi } from '../../data/api/seasonApi';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { Card } from '../components/Card';
import { Header } from '../components/Header';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { useToast } from '../context/ToastContext';
import { useTranslation } from 'react-i18next';

type RouteType = RouteProp<RootStackParamList, 'EditSeason'>;

// PRESETS moved inside component for i18n

export const CreateSeasonScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const route = useRoute<RouteType>();
  const seasonId = (route.params as any)?.seasonId as string | undefined;
  const isEditing = !!seasonId;
  const { showToast } = useToast();

  const currentYear = new Date().getFullYear();

  const PRESETS = [
    { label: t('createSeason.christmas'), startMonth: '12-01', endMonth: '12-31', pct: 20 },
    { label: t('createSeason.easter'), startMonth: '03-20', endMonth: '04-20', pct: 15 },
    { label: t('createSeason.mothersDay'), startMonth: '05-01', endMonth: '05-15', pct: 15 },
    { label: t('createSeason.valentinesDay'), startMonth: '06-06', endMonth: '06-12', pct: 10 },
  ];

  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [percentText, setPercentText] = useState('20');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!seasonId) return;
    seasonApi.getAll().then(all => {
      const s = all.find(x => x.id === seasonId);
      if (!s) return;
      setName(s.name);
      setStartDate(s.startDate);
      setEndDate(s.endDate);
      setPercentText(String(Math.round((s.multiplier - 1) * 100)));
    }).catch(() => {});
  }, [seasonId]);

  const applyPreset = (preset: typeof PRESETS[0]) => {
    setName(preset.label);
    setStartDate(`${currentYear}-${preset.startMonth}`);
    setEndDate(`${currentYear}-${preset.endMonth}`);
    setPercentText(String(preset.pct));
    setErrors({});
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = t('createSeason.nameRequired');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) e.startDate = t('createSeason.dateFormat');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(endDate)) e.endDate = t('createSeason.dateFormat');
    if (startDate && endDate && startDate > endDate) e.endDate = t('createSeason.endAfterStart');
    const pct = parseFloat(percentText);
    if (isNaN(pct) || pct <= -100) e.percent = t('createSeason.invalidValue');
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const multiplier = 1 + parseFloat(percentText) / 100;
      const data = { name: name.trim(), startDate, endDate, multiplier };
      if (isEditing) {
        await seasonApi.update(seasonId!, data);
        showToast(t('createSeason.updated'), 'success');
      } else {
        await seasonApi.create(data);
        showToast(t('createSeason.created'), 'success');
      }
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const pct = parseFloat(percentText);
  const previewMultiplier = !isNaN(pct) ? 1 + pct / 100 : null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title={isEditing ? t('createSeason.titleEdit') : t('createSeason.titleNew')}
        showBack
        onBack={() => navigation.goBack()}
      />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

          {!isEditing && (
            <Card style={styles.card}>
              <Text style={styles.sectionLabel}>{t('createSeason.quickShortcuts')}</Text>
              <View style={styles.presets}>
                {PRESETS.map(p => (
                  <TouchableOpacity
                    key={p.label}
                    style={styles.presetChip}
                    onPress={() => applyPreset(p)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.presetText}>{p.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Card>
          )}

          <Card style={styles.card}>
            <Input
              label={t('createSeason.nameLabel')}
              placeholder={t('createSeason.namePlaceholder')}
              value={name}
              onChangeText={setName}
              error={errors.name}
            />
            <Input
              label={t('createSeason.startDate')}
              placeholder={`${currentYear}-12-01`}
              value={startDate}
              onChangeText={setStartDate}
              error={errors.startDate}
              keyboardType="numbers-and-punctuation"
            />
            <Input
              label={t('createSeason.endDate')}
              placeholder={`${currentYear}-12-31`}
              value={endDate}
              onChangeText={setEndDate}
              error={errors.endDate}
              keyboardType="numbers-and-punctuation"
            />
            <Input
              label={t('createSeason.priceAdjust')}
              placeholder={t('createSeason.priceAdjustPlaceholder')}
              value={percentText}
              onChangeText={setPercentText}
              error={errors.percent}
              keyboardType="numbers-and-punctuation"
            />
          </Card>

          {previewMultiplier !== null && (
            <Card style={styles.previewCard}>
              <View style={styles.previewRow}>
                <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
                <Text style={styles.previewText}>
                  {pct >= 0
                    ? t('createSeason.previewIncrease', { price: (10 * previewMultiplier).toFixed(2).replace('.', ',') })
                    : t('createSeason.previewDiscount', { price: (10 * previewMultiplier).toFixed(2).replace('.', ','), pct: Math.abs(pct) })}
                </Text>
              </View>
            </Card>
          )}

          <Button
            title={isEditing ? t('createSeason.updateButton') : t('createSeason.saveButton')}
            onPress={handleSave}
            loading={loading}
            style={styles.saveBtn}
          />
          <View style={{ height: 32 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { padding: 16 },
  card: { marginBottom: 14, padding: 16 },
  sectionLabel: { ...typography.h4, color: colors.text, marginBottom: 12 },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  presetChip: {
    backgroundColor: colors.primaryLight,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  presetText: { ...typography.bodySmall, color: colors.primary, fontWeight: '700' },
  previewCard: {
    marginBottom: 14,
    padding: 14,
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  previewRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  previewText: { ...typography.bodySmall, color: colors.textSecondary, flex: 1, lineHeight: 18 },
  saveBtn: { marginTop: 4 },
});
