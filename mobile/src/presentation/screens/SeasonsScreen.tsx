import { colors } from '../theme/colors';
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { seasonApi, Season } from '../../data/api/seasonApi';
import { usePaywall } from '../premium/usePaywall';
import { useTranslation } from 'react-i18next';

type Nav = NativeStackNavigationProp<RootStackParamList>;

/* ── Design Tokens ── */
const INK = colors.text;
const INK2 = colors.textSecondary;
const INK3 = colors.textMuted;
const CREAM = colors.pinkBg3;
const LINE = colors.border;
const PINK = colors.primary;
const GREEN = colors.green;
const SHADOW = {
  shadowColor: INK,
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.07,
  shadowRadius: 12,
  elevation: 4,
};

/* ── Helpers ── */
const formatDate = (d: string) =>
  new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

const isActive = (s: Season) => {
  const today = new Date().toISOString().slice(0, 10);
  return s.startDate <= today && s.endDate >= today;
};

export const SeasonsScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<Nav>();
  const { guardScreen } = usePaywall();
  const [seasons, setSeasons] = useState<Season[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (!guardScreen('seasonalPricing')) return;
      seasonApi.getAll().then(setSeasons).catch(() => {});
    }, [])
  );

  const handleDelete = (season: Season) => {
    Alert.alert(t('seasons.deleteTitle'), t('seasons.deleteMessage', { name: season.name }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          await seasonApi.delete(season.id);
          setSeasons(prev => prev.filter(s => s.id !== season.id));
        },
      },
    ]);
  };

  const renderRow = (item: Season, index: number) => {
    const active = isActive(item);
    const pct = ((item.multiplier - 1) * 100).toFixed(0);
    const sign = item.multiplier >= 1 ? '+' : '';
    const isIncrease = item.multiplier >= 1;

    return (
      <View
        key={item.id}
        style={[styles.row, index > 0 && styles.rowBorder]}
      >
        {/* Icon */}
        <View style={[styles.iconWrap, { backgroundColor: isIncrease ? '#FDF0F5' : '#EDFBF2' }]}>
          <Ionicons name="pricetag" size={18} color={isIncrease ? PINK : GREEN} />
        </View>

        {/* Info */}
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{item.name}</Text>
            {active && (
              <View style={styles.activeBadge}>
                <Text style={styles.activeBadgeText}>{t('seasons.active')}</Text>
              </View>
            )}
          </View>
          <Text style={styles.dates}>
            {formatDate(item.startDate)} → {formatDate(item.endDate)}
          </Text>
          <Text style={[styles.multiplier, { color: isIncrease ? PINK : GREEN }]}>
            {sign}{pct}% {t('seasons.inPrices')}
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            onPress={() => navigation.navigate('EditSeason', { seasonId: item.id })}
            style={styles.actionBtn}
          >
            <Ionicons name="pencil-outline" size={16} color={INK2} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleDelete(item)}
            style={[styles.actionBtn, { marginTop: 6 }]}
          >
            <Ionicons name="trash-outline" size={16} color={INK2} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color={INK} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>{t('seasons.title', { defaultValue: 'Épocas' })}</Text>
              <View style={styles.pill}>
                <Text style={styles.pillText}>Nova</Text>
              </View>
            </View>
            <Text style={styles.subtitle}>{t('seasons.subtitle', { defaultValue: 'Ajuste sazonal de preços' })}</Text>
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate('CreateSeason')}
            style={styles.addBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={22} color={PINK} />
          </TouchableOpacity>
        </View>

        {/* Info Banner */}
        <View style={styles.banner}>
          <View style={styles.bannerIcon}>
            <Ionicons name="information-circle-outline" size={20} color="#4BA3D9" />
          </View>
          <View style={styles.bannerText}>
            <Text style={styles.bannerTitle}>Cobre mais nas datas certas</Text>
            <Text style={styles.bannerSub}>O ajuste é aplicado no preço sugerido.</Text>
          </View>
        </View>

        {/* Seasons Card or Empty State */}
        {seasons.length > 0 ? (
          <View style={styles.card}>
            {seasons.map((item, index) => renderRow(item, index))}
          </View>
        ) : (
          <View style={styles.empty}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="pricetag-outline" size={48} color={INK3} />
            </View>
            <Text style={styles.emptyTitle}>{t('seasons.emptyTitle')}</Text>
            <Text style={styles.emptyText}>{t('seasons.emptyDescription')}</Text>
            <Text style={styles.emptyHint}>Toque no + acima para criar sua primeira época.</Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => navigation.navigate('CreateSeason')}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={styles.emptyBtnText}>{t('seasons.createFirst')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: { padding: 20, paddingBottom: 40, flexGrow: 1 },

  /* ── Header ── */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW,
    shadowOpacity: 0.04,
  },
  headerCenter: { flex: 1, marginLeft: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontSize: 22, fontWeight: '800', color: INK },
  pill: {
    backgroundColor: PINK,
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  pillText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  subtitle: { fontSize: 13, color: INK2, fontWeight: '500', marginTop: 2 },
  addBtn: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW,
    shadowOpacity: 0.05,
  },

  /* ── Banner ── */
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 15,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.blueBgSoft,
    marginBottom: 18,
    ...SHADOW,
    shadowOpacity: 0.04,
  },
  bannerIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW,
    shadowOpacity: 0.05,
  },
  bannerText: { flex: 1 },
  bannerTitle: { fontSize: 15, fontWeight: '700', color: INK },
  bannerSub: { fontSize: 12, color: INK2, fontWeight: '500', marginTop: 2 },

  /* ── Single Card ── */
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    overflow: 'hidden',
    ...SHADOW,
  },

  /* ── Row ── */
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    paddingHorizontal: 16,
  },
  rowBorder: {
    borderTopWidth: 1,
    borderTopColor: LINE,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  info: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { fontSize: 15, fontWeight: '700', color: INK },
  activeBadge: {
    backgroundColor: GREEN,
    borderRadius: 7,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  activeBadgeText: { fontSize: 10, color: '#fff', fontWeight: '700' },
  dates: { fontSize: 12, color: INK2, fontWeight: '500', marginTop: 2 },
  multiplier: { fontSize: 13, fontWeight: '700', marginTop: 2 },
  actions: { alignItems: 'center' },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: CREAM,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ── Empty State ── */
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    marginTop: 60,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW,
    shadowOpacity: 0.05,
    marginBottom: 20,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: INK, marginBottom: 8 },
  emptyText: { fontSize: 14, color: INK2, textAlign: 'center', lineHeight: 22, marginBottom: 8 },
  emptyHint: { fontSize: 12, color: INK3, textAlign: 'center', marginBottom: 24 },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: PINK,
    borderRadius: 14,
    paddingHorizontal: 22,
    paddingVertical: 13,
    ...SHADOW,
    shadowColor: PINK,
    shadowOpacity: 0.3,
  },
  emptyBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
