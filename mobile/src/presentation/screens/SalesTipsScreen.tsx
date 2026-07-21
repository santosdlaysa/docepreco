import { colors } from '../theme/colors';
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { usePaywall } from '../premium/usePaywall';
import { generateInsights, Insight } from '../utils/generateInsights';
import { MARKETING_TIPS, MARKETING_CATEGORIES, MarketingCategory } from '../utils/marketingTips';
import { statsApi } from '../../data/api/statsApi';
import { saleApi } from '../../data/api/saleApi';
import { recipeApi } from '../../data/api/recipeApi';
import { goalApi } from '../../data/api/goalApi';
import { isDemoMode } from '../../data/demo/demoMode';
import { demoStatsApi, demoSaleApi, demoRecipeApi } from '../../data/demo/demoApi';
import { Recipe } from '../../domain/entities/Recipe';
import { Sale } from '../../domain/entities/Sale';

/* ─── Design tokens ─── */
const INK = colors.text;
const INK2 = colors.textSecondary;
const INK3 = colors.textMuted;
const CREAM = colors.pinkBg3;
const LINE = colors.border;
const GREEN = colors.green;
const AMBER = '#E0922B';
const PURPLE = colors.purple;
const SHADOW = { shadowColor: INK, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 12, elevation: 4 };

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type CatFilter = MarketingCategory | 'all';

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
  const [insights, setInsights] = useState<Insight[]>([]);
  const [cat, setCat] = useState<CatFilter>('all');
  const [expanded, setExpanded] = useState<string | null>(null);

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
      setInsights([...pricing, ...base]);
    } catch {
      setInsights([]);
    } finally {
      setLoading(false);
    }
  };

  const toggle = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(prev => (prev === id ? null : id));
  };

  const tips = cat === 'all' ? MARKETING_TIPS : MARKETING_TIPS.filter(tt => tt.category === cat);

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
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

        <View style={{ paddingHorizontal: 18 }}>
          <LinearGradient colors={['#9B6BF0', PURPLE, '#5B23C0']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.hero}>
            <Ionicons name="bulb" size={26} color="#fff" />
            <Text style={s.heroTitle}>Venda mais e melhor</Text>
            <Text style={s.heroSub}>Análises do seu negócio + dicas práticas de marketing e vendas para confeitaria.</Text>
          </LinearGradient>
        </View>

        {/* Análise do negócio (dinâmica) */}
        {insights.length > 0 && (
          <View style={{ paddingHorizontal: 18 }}>
            <Text style={s.secTitle}>📊 Análise do seu negócio</Text>
            <View style={{ gap: 10, marginBottom: 22 }}>
              {insights.map(tip => {
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
          </View>
        )}

        {/* Dicas de marketing (curadas) */}
        <Text style={[s.secTitle, { paddingHorizontal: 18 }]}>💡 Dicas de marketing e vendas</Text>

        {/* Filtro por categoria */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 18, gap: 8, paddingBottom: 4 }}
          style={{ marginBottom: 14 }}>
          <Chip label="Todas" icon="apps-outline" color={PURPLE} active={cat === 'all'} onPress={() => setCat('all')} />
          {MARKETING_CATEGORIES.map(c => (
            <Chip key={c.key} label={c.label} icon={c.icon} color={c.color} active={cat === c.key} onPress={() => setCat(c.key)} />
          ))}
        </ScrollView>

        <View style={{ paddingHorizontal: 18, gap: 10 }}>
          {tips.map(tip => {
            const meta = MARKETING_CATEGORIES.find(c => c.key === tip.category)!;
            const open = expanded === tip.id;
            return (
              <TouchableOpacity key={tip.id} style={s.tipCard} activeOpacity={0.85} onPress={() => toggle(tip.id)}>
                <View style={s.tipHead}>
                  <View style={[s.tipIco, { backgroundColor: meta.bg }]}>
                    <Ionicons name={tip.icon as any} size={19} color={meta.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.tipTitle}>{tip.title}</Text>
                    <Text style={[s.tipCat, { color: meta.color }]}>{meta.label}</Text>
                  </View>
                  <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={INK3} />
                </View>
                {open && (
                  <>
                    <Text style={s.tipBody}>{tip.body}</Text>
                    {tip.link && (
                      <TouchableOpacity
                        style={s.tipLink}
                        activeOpacity={0.85}
                        onPress={() => Linking.openURL(tip.link!.url)}
                      >
                        <Ionicons name="open-outline" size={16} color="#fff" />
                        <Text style={s.tipLinkText}>{tip.link.label}</Text>
                      </TouchableOpacity>
                    )}
                  </>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
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

  const agg: Record<string, { name: string; units: number; revenue: number }> = {};
  for (const s of sales) {
    const a = agg[s.recipeId] ?? { name: s.recipeName, units: 0, revenue: 0 };
    a.units += s.quantitySold;
    a.revenue += s.totalRevenue;
    agg[s.recipeId] = a;
  }

  const totalRevenue = Object.values(agg).reduce((sum, a) => sum + a.revenue, 0);
  const soldIds = Object.keys(agg);

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

const Chip: React.FC<{ label: string; icon: string; color: string; active: boolean; onPress: () => void }> = ({ label, icon, color, active, onPress }) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.8}
    style={[s.chip, active && { backgroundColor: color, borderColor: color }]}>
    <Ionicons name={icon as any} size={14} color={active ? '#fff' : color} />
    <Text style={[s.chipText, { color: active ? '#fff' : INK }]}>{label}</Text>
  </TouchableOpacity>
);

const Header: React.FC<{ navigation: NavigationProp }> = ({ navigation }) => (
  <View style={s.header}>
    <TouchableOpacity onPress={() => navigation.goBack()} style={s.bk}>
      <Ionicons name="arrow-back" size={20} color={INK} />
    </TouchableOpacity>
    <View style={{ flex: 1 }}>
      <Text style={s.headerTitle}>Dicas de vendas</Text>
      <Text style={s.headerSub}>Marketing e precificação</Text>
    </View>
    <View style={s.masterBadge}><Text style={s.masterBadgeTxt}>MASTER</Text></View>
  </View>
);

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10 },
  bk: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...SHADOW },
  headerTitle: { fontSize: 22, fontWeight: '700', color: INK },
  headerSub: { fontSize: 12.5, color: INK2, marginTop: 1 },
  masterBadge: { backgroundColor: colors.purpleBg, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 5 },
  masterBadgeTxt: { fontSize: 10, fontWeight: '800', color: PURPLE, letterSpacing: 0.5 },

  hero: { borderRadius: 22, padding: 22, marginTop: 4, marginBottom: 22, ...SHADOW, shadowColor: PURPLE, shadowOpacity: 0.3 },
  heroTitle: { fontSize: 19, fontWeight: '800', color: '#fff', marginTop: 8 },
  heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.88)', marginTop: 5, lineHeight: 18 },

  secTitle: { fontSize: 16, fontWeight: '700', color: INK, marginBottom: 12 },

  card: { flexDirection: 'row', alignItems: 'center', gap: 13, backgroundColor: '#fff', borderRadius: 16, padding: 14, ...SHADOW },
  cardIco: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardText: { flex: 1, fontSize: 13.5, color: INK, lineHeight: 19, fontWeight: '500' },

  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff', borderWidth: 1, borderColor: LINE, borderRadius: 20, paddingHorizontal: 13, paddingVertical: 8 },
  chipText: { fontSize: 13, fontWeight: '700' },

  tipCard: { backgroundColor: '#fff', borderRadius: 16, padding: 14, ...SHADOW },
  tipHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  tipIco: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  tipTitle: { fontSize: 14.5, fontWeight: '700', color: INK },
  tipCat: { fontSize: 11.5, fontWeight: '700', marginTop: 2 },
  tipBody: { fontSize: 13.5, color: INK2, lineHeight: 20, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: LINE },
  tipLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: PURPLE, borderRadius: 12, paddingVertical: 11, marginTop: 12 },
  tipLinkText: { fontSize: 13.5, fontWeight: '700', color: '#fff' },
});
