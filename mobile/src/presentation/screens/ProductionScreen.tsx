import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, Share, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
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
    } catch (err: any) {
      if (current === request.current) setError(err.response?.data?.message || 'Não foi possível gerar o plano. Confira sua conexão e tente novamente.');
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
    <View style={s.header}><TouchableOpacity accessibilityLabel="Voltar" onPress={() => navigation.goBack()} style={s.back}><Ionicons name="arrow-back" size={24} color={colors.text} /></TouchableOpacity><Text style={s.title}>Produção inteligente</Text></View>
    <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      <Text style={s.description}>Suas encomendas viram quantidades para produzir e uma lista do que falta comprar.</Text>
      <View style={s.card}>
        <Text style={s.heading}>Período de entrega</Text>
        <View style={s.row}>{(['start', 'end'] as const).map(field => <View key={field} style={s.flex}><Text style={s.label}>{field === 'start' ? 'De' : 'Até'}</Text><TextInput accessibilityLabel={field === 'start' ? 'Início do período' : 'Fim do período'} value={field === 'start' ? start : end} onChangeText={value => edit(value, field)} keyboardType="number-pad" placeholder="dd/mm/aaaa" placeholderTextColor={colors.textMuted} maxLength={10} style={s.input} /></View>)}</View>
        <Text style={s.hint}>Inclui encomendas pendentes e em produção.</Text>
        <TouchableOpacity accessibilityRole="button" disabled={loading} style={[s.button, loading && { opacity: 0.6 }]} onPress={load}><Text style={s.buttonText}>{loading ? 'Calculando…' : 'Gerar plano de produção'}</Text></TouchableOpacity>
      </View>
      {loading && <ActivityIndicator color={colors.primary} size="large" />}
      {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
      {plan && <>
        <Text style={s.heading}>{plan.orderCount} encomendas · {productionDate(plan.start)} a {productionDate(plan.end)}</Text>
        {!plan.orderCount ? <View style={s.card}><Text style={s.description}>Nenhuma encomenda a produzir neste período.</Text><TouchableOpacity onPress={() => navigation.navigate('Orders')}><Text style={s.link}>Ver encomendas</Text></TouchableOpacity></View> : <>
          {plan.warnings.length > 0 && <View style={s.warning}><Text style={s.heading}>Confira antes de comprar</Text><Text style={s.description}>A lista tem pendências e pode estar incompleta.</Text>{plan.warnings.map(w => <Text key={w} style={s.warningText}>• {w}</Text>)}</View>}
          <Text style={s.heading}>Produtos e receitas</Text>
          {plan.products.map(p => <View key={p.key} style={s.card}><Text style={s.heading}>{qty(p.quantity)}× {p.name}</Text><Text style={s.description}>{p.batches === null ? 'Receita a conferir' : `${qty(p.batches)} receita(s)`}</Text></View>)}
          <Text style={s.hint}>Quantidades proporcionais ao rendimento cadastrado, sem arredondar para receitas inteiras.</Text>
          <Text style={s.heading}>Ingredientes e compras</Text>
          {!plan.ingredients.length && <Text style={s.description}>Nenhum ingrediente calculado. Confira as receitas dos produtos.</Text>}
          {plan.ingredients.map(i => { const label = i.unit === 'unit' ? 'un' : i.unit; return <View key={i.id} style={s.card}><Text style={s.heading}>{i.name}</Text><View style={s.row}><View style={s.flex}><Text style={s.label}>Necessário</Text><Text style={s.value}>{qty(i.required)} {label}</Text></View><View style={s.flex}><Text style={s.label}>Em estoque</Text><Text style={s.value}>{i.available === null ? 'Não informado' : `${qty(i.available)} ${label}`}</Text></View></View><Text style={[s.value, { color: i.missing > 0.0000001 ? colors.primary : colors.greenDark, marginTop: 10 }]}>{i.missing > 0.0000001 ? `Comprar: ${qty(Math.ceil(i.missing * 1000) / 1000)} ${label}${i.available === null ? ' (conferir estoque)' : ''}` : 'Estoque suficiente'}</Text></View>; })}
          <Text style={s.hint}>O plano consulta o estoque atual, sem reservar ou dar baixa. Confira o que já separou nos pedidos em produção. As quantidades não arredondam embalagens de compra.</Text>
          <TouchableOpacity accessibilityRole="button" style={s.button} onPress={share}><Text style={s.buttonText}>Compartilhar lista de compras</Text></TouchableOpacity>
          {!!shareError && <Text style={s.error}>{shareError}</Text>}
          <TouchableOpacity onPress={() => navigation.navigate('Orders')}><Text style={s.link}>Conferir encomendas</Text></TouchableOpacity>
        </>}
      </>}
    </ScrollView>
  </SafeAreaView>;
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.pinkBg3 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 8 },
  back: { padding: 8 }, title: { fontSize: 21, fontWeight: '700', color: colors.text, flex: 1 },
  content: { padding: 20, paddingBottom: 48, gap: 16 },
  card: { backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 10 },
  heading: { fontSize: 16, fontWeight: '700', color: colors.text },
  description: { fontSize: 14, lineHeight: 21, color: colors.textSecondary },
  hint: { fontSize: 12, lineHeight: 18, color: colors.textSecondary },
  row: { flexDirection: 'row', gap: 12 }, flex: { flex: 1 },
  label: { fontSize: 12, color: colors.textSecondary, marginBottom: 5 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, color: colors.text, fontSize: 15 },
  value: { fontSize: 15, fontWeight: '600', color: colors.text },
  button: { backgroundColor: colors.primary, borderRadius: 12, padding: 15, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '700', textAlign: 'center' },
  error: { color: colors.error, lineHeight: 21 },
  warning: { backgroundColor: '#FFF3D8', borderRadius: 14, padding: 16, gap: 8 },
  warningText: { color: '#78501C', fontSize: 13, lineHeight: 20 },
  link: { color: colors.primary, fontWeight: '600', textAlign: 'center', padding: 10 },
});
