import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Skeleton } from '../components/Skeleton';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { RootStackParamList } from '../navigation/types';
import { Sale } from '../../domain/entities/Sale';
import { saleApi } from '../../data/api/saleApi';
import { recipeApi } from '../../data/api/recipeApi';
import { isDemoMode } from '../../data/demo/demoMode';
import { demoSaleApi, demoRecipeApi } from '../../data/demo/demoApi';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { Card } from '../components/Card';
import { Header } from '../components/Header';
import { usePaywall } from '../premium/usePaywall';
import { useTranslation } from 'react-i18next';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const formatCurrency = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// getMonthLabel moved inside component for i18n

interface MonthlyData {
  label: string;
  revenue: number;
  count: number;
}

interface RecipeRanking {
  recipeName: string;
  quantity: number;
  revenue: number;
}

export const ReportsScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp>();
  const { guardScreen } = usePaywall();

  const getMonthLabel = (date: Date) => {
    const months = t('months.short', { returnObjects: true }) as string[];
    return months[date.getMonth()];
  };
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [sales, setSales] = useState<Sale[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [topRecipes, setTopRecipes] = useState<RecipeRanking[]>([]);
  const [currentMonthRevenue, setCurrentMonthRevenue] = useState(0);
  const [prevMonthRevenue, setPrevMonthRevenue] = useState(0);
  const [avgTicket, setAvgTicket] = useState(0);

  const sApi = isDemoMode() ? demoSaleApi : saleApi;
  const rApi = isDemoMode() ? demoRecipeApi : recipeApi;

  useFocusEffect(
    useCallback(() => {
      if (!guardScreen('advancedReports')) {
        return;
      }
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      const allSales = await sApi.getAll();
      setSales(allSales);

      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      // Monthly revenue (last 6 months)
      const monthly: MonthlyData[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(currentYear, currentMonth - i, 1);
        const m = d.getMonth();
        const y = d.getFullYear();
        const monthSales = allSales.filter(s => {
          const sd = new Date(s.saleDate);
          return sd.getMonth() === m && sd.getFullYear() === y;
        });
        monthly.push({
          label: getMonthLabel(d),
          revenue: monthSales.reduce((sum, s) => sum + s.totalRevenue, 0),
          count: monthSales.length,
        });
      }
      setMonthlyData(monthly);

      // Current and previous month revenue
      const curMonthSales = allSales.filter(s => {
        const sd = new Date(s.saleDate);
        return sd.getMonth() === currentMonth && sd.getFullYear() === currentYear;
      });
      const curRevenue = curMonthSales.reduce((sum, s) => sum + s.totalRevenue, 0);
      setCurrentMonthRevenue(curRevenue);

      const prevDate = new Date(currentYear, currentMonth - 1, 1);
      const prevMonthSales = allSales.filter(s => {
        const sd = new Date(s.saleDate);
        return sd.getMonth() === prevDate.getMonth() && sd.getFullYear() === prevDate.getFullYear();
      });
      setPrevMonthRevenue(prevMonthSales.reduce((sum, s) => sum + s.totalRevenue, 0));

      // Average ticket
      if (allSales.length > 0) {
        const totalRevenue = allSales.reduce((sum, s) => sum + s.totalRevenue, 0);
        setAvgTicket(totalRevenue / allSales.length);
      }

      // Top recipes
      const recipeMap = new Map<string, { quantity: number; revenue: number }>();
      for (const sale of allSales) {
        const existing = recipeMap.get(sale.recipeName) || { quantity: 0, revenue: 0 };
        existing.quantity += sale.quantitySold;
        existing.revenue += sale.totalRevenue;
        recipeMap.set(sale.recipeName, existing);
      }
      const ranked = Array.from(recipeMap.entries())
        .map(([recipeName, data]) => ({ recipeName, ...data }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);
      setTopRecipes(ranked);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const now = new Date();
      const dateLabel = now.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
      const revenueChange = prevMonthRevenue > 0
        ? ((currentMonthRevenue - prevMonthRevenue) / prevMonthRevenue * 100)
        : 0;

      const monthRows = monthlyData.map(m => `
        <tr>
          <td>${m.label}</td>
          <td>${m.count} venda${m.count !== 1 ? 's' : ''}</td>
          <td style="text-align:right;font-weight:600;color:#E91E63">${formatCurrency(m.revenue)}</td>
        </tr>`).join('');

      const recipeRows = topRecipes.map((r, i) => `
        <tr>
          <td style="font-weight:700;color:${i === 0 ? '#E91E63' : '#333'}">${i + 1}º</td>
          <td>${r.recipeName}</td>
          <td>${r.quantity} un</td>
          <td style="text-align:right;font-weight:600;color:#E91E63">${formatCurrency(r.revenue)}</td>
        </tr>`).join('');

      const html = `
        <html><head><meta charset="utf-8"/>
        <style>
          body { font-family: Arial, sans-serif; padding: 32px; color: #333; }
          h1 { color: #E91E63; font-size: 24px; margin-bottom: 4px; }
          .subtitle { color: #888; font-size: 13px; margin-bottom: 28px; }
          .section { margin-bottom: 28px; }
          h2 { font-size: 15px; color: #555; border-bottom: 2px solid #F8BBD0; padding-bottom: 6px; margin-bottom: 12px; }
          .stat-grid { display: flex; gap: 16px; margin-bottom: 24px; }
          .stat { flex: 1; background: #FFF0F5; border-radius: 10px; padding: 14px; }
          .stat-label { font-size: 12px; color: #888; margin-bottom: 4px; }
          .stat-value { font-size: 22px; font-weight: 700; color: #E91E63; }
          .stat-sub { font-size: 11px; color: #888; margin-top: 4px; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; }
          th { background: #FCE4EC; color: #C2185B; text-align: left; padding: 8px 10px; }
          td { padding: 8px 10px; border-bottom: 1px solid #f0f0f0; }
          .footer { margin-top: 40px; font-size: 11px; color: #bbb; text-align: center; }
        </style></head><body>
        <h1>Relatório DocePreço</h1>
        <div class="subtitle">Gerado em ${dateLabel}</div>

        <div class="stat-grid">
          <div class="stat">
            <div class="stat-label">Faturamento do mês</div>
            <div class="stat-value">${formatCurrency(currentMonthRevenue)}</div>
            ${prevMonthRevenue > 0 ? `<div class="stat-sub">${revenueChange >= 0 ? '▲' : '▼'} ${Math.abs(revenueChange).toFixed(1)}% vs mês anterior</div>` : ''}
          </div>
          <div class="stat">
            <div class="stat-label">Ticket médio</div>
            <div class="stat-value">${formatCurrency(avgTicket)}</div>
            <div class="stat-sub">${sales.length} vendas no total</div>
          </div>
        </div>

        <div class="section">
          <h2>Vendas por mês (últimos 6 meses)</h2>
          <table><thead><tr><th>Mês</th><th>Qtd. vendas</th><th style="text-align:right">Faturamento</th></tr></thead>
          <tbody>${monthRows}</tbody></table>
        </div>

        <div class="section">
          <h2>Receitas mais vendidas</h2>
          ${topRecipes.length === 0
            ? '<p style="color:#aaa">Nenhuma venda registrada.</p>'
            : `<table><thead><tr><th>#</th><th>Receita</th><th>Qtd.</th><th style="text-align:right">Faturamento</th></tr></thead>
               <tbody>${recipeRows}</tbody></table>`}
        </div>

        <div class="footer">DocePreço · relatório gerado automaticamente</div>
        </body></html>`;

      const { uri } = await Print.printToFileAsync({ html, base64: false });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Relatório DocePreço' });
      }
    } catch {
      // silently fail
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Header title={t('reports.title')} subtitle={t('reports.subtitle')} showBack onBack={() => navigation.goBack()} />
        <View style={styles.skeletonContainer}>
          {/* Revenue cards skeleton */}
          <View style={styles.skeletonRow}>
            <View style={styles.skeletonRevenueCard}>
              <Skeleton width={80} height={12} borderRadius={4} />
              <Skeleton width={100} height={24} borderRadius={6} style={{ marginTop: 8 }} />
              <Skeleton width={60} height={12} borderRadius={4} style={{ marginTop: 6 }} />
            </View>
            <View style={styles.skeletonRevenueCard}>
              <Skeleton width={80} height={12} borderRadius={4} />
              <Skeleton width={100} height={24} borderRadius={6} style={{ marginTop: 8 }} />
              <Skeleton width={60} height={12} borderRadius={4} style={{ marginTop: 6 }} />
            </View>
          </View>
          {/* Chart skeleton */}
          <View style={styles.skeletonChartCard}>
            <Skeleton width={140} height={16} borderRadius={6} />
            <View style={styles.skeletonBars}>
              {[60, 80, 45, 90, 55, 70].map((h, i) => (
                <Skeleton key={i} width={28} height={h} borderRadius={4} />
              ))}
            </View>
          </View>
          {/* Top recipes skeleton */}
          <View style={styles.skeletonListCard}>
            <Skeleton width={160} height={16} borderRadius={6} />
            {[0, 1, 2].map(i => (
              <View key={i} style={styles.skeletonListItem}>
                <Skeleton width={24} height={24} borderRadius={12} />
                <Skeleton width={140} height={14} borderRadius={4} style={{ marginLeft: 10 }} />
                <View style={{ flex: 1 }} />
                <Skeleton width={60} height={14} borderRadius={4} />
              </View>
            ))}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const maxMonthlyRevenue = Math.max(...monthlyData.map(m => m.revenue), 1);
  const revenueChange = prevMonthRevenue > 0
    ? ((currentMonthRevenue - prevMonthRevenue) / prevMonthRevenue * 100)
    : 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title={t('reports.title')}
        subtitle={t('reports.subtitle')}
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity onPress={handleDownload} disabled={downloading} style={styles.downloadBtn} activeOpacity={0.7}>
            {downloading
              ? <ActivityIndicator size="small" color={colors.primary} />
              : <Ionicons name="download-outline" size={22} color={colors.primary} />}
          </TouchableOpacity>
        }
      />
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

        {/* Revenue Card */}
        <Card style={styles.revenueCard}>
          <View style={styles.revenueHeader}>
            <View style={[styles.iconWrap, { backgroundColor: '#E8F5E9' }]}>
              <Ionicons name="trending-up" size={22} color={colors.success} />
            </View>
            <Text style={styles.cardTitle}>{t('reports.monthRevenue')}</Text>
          </View>
          <Text style={styles.revenueValue}>{formatCurrency(currentMonthRevenue)}</Text>
          {prevMonthRevenue > 0 && (
            <View style={styles.compareRow}>
              <Ionicons
                name={revenueChange >= 0 ? 'arrow-up' : 'arrow-down'}
                size={14}
                color={revenueChange >= 0 ? colors.success : colors.error}
              />
              <Text style={[styles.compareText, { color: revenueChange >= 0 ? colors.success : colors.error }]}>
                {Math.abs(revenueChange).toFixed(1)}% {t('reports.vsPrevMonth')} ({formatCurrency(prevMonthRevenue)})
              </Text>
            </View>
          )}
        </Card>

        {/* Average Ticket */}
        <Card style={styles.card}>
          <View style={styles.revenueHeader}>
            <View style={[styles.iconWrap, { backgroundColor: '#FFF3E0' }]}>
              <Ionicons name="receipt-outline" size={22} color={colors.warning} />
            </View>
            <Text style={styles.cardTitle}>{t('reports.avgTicket')}</Text>
          </View>
          <Text style={styles.ticketValue}>{formatCurrency(avgTicket)}</Text>
          <Text style={styles.ticketSub}>{t('reports.perSale', { count: sales.length })}</Text>
        </Card>

        {/* Monthly Chart */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>{t('reports.salesByPeriod')}</Text>
          <Text style={styles.cardSubtitle}>{t('reports.last6Months')}</Text>
          <View style={styles.chartContainer}>
            {monthlyData.map((month, idx) => (
              <View key={idx} style={styles.barColumn}>
                <Text style={styles.barValue}>
                  {month.revenue > 0 ? formatCurrency(month.revenue) : '-'}
                </Text>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: `${Math.max((month.revenue / maxMonthlyRevenue) * 100, 4)}%`,
                        backgroundColor: idx === monthlyData.length - 1 ? colors.primary : colors.primaryLight,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.barLabel}>{month.label}</Text>
              </View>
            ))}
          </View>
        </Card>

        {/* Top Recipes */}
        <Card style={styles.card}>
          <View style={styles.revenueHeader}>
            <View style={[styles.iconWrap, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="trophy-outline" size={22} color={colors.primary} />
            </View>
            <Text style={styles.cardTitle}>{t('reports.topRecipes')}</Text>
          </View>
          {topRecipes.length === 0 ? (
            <Text style={styles.emptyText}>{t('reports.noSales')}</Text>
          ) : (
            topRecipes.map((recipe, idx) => (
              <View key={recipe.recipeName} style={styles.rankRow}>
                <View style={[styles.rankBadge, idx === 0 && styles.rankBadgeFirst]}>
                  <Text style={[styles.rankNumber, idx === 0 && styles.rankNumberFirst]}>
                    {idx + 1}
                  </Text>
                </View>
                <View style={styles.rankInfo}>
                  <Text style={styles.rankName}>{recipe.recipeName}</Text>
                  <Text style={styles.rankSub}>{t('reports.unitsSold', { count: recipe.quantity })}</Text>
                </View>
                <Text style={styles.rankRevenue}>{formatCurrency(recipe.revenue)}</Text>
              </View>
            ))
          )}
        </Card>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { flex: 1, padding: 20 },
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
  revenueCard: { marginBottom: 12, backgroundColor: colors.cream },
  card: { marginBottom: 12 },
  revenueHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { ...typography.h4, color: colors.text },
  cardSubtitle: { ...typography.caption, color: colors.textSecondary, marginTop: 4, marginBottom: 12 },
  revenueValue: { ...typography.h1, color: colors.success, marginBottom: 4 },
  compareRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  compareText: { ...typography.bodySmall },
  ticketValue: { ...typography.h2, color: colors.warning, marginBottom: 2 },
  ticketSub: { ...typography.caption, color: colors.textSecondary },
  chartContainer: { flexDirection: 'row', height: 180, gap: 4, marginTop: 8 },
  barColumn: { flex: 1, alignItems: 'center' },
  barTrack: {
    flex: 1,
    width: '80%',
    justifyContent: 'flex-end',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.border,
  },
  bar: { width: '100%', borderRadius: 8 },
  barValue: {
    fontSize: 9,
    color: colors.textSecondary,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  barLabel: { ...typography.caption, color: colors.textSecondary, marginTop: 6 },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rankBadgeFirst: { backgroundColor: '#FFD700' },
  rankNumber: { ...typography.bodySmall, fontWeight: '700', color: colors.textSecondary },
  rankNumberFirst: { color: '#fff' },
  rankInfo: { flex: 1 },
  rankName: { ...typography.body, color: colors.text, fontWeight: '600' },
  rankSub: { ...typography.caption, color: colors.textSecondary },
  rankRevenue: { ...typography.h4, color: colors.primary },
  emptyText: { ...typography.body, color: colors.textMuted, textAlign: 'center', paddingVertical: 16 },
  downloadBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skeletonContainer: {
    padding: 20,
    gap: 14,
  },
  skeletonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  skeletonRevenueCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  skeletonChartCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  skeletonBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: 100,
    marginTop: 16,
  },
  skeletonListCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 12,
  },
  skeletonListItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
