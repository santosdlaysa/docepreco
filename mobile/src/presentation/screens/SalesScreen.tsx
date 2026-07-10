import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
import { useToast } from '../context/ToastContext';
import { useTranslation } from 'react-i18next';
import { useDemoGuard } from '../hooks/useDemoGuard';
import { Skeleton } from '../components/Skeleton';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

/* ─── Design tokens ─── */
const INK = '#3D2233';
const INK2 = '#9A7E8C';
const INK3 = '#C4B0BB';
const PINK = '#EA4B92';
const GREEN = '#43BE6E';
const CREAM = '#FFF6F0';
const LINE = '#F1E2DA';
const SHADOW = {
  shadowColor: INK,
  shadowOffset: { width: 0, height: 2 } as const,
  shadowOpacity: 0.07,
  shadowRadius: 8,
  elevation: 3,
};

const fmtCurrency = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const PAYMENT_LABEL: Record<string, string> = { pix: 'Pix', dinheiro: 'Dinheiro', credito: 'Crédito', debito: 'Débito', cartao: 'Cartão' };

type Section = { date: string; label: string; data: Sale[]; total: number };

export const SalesScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { guardAction, DemoGuardModal } = useDemoGuard();
  const api = isDemoMode() ? demoSaleApi : saleApi;

  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<'all' | 'week' | 'month'>('all');

  const formatDateLabel = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-');
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    if (date.toDateString() === today.toDateString()) return 'Hoje';
    if (date.toDateString() === yesterday.toDateString()) return 'Ontem';
    return date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
  };

  const groupByDate = (list: Sale[]): Section[] => {
    const map = new Map<string, Sale[]>();
    for (const sale of list) {
      if (!map.has(sale.saleDate)) map.set(sale.saleDate, []);
      map.get(sale.saleDate)!.push(sale);
    }
    return Array.from(map.entries()).map(([date, data]) => ({
      date,
      label: formatDateLabel(date),
      data,
      total: data.reduce((sum, s) => sum + s.totalRevenue, 0),
    }));
  };

  const loadSales = async () => {
    try {
      const data = await api.getAll(period === 'all' ? undefined : period);
      setSales(data);
    } catch {
      showToast('Erro ao carregar vendas', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { setLoading(true); loadSales(); }, []));
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    loadSales();
  }, [period]);

  const handleDelete = (sale: Sale) => {
    if (!guardAction()) return;
    const idx = sales.findIndex(s => s.id === sale.id);
    setSales(prev => prev.filter(s => s.id !== sale.id));
    const restore = () => {
      setSales(prev => {
        if (prev.some(s => s.id === sale.id)) return prev;
        const next = [...prev];
        next.splice(Math.max(0, Math.min(idx, next.length)), 0, sale);
        return next;
      });
    };
    showToast(`${sale.recipeName} removida`, {
      type: 'success',
      action: { label: 'Desfazer', onPress: restore },
      onDismiss: async () => {
        try { await api.delete(sale.id); }
        catch { restore(); showToast('Erro ao excluir', 'error'); }
      },
    });
  };

  const totalRevenue = sales.reduce((sum, s) => sum + s.totalRevenue, 0);
  const totalUnits = sales.reduce((sum, s) => sum + s.quantitySold, 0);
  const sections = groupByDate(sales);

  /* ─── Loading skeleton ─── */
  if (loading) {
    return (
      <SafeAreaView style={st.safe} edges={['top']}>
        <View style={st.sh}>
          <View style={st.shT}><Text style={st.shH1}>Vendas</Text><Text style={st.shSub}>Carregando...</Text></View>
        </View>
        <View style={{ padding: 18, gap: 12 }}>
          <Skeleton width="100%" height={80} borderRadius={20} />
          <Skeleton width="100%" height={42} borderRadius={13} />
          <Skeleton width={100} height={14} borderRadius={6} />
          {[0, 1, 2].map(i => <Skeleton key={i} width="100%" height={64} borderRadius={18} />)}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={st.safe} edges={['top']}>
      {/* ── Header ── */}
      <View style={st.sh}>
        <View style={st.shT}>
          <Text style={st.shH1}>Vendas</Text>
          <Text style={st.shSub}>{sales.length} venda{sales.length !== 1 ? 's' : ''} este mês</Text>
        </View>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 90, paddingTop: 12, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadSales(); }} colors={[PINK]} />}
        ListHeaderComponent={
          <>
            {/* ── Hero summary ── */}
            <LinearGradient
              colors={['#FFB6D5', '#FF93C1', '#F56FAC']}
              locations={[0, 0.52, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={st.hero}
            >
              <View style={st.heroStats}>
                <View style={st.heroStat}>
                  <Text style={st.heroStatN}>{totalUnits} un</Text>
                  <Text style={st.heroStatT}>vendidas no mês</Text>
                </View>
                <View style={st.heroStat}>
                  <Text style={st.heroStatN}>{fmtCurrency(totalRevenue)}</Text>
                  <Text style={st.heroStatT}>faturamento</Text>
                </View>
              </View>
            </LinearGradient>

            {/* ── Segmented filter ── */}
            <View style={st.seg}>
              {(['all', 'month', 'week'] as const).map(p => {
                const on = period === p;
                const label = p === 'all' ? 'Todas' : p === 'month' ? 'Este mês' : 'Esta semana';
                return (
                  <TouchableOpacity key={p} onPress={() => setPeriod(p)} style={[st.segOpt, on && st.segOptOn]} activeOpacity={0.7}>
                    <Text style={[st.segText, on && st.segTextOn]}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        }
        renderSectionHeader={({ section }) => (
          <View style={st.secHead}>
            <Text style={st.secHeadLabel}>{section.label}</Text>
            <Text style={st.secHeadTotal}>{fmtCurrency(section.total)}</Text>
          </View>
        )}
        ItemSeparatorComponent={() => <View style={st.sep} />}
        renderItem={({ item }) => (
          <TouchableOpacity activeOpacity={0.6} onLongPress={() => handleDelete(item)}>
            <View style={st.row}>
              <View style={st.gi}>
                <Ionicons name="cash-outline" size={18} color={GREEN} />
              </View>
              <View style={st.gt}>
                <Text style={st.gtB}>{item.recipeName}</Text>
                <Text style={st.gtS}>
                  {item.quantitySold} un × {fmtCurrency(item.salePrice)}
                  {item.paymentMethod ? ` · ${PAYMENT_LABEL[item.paymentMethod] || item.paymentMethod}` : ''}
                </Text>
                {item.orderId ? (
                  <View style={st.orderBadge}>
                    <Ionicons name="calendar-outline" size={11} color="#B04A85" />
                    <Text style={st.orderBadgeText} numberOfLines={1}>{item.notes || 'Encomenda'}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={st.gv}>{fmtCurrency(item.totalRevenue)}</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={st.empty}>
            <View style={st.emptyIco}><Ionicons name="cash-outline" size={36} color={PINK} /></View>
            <Text style={st.emptyTitle}>Nenhuma venda</Text>
            <Text style={st.emptyDesc}>Registre suas vendas para acompanhar o faturamento.</Text>
            <TouchableOpacity onPress={() => guardAction(() => navigation.navigate('CreateSale'))} activeOpacity={0.85}>
              <LinearGradient colors={['#FF6AAE', PINK]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.emptyBtn}>
                <Text style={st.emptyBtnText}>Registrar venda</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        }
      />

      {/* ── FAB ── */}
      <TouchableOpacity style={st.fab} onPress={() => guardAction(() => navigation.navigate('CreateSale'))} activeOpacity={0.85}>
        <LinearGradient colors={['#FF6AAE', PINK]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.fabInner}>
          <Ionicons name="add" size={26} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>

      <DemoGuardModal />
    </SafeAreaView>
  );
};

/* ──────────────────────── STYLES ──────────────────────── */
const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },

  /* header (.sh) */
  sh: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingVertical: 10 },
  shT: { flex: 1, marginLeft: 2 },
  shH1: { fontSize: 22, fontWeight: '700', color: INK, lineHeight: 26 },
  shSub: { fontSize: 12.5, color: INK2, fontWeight: '600', marginTop: 1 },
  actPill: {
    height: 38, paddingHorizontal: 14, borderRadius: 12, flexDirection: 'row',
    alignItems: 'center', gap: 6, ...SHADOW,
  },

  /* hero */
  hero: { borderRadius: 26, padding: 15, paddingHorizontal: 18, marginBottom: 14, ...SHADOW, shadowColor: '#D8377F', shadowOpacity: 0.32, shadowRadius: 16 },
  heroStats: { flexDirection: 'row', gap: 10 },
  heroStat: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.16)', borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)', borderRadius: 15, padding: 10, paddingHorizontal: 12,
  },
  heroStatN: { fontSize: 20, fontWeight: '700', color: '#fff', lineHeight: 22 },
  heroStatT: { fontSize: 11.5, color: 'rgba(255,255,255,0.92)', marginTop: 4, fontWeight: '500' },

  /* segmented (.seg) */
  seg: {
    flexDirection: 'row', backgroundColor: '#F2F3F5', borderRadius: 13,
    padding: 4, gap: 3, marginBottom: 14,
  },
  segOpt: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 10 },
  segOptOn: { backgroundColor: '#fff', ...SHADOW },
  segText: { fontSize: 12.5, fontWeight: '700', color: INK2 },
  segTextOn: { color: PINK },

  /* section header */
  secHead: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 20, marginBottom: 2, paddingHorizontal: 2,
  },
  secHeadLabel: { fontSize: 13, fontWeight: '700', color: INK2, textTransform: 'uppercase', letterSpacing: 0.4 },
  secHeadTotal: { fontSize: 13, fontWeight: '700', color: GREEN },

  /* sale rows — listagem */
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, paddingHorizontal: 2,
  },
  sep: { height: 1, backgroundColor: LINE, marginLeft: 52 },
  gi: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: '#DCF6E5',
    alignItems: 'center', justifyContent: 'center',
  },
  gt: { flex: 1 },
  gtB: { fontSize: 14.5, fontWeight: '700', color: INK, lineHeight: 17 },
  gtS: { fontSize: 12, color: INK2, fontWeight: '500', marginTop: 2 },
  orderBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start',
    backgroundColor: '#FFE9F3', borderRadius: 7, paddingHorizontal: 7, paddingVertical: 2, marginTop: 4,
  },
  orderBadgeText: { fontSize: 10.5, fontWeight: '700', color: '#B04A85' },
  gv: { fontSize: 15, fontWeight: '700', color: GREEN },

  /* empty */
  empty: { alignItems: 'center', paddingTop: 60, gap: 10, paddingHorizontal: 24 },
  emptyIco: {
    width: 72, height: 72, borderRadius: 24, backgroundColor: '#FFF0F6',
    alignItems: 'center', justifyContent: 'center',
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: INK },
  emptyDesc: { fontSize: 13, color: INK2, fontWeight: '500', textAlign: 'center', lineHeight: 19, maxWidth: 240 },
  emptyBtn: { height: 48, borderRadius: 14, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  emptyBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  /* FAB */
  fab: { position: 'absolute', right: 18, bottom: 30, borderRadius: 19, ...SHADOW, shadowColor: '#D8377F', shadowOpacity: 0.42, shadowRadius: 12, elevation: 8 },
  fabInner: { width: 58, height: 58, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
});
