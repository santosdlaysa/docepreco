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
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { usePaywall } from '../premium/usePaywall';
import { recipeApi } from '../../data/api/recipeApi';
import { saleApi } from '../../data/api/saleApi';
import { expenseApi, Expense } from '../../data/api/expenseApi';
import { isDemoMode } from '../../data/demo/demoMode';
import { demoRecipeApi, demoSaleApi, demoExpenseApi } from '../../data/demo/demoApi';
import { Recipe } from '../../domain/entities/Recipe';
import { Sale } from '../../domain/entities/Sale';

/* ─── Design tokens ─── */
const INK = '#3D2233';
const INK2 = '#9A7E8C';
const INK3 = '#C4B0BB';
const CREAM = '#FFF6F0';
const LINE = '#F1E2DA';
const GREEN = '#43BE6E';
const RED = '#E8537A';
const PURPLE = '#7C3AED';
const SHADOW = { shadowColor: INK, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 12, elevation: 4 };

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type Period = 'month' | 'prev' | 'all';

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const ymOf = (iso: string) => iso.slice(0, 7); // 'YYYY-MM'

const periodKeys = (): { month: string; prev: string } => {
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const p = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prev = `${p.getFullYear()}-${String(p.getMonth() + 1).padStart(2, '0')}`;
  return { month, prev };
};

interface ProductLine {
  recipeId: string;
  name: string;
  units: number;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
}

export const FinanceScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { guardMaster } = usePaywall();

  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [costPerUnit, setCostPerUnit] = useState<Record<string, number>>({});
  const [recipeName, setRecipeName] = useState<Record<string, string>>({});
  const [period, setPeriod] = useState<Period>('month');

  useFocusEffect(
    useCallback(() => {
      if (!guardMaster('finance')) return;
      load();
    }, [period]),
  );

  const load = async () => {
    const rApi = isDemoMode() ? demoRecipeApi : recipeApi;
    const sApi = isDemoMode() ? demoSaleApi : saleApi;
    const eApi = isDemoMode() ? demoExpenseApi : expenseApi;
    const { month, prev } = periodKeys();
    const expenseMonth = period === 'all' ? undefined : period === 'prev' ? prev : month;
    try {
      const [allSales, recipes, allExpenses] = await Promise.all([
        sApi.getAll() as Promise<Sale[]>,
        rApi.getAll() as Promise<Recipe[]>,
        eApi.getAll(expenseMonth) as Promise<Expense[]>,
      ]);
      setSales(allSales);
      setExpenses(allExpenses);

      const names: Record<string, string> = {};
      for (const r of recipes) names[r.id] = r.name;
      setRecipeName(names);

      // Calcula o custo unitário só das receitas que tiveram venda.
      const soldIds = Array.from(new Set(allSales.map(s => s.recipeId)));
      const costs: Record<string, number> = {};
      await Promise.all(
        soldIds.map(async id => {
          try {
            const calc = await rApi.calculate(id);
            costs[id] = calc.costPerUnit ?? 0;
          } catch {
            costs[id] = 0;
          }
        }),
      );
      setCostPerUnit(costs);
    } catch {
      // mantém estados vazios — exibe empty state
    } finally {
      setLoading(false);
    }
  };

  const { month, prev } = periodKeys();
  const filtered = sales.filter(s => {
    if (period === 'all') return true;
    const ym = ymOf(s.saleDate);
    return period === 'month' ? ym === month : ym === prev;
  });

  const revenue = filtered.reduce((sum, s) => sum + s.totalRevenue, 0);
  const cost = filtered.reduce((sum, s) => sum + (costPerUnit[s.recipeId] ?? 0) * s.quantitySold, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const profit = revenue - cost - totalExpenses;
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
  const units = filtered.reduce((sum, s) => sum + s.quantitySold, 0);

  // Quebra por produto
  const byProduct: Record<string, ProductLine> = {};
  for (const s of filtered) {
    const line = byProduct[s.recipeId] ?? {
      recipeId: s.recipeId,
      name: s.recipeName || recipeName[s.recipeId] || 'Receita',
      units: 0, revenue: 0, cost: 0, profit: 0, margin: 0,
    };
    line.units += s.quantitySold;
    line.revenue += s.totalRevenue;
    line.cost += (costPerUnit[s.recipeId] ?? 0) * s.quantitySold;
    byProduct[s.recipeId] = line;
  }
  const products = Object.values(byProduct)
    .map(p => ({ ...p, profit: p.revenue - p.cost, margin: p.revenue > 0 ? ((p.revenue - p.cost) / p.revenue) * 100 : 0 }))
    .sort((a, b) => b.profit - a.profit);

  const costPct = revenue > 0 ? (cost / revenue) * 100 : 0;

  if (loading) {
    return (
      <SafeAreaView style={s.safe}>
        <Header navigation={navigation} />
        <View style={s.center}><ActivityIndicator size="large" color={PURPLE} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <Header navigation={navigation} />
      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

        {/* Seletor de período */}
        <View style={s.seg}>
          {([['month', 'Este mês'], ['prev', 'Mês passado'], ['all', 'Tudo']] as [Period, string][]).map(([key, label]) => (
            <TouchableOpacity key={key} onPress={() => setPeriod(key)} activeOpacity={0.8}
              style={[s.segItem, period === key && s.segItemOn]}>
              <Text style={[s.segText, period === key && s.segTextOn]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {filtered.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="bar-chart-outline" size={40} color={INK3} />
            <Text style={s.emptyTitle}>Sem dados no período</Text>
            <Text style={s.emptyDesc}>Registre vendas para ver o resultado financeiro (DRE) do seu negócio.</Text>
          </View>
        ) : (
          <>
            {/* Hero — Lucro do período */}
            <LinearGradient colors={['#9B6BF0', PURPLE, '#5B23C0']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.hero}>
              <Text style={s.heroLabel}>Lucro do período</Text>
              <Text style={s.heroValue}>{fmt(profit)}</Text>
              <View style={s.heroRow}>
                <View style={s.heroPill}>
                  <Ionicons name="trending-up" size={13} color="#fff" />
                  <Text style={s.heroPillText}>Margem {margin.toFixed(0)}%</Text>
                </View>
                <View style={s.heroPill}>
                  <Ionicons name="cube-outline" size={13} color="#fff" />
                  <Text style={s.heroPillText}>{units} un vendidas</Text>
                </View>
              </View>
            </LinearGradient>

            {/* DRE */}
            <Text style={s.secTitle}>Demonstrativo (DRE)</Text>
            <View style={s.card}>
              <DreRow label="Receita bruta" value={fmt(revenue)} color={INK} bar={100} barColor="#E7DAF7" />
              <DreRow label="(–) Custo dos produtos" sub={`${costPct.toFixed(0)}% da receita`} value={`– ${fmt(cost)}`} color={RED} bar={costPct} barColor="#FBD9E2" />
              {totalExpenses > 0 && (
                <DreRow
                  label="(–) Despesas operacionais"
                  sub={`${revenue > 0 ? ((totalExpenses / revenue) * 100).toFixed(0) : 0}% da receita`}
                  value={`– ${fmt(totalExpenses)}`}
                  color={RED}
                  bar={revenue > 0 ? (totalExpenses / revenue) * 100 : 0}
                  barColor="#FBD9E2"
                />
              )}
              <View style={s.divider} />
              <DreRow label="(=) Lucro líquido" value={fmt(profit)} color={profit >= 0 ? GREEN : RED} bold bar={Math.max(0, margin)} barColor="#CFEFDB" />
              <View style={s.marginRow}>
                <Text style={s.marginLabel}>Margem de lucro</Text>
                <Text style={[s.marginValue, { color: profit >= 0 ? GREEN : RED }]}>{margin.toFixed(1)}%</Text>
              </View>
            </View>

            {/* Por produto */}
            <Text style={s.secTitle}>Resultado por produto</Text>
            <View style={s.card}>
              {products.map((p, i) => (
                <View key={p.recipeId} style={[s.prodRow, i > 0 && { borderTopWidth: 1, borderTopColor: LINE }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.prodName} numberOfLines={1}>{p.name}</Text>
                    <Text style={s.prodMeta}>{p.units} un · receita {fmt(p.revenue)} · custo {fmt(p.cost)}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[s.prodProfit, { color: p.profit >= 0 ? GREEN : RED }]}>{fmt(p.profit)}</Text>
                    <Text style={s.prodMargin}>{p.margin.toFixed(0)}% margem</Text>
                  </View>
                </View>
              ))}
            </View>

            <Text style={s.note}>
              O custo é calculado a partir da ficha técnica de cada receita (ingredientes, adicionais e sub-receitas) no momento da consulta.
            </Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const Header: React.FC<{ navigation: NavigationProp }> = ({ navigation }) => (
  <View style={s.header}>
    <TouchableOpacity onPress={() => navigation.goBack()} style={s.bk}>
      <Ionicons name="arrow-back" size={20} color={INK} />
    </TouchableOpacity>
    <View style={{ flex: 1 }}>
      <Text style={s.headerTitle}>Financeiro</Text>
      <Text style={s.headerSub}>Gestão de resultado (DRE)</Text>
    </View>
    <TouchableOpacity onPress={() => navigation.navigate('Expenses')} style={s.expensesBtn} activeOpacity={0.8}>
      <Ionicons name="receipt-outline" size={15} color={PURPLE} />
      <Text style={s.expensesBtnTxt}>Despesas</Text>
    </TouchableOpacity>
    <View style={s.masterBadge}><Text style={s.masterBadgeTxt}>MASTER</Text></View>
  </View>
);

const DreRow: React.FC<{ label: string; sub?: string; value: string; color: string; bold?: boolean; bar: number; barColor: string }> = ({ label, sub, value, color, bold, bar, barColor }) => (
  <View style={s.dreRow}>
    <View style={s.dreTop}>
      <View style={{ flex: 1 }}>
        <Text style={[s.dreLabel, bold && { fontWeight: '800' }]}>{label}</Text>
        {sub && <Text style={s.dreSub}>{sub}</Text>}
      </View>
      <Text style={[s.dreValue, { color }, bold && { fontWeight: '800' }]}>{value}</Text>
    </View>
    <View style={s.barTrack}>
      <View style={[s.barFill, { width: `${Math.min(100, Math.max(0, bar))}%`, backgroundColor: barColor }]} />
    </View>
  </View>
);

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: CREAM },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10 },
  bk: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...SHADOW },
  headerTitle: { fontSize: 22, fontWeight: '700', color: INK },
  headerSub: { fontSize: 12.5, color: INK2, marginTop: 1 },
  expensesBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#EDE4FB', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, marginRight: 6 },
  expensesBtnTxt: { fontSize: 12, fontWeight: '700', color: PURPLE },
  masterBadge: { backgroundColor: '#EDE4FB', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 5 },
  masterBadgeTxt: { fontSize: 10, fontWeight: '800', color: PURPLE, letterSpacing: 0.5 },

  seg: { flexDirection: 'row', backgroundColor: '#F3E9F0', borderRadius: 13, padding: 4, marginBottom: 16 },
  segItem: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  segItemOn: { backgroundColor: '#fff', ...SHADOW },
  segText: { fontSize: 13, fontWeight: '600', color: INK2 },
  segTextOn: { color: INK, fontWeight: '700' },

  hero: { borderRadius: 22, padding: 22, marginBottom: 18, ...SHADOW, shadowColor: PURPLE, shadowOpacity: 0.3 },
  heroLabel: { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginBottom: 4 },
  heroValue: { fontSize: 34, fontWeight: '800', color: '#fff', letterSpacing: 0.3 },
  heroRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  heroPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  heroPillText: { fontSize: 12, fontWeight: '700', color: '#fff' },

  secTitle: { fontSize: 16, fontWeight: '700', color: INK, marginBottom: 10 },
  card: { backgroundColor: '#fff', borderRadius: 18, padding: 16, marginBottom: 18, ...SHADOW },

  dreRow: { marginBottom: 12 },
  dreTop: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 6 },
  dreLabel: { fontSize: 14, fontWeight: '600', color: INK },
  dreSub: { fontSize: 11.5, color: INK2, marginTop: 1 },
  dreValue: { fontSize: 15, fontWeight: '700' },
  barTrack: { height: 7, borderRadius: 4, backgroundColor: '#F4ECF1', overflow: 'hidden' },
  barFill: { height: 7, borderRadius: 4 },
  divider: { height: 1, backgroundColor: LINE, marginVertical: 4, marginBottom: 12 },
  marginRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, paddingTop: 12, borderTopWidth: 1, borderTopColor: LINE },
  marginLabel: { fontSize: 13, fontWeight: '600', color: INK2 },
  marginValue: { fontSize: 20, fontWeight: '800' },

  prodRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 10 },
  prodName: { fontSize: 14.5, fontWeight: '700', color: INK },
  prodMeta: { fontSize: 11.5, color: INK2, marginTop: 2 },
  prodProfit: { fontSize: 15, fontWeight: '800' },
  prodMargin: { fontSize: 11, color: INK2, marginTop: 2 },

  note: { fontSize: 11.5, color: INK3, lineHeight: 16, textAlign: 'center', paddingHorizontal: 8 },

  empty: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 30, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: INK, marginTop: 6 },
  emptyDesc: { fontSize: 13, color: INK2, textAlign: 'center', lineHeight: 19 },
});
