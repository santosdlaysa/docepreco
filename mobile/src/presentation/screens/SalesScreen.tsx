import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  SectionList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Sale } from '../../domain/entities/Sale';
import { saleApi } from '../../data/api/saleApi';
import { isDemoMode } from '../../data/demo/demoMode';
import { demoSaleApi } from '../../data/demo/demoApi';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { Header } from '../components/Header';
import { useToast } from '../context/ToastContext';
import { useTranslation } from 'react-i18next';
import { useDemoGuard } from '../hooks/useDemoGuard';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const formatCurrency = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

type Section = { date: string; label: string; data: Sale[]; total: number };

export const SalesScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { t } = useTranslation();

  const formatDateLabel = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-');
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    const isToday = date.toDateString() === today.toDateString();
    const isYesterday = date.toDateString() === yesterday.toDateString();

    if (isToday) return t('common.today');
    if (isYesterday) return t('common.yesterday');

    return date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
  };

  const groupByDate = (sales: Sale[]): Section[] => {
    const map = new Map<string, Sale[]>();
    for (const sale of sales) {
      const key = sale.saleDate;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(sale);
    }
    return Array.from(map.entries()).map(([date, data]) => ({
      date,
      label: formatDateLabel(date),
      data,
      total: data.reduce((sum, s) => sum + s.totalRevenue, 0),
    }));
  };
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<'all' | 'week' | 'month'>('all');
  const { showToast } = useToast();
  const { guardAction, DemoGuardModal } = useDemoGuard();
  const api = isDemoMode() ? demoSaleApi : saleApi;

  const loadSales = async () => {
    try {
      const data = await api.getAll(period === 'all' ? undefined : period);
      setSales(data);
    } catch {
      showToast(t('sales.loadError'), 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => {
    setLoading(true);
    loadSales();
  }, []));

  useEffect(() => {
    setLoading(true);
    loadSales();
  }, [period]);

  const handleDelete = (sale: Sale) => {
    if (!guardAction()) return;
    const originalIndex = sales.findIndex(s => s.id === sale.id);
    setSales(prev => prev.filter(s => s.id !== sale.id));

    const restore = () => {
      setSales(prev => {
        if (prev.some(s => s.id === sale.id)) return prev;
        const next = [...prev];
        const idx = Math.max(0, Math.min(originalIndex, next.length));
        next.splice(idx, 0, sale);
        return next;
      });
    };

    showToast(t('sales.deleteMessage', { name: sale.recipeName }), {
      type: 'success',
      action: { label: t('sales.undo'), onPress: restore },
      onDismiss: async () => {
        try {
          await api.delete(sale.id);
        } catch {
          restore();
          showToast(t('sales.deleteError'), 'error');
        }
      },
    });
  };

  const totalRevenue = sales.reduce((sum, s) => sum + s.totalRevenue, 0);
  const totalUnits = sales.reduce((sum, s) => sum + s.quantitySold, 0);
  const sections = groupByDate(sales);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <Header title={t('sales.title')} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Header
        title={t('sales.title')}
        subtitle={t('sales.subtitle', { count: sales.length, plural: sales.length !== 1 ? 's' : '' })}
        rightAction={
          <TouchableOpacity
            onPress={() => guardAction(() => navigation.navigate('CreateSale'))}
            style={styles.addButton}
          >
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        }
      />

      {sales.length > 0 && (
        <View style={styles.summaryBar}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{totalUnits}</Text>
            <Text style={styles.summaryLabel}>{t('sales.units')}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: colors.success }]}>
              {formatCurrency(totalRevenue)}
            </Text>
            <Text style={styles.summaryLabel}>{t('sales.totalRevenue')}</Text>
          </View>
        </View>
      )}

      <View style={styles.filterBar}>
        {(['all', 'month', 'week'] as const).map(p => (
          <TouchableOpacity
            key={p}
            style={[styles.filterBtn, period === p && styles.filterBtnActive]}
            onPress={() => setPeriod(p)}
          >
            <Text style={[styles.filterBtnText, period === p && styles.filterBtnTextActive]}>
              {p === 'all' ? t('sales.all') : p === 'month' ? t('sales.thisMonth') : t('sales.thisWeek')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <SectionList
        sections={sections}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadSales(); }}
            colors={[colors.primary]}
          />
        }
        ListHeaderComponent={
          sales.length > 0 ? (
            <View style={styles.infoCard}>
              <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
              <Text style={styles.infoText}>
                {t('sales.infoText')}
              </Text>
            </View>
          ) : null
        }
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionDate}>{section.label}</Text>
            <Text style={styles.sectionTotal}>{formatCurrency(section.total)}</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <Card style={styles.saleCard}>
            <View style={styles.saleRow}>
              <View style={styles.saleIcon}>
                <Ionicons name="cash-outline" size={22} color={colors.success} />
              </View>
              <View style={styles.saleInfo}>
                <Text style={styles.recipeName}>{item.recipeName}</Text>
                <Text style={styles.saleDetail}>
                  {item.quantitySold} un × {formatCurrency(item.salePrice)}
                </Text>
                {item.notes ? (
                  <Text style={styles.saleNotes}>{item.notes}</Text>
                ) : null}
              </View>
              <View style={styles.saleRight}>
                <Text style={styles.saleTotal}>{formatCurrency(item.totalRevenue)}</Text>
                <TouchableOpacity onPress={() => handleDelete(item)} style={styles.deleteBtn}>
                  <Ionicons name="trash-outline" size={18} color={colors.error} />
                </TouchableOpacity>
              </View>
            </View>
          </Card>
        )}
        ListEmptyComponent={
          <EmptyState
            icon="cash-outline"
            title={t('sales.emptyTitle')}
            description={t('sales.emptyDescription')}
            actionLabel={t('sales.registerSale')}
            onAction={() => guardAction(() => navigation.navigate('CreateSale'))}
          />
        }
      />
      <DemoGuardModal />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  addButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  summaryBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryDivider: { width: 1, backgroundColor: colors.border },
  summaryValue: { ...typography.h3, color: colors.text },
  summaryLabel: { ...typography.caption, color: colors.textSecondary },
  filterBar: { flexDirection: 'row', marginHorizontal: 20, marginTop: 8, marginBottom: 4, gap: 8 },
  filterBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', backgroundColor: colors.surface },
  filterBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterBtnText: { ...typography.bodySmall, color: colors.textSecondary, fontWeight: '600' },
  filterBtnTextActive: { color: '#fff' },
  list: { padding: 20, paddingTop: 8, flexGrow: 1 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 2,
  },
  sectionDate: { ...typography.h4, color: colors.text, textTransform: 'capitalize' },
  sectionTotal: { ...typography.bodySmall, color: colors.success, fontWeight: '700' },
  saleCard: { marginBottom: 8 },
  saleRow: { flexDirection: 'row', alignItems: 'center' },
  saleIcon: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: '#E8F5E9', alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  saleInfo: { flex: 1 },
  recipeName: { ...typography.h4, color: colors.text },
  saleDetail: { ...typography.bodySmall, color: colors.textSecondary, marginTop: 2 },
  saleNotes: { ...typography.caption, color: colors.textSecondary, marginTop: 2, fontStyle: 'italic' },
  saleRight: { alignItems: 'flex-end', gap: 8 },
  saleTotal: { ...typography.h4, color: colors.success },
  deleteBtn: { padding: 4 },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.primaryLight,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  infoText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 18,
  },
});
