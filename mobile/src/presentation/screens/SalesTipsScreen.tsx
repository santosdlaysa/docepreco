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
import { generateInsights, Insight } from '../utils/generateInsights';
import { statsApi } from '../../data/api/statsApi';
import { saleApi } from '../../data/api/saleApi';
import { recipeApi } from '../../data/api/recipeApi';
import { goalApi } from '../../data/api/goalApi';
import { isDemoMode } from '../../data/demo/demoMode';
import { demoStatsApi, demoSaleApi, demoRecipeApi } from '../../data/demo/demoApi';
import { Recipe } from '../../domain/entities/Recipe';
import { Sale } from '../../domain/entities/Sale';

/* ─── Design tokens ─── */
const INK = '#3D2233';
const INK2 = '#9A7E8C';
const INK3 = '#C4B0BB';
const CREAM = '#FFF6F0';
const GREEN = '#43BE6E';
const AMBER = '#E0922B';
const PINK = '#EA4B92';
const PURPLE = '#7C3AED';
const SHADOW = { shadowColor: INK, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 12, elevation: 4 };

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const STYLE_BY_TYPE: Record<Insight['type'], { bg: string; color: string }> = {
  positive: { bg: '#E4F6EA', color: GREEN },
  warning: { bg: '#FCEFD9', color: AMBER },
  neutral: { bg: '#EAF2FD', color: '#2B7DDB' },
  tip: { bg: '#F1E8FB', color: PURPLE },
};

export const SalesTipsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { guardMaster } = usePaywall();

  const [loading, setLoading] = useState(true);
  const [tips, setTips] = useState<Insight[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (!guardMaster('salesTips')) return;
      load();
    }, []),
  );

  const load = async () => {
    const stApi = isDemoMode() ? demoStatsApi : statsApi;
    const sApi = isDemoMode() ? demoSaleApi : saleApi;
    const rApi = isDemoMode() ? demoRecipeApi : recipeApi;
    try {
      const now = new Date();
      const [stats, sales, recipes] = await Promise.all([
        stApi.getStats(),
        sApi.getAll() as Promise<Sale[]>,
        rApi.getAll() as Promise<Recipe[]>,
      ]);
      let goal = null;
      try { goal = await goalApi.get(now.getMonth() + 1, now.getFullYear()); } catch { /* sem meta */ }

      const base = generateInsights(stats, goal);
      const pricing = await buildPricingTips(sales, recipes, rApi.calculate);
      setTips([...pricing, ...base]);
    } catch {
      setTips([]);
    } finally {
      setLoading(false);
    }
  };

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
        <LinearGradient colors={['#9B6BF0', PURPLE, '#5B23C0']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.hero}>
          <Ionicons name="bulb" size={26} color="#fff" />
          <Text style={s.heroTitle}>Dicas para vender mais</Text>
          <Text style={s.heroSub}>Análises da sua precificação e das suas vendas para aumentar o lucro.</Text>
        </LinearGradient>

        {tips.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="bulb-outline" size={40} color={INK3} />
            <Text style={s.emptyTitle}>Ainda sem dicas</Text>
            <Text style={s.emptyDesc}>Cadastre receitas e registre vendas para receber dicas personalizadas.</Text>
          </View>
        ) : (
          <View style={{ gap: 11 }}>
            {tips.map(tip => {
              const st = STYLE_BY_TYPE[tip.type];
              return (
                <View key={tip.id} style={s.card}>
                  <View style={[s.cardIco, { backgroundColor: st.bg }]}>
                    <Ionicons name={tip.icon as any} size={20} color={st.color} />
                  </View>
                  <Text style={s.cardText}>{tip.message}</Text>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

/**
 * Dicas de precificação: compara o preço médio praticado com o preço sugerido
 * pela ficha técnica e destaca o produto de maior margem e a concentração de
 * faturamento.
 */
async function buildPricingTips(
  sales: Sale[],
  recipes: Recipe[],
  calculate: (id: string) => Promise<{ suggestedPrice: number; profitMargin: number; costPerUnit: number }>,
): Promise<Insight[]> {
  const tips: Insight[] = [];
  if (sales.length === 0) return tips;

  // Agrega vendas por receita
  const agg: Record<string, { name: string; units: number; revenue: number }> = {};
  for (const s of sales) {
    const a = agg[s.recipeId] ?? { name: s.recipeName, units: 0, revenue: 0 };
    a.units += s.quantitySold;
    a.revenue += s.totalRevenue;
    agg[s.recipeId] = a;
  }

  const totalRevenue = Object.values(agg).reduce((sum, a) => sum + a.revenue, 0);
  const soldIds = Object.keys(agg);

  // Calcula preço sugerido/margem de cada receita vendida
  const calc: Record<string, { suggestedPrice: number; profitMargin: number; costPerUnit: number }> = {};
  await Promise.all(soldIds.map(async id => {
    try { calc[id] = await calculate(id); } catch { /* ignora */ }
  }));

  // 1. Vendendo abaixo do preço sugerido
  let bestUnderpriced: { name: string; avg: number; suggested: number; gapPct: number } | null = null;
  for (const id of soldIds) {
    const a = agg[id];
    const c = calc[id];
    if (!c || !c.suggestedPrice || a.units === 0) continue;
    const avg = a.revenue / a.units;
    if (avg < c.suggestedPrice * 0.95) {
      const gapPct = ((c.suggestedPrice - avg) / avg) * 100;
      if (!bestUnderpriced || gapPct > bestUnderpriced.gapPct) {
        bestUnderpriced = { name: a.name, avg, suggested: c.suggestedPrice, gapPct };
      }
    }
  }
  if (bestUnderpriced) {
    tips.push({
      id: 'underpriced',
      icon: 'pricetag-outline',
      type: 'warning',
      message: `Você vende "${bestUnderpriced.name}" a ${fmt(bestUnderpriced.avg)}, mas o preço sugerido é ${fmt(bestUnderpriced.suggested)} (+${bestUnderpriced.gapPct.toFixed(0)}%). Ajustar pode aumentar seu lucro.`,
    });
  }

  // 2. Produto de maior margem
  let bestMargin: { name: string; margin: number } | null = null;
  for (const id of soldIds) {
    const c = calc[id];
    if (!c) continue;
    if (!bestMargin || c.profitMargin > bestMargin.margin) {
      bestMargin = { name: agg[id].name, margin: c.profitMargin };
    }
  }
  if (bestMargin && bestMargin.margin > 0) {
    tips.push({
      id: 'best-margin',
      icon: 'rocket-outline',
      type: 'positive',
      message: `"${bestMargin.name}" tem a maior margem (${bestMargin.margin.toFixed(0)}%). Divulgue mais esse produto para lucrar mais com o mesmo esforço.`,
    });
  }

  // 3. Concentração de faturamento
  if (totalRevenue > 0) {
    const top = Object.values(agg).sort((a, b) => b.revenue - a.revenue)[0];
    const pct = (top.revenue / totalRevenue) * 100;
    if (pct >= 60 && Object.keys(agg).length >= 2) {
      tips.push({
        id: 'concentration',
        icon: 'pie-chart-outline',
        type: 'tip',
        message: `"${top.name}" representa ${pct.toFixed(0)}% do seu faturamento. Diversifique para não depender de um só produto.`,
      });
    }
  }

  return tips;
}

const Header: React.FC<{ navigation: NavigationProp }> = ({ navigation }) => (
  <View style={s.header}>
    <TouchableOpacity onPress={() => navigation.goBack()} style={s.bk}>
      <Ionicons name="arrow-back" size={20} color={INK} />
    </TouchableOpacity>
    <View style={{ flex: 1 }}>
      <Text style={s.headerTitle}>Dicas de vendas</Text>
      <Text style={s.headerSub}>Inteligência de precificação</Text>
    </View>
    <View style={s.masterBadge}><Text style={s.masterBadgeTxt}>MASTER</Text></View>
  </View>
);

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: CREAM },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10 },
  bk: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...SHADOW },
  headerTitle: { fontSize: 22, fontWeight: '700', color: INK },
  headerSub: { fontSize: 12.5, color: INK2, marginTop: 1 },
  masterBadge: { backgroundColor: '#EDE4FB', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 5 },
  masterBadgeTxt: { fontSize: 10, fontWeight: '800', color: PURPLE, letterSpacing: 0.5 },

  hero: { borderRadius: 22, padding: 22, marginBottom: 18, ...SHADOW, shadowColor: PURPLE, shadowOpacity: 0.3 },
  heroTitle: { fontSize: 19, fontWeight: '800', color: '#fff', marginTop: 8 },
  heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.88)', marginTop: 5, lineHeight: 18 },

  card: { flexDirection: 'row', alignItems: 'center', gap: 13, backgroundColor: '#fff', borderRadius: 16, padding: 14, ...SHADOW },
  cardIco: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardText: { flex: 1, fontSize: 13.5, color: INK, lineHeight: 19, fontWeight: '500' },

  empty: { alignItems: 'center', paddingVertical: 50, paddingHorizontal: 30, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: INK, marginTop: 6 },
  emptyDesc: { fontSize: 13, color: INK2, textAlign: 'center', lineHeight: 19 },
});
