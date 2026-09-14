import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, Share, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { apiClient } from '../../data/api/client';
import { ProductionPlan, productionDate, productionQuantity as qty, productionShoppingText } from '../../data/api/productionPlan';
import { isDemoMode } from '../../data/demo/demoMode';

function dateAfter(days: number) {
  const date = new Date(); date.setDate(date.getDate() + days);
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
}
function isoDate(text: string): string | null {
  const match = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const [, day, month, year] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return date.getFullYear() === Number(year) && date.getMonth() === Number(month) - 1 && date.getDate() === Number(day) ? `${year}-${month}-${day}` : null;
}
const maskDate = (text: string) => text.replace(/\D/g, '').slice(0, 8).replace(/^(\d{2})(\d)/, '$1/$2').replace(/^(\d{2})\/(\d{2})(\d)/, '$1/$2/$3');

export function ProductionScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [start, setStart] = useState(() => dateAfter(0));
  const [end, setEnd] = useState(() => dateAfter(6));
  const dates = useRef({ start, end }); dates.current = { start, end };
  const request = useRef(0);
  const [plan, setPlan] = useState<ProductionPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [shareError, setShareError] = useState('');
  const load = useCallback(async () => {
    const current = ++request.current;
    setPlan(null); setError(''); setShareError(''); setLoading(false);
    const from = isoDate(dates.current.start), to = isoDate(dates.current.end);
    if (!from || !to || from > to) { setError('Informe datas válidas, com início anterior ou igual ao fim.'); return; }
    if (isDemoMode()) { setError('Entre na sua conta para planejar a produção com suas encomendas, receitas e estoque.'); return; }
    setLoading(true);
    try {
      const response = await apiClient.get('/orders/production-plan', { params: { start: from, end: to } });
      if (current === request.current) setPlan(response.data.data);
    } catch (err) {
      if (current === request.current) setError(err instanceof Error ? err.message : 'Não foi possível gerar o plano. Confira sua conexão e tente novamente.');
    } finally { if (current === request.current) setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { load(); return () => { request.current++; }; }, [load]));
  const edit = (value: string, field: 'start' | 'end') => {
    request.current++; setLoading(false); setPlan(null); setError(''); setShareError('');
    const masked = maskDate(value); dates.current[field] = masked;
    if (field === 'start') setStart(masked); else setEnd(masked);
  };
  const share = async () => {
    if (!plan) return;
    try { await Share.share({ message: productionShoppingText(plan) }); }
    catch { setShareError('Não foi possível compartilhar a lista. Tente novamente.'); }
  };
  return <SafeAreaView style={s.safe}>
    <View style={s.header}>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Voltar" onPress={() => navigation.goBack()} style={s.back}><Ionicons name="arrow-back" size={20} color={colors.text} /></TouchableOpacity>
      <View style={s.flex}><Text style={s.title}>Produção inteligente</Text><Text style={s.subtitle}>Receitas e lista de compras</Text></View>
    </View>
    <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <LinearGradient colors={[colors.pinkSoft, colors.primary, colors.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.hero}>
        <View style={s.heroTop}><Text style={s.heroLabel}>Seu plano de produção</Text><Ionicons name="restaurant-outline" size={23} color="#fff" /></View>
        <Text style={s.heroValue}>{plan ? `${plan.orderCount} encomenda${plan.orderCount === 1 ? '' : 's'}` : 'Da receita à entrega'}</Text>
        <Text style={s.heroDescription}>{plan ? `${productionDate(plan.start)} a ${productionDate(plan.end)}` : 'Organize o que preparar e saiba o que falta comprar.'}</Text>
        {plan && plan.orderCount > 0 && <View style={s.heroPills}>
          <View style={s.heroPill}><Ionicons name="cube-outline" size={13} color="#fff" /><Text style={s.heroPillText}>{plan.products.length} produtos</Text></View>
          <View style={s.heroPill}><Ionicons name="basket-outline" size={13} color="#fff" /><Text style={s.heroPillText}>{plan.ingredients.filter(i => i.missing > 0.0000001).length} para comprar</Text></View>
        </View>}
      </LinearGradient>
      <View style={s.card}>
        <View style={s.cardTop}><View style={s.iconBox}><Ionicons name="calendar-outline" size={19} color={colors.primary} /></View><View style={s.flex}><Text style={s.heading}>Período de entrega</Text><Text style={s.subtitle}>Escolha as datas das encomendas</Text></View></View>
        <View style={s.row}>{(['start', 'end'] as const).map(field => <View key={field} style={s.flex}><Text style={s.label}>{field === 'start' ? 'De' : 'Até'}</Text><TextInput accessibilityLabel={field === 'start' ? 'Início do período' : 'Fim do período'} value={field === 'start' ? start : end} onChangeText={value => edit(value, field)} keyboardType="number-pad" placeholder="dd/mm/aaaa" placeholderTextColor={colors.textMuted} maxLength={10} style={s.input} /></View>)}</View>
        <Text style={s.hint}>Inclui encomendas pendentes e em produção.</Text>
        <TouchableOpacity accessibilityRole="button" disabled={loading} activeOpacity={0.8} style={[s.button, loading && { opacity: 0.6 }]} onPress={load}>{loading ? <ActivityIndicator color="#fff" /> : <Ionicons name="restaurant-outline" size={18} color="#fff" />}<Text style={s.buttonText}>{loading ? 'Calculando…' : 'Gerar plano de produção'}</Text></TouchableOpacity>
      </View>
      {loading && <ActivityIndicator color={colors.primary} size="large" />}
      {!!error && <View style={s.errorCard}><Ionicons name="alert-circle-outline" size={20} color={colors.error} /><Text accessibilityRole="alert" style={[s.error, s.flex]}>{error}</Text></View>}
      {plan && <>
        {!plan.orderCount ? <View style={s.empty}><View style={s.emptyIcon}><Ionicons name="restaurant-outline" size={38} color={colors.primary} /></View><Text style={s.emptyTitle}>Nenhuma produção no período</Text><Text style={s.emptyDescription}>As encomendas pendentes e em produção aparecem aqui. Escolha outras datas ou confira seus pedidos.</Text><TouchableOpacity accessibilityRole="button" onPress={() => navigation.navigate('Orders')}><Text style={s.link}>Ver encomendas</Text></TouchableOpacity></View> : <>
          {plan.warnings.length > 0 && <View style={s.warning}><View style={s.cardTop}><Ionicons name="alert-circle-outline" size={20} color={colors.amberDark} /><Text style={[s.heading, s.flex]}>Confira antes de comprar</Text></View><Text style={s.description}>A lista tem pendências e pode estar incompleta.</Text>{plan.warnings.map(w => <Text key={w} style={s.warningText}>• {w}</Text>)}</View>}
          <Text style={s.sectionTitle}>Produtos e receitas</Text>
          <View style={s.list}>{plan.products.map(p => <View key={p.key} style={[s.card, s.cardTop]}><View style={s.iconBox}><Ionicons name="restaurant-outline" size={19} color={colors.primary} /></View><View style={s.flex}><Text style={s.heading}>{p.name}</Text><Text style={s.subtitle}>{p.batches === null ? 'Receita a conferir' : `${qty(p.batches)} receita(s)`}</Text></View><View style={s.quantityBadge}><Text style={s.quantityText}>{qty(p.quantity)}×</Text></View></View>)}</View>
          <Text style={s.hint}>Quantidades proporcionais ao rendimento cadastrado, sem arredondar para receitas inteiras.</Text>
          <Text style={s.sectionTitle}>Ingredientes e compras</Text>
          {!plan.ingredients.length && <Text style={s.description}>Nenhum ingrediente calculado. Confira as receitas dos produtos.</Text>}
          <View style={s.list}>{plan.ingredients.map(i => {
            const label = i.unit === 'unit' ? 'un' : i.unit;
            const needsPurchase = i.missing > 0.0000001;
            return <View key={i.id} style={s.card}>
              <View style={s.cardTop}><View style={[s.iconBox, { backgroundColor: colors.blueBg }]}><Ionicons name="cube-outline" size={19} color={colors.blue} /></View><Text style={[s.heading, s.flex]}>{i.name}</Text></View>
              <View style={s.measurements}><View style={s.flex}><Text style={s.label}>Necessário</Text><Text style={s.value}>{qty(i.required)} {label}</Text></View><View style={s.measureDivider} /><View style={s.flex}><Text style={s.label}>Em estoque</Text><Text style={s.value}>{i.available === null ? 'Não informado' : `${qty(i.available)} ${label}`}</Text></View></View>
              <View style={[s.stockStatus, { backgroundColor: needsPurchase ? colors.pinkBg2 : colors.greenBgSoft }]}><Ionicons name={needsPurchase ? 'basket-outline' : 'checkmark-circle-outline'} size={17} color={needsPurchase ? colors.primary : colors.greenDark} /><Text style={[s.statusText, { color: needsPurchase ? colors.primary : colors.greenDark }]}>{needsPurchase ? `Comprar: ${qty(Math.ceil(i.missing * 1000) / 1000)} ${label}${i.available === null ? ' (conferir estoque)' : ''}` : 'Estoque suficiente'}</Text></View>
            </View>;
          })}</View>
          <Text style={s.hint}>O plano consulta o estoque atual, sem reservar ou dar baixa. Confira o que já separou nos pedidos em produção. As quantidades não arredondam embalagens de compra.</Text>
          <TouchableOpacity accessibilityRole="button" activeOpacity={0.8} style={s.button} onPress={share}><Ionicons name="share-social-outline" size={18} color="#fff" /><Text style={s.buttonText}>Compartilhar lista de compras</Text></TouchableOpacity>
          {!!shareError && <Text style={s.error}>{shareError}</Text>}
          <TouchableOpacity onPress={() => navigation.navigate('Orders')}><Text style={s.link}>Conferir encomendas</Text></TouchableOpacity>
        </>}
      </>}
    </ScrollView>
  </SafeAreaView>;
}

const SHADOW = { shadowColor: colors.text, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 12, elevation: 4 };
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 12 },
  back: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', ...SHADOW },
  title: { fontSize: 22, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 12.5, color: colors.textSecondary, marginTop: 2 },
  content: { padding: 18, paddingBottom: 40, gap: 16 },
  hero: { borderRadius: 22, padding: 22, ...SHADOW, shadowColor: colors.primary, shadowOpacity: 0.3 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  heroLabel: { fontSize: 13, color: 'rgba(255,255,255,0.85)', flex: 1 },
  heroValue: { fontSize: 28, fontWeight: '800', color: '#fff', marginTop: 8 },
  heroDescription: { fontSize: 13, lineHeight: 19, color: 'rgba(255,255,255,0.9)', marginTop: 6 },
  heroPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  heroPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  heroPillText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  card: { backgroundColor: colors.surface, borderRadius: 16, padding: 14, gap: 12, ...SHADOW },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  iconBox: { width: 38, height: 38, borderRadius: 11, backgroundColor: colors.pinkBg2, alignItems: 'center', justifyContent: 'center' },
  heading: { fontSize: 14.5, fontWeight: '700', color: colors.text },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginTop: 4 },
  list: { gap: 10 },
  quantityBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: colors.pinkBg2, maxWidth: '40%' },
  quantityText: { fontSize: 15, fontWeight: '800', color: colors.primary },
  measurements: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.pinkBg3, padding: 12, borderRadius: 12 },
  measureDivider: { width: 1, alignSelf: 'stretch', backgroundColor: colors.border },
  stockStatus: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 9 },
  statusText: { flex: 1, fontSize: 12, fontWeight: '700', lineHeight: 18 },
  description: { fontSize: 14, lineHeight: 21, color: colors.textSecondary },
  hint: { fontSize: 12, lineHeight: 18, color: colors.textSecondary },
  row: { flexDirection: 'row', gap: 12 }, flex: { flex: 1 },
  label: { fontSize: 12, color: colors.textSecondary, marginBottom: 5 },
  input: { borderWidth: 1.5, borderColor: colors.border, borderRadius: 13, paddingHorizontal: 13, paddingVertical: 12, backgroundColor: colors.surface, color: colors.text, fontSize: 14 },
  value: { fontSize: 15, fontWeight: '600', color: colors.text },
  button: { backgroundColor: colors.primary, borderRadius: 15, minHeight: 52, padding: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, ...SHADOW, shadowColor: colors.primary, shadowOpacity: 0.25 },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '700', textAlign: 'center', flexShrink: 1 },
  errorCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.pinkBg2, padding: 14, borderRadius: 14 },
  error: { color: colors.error, lineHeight: 21 },
  warning: { backgroundColor: colors.amberBg, borderRadius: 16, padding: 14, gap: 8 },
  warningText: { color: colors.textSecondary, fontSize: 12, lineHeight: 18 },
  empty: { alignItems: 'center', paddingVertical: 36, paddingHorizontal: 24, gap: 8 },
  emptyIcon: { width: 76, height: 76, borderRadius: 24, backgroundColor: colors.pinkBg2, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.text, textAlign: 'center' },
  emptyDescription: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 19 },
  link: { color: colors.primary, fontWeight: '600', textAlign: 'center', padding: 10 },
});
