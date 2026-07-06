import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { expenseApi, Expense, EXPENSE_CATEGORIES } from '../../data/api/expenseApi';
import { isDemoMode } from '../../data/demo/demoMode';
import { demoExpenseApi } from '../../data/demo/demoApi';
import { useToast } from '../context/ToastContext';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const INK = '#3D2233';
const INK2 = '#9A7E8C';
const INK3 = '#C4B0BB';
const CREAM = '#FFF6F0';
const LINE = '#F1E2DA';
const PURPLE = '#7C3AED';
const RED = '#E8537A';
const SHADOW = { shadowColor: INK, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 10, elevation: 3 };

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const fmtDate = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
};

const categoryLabel = (key: string) => EXPENSE_CATEGORIES.find(c => c.key === key)?.label ?? key;

const periodMonths = () => {
  const result: { key: string; label: string }[] = [{ key: '', label: 'Tudo' }];
  const now = new Date();
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace('.', '');
    result.push({ key, label });
  }
  return result;
};

export const ExpensesScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { showToast } = useToast();
  const api = isDemoMode() ? demoExpenseApi : expenseApi;

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<string>('');
  const months = periodMonths();

  const load = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true); else setLoading(true);
    try {
      const data = await api.getAll(period || undefined);
      setExpenses(data);
    } catch {
      showToast('Erro ao carregar despesas', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { load(); }, [period]));

  const handleDelete = (expense: Expense) => {
    Alert.alert('Excluir despesa', `Excluir "${expense.description}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir', style: 'destructive', onPress: async () => {
          try {
            await api.delete(expense.id);
            setExpenses(prev => prev.filter(e => e.id !== expense.id));
            showToast('Despesa excluída', 'success');
          } catch {
            showToast('Erro ao excluir despesa', 'error');
          }
        },
      },
    ]);
  };

  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const fixed = expenses.filter(e => e.costType === 'fixed').reduce((s, e) => s + e.amount, 0);
  const variable = expenses.filter(e => e.costType === 'variable').reduce((s, e) => s + e.amount, 0);

  const renderExpense = ({ item }: { item: Expense }) => (
    <View style={s.card}>
      <View style={s.cardLeft}>
        <View style={[s.dot, { backgroundColor: item.costType === 'fixed' ? PURPLE : '#F59E0B' }]} />
        <View style={{ flex: 1 }}>
          <Text style={s.cardTitle} numberOfLines={1}>{item.description}</Text>
          <Text style={s.cardMeta}>
            {categoryLabel(item.category)} · {fmtDate(item.expenseDate)}
            {item.isRecurring ? ' · Recorrente' : ''}
          </Text>
        </View>
      </View>
      <View style={s.cardRight}>
        <Text style={s.cardAmount}>{fmt(item.amount)}</Text>
        <TouchableOpacity onPress={() => handleDelete(item)} style={s.deleteBtn} activeOpacity={0.7}>
          <Ionicons name="trash-outline" size={15} color={RED} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.bk}>
          <Ionicons name="arrow-back" size={20} color={INK} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Despesas</Text>
          <Text style={s.headerSub}>Custos operacionais do negócio</Text>
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate('CreateExpense', {})}
          style={s.addBtn} activeOpacity={0.8}
        >
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Filtro de período */}
      <View style={s.periodWrap}>
        <FlatList
          data={months}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={m => m.key}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
          renderItem={({ item: m }) => (
            <TouchableOpacity
              onPress={() => setPeriod(m.key)}
              style={[s.pill, period === m.key && s.pillOn]}
              activeOpacity={0.8}
            >
              <Text style={[s.pillText, period === m.key && s.pillTextOn]}>{m.label}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator size="large" color={PURPLE} /></View>
      ) : (
        <FlatList
          data={expenses}
          keyExtractor={e => e.id}
          renderItem={renderExpense}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={PURPLE} />}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          ListHeaderComponent={
            expenses.length > 0 ? (
              <LinearGradient colors={['#9B6BF0', PURPLE]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.summary}>
                <Text style={s.summaryLabel}>Total no período</Text>
                <Text style={s.summaryValue}>{fmt(total)}</Text>
                <View style={s.summaryRow}>
                  <View style={s.summaryItem}>
                    <View style={[s.dot, { backgroundColor: 'rgba(255,255,255,0.5)' }]} />
                    <Text style={s.summaryItemText}>Fixo {fmt(fixed)}</Text>
                  </View>
                  <View style={s.summaryItem}>
                    <View style={[s.dot, { backgroundColor: 'rgba(255,200,100,0.8)' }]} />
                    <Text style={s.summaryItemText}>Variável {fmt(variable)}</Text>
                  </View>
                </View>
              </LinearGradient>
            ) : null
          }
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="receipt-outline" size={44} color={INK3} />
              <Text style={s.emptyTitle}>Nenhuma despesa</Text>
              <Text style={s.emptyDesc}>Registre seus custos operacionais para acompanhar o resultado real do negócio.</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('CreateExpense', {})}
                style={s.emptyBtn} activeOpacity={0.8}
              >
                <Text style={s.emptyBtnText}>Registrar despesa</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10 },
  bk: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...SHADOW },
  headerTitle: { fontSize: 22, fontWeight: '700', color: INK },
  headerSub: { fontSize: 12, color: INK2, marginTop: 1 },
  addBtn: { width: 40, height: 40, borderRadius: 13, backgroundColor: PURPLE, alignItems: 'center', justifyContent: 'center', ...SHADOW },

  periodWrap: { paddingVertical: 8 },
  pill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#F3E9F0' },
  pillOn: { backgroundColor: PURPLE },
  pillText: { fontSize: 12.5, fontWeight: '600', color: INK2 },
  pillTextOn: { color: '#fff' },

  summary: { borderRadius: 20, padding: 18, marginBottom: 14, ...SHADOW, shadowColor: PURPLE, shadowOpacity: 0.25 },
  summaryLabel: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginBottom: 4 },
  summaryValue: { fontSize: 32, fontWeight: '800', color: '#fff' },
  summaryRow: { flexDirection: 'row', gap: 14, marginTop: 10 },
  summaryItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  summaryItemText: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.9)' },

  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10, ...SHADOW },
  cardLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  cardTitle: { fontSize: 14.5, fontWeight: '700', color: INK },
  cardMeta: { fontSize: 11.5, color: INK2, marginTop: 2 },
  cardRight: { alignItems: 'flex-end', gap: 6 },
  cardAmount: { fontSize: 15, fontWeight: '800', color: INK },
  deleteBtn: { padding: 4 },

  empty: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 30, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: INK, marginTop: 6 },
  emptyDesc: { fontSize: 13, color: INK2, textAlign: 'center', lineHeight: 19 },
  emptyBtn: { marginTop: 12, backgroundColor: PURPLE, borderRadius: 14, paddingHorizontal: 24, paddingVertical: 12 },
  emptyBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
