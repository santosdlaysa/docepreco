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
import { LinearGradient } from 'expo-linear-gradient';
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
import { usePaywall } from '../premium/usePaywall';
import { useTranslation } from 'react-i18next';
import { useCurrencyFormat } from '../hooks/useCurrencyFormat';

const INK = '#3D2233';
const INK2 = '#9A7E8C';
const INK3 = '#C4B0BB';
const CREAM = '#FFF6F0';
const LINE = '#F1E2DA';
const PINK = '#EA4B92';
const GREEN = '#43BE6E';
const SHADOW = { shadowColor: INK, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 12, elevation: 4 };

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

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

  const { formatCurrency } = useCurrencyFormat();

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

  const now = new Date();
  const currentMonthLabel = now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const capitalizedMonth = currentMonthLabel.charAt(0).toUpperCase() + currentMonthLabel.slice(1);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        {/* Header skeleton */}
        <View style={styles.header}>
          <View>
            <Skeleton width={120} height={22} borderRadius={6} />
            <Skeleton width={90} height={14} borderRadius={4} style={{ marginTop: 6 }} />
          </View>
          <Skeleton width={70} height={38} borderRadius={12} />
        </View>
        <View style={styles.skeletonContainer}>
          {/* Hero skeleton */}
          <Skeleton width={'100%' as any} height={140} borderRadius={22} />
          {/* Stat cards skeleton */}
          <View style={styles.skeletonRow}>
            <View style={styles.skeletonStatCard}>
              <Skeleton width={80} height={12} borderRadius={4} />
              <Skeleton width={100} height={24} borderRadius={6} style={{ marginTop: 8 }} />
              <Skeleton width={60} height={12} borderRadius={4} style={{ marginTop: 6 }} />
            </View>
            <View style={styles.skeletonStatCard}>
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
                <Skeleton width={40} height={40} borderRadius={12} />
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

  const prevMonthName = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    .toLocaleDateString('pt-BR', { month: 'long' });

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>{t('reports.title')}</Text>
          <Text style={styles.headerSubtitle}>{capitalizedMonth}</Text>
        </View>
        <TouchableOpacity
          onPress={handleDownload}
          disabled={downloading}
          style={styles.pdfPill}
          activeOpacity={0.7}
        >
          {downloading ? (
            <ActivityIndicator size="small" color={PINK} />
          ) : (
            <>
              <Ionicons name="share-outline" size={16} color={INK} />
              <Text style={styles.pdfPillText}>PDF</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Hero Card */}
        <LinearGradient
          colors={['#FF6AAE', PINK, '#C7367A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <Text style={styles.heroLabel}>{t('reports.monthRevenue')}</Text>
          <Text style={styles.heroValue}>{formatCurrency(currentMonthRevenue)}</Text>
          {prevMonthRevenue > 0 && (
            <View style={styles.heroCompare}>
              <Ionicons
                name={revenueChange >= 0 ? 'arrow-up' : 'arrow-down'}
                size={14}
                color="#fff"
              />
              <Text style={styles.heroCompareText}>
                {revenueChange >= 0 ? '+' : ''}{revenueChange.toFixed(1)}% vs {prevMonthName} ({formatCurrency(prevMonthRevenue)})
              </Text>
            </View>
          )}
        </LinearGradient>

        {/* Two stat cards */}
        <View style={styles.twoCards}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>{t('reports.avgTicket')}</Text>
            <Text style={styles.statValue}>{formatCurrency(avgTicket)}</Text>
            <Text style={styles.statSub}>por venda</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Vendas</Text>
            <Text style={styles.statValue}>{sales.filter(s => {
              const sd = new Date(s.saleDate);
              return sd.getMonth() === now.getMonth() && sd.getFullYear() === now.getFullYear();
            }).length}</Text>
            <Text style={styles.statSub}>neste m{'\u00EA'}s</Text>
          </View>
        </View>

        {/* Monthly Chart */}
        <Text style={styles.sectionTitle}>{t('reports.last6Months')}</Text>
        <View style={styles.chartCard}>
          <View style={styles.chartContainer}>
            {monthlyData.map((month, idx) => {
              const barHeight = Math.max((month.revenue / maxMonthlyRevenue) * 100, 6);
              const isLast = idx === monthlyData.length - 1;
              return (
                <View key={idx} style={styles.barColumn}>
                  <View style={styles.barTrack}>
                    {isLast ? (
                      <LinearGradient
                        colors={['#FF6AAE', PINK, '#C7367A']}
                        style={[styles.bar, { height: `${barHeight}%` }]}
                      />
                    ) : (
                      <View style={[styles.bar, { height: `${barHeight}%`, backgroundColor: '#FFE3EF' }]} />
                    )}
                  </View>
                  <Text style={styles.barLabel}>{month.label}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Top Recipes */}
        <Text style={styles.sectionTitle}>{t('reports.topRecipes')}</Text>
        <View style={styles.recipesCard}>
          {topRecipes.length === 0 ? (
            <Text style={styles.emptyText}>{t('reports.noSales')}</Text>
          ) : (
            topRecipes.map((recipe, idx) => (
              <View
                key={recipe.recipeName}
                style={[
                  styles.rankRow,
                  idx > 0 && { borderTopWidth: 1, borderTopColor: LINE },
                ]}
              >
                <View style={[styles.rankBadge, idx === 0 && styles.rankBadgeFirst]}>
                  {idx === 0 ? (
                    <Ionicons name="trophy" size={18} color="#B8860B" />
                  ) : (
                    <Text style={[styles.rankNumber, idx === 0 && styles.rankNumberFirst]}>
                      {idx + 1}
                    </Text>
                  )}
                </View>
                <View style={styles.rankInfo}>
                  <Text style={styles.rankName}>{recipe.recipeName}</Text>
                  <Text style={styles.rankSub}>{t('reports.unitsSold', { count: recipe.quantity })}</Text>
                </View>
                <Text style={styles.rankRevenue}>{formatCurrency(recipe.revenue)}</Text>
              </View>
            ))
          )}
        </View>

        {/* Download Button */}
        <TouchableOpacity onPress={handleDownload} disabled={downloading} activeOpacity={0.8}>
          <LinearGradient
            colors={['#FF6AAE', PINK, '#C7367A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.downloadButton}
          >
            {downloading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="document-text-outline" size={20} color="#fff" />
                <Text style={styles.downloadButtonText}>Baixar relat{'\u00F3'}rio completo</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: CREAM,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: INK,
  },
  headerSubtitle: {
    fontSize: 14,
    color: INK2,
    marginTop: 2,
  },
  pdfPill: {
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    ...SHADOW,
  },
  pdfPillText: {
    fontSize: 14,
    fontWeight: '600',
    color: INK,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  heroCard: {
    borderRadius: 22,
    padding: 24,
    marginBottom: 14,
  },
  heroLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 6,
  },
  heroValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
  },
  heroCompare: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  heroCompareText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
  },
  twoCards: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 18,
    ...SHADOW,
  },
  statLabel: {
    fontSize: 13,
    color: INK2,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: INK,
  },
  statSub: {
    fontSize: 12,
    color: INK3,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: INK,
    marginBottom: 10,
  },
  chartCard: {
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 18,
    marginBottom: 20,
    ...SHADOW,
  },
  chartContainer: {
    flexDirection: 'row',
    height: 160,
    alignItems: 'flex-end',
    gap: 6,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  barTrack: {
    flex: 1,
    width: '70%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bar: {
    width: '100%',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  barLabel: {
    fontSize: 11,
    color: INK2,
    marginTop: 8,
  },
  recipesCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 20,
    ...SHADOW,
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  rankBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: CREAM,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rankBadgeFirst: {
    backgroundColor: '#FFF3D0',
  },
  rankNumber: {
    fontSize: 15,
    fontWeight: '700',
    color: INK2,
  },
  rankNumberFirst: {
    color: '#B8860B',
  },
  rankInfo: {
    flex: 1,
  },
  rankName: {
    fontSize: 15,
    fontWeight: '600',
    color: INK,
  },
  rankSub: {
    fontSize: 12,
    color: INK3,
    marginTop: 2,
  },
  rankRevenue: {
    fontSize: 15,
    fontWeight: '700',
    color: GREEN,
  },
  emptyText: {
    fontSize: 14,
    color: INK3,
    textAlign: 'center',
    paddingVertical: 24,
  },
  downloadButton: {
    height: 54,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  downloadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  // Skeleton styles
  skeletonContainer: {
    padding: 20,
    gap: 14,
  },
  skeletonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  skeletonStatCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 18,
    ...SHADOW,
  },
  skeletonChartCard: {
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 18,
    ...SHADOW,
  },
  skeletonBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: 100,
    marginTop: 16,
  },
  skeletonListCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    gap: 12,
    ...SHADOW,
  },
  skeletonListItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
