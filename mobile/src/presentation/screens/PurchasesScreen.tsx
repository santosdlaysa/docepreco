import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/types';
import { PurchaseInvoice, purchaseApi } from '../../data/api/purchaseApi';
import { isDemoMode } from '../../data/demo/demoMode';
import { useToast } from '../context/ToastContext';
import { useCurrencyFormat } from '../hooks/useCurrencyFormat';
import { colors } from '../theme/colors';

type Navigation = NativeStackNavigationProp<RootStackParamList>;
const months = () => {
  const now = new Date();
  return [{ key: '', label: 'Tudo' }, ...Array.from({ length: 6 }, (_, index) => {
    const d = new Date(now.getFullYear(), now.getMonth() - index, 1);
    return { key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '') };
  })];
};
const fmtDate = (date: string) => date.split('-').reverse().join('/');

export const PurchasesScreen: React.FC = () => {
  const navigation = useNavigation<Navigation>(); const { showToast } = useToast(); const { formatCurrency } = useCurrencyFormat();
  const [items, setItems] = useState<PurchaseInvoice[]>([]); const [month, setMonth] = useState('');
  const [loading, setLoading] = useState(true); const [refreshing, setRefreshing] = useState(false); const [expanded, setExpanded] = useState<string | null>(null);
  const load = async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    try { setItems(isDemoMode() ? [] : await purchaseApi.getAll(month || undefined)); }
    catch { showToast('Erro ao carregar compras', 'error'); }
    finally { setLoading(false); setRefreshing(false); }
  };
  useFocusEffect(useCallback(() => { load(); }, [month]));
  const total = items.reduce((sum, item) => sum + item.total, 0);
  return <SafeAreaView style={s.safe}>
    <View style={s.header}><TouchableOpacity onPress={() => navigation.goBack()} style={s.back}><Ionicons name="arrow-back" size={20} color={colors.text} /></TouchableOpacity><View style={{ flex: 1 }}><Text style={s.title}>Compras</Text><Text style={s.subtitle}>Notas, estoque e preços</Text></View><TouchableOpacity onPress={() => navigation.navigate('CreatePurchase')} style={s.add}><Ionicons name="add" size={23} color="#fff" /></TouchableOpacity></View>
    <FlatList horizontal data={months()} keyExtractor={item => item.key || 'all'} showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={s.months} renderItem={({ item }) => <TouchableOpacity onPress={() => setMonth(item.key)} style={[s.pill, month === item.key && s.pillOn]}><Text style={[s.pillText, month === item.key && s.pillTextOn]}>{item.label}</Text></TouchableOpacity>} />
    {loading ? <View style={s.center}><ActivityIndicator size="large" color={colors.purple} /></View> : <FlatList data={items} keyExtractor={item => item.id} contentContainerStyle={s.list} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
      ListHeaderComponent={items.length ? <View style={s.summary}><Text style={s.summaryLabel}>Compras no período</Text><Text style={s.summaryValue}>{formatCurrency(total)}</Text></View> : null}
      ListEmptyComponent={<View style={s.empty}><Ionicons name="document-text-outline" size={48} color={colors.textMuted} /><Text style={s.emptyTitle}>Nenhuma compra lançada</Text><Text style={s.emptyText}>Registre uma nota para atualizar estoque e preços automaticamente.</Text><TouchableOpacity style={s.emptyButton} onPress={() => navigation.navigate('CreatePurchase')}><Text style={s.emptyButtonText}>Registrar compra</Text></TouchableOpacity></View>}
      renderItem={({ item }) => <TouchableOpacity activeOpacity={0.8} onPress={() => setExpanded(expanded === item.id ? null : item.id)} style={s.card}><View style={s.cardTop}><View style={s.doc}><Ionicons name="document-text-outline" size={19} color={colors.purple} /></View><View style={{ flex: 1 }}><Text style={s.cardTitle}>{item.supplier}</Text><Text style={s.cardMeta}>{fmtDate(item.purchaseDate)}{item.documentNumber ? ` · NF ${item.documentNumber}` : ''} · {item.items.length} item(ns)</Text></View><View style={{ alignItems: 'flex-end' }}><Text style={s.amount}>{formatCurrency(item.total)}</Text><Text style={[s.status, item.paymentStatus === 'pending' && s.pending]}>{item.paymentStatus === 'paid' ? 'Pago' : 'Pendente'}</Text></View></View>{expanded === item.id && <View style={s.lines}>{item.items.map(line => <View key={line.id} style={s.line}><Text style={s.lineName}>{line.description} · {line.quantity} {line.unit === 'unit' ? 'un' : line.unit}</Text><Text style={s.lineValue}>{formatCurrency(line.total)}</Text></View>)}</View>}</TouchableOpacity>} />}
  </SafeAreaView>;
};

const shadow = { shadowColor: '#3D2233', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 10, elevation: 3 };
const s = StyleSheet.create({ safe: { flex: 1, backgroundColor: '#fff' }, center: { flex: 1, alignItems: 'center', justifyContent: 'center' }, header: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 }, back: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', ...shadow }, title: { fontSize: 22, fontWeight: '800', color: colors.text }, subtitle: { fontSize: 12, color: colors.textSecondary }, add: { width: 40, height: 40, borderRadius: 13, backgroundColor: colors.purple, alignItems: 'center', justifyContent: 'center' }, months: { paddingHorizontal: 16, paddingBottom: 10, gap: 8 }, pill: { backgroundColor: colors.pinkBg3, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 7 }, pillOn: { backgroundColor: colors.purple }, pillText: { color: colors.textSecondary, fontWeight: '600', textTransform: 'capitalize' }, pillTextOn: { color: '#fff' }, list: { padding: 16, paddingBottom: 40 }, summary: { backgroundColor: colors.purple, borderRadius: 20, padding: 18, marginBottom: 14 }, summaryLabel: { color: 'rgba(255,255,255,.8)', fontSize: 12 }, summaryValue: { color: '#fff', fontSize: 30, fontWeight: '800', marginTop: 3 }, card: { backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10, ...shadow }, cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 }, doc: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.purpleBg, alignItems: 'center', justifyContent: 'center' }, cardTitle: { fontSize: 15, fontWeight: '700', color: colors.text }, cardMeta: { fontSize: 11.5, color: colors.textSecondary, marginTop: 2 }, amount: { fontSize: 14, fontWeight: '800', color: colors.text }, status: { color: colors.green, fontSize: 10.5, fontWeight: '700', marginTop: 2 }, pending: { color: '#D98B00' }, lines: { marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border, gap: 7 }, line: { flexDirection: 'row', gap: 8 }, lineName: { flex: 1, fontSize: 12, color: colors.textSecondary }, lineValue: { fontSize: 12, fontWeight: '700', color: colors.text }, empty: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 28 }, emptyTitle: { fontSize: 17, fontWeight: '700', color: colors.text, marginTop: 10 }, emptyText: { fontSize: 13, lineHeight: 19, color: colors.textSecondary, textAlign: 'center', marginTop: 5 }, emptyButton: { backgroundColor: colors.purple, borderRadius: 14, paddingHorizontal: 22, paddingVertical: 12, marginTop: 18 }, emptyButtonText: { color: '#fff', fontWeight: '700' } });
