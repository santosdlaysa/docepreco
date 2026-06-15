import React, { useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Order, OrderStatus, OrderPayment, PaymentMethodType } from '../../domain/entities/Order';
import { orderApi as orderStorage } from '../../data/api/orderApi';
import { saleApi } from '../../data/api/saleApi';
import { isDemoMode } from '../../data/demo/demoMode';
import { demoSaleApi } from '../../data/demo/demoApi';
import { colors } from '../theme/colors';
import { Skeleton } from '../components/Skeleton';
import { usePaywall } from '../premium/usePaywall';
import { useToast } from '../context/ToastContext';
import { useTranslation } from 'react-i18next';

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

type Section = { title: string; data: Order[] };

const STATUS_STAGES: { key: OrderStatus; label: string }[] = [
  { key: 'pending', label: 'Pendente' },
  { key: 'in_progress', label: 'Produção' },
  { key: 'done', label: 'Pronto' },
  { key: 'delivered', label: 'Entregue' },
];

const FILTER_ALL: { key: OrderStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'pending', label: 'Pendente' },
  { key: 'in_progress', label: 'Produção' },
  { key: 'done', label: 'Pronto' },
  { key: 'delivered', label: 'Entregue' },
];

export const OrdersScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { guardScreen } = usePaywall();
  const { showToast } = useToast();
  const { t } = useTranslation();
  const sApi = isDemoMode() ? demoSaleApi : saleApi;

  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<OrderStatus | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [paymentModalOrder, setPaymentModalOrder] = useState<Order | null>(null);
  const [newPaymentAmount, setNewPaymentAmount] = useState('');
  const [newPaymentMethod, setNewPaymentMethod] = useState<PaymentMethodType>('pix');

  const PAYMENT_METHODS: { key: PaymentMethodType; icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
    { key: 'pix', icon: 'qr-code-outline', label: 'Pix' },
    { key: 'cash', icon: 'cash-outline', label: 'Dinheiro' },
    { key: 'credit', icon: 'card-outline', label: 'Crédito' },
    { key: 'debit', icon: 'card-outline', label: 'Débito' },
  ];

  const formatDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    if (date.getTime() === today.getTime()) return 'Hoje';
    if (date.getTime() === tomorrow.getTime()) return 'Amanhã';
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  useFocusEffect(useCallback(() => {
    if (!guardScreen('ordersManagement')) return;
    loadOrders();
  }, []));

  const loadOrders = async () => {
    try { setOrders(await orderStorage.getAll()); }
    finally { setLoading(false); }
  };

  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter);

  const sections: Section[] = (() => {
    const map = new Map<string, Order[]>();
    const sorted = [...filtered].sort((a, b) => a.deliveryDate.localeCompare(b.deliveryDate));
    for (const o of sorted) { if (!map.has(o.deliveryDate)) map.set(o.deliveryDate, []); map.get(o.deliveryDate)!.push(o); }
    return Array.from(map.entries()).map(([date, data]) => ({ title: formatDate(date), data }));
  })();

  const handleCancel = (order: Order) => {
    Alert.alert('Cancelar encomenda?', `${order.recipeName} — ${order.clientName}`, [
      { text: 'Não', style: 'cancel' },
      { text: 'Cancelar', style: 'destructive', onPress: async () => { await orderStorage.update(order.id, { status: 'cancelled' }); showToast('Encomenda cancelada', 'success'); loadOrders(); } },
    ]);
  };

  const handleDelete = (order: Order) => {
    Alert.alert('Excluir encomenda?', `${order.recipeName} — ${order.clientName}`, [
      { text: 'Não', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: async () => { await orderStorage.delete(order.id); loadOrders(); } },
    ]);
  };

  const registerSale = async (order: Order) => {
    try {
      await sApi.create({ recipeId: order.recipeId || '', quantitySold: order.quantity, salePrice: order.unitPrice, saleDate: new Date().toISOString().split('T')[0], notes: `Encomenda de ${order.clientName}` });
      showToast('Venda registrada!', 'success');
    } catch { showToast('Erro ao registrar venda', 'warning'); }
  };

  const changeStatus = async (order: Order, newStatus: OrderStatus) => {
    if (newStatus === 'delivered') {
      Alert.alert('Pagamento', `${order.clientName} já pagou?`, [
        { text: 'Ainda não', style: 'cancel', onPress: async () => { await orderStorage.update(order.id, { status: 'delivered', paid: false }); loadOrders(); } },
        { text: 'Sim, pago!', onPress: async () => { await orderStorage.update(order.id, { status: 'delivered', paid: true, paidAmount: order.totalPrice }); await registerSale(order); loadOrders(); } },
      ]);
      return;
    }
    await orderStorage.update(order.id, { status: newStatus });
    loadOrders();
  };

  const handleAddPayment = async () => {
    if (!paymentModalOrder) return;
    const amount = parseFloat(newPaymentAmount.replace(',', '.'));
    if (!amount || amount <= 0) return;
    const payment: OrderPayment = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), amount, method: newPaymentMethod, date: new Date().toISOString().split('T')[0] };
    const updatedPayments = [...(paymentModalOrder.payments || []), payment];
    const newPaidAmount = updatedPayments.reduce((sum, p) => sum + p.amount, 0);
    await orderStorage.update(paymentModalOrder.id, { payments: updatedPayments, paidAmount: newPaidAmount, paid: newPaidAmount >= paymentModalOrder.totalPrice });
    setPaymentModalOrder(null); setNewPaymentAmount(''); setNewPaymentMethod('pix');
    loadOrders(); showToast('Pagamento adicionado', 'success');
  };

  const renderOrder = ({ item }: { item: Order }) => {
    const isDelivered = item.status === 'delivered';
    const isCancelled = item.status === 'cancelled';
    const isLocked = isDelivered || isCancelled;
    const remaining = item.totalPrice - (item.paidAmount || 0);
    const stageIdx = STATUS_STAGES.findIndex(s => s.key === item.status);

    return (
      <TouchableOpacity activeOpacity={0.85}
        onPress={() => navigation.navigate('EditOrder', { orderId: item.id })}
        onLongPress={() => { if (!isLocked) handleDelete(item); }}>
        <View style={st.card}>
          {/* Top: name + total */}
          <View style={st.cardTop}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={st.cardRecipe}>
                {item.items && item.items.length > 1 ? `${item.items[0].recipeName} +${item.items.length - 1}` : item.recipeName}
              </Text>
              <Text style={st.cardClient}>
                {item.clientName} · {item.items && item.items.length > 1 ? `${item.items.length} produtos` : `${item.quantity} un × ${fmtCurrency(item.unitPrice)}`}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={st.cardTotal}>{fmtCurrency(item.totalPrice)}</Text>
              <View style={[st.badge, item.paid ? st.badgeGreen : st.badgeYellow]}>
                <Text style={[st.badgeText, { color: item.paid ? '#1F8A48' : '#8A5A00' }]}>{item.paid ? 'Pago' : 'Não pago'}</Text>
              </View>
            </View>
          </View>

          {/* Partial payments */}
          {(item.paidAmount != null && item.paidAmount > 0 && !item.paid) && (
            <View style={st.partialRow}>
              {item.payments?.map(p => (
                <View key={p.id} style={st.partialBadge}>
                  <Text style={st.partialBadgeText}>{p.method === 'pix' ? 'Pix' : p.method} {fmtCurrency(p.amount)}</Text>
                </View>
              ))}
              <Text style={st.partialRemaining}>Restante {fmtCurrency(remaining)}</Text>
            </View>
          )}

          {/* Status stages */}
          {isCancelled ? (
            <View style={st.cancelledRow}>
              <Ionicons name="close-circle" size={16} color="#C0392B" />
              <Text style={st.cancelledText}>Cancelado</Text>
            </View>
          ) : (
            <View style={st.stagesRow}>
              {STATUS_STAGES.map((s, i) => {
                const active = i === stageIdx;
                return (
                  <TouchableOpacity key={s.key} style={[st.stageBtn, active && st.stageBtnOn]}
                    onPress={() => { if (!isLocked) changeStatus(item, s.key); }}
                    disabled={isLocked} activeOpacity={isLocked ? 1 : 0.7}>
                    <Text style={[st.stageText, active && st.stageTextOn, i < stageIdx && { color: INK2 }]}>{s.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Delivery + notes */}
          <View style={st.deliveryRow}>
            <Ionicons name="time-outline" size={15} color={INK2} />
            <Text style={st.deliveryText}>
              Entrega {formatDate(item.deliveryDate)}{item.deliveryTime ? `, ${item.deliveryTime}` : ''}
              {item.notes ? ` · ${item.notes}` : ''}
            </Text>
          </View>

          {/* Add payment button */}
          {isDelivered && remaining > 0 && (
            <TouchableOpacity style={st.addPayBtn} onPress={() => setPaymentModalOrder(item)} activeOpacity={0.7}>
              <Ionicons name="add-circle-outline" size={16} color={PINK} />
              <Text style={st.addPayText}>Adicionar pagamento</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  /* ─── Loading ─── */
  if (loading) {
    return (
      <SafeAreaView style={st.safe}>
        <View style={st.sh}><View style={st.shT}><Text style={st.shH1}>Encomendas</Text><Text style={st.shSub}>Carregando...</Text></View></View>
        <View style={{ padding: 18, gap: 12 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>{[0, 1, 2, 3].map(i => <Skeleton key={i} width={80} height={32} borderRadius={20} />)}</View>
          {[0, 1, 2].map(i => <Skeleton key={i} width="100%" height={160} borderRadius={18} />)}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={st.safe}>
      {/* ── Header ── */}
      <View style={st.sh}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={st.bk}>
          <Ionicons name="arrow-back" size={20} color={INK} />
        </TouchableOpacity>
        <View style={st.shT}>
          <Text style={st.shH1}>Encomendas</Text>
          <Text style={st.shSub}>{orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled').length} em andamento</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('CreateOrder')} activeOpacity={0.8}
          style={[st.actPill, { backgroundColor: PINK, shadowColor: PINK, shadowOpacity: 0.3 }]}>
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={st.actPillText}>Nova</Text>
        </TouchableOpacity>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={item => item.id}
        renderItem={renderOrder}
        renderSectionHeader={({ section }) => (
          <Text style={st.secHead}>{section.title}</Text>
        )}
        contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={st.filterRow} style={{ marginHorizontal: -18, paddingHorizontal: 0 }}>
            {FILTER_ALL.map(f => {
              const on = filter === f.key;
              return (
                <TouchableOpacity key={f.key} onPress={() => setFilter(f.key)}
                  style={[st.pill, on && st.pillOn]} activeOpacity={0.7}>
                  <Text style={[st.pillText, on && st.pillTextOn]}>{f.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        }
        ListEmptyComponent={
          <View style={st.empty}>
            <View style={st.emptyIco}><Ionicons name="calendar-outline" size={36} color={PINK} /></View>
            <Text style={st.emptyTitle}>Nenhuma encomenda</Text>
            <Text style={st.emptyDesc}>Organize seus pedidos, entregas e pagamentos.</Text>
            <TouchableOpacity onPress={() => navigation.navigate('CreateOrder')} activeOpacity={0.85}>
              <LinearGradient colors={['#FF6AAE', PINK]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.emptyBtn}>
                <Text style={st.emptyBtnText}>Nova encomenda</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        }
      />

      {/* ── Payment modal ── */}
      <Modal visible={!!paymentModalOrder} animationType="slide" transparent>
        <View style={st.modalOverlay}>
          <View style={st.payModal}>
            <View style={st.payModalHead}>
              <Text style={st.payModalTitle}>Adicionar pagamento</Text>
              <TouchableOpacity onPress={() => { setPaymentModalOrder(null); setNewPaymentAmount(''); }}>
                <Ionicons name="close" size={24} color={INK} />
              </TouchableOpacity>
            </View>
            {paymentModalOrder && (
              <View>
                <Text style={st.payModalSub}>{paymentModalOrder.recipeName} — {paymentModalOrder.clientName}</Text>
                <View style={st.payRemaining}>
                  <Ionicons name="wallet-outline" size={14} color="#F57F17" />
                  <Text style={st.payRemainingText}>Restante {fmtCurrency(paymentModalOrder.totalPrice - (paymentModalOrder.paidAmount || 0))}</Text>
                </View>
                <Text style={st.payLabel}>Valor</Text>
                <View style={st.payInput}>
                  <Text style={{ color: INK3, fontWeight: '700', fontSize: 13 }}>R$</Text>
                  <TextInput style={st.payInputText} value={newPaymentAmount} onChangeText={setNewPaymentAmount}
                    placeholder="0,00" placeholderTextColor={INK3} keyboardType="decimal-pad" />
                </View>
                <Text style={st.payLabel}>Método</Text>
                <View style={st.payMethodGrid}>
                  {PAYMENT_METHODS.map(m => {
                    const on = newPaymentMethod === m.key;
                    return (
                      <TouchableOpacity key={m.key} onPress={() => setNewPaymentMethod(m.key)}
                        style={[st.payMethodBtn, on && { borderColor: PINK, backgroundColor: PINK + '15' }]} activeOpacity={0.7}>
                        <Ionicons name={m.icon} size={16} color={on ? PINK : INK3} />
                        <Text style={[st.payMethodText, on && { color: PINK, fontWeight: '700' }]}>{m.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <TouchableOpacity onPress={handleAddPayment} activeOpacity={0.85}>
                  <LinearGradient colors={['#FF6AAE', PINK]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.payConfirmBtn}>
                    <Ionicons name="checkmark" size={18} color="#fff" />
                    <Text style={st.payConfirmText}>Adicionar pagamento</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

/* ──────────────────────── STYLES ──────────────────────── */
const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: CREAM },

  /* header */
  sh: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10 },
  bk: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...SHADOW },
  shT: { flex: 1 },
  shH1: { fontSize: 22, fontWeight: '700', color: INK, lineHeight: 26 },
  shSub: { fontSize: 12.5, color: INK2, fontWeight: '600', marginTop: 1 },
  actPill: { height: 38, paddingHorizontal: 14, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 6, ...SHADOW },
  actPillText: { color: '#fff', fontWeight: '700', fontSize: 13.5 },

  /* filters (.pill) */
  filterRow: { paddingHorizontal: 18, gap: 8, paddingTop: 6, paddingBottom: 10 },
  pill: { height: 32, paddingHorizontal: 14, borderRadius: 999, backgroundColor: '#fff', justifyContent: 'center', ...SHADOW },
  pillOn: { backgroundColor: INK },
  pillText: { fontSize: 13, fontWeight: '600', color: INK2 },
  pillTextOn: { color: '#fff' },

  /* section header */
  secHead: { fontSize: 13, fontWeight: '700', color: INK2, textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 4, marginBottom: 9, marginLeft: 4 },

  /* order card (.gcard) */
  card: { backgroundColor: '#fff', borderRadius: 18, padding: 14, marginBottom: 11, ...SHADOW },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  cardRecipe: { fontSize: 16, fontWeight: '700', color: INK, lineHeight: 19 },
  cardClient: { fontSize: 12.5, color: INK2, fontWeight: '600', marginTop: 2 },
  cardTotal: { fontSize: 16, fontWeight: '700', color: INK },

  /* badges */
  badge: { marginTop: 4, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 8 },
  badgeGreen: { backgroundColor: '#DCF6E5' },
  badgeYellow: { backgroundColor: '#FFF1CE' },
  badgeText: { fontSize: 11, fontWeight: '700' },

  /* partial payments */
  partialRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 8, flexWrap: 'wrap' },
  partialBadge: { backgroundColor: '#DCF1FB', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  partialBadgeText: { fontSize: 11, fontWeight: '700', color: '#1A6F96' },
  partialRemaining: { fontSize: 11.5, color: INK2, fontWeight: '600' },

  /* status stages */
  stagesRow: { flexDirection: 'row', gap: 5, marginTop: 11 },
  stageBtn: { flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: 9, backgroundColor: '#FCEFE6' },
  stageBtnOn: { backgroundColor: PINK },
  stageText: { fontSize: 10.5, fontWeight: '700', color: INK3 },
  stageTextOn: { color: '#fff' },

  /* cancelled */
  cancelledRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 11, paddingTop: 10, borderTopWidth: 1, borderTopColor: LINE },
  cancelledText: { fontSize: 13, fontWeight: '700', color: '#C0392B' },

  /* delivery */
  deliveryRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 10, },
  deliveryText: { fontSize: 12, color: INK2, fontWeight: '600', flex: 1 },

  /* add payment */
  addPayBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, marginTop: 8, borderRadius: 10, borderWidth: 1.5, borderColor: PINK, borderStyle: 'dashed' },
  addPayText: { fontSize: 12, color: PINK, fontWeight: '700' },

  /* empty */
  empty: { alignItems: 'center', paddingTop: 60, gap: 10, paddingHorizontal: 24 },
  emptyIco: { width: 72, height: 72, borderRadius: 24, backgroundColor: '#FFF0F6', alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: INK },
  emptyDesc: { fontSize: 13, color: INK2, fontWeight: '500', textAlign: 'center', lineHeight: 19, maxWidth: 240 },
  emptyBtn: { height: 48, borderRadius: 14, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  emptyBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  /* FAB */
  fab: { position: 'absolute', right: 18, bottom: 30, borderRadius: 19, ...SHADOW, shadowColor: '#D8377F', shadowOpacity: 0.42, shadowRadius: 12, elevation: 8 },
  fabInner: { width: 58, height: 58, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },

  /* Payment modal */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(61,34,51,0.35)', justifyContent: 'flex-end' },
  payModal: { backgroundColor: CREAM, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 32 },
  payModalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  payModalTitle: { fontSize: 20, fontWeight: '700', color: INK },
  payModalSub: { fontSize: 13, color: INK2, fontWeight: '500', marginBottom: 8 },
  payRemaining: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFF8E1', borderRadius: 10, padding: 10, marginBottom: 14 },
  payRemainingText: { fontSize: 13, color: '#F57F17', fontWeight: '600' },
  payLabel: { fontSize: 13, fontWeight: '700', color: INK, marginBottom: 6, marginTop: 8, marginLeft: 2 },
  payInput: { backgroundColor: '#fff', borderRadius: 14, padding: 14, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', gap: 10, ...SHADOW },
  payInputText: { flex: 1, fontSize: 15, color: INK, padding: 0 },
  payMethodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  payMethodBtn: { flexBasis: '46%' as any, flexGrow: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5, borderColor: LINE, backgroundColor: '#fff' },
  payMethodText: { fontSize: 12, color: INK3, fontWeight: '500' },
  payConfirmBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 50, borderRadius: 14, marginTop: 16 },
  payConfirmText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
