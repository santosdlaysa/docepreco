import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform, TextInput, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { RootStackParamList } from '../navigation/types';
import { seasonApi } from '../../data/api/seasonApi';
import { useToast } from '../context/ToastContext';
import { useTranslation } from 'react-i18next';
import { parseLocaleNumber } from '../utils/number';

// ── Design tokens ──
const INK = '#3D2233';
const INK2 = '#9A7E8C';
const INK3 = '#C4B0BB';
const CREAM = '#FFF6F0';
const PINK = '#EA4B92';
const SHADOW = {
  shadowColor: INK,
  shadowOffset: { width: 0, height: 2 } as const,
  shadowOpacity: 0.07,
  shadowRadius: 8,
  elevation: 3,
};

type RouteType = RouteProp<RootStackParamList, 'EditSeason'>;

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
    const pct = parseLocaleNumber(percentText);
    if (!percentText.trim() || pct <= -100) e.percent = t('createSeason.invalidValue');
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const multiplier = 1 + parseLocaleNumber(percentText) / 100;
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

  const pct = parseLocaleNumber(percentText);
  const previewMultiplier = percentText.trim() ? 1 + pct / 100 : null;

  return (
    <SafeAreaView style={s.safe}>
      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={20} color={INK} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>{isEditing ? t('createSeason.titleEdit') : 'Nova época'}</Text>
        </View>
        <TouchableOpacity
          style={[s.savePill, { backgroundColor: PINK, shadowColor: PINK, shadowOpacity: 0.3 }]}
          onPress={handleSave}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.savePillText}>Salvar</Text>}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"
          contentContainerStyle={s.body}>

          {/* ── Atalhos rápidos ── */}
          {!isEditing && (
            <View style={s.field}>
              <Text style={s.label}>Atalhos rápidos</Text>
              <View style={s.ugrid}>
                {PRESETS.map(p => (
                  <TouchableOpacity
                    key={p.label}
                    style={[s.uchip, name === p.label && s.uchipOn]}
                    onPress={() => applyPreset(p)}
                    activeOpacity={0.7}
                  >
                    <Text style={[s.uchipText, name === p.label && s.uchipTextOn]}>{p.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* ── Nome ── */}
          <View style={s.field}>
            <Text style={s.label}>Nome da época</Text>
            <View style={[s.input, errors.name && s.inputErr]}>
              <Ionicons name="pricetag-outline" size={18} color={INK3} />
              <TextInput style={s.inputText} value={name} onChangeText={setName}
                placeholder="Ex: Páscoa 2026" placeholderTextColor={INK3} />
            </View>
            {errors.name && <Text style={s.err}>{errors.name}</Text>}
          </View>

          {/* ── Datas ── */}
          <View style={s.two}>
            <View style={[s.field, { flex: 1 }]}>
              <Text style={s.label}>Início</Text>
              <View style={[s.input, errors.startDate && s.inputErr]}>
                <TextInput style={s.inputText} value={startDate} onChangeText={setStartDate}
                  placeholder={`${currentYear}-03-15`} placeholderTextColor={INK3} keyboardType="numbers-and-punctuation" />
              </View>
              {errors.startDate && <Text style={s.err}>{errors.startDate}</Text>}
            </View>
            <View style={[s.field, { flex: 1 }]}>
              <Text style={s.label}>Fim</Text>
              <View style={[s.input, errors.endDate && s.inputErr]}>
                <TextInput style={s.inputText} value={endDate} onChangeText={setEndDate}
                  placeholder={`${currentYear}-04-20`} placeholderTextColor={INK3} keyboardType="numbers-and-punctuation" />
              </View>
              {errors.endDate && <Text style={s.err}>{errors.endDate}</Text>}
            </View>
          </View>

          {/* ── Ajuste de preço ── */}
          <View style={s.field}>
            <Text style={s.label}>Ajuste de preço</Text>
            <View style={[s.input, errors.percent && s.inputErr]}>
              <TextInput style={s.inputText} value={percentText} onChangeText={setPercentText}
                placeholder="+25" placeholderTextColor={INK3} keyboardType="numbers-and-punctuation" />
              <Text style={s.suffix}>%</Text>
            </View>
            {errors.percent && <Text style={s.err}>{errors.percent}</Text>}
          </View>

          {/* ── Preview ── */}
          {previewMultiplier !== null && (
            <LinearGradient
              colors={['#FF6AAE', PINK, '#C7367A']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.preview}
            >
              <Text style={s.previewLabel}>Pré-visualização</Text>
              <Text style={s.previewSub}>Uma receita de <Text style={{ fontWeight: '700' }}>R$ 10,00</Text></Text>
              <Text style={s.previewPrice}>passa a R$ {(10 * previewMultiplier).toFixed(2).replace('.', ',')}</Text>
            </LinearGradient>
          )}

          {/* ── Botão salvar ── */}
          <TouchableOpacity onPress={handleSave} disabled={loading} activeOpacity={0.85}>
            <LinearGradient
              colors={['#FF6AAE', PINK]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.btn}
            >
              {loading ? <ActivityIndicator color="#fff" /> : (
                <Text style={s.btnText}>{isEditing ? t('createSeason.updateButton') : 'Salvar época'}</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <View style={{ height: 24 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  body: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 40, gap: 14 },

  /* ── Header ── */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW,
  },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: INK },
  savePill: {
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW,
  },
  savePillText: { color: '#fff', fontWeight: '700', fontSize: 13.5 },

  /* ── Fields ── */
  field: { gap: 7 },
  label: { fontSize: 13, fontWeight: '700', color: INK, marginLeft: 2 },
  err: { fontSize: 12, color: '#F44336', marginLeft: 2 },

  /* ── Input ── */
  input: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    ...SHADOW,
  },
  inputErr: { borderWidth: 1.5, borderColor: '#F44336' },
  inputText: { flex: 1, fontSize: 15, color: INK, padding: 0 },
  suffix: { fontSize: 15, fontWeight: '700', color: INK2 },

  /* ── Two cols ── */
  two: { flexDirection: 'row', gap: 11 },

  /* ── Chips ── */
  ugrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  uchip: {
    height: 40,
    minWidth: 46,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW,
  },
  uchipOn: { backgroundColor: PINK, shadowColor: PINK, shadowOpacity: 0.3, elevation: 5 },
  uchipText: { fontWeight: '700', fontSize: 13.5, color: INK2 },
  uchipTextOn: { color: '#fff' },

  /* ── Preview ── */
  preview: {
    borderRadius: 24,
    padding: 18,
  },
  previewLabel: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.92)', letterSpacing: 0.2 },
  previewSub: { fontSize: 15, fontWeight: '600', color: 'rgba(255,255,255,0.96)', marginTop: 8 },
  previewPrice: { fontSize: 34, fontWeight: '800', color: '#fff', marginTop: 4 },

  /* ── Button ── */
  btn: {
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW,
    shadowColor: PINK,
    shadowOpacity: 0.35,
  },
  btnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
