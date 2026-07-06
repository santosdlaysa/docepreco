import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { OrderStatus, OrderPayment, OrderItem, PaymentMethodType } from '../../domain/entities/Order';
import { Recipe } from '../../domain/entities/Recipe';
import { Client } from '../../domain/entities/Client';
import { orderApi as orderStorage } from '../../data/api/orderApi';
import { saleApi } from '../../data/api/saleApi';
import { clientStorage } from '../../data/storage/clientStorage';
import { recipeApi } from '../../data/api/recipeApi';
import { isDemoMode } from '../../data/demo/demoMode';
import { demoRecipeApi, demoSaleApi } from '../../data/demo/demoApi';
import { colors } from '../theme/colors';
import { useToast } from '../context/ToastContext';
import { useTranslation } from 'react-i18next';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'EditOrder'>;

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

// Aceita vírgula, ponto e ponto de milhar no padrão BR.
const num = (s: string) => {
  const sanitized = String(s ?? '').replace(/[^0-9.,]/g, '');
  const normalized = sanitized.includes(',')
    ? sanitized.replace(/\./g, '').replace(',', '.')
    : sanitized;
  return parseFloat(normalized) || 0;
};
const toCents = (value: number) => Math.round(value * 100);

const STATUS_OPTIONS: { key: OrderStatus; label: string; bg: string; color: string }[] = [
  { key: 'pending', label: 'Pendente', bg: '#FFF1CE', color: '#8A5A00' },
  { key: 'in_progress', label: 'Produção', bg: '#DCF1FB', color: '#1A6F96' },
  { key: 'done', label: 'Saiu para entrega', bg: '#FFE3EF', color: '#BC2A6C' },
  { key: 'delivered', label: 'Entregue', bg: '#DCF6E5', color: '#1F8A48' },
  { key: 'cancelled', label: 'Cancelado', bg: '#FBE0E0', color: '#C0392B' },
];

const PAYMENT_METHODS: { key: PaymentMethodType; icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
  { key: 'pix', icon: 'qr-code-outline', label: 'Pix' },
  { key: 'cash', icon: 'cash-outline', label: 'Dinheiro' },
  { key: 'credit', icon: 'card-outline', label: 'Crédito' },
  { key: 'debit', icon: 'card-outline', label: 'Débito' },
];

const THUMB_COLORS = ['#FF8FB6', '#EA4B92', '#2BA7DD', '#FFB01F', '#43BE6E', '#7B68EE'];

export const CreateOrderScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { t } = useTranslation();
  const orderId = (route.params as any)?.orderId as string | undefined;
  const isEditing = !!orderId;
  const { showToast } = useToast();
  const rApi = isDemoMode() ? demoRecipeApi : recipeApi;
  const sApi = isDemoMode() ? demoSaleApi : saleApi;

  interface ItemDraft { id: string; recipeId?: string; recipeName: string; quantity: string; unitPrice: string; }
  const newItemDraft = (): ItemDraft => ({ id: Math.random().toString(36).slice(2), recipeId: undefined, recipeName: '', quantity: '', unitPrice: '' });

  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [items, setItems] = useState<ItemDraft[]>([newItemDraft()]);
  const [pickingItemIdx, setPickingItemIdx] = useState<number | null>(null);
  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliveryTime, setDeliveryTime] = useState('');
  const [status, setStatus] = useState<OrderStatus>('pending');
  const [notes, setNotes] = useState('');
  const [payments, setPayments] = useState<OrderPayment[]>([]);
  const [newPaymentAmount, setNewPaymentAmount] = useState('');
  const [newPaymentMethod, setNewPaymentMethod] = useState<PaymentMethodType>('pix');
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [deliveryModalMethod, setDeliveryModalMethod] = useState<PaymentMethodType>('pix');
  const [deliveryModalAmount, setDeliveryModalAmount] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState('');

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);

  const toIso = (d: string) => { const [dd, mm, aaaa] = d.split('-'); return `${aaaa}-${mm}-${dd}`; };
  const fromIso = (d: string) => { const [aaaa, mm, dd] = d.split('-'); return `${dd}-${mm}-${aaaa}`; };

  useEffect(() => {
    rApi.getAll().then(setRecipes).catch(() => {});
    clientStorage.getAll().then(setClients).catch(() => {});
    if (orderId) {
      orderStorage.getById(orderId).then(order => {
        if (!order) return;
        setClientName(order.clientName);
        setClientPhone(order.clientPhone || '');
        const loadedItems = order.items && order.items.length > 0
          ? order.items.map(i => ({ id: Math.random().toString(36).slice(2), recipeId: i.recipeId, recipeName: i.recipeName, quantity: String(i.quantity), unitPrice: String(i.unitPrice).replace('.', ',') }))
          : [{ id: Math.random().toString(36).slice(2), recipeId: order.recipeId, recipeName: order.recipeName, quantity: String(order.quantity), unitPrice: String(order.unitPrice).replace('.', ',') }];
        setItems(loadedItems);
        setDeliveryDate(fromIso(order.deliveryDate));
        setDeliveryTime(order.deliveryTime || '');
        setStatus(order.status);
        if (order.status === 'delivered' || order.status === 'cancelled') setIsLocked(true);
        setPayments(order.payments && order.payments.length > 0 ? order.payments : order.paidAmount && order.paidAmount > 0 ? [{ id: 'migrated', amount: order.paidAmount, method: 'cash', date: order.createdAt.split('T')[0] }] : []);
        setNotes(order.notes || '');
        setDeliveryAddress(order.deliveryAddress || '');
      });
    }
  }, []);

  const totalPrice = items.reduce((s, i) => s + num(i.quantity) * num(i.unitPrice), 0);
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const remaining = Math.max(totalPrice - totalPaid, 0);

  const filteredClients = clientName.trim().length >= 2
    ? clients.filter(c => c.name.toLowerCase().includes(clientName.toLowerCase()))
    : [];

  const validate = () => {
    const e: Record<string, string> = {};
    if (!clientName.trim()) e.client = 'Obrigatório';
    if (items.some(i => !i.recipeName.trim())) e.recipe = 'Selecione todos os produtos';
    if (items.some(i => !i.quantity || num(i.quantity) <= 0)) e.qty = 'Preencha as quantidades';
    if (items.some(i => !i.unitPrice || num(i.unitPrice) <= 0)) e.price = 'Preencha os preços';
    if (!deliveryDate.trim()) e.date = 'Obrigatório';
    if (deliveryDate && !/^\d{2}-\d{2}-\d{4}$/.test(deliveryDate)) e.date = 'Use DD-MM-AAAA';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const orderItems: OrderItem[] = items.map(i => ({
        recipeId: i.recipeId,
        recipeName: i.recipeName.trim(),
        quantity: num(i.quantity),
        unitPrice: num(i.unitPrice),
      }));
      const data = {
        clientName: clientName.trim(), clientPhone: clientPhone.trim() || undefined,
        recipeId: orderItems[0]?.recipeId,
        recipeName: orderItems[0]?.recipeName || '',
        quantity: orderItems[0]?.quantity || 1,
        unitPrice: orderItems[0]?.unitPrice || 0,
        totalPrice,
        items: orderItems,
        deliveryDate: toIso(deliveryDate.trim()), deliveryTime: deliveryTime.trim() || undefined,
        status,
        paid: totalPrice > 0 && toCents(totalPaid) >= toCents(totalPrice),
        paidAmount: totalPaid,
        payments,
        notes: notes.trim() || undefined,
      };
      if (isEditing) { await orderStorage.update(orderId!, data); showToast('Encomenda atualizada!', 'success'); }
      else { await orderStorage.create({ ...data, source: 'manual' as const }); showToast('Encomenda criada!', 'success'); }
      const isFullyPaid = totalPrice > 0 && toCents(totalPaid) >= toCents(totalPrice);
      if (isFullyPaid && status === 'delivered') {
        try {
          await sApi.create({ recipeId: data.recipeId || '', quantitySold: data.quantity, salePrice: data.unitPrice, saleDate: new Date().toISOString().split('T')[0], notes: `Encomenda de ${data.clientName}` });
          showToast('Encomenda entregue e venda registrada!', 'success');
        } catch { showToast('Encomenda salva, mas erro ao registrar venda', 'warning'); }
      }
      navigation.goBack();
    } catch { showToast('Erro ao salvar', 'error'); }
    finally { setLoading(false); }
  };

  const handleAddPayment = () => {
    const amount = num(newPaymentAmount);
    if (amount <= 0) {
      showToast('Informe um valor pago válido', 'warning');
      return;
    }
    setPayments(prev => [...prev, { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), amount, method: newPaymentMethod, date: new Date().toISOString().split('T')[0] }]);
    setNewPaymentAmount(''); setNewPaymentMethod('pix'); setShowAddPayment(false);
  };

  const handleDeliveryConfirm = async () => {
    if (!validate()) { setShowDeliveryModal(false); return; }
    setLoading(true);
    try {
      const orderItems: OrderItem[] = items.map(i => ({
        recipeId: i.recipeId, recipeName: i.recipeName.trim(),
        quantity: num(i.quantity), unitPrice: num(i.unitPrice),
      }));
      let finalPayments = [...payments];
      const modalAmount = num(deliveryModalAmount);
      if (remaining > 0) {
        if (modalAmount <= 0) { showToast('Informe o valor recebido', 'warning'); setLoading(false); return; }
        finalPayments = [...payments, { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), amount: modalAmount, method: deliveryModalMethod, date: new Date().toISOString().split('T')[0] }];
      }
      const finalPaid = finalPayments.reduce((s, p) => s + p.amount, 0);
      const data = {
        clientName: clientName.trim(), clientPhone: clientPhone.trim() || undefined,
        recipeId: orderItems[0]?.recipeId,
        recipeName: orderItems[0]?.recipeName || '',
        quantity: orderItems[0]?.quantity || 1,
        unitPrice: orderItems[0]?.unitPrice || 0,
        totalPrice, items: orderItems,
        deliveryDate: toIso(deliveryDate.trim()), deliveryTime: deliveryTime.trim() || undefined,
        status: 'delivered' as OrderStatus,
        paid: true,
        paidAmount: finalPaid,
        payments: finalPayments,
        notes: notes.trim() || undefined,
      };
      if (isEditing) await orderStorage.update(orderId!, data);
      else await orderStorage.create({ ...data, source: 'manual' as const });
      try {
        await sApi.create({ recipeId: data.recipeId || '', quantitySold: data.quantity, salePrice: data.unitPrice, saleDate: new Date().toISOString().split('T')[0], notes: `Encomenda de ${data.clientName}` });
        showToast('Entregue e venda registrada!', 'success');
      } catch { showToast('Entregue, mas erro ao registrar venda', 'warning'); }
      setShowDeliveryModal(false);
      navigation.goBack();
    } catch { showToast('Erro ao finalizar entrega', 'error'); }
    finally { setLoading(false); }
  };

  const maskDate = (text: string) => {
    const nums = text.replace(/\D/g, '').slice(0, 8);
    if (nums.length > 4) return `${nums.slice(0, 2)}-${nums.slice(2, 4)}-${nums.slice(4)}`;
    if (nums.length > 2) return `${nums.slice(0, 2)}-${nums.slice(2)}`;
    return nums;
  };

  const maskTime = (text: string) => {
    const nums = text.replace(/\D/g, '').slice(0, 4);
    if (nums.length > 2) return `${nums.slice(0, 2)}:${nums.slice(2)}`;
    return nums;
  };

  return (
    <SafeAreaView style={st.safe}>
      {/* ── Header ── */}
      <View style={st.sh}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={st.bk}>
          <Ionicons name="arrow-back" size={20} color={INK} />
        </TouchableOpacity>
        <View style={st.shT}><Text style={st.shH1}>{isEditing ? 'Editar encomenda' : 'Nova encomenda'}</Text></View>
        {!isLocked && (
          <TouchableOpacity onPress={handleSave} disabled={loading} activeOpacity={0.8}
            style={[st.actPill, { backgroundColor: PINK, shadowColor: PINK, shadowOpacity: 0.3 }]}>
            {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={st.actPillText}>Salvar</Text>}
          </TouchableOpacity>
        )}
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView style={st.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingTop: 14, paddingBottom: 40, gap: 13 }}>

          {/* ── Cliente ── */}
          <Text style={st.sec}>Cliente</Text>
          <View style={st.field}>
            <View style={[st.input, errors.client ? st.inputErr : null]}>
              <Ionicons name="person-outline" size={18} color={INK3} />
              <TextInput style={st.inputText} value={clientName} placeholder="Nome do cliente" placeholderTextColor={INK3}
                editable={!isLocked} onChangeText={(t) => { setClientName(t); setShowClientSuggestions(true); }} />
            </View>
            {errors.client && <Text style={st.err}>{errors.client}</Text>}
            {!isLocked && showClientSuggestions && filteredClients.length > 0 && (
              <View style={st.sugBox}>
                {filteredClients.slice(0, 5).map(c => (
                  <TouchableOpacity key={c.id} style={st.sugItem} onPress={() => { setClientName(c.name); if (c.phone) setClientPhone(c.phone); setShowClientSuggestions(false); }}>
                    <Ionicons name="person-outline" size={14} color={INK2} />
                    <Text style={st.sugText}>{c.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
          <View style={st.input}>
            <Ionicons name="call-outline" size={18} color={INK3} />
            <TextInput style={st.inputText} value={clientPhone} placeholder="(11) 98888-7777" placeholderTextColor={INK3}
              keyboardType="phone-pad" maxLength={15} editable={!isLocked} onChangeText={setClientPhone} />
          </View>

          {/* ── Produtos ── */}
          <Text style={st.sec}>Produtos</Text>
          {items.map((item, idx) => {
            const itemTotal = num(item.quantity) * num(item.unitPrice);
            return (
              <View key={item.id} style={st.itemCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <TouchableOpacity
                    style={[st.input, { flex: 1 }, (!item.recipeName && errors.recipe) ? st.inputErr : null]}
                    onPress={() => { if (!isLocked) setPickingItemIdx(idx); }}
                    activeOpacity={0.8}
                  >
                    {item.recipeName ? (
                      <>
                        <LinearGradient colors={['#FF8FB6', PINK]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                          style={{ width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' }}>
                          <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>{item.recipeName.slice(0, 2).toUpperCase()}</Text>
                        </LinearGradient>
                        <Text style={{ flex: 1, fontSize: 15, color: INK }} numberOfLines={1}>{item.recipeName}</Text>
                      </>
                    ) : (
                      <Text style={{ flex: 1, fontSize: 15, color: INK3 }}>Selecionar receita</Text>
                    )}
                    <Ionicons name="chevron-forward" size={16} color={INK3} />
                  </TouchableOpacity>
                  {!isLocked && items.length > 1 && (
                    <TouchableOpacity onPress={() => setItems(prev => prev.filter((_, i) => i !== idx))}>
                      <Ionicons name="close-circle" size={22} color="#C0392B" />
                    </TouchableOpacity>
                  )}
                </View>
                <View style={st.two}>
                  <View style={[st.field, { flex: 1 }]}>
                    <Text style={st.label}>Qtd</Text>
                    <View style={[st.input, (errors.qty && (!item.quantity || num(item.quantity) <= 0)) ? st.inputErr : null]}>
                      <TextInput style={st.inputText} value={item.quantity} placeholder="1" placeholderTextColor={INK3}
                        keyboardType="number-pad" editable={!isLocked}
                        onChangeText={v => setItems(prev => prev.map((it, i) => i === idx ? { ...it, quantity: v } : it))} />
                    </View>
                  </View>
                  <View style={[st.field, { flex: 1 }]}>
                    <Text style={st.label}>Preço un.</Text>
                    <View style={[st.input, (errors.price && (!item.unitPrice || num(item.unitPrice) <= 0)) ? st.inputErr : null]}>
                      <Text style={{ color: INK3, fontWeight: '700', fontSize: 13 }}>R$</Text>
                      <TextInput style={st.inputText} value={item.unitPrice} placeholder="120,00" placeholderTextColor={INK3}
                        keyboardType="decimal-pad" editable={!isLocked}
                        onChangeText={v => setItems(prev => prev.map((it, i) => i === idx ? { ...it, unitPrice: v } : it))} />
                    </View>
                  </View>
                </View>
                {itemTotal > 0 && items.length > 1 && (
                  <View style={[st.totalRow, { marginTop: 0 }]}>
                    <Text style={st.totalLabel}>Subtotal</Text>
                    <Text style={[st.totalValue, { fontSize: 15 }]}>{fmtCurrency(itemTotal)}</Text>
                  </View>
                )}
              </View>
            );
          })}
          {(errors.recipe || errors.qty || errors.price) && (
            <Text style={st.err}>{errors.recipe || errors.qty || errors.price}</Text>
          )}
          {!isLocked && (
            <TouchableOpacity style={st.addPayBtn} onPress={() => setItems(prev => [...prev, newItemDraft()])} activeOpacity={0.7}>
              <Ionicons name="add-circle-outline" size={16} color={PINK} />
              <Text style={st.addPayText}>Adicionar produto</Text>
            </TouchableOpacity>
          )}

          {totalPrice > 0 && (
            <View style={st.totalRow}>
              <Text style={st.totalLabel}>Total</Text>
              <Text style={st.totalValue}>{fmtCurrency(totalPrice)}</Text>
            </View>
          )}

          {/* ── Entrega ── */}
          <Text style={st.sec}>Entrega</Text>
          <View style={st.two}>
            <View style={[st.field, { flex: 1 }]}>
              <Text style={st.label}>Data</Text>
              <View style={[st.input, errors.date ? st.inputErr : null]}>
                <TextInput style={st.inputText} value={deliveryDate} placeholder="15-01-2026" placeholderTextColor={INK3}
                  keyboardType="number-pad" maxLength={10} editable={!isLocked}
                  onChangeText={(t) => setDeliveryDate(maskDate(t))} />
              </View>
              {errors.date && <Text style={st.err}>{errors.date}</Text>}
            </View>
            <View style={[st.field, { flex: 1 }]}>
              <Text style={st.label}>Horário</Text>
              <View style={st.input}>
                <TextInput style={st.inputText} value={deliveryTime} placeholder="16:00" placeholderTextColor={INK3}
                  keyboardType="number-pad" maxLength={5} editable={!isLocked}
                  onChangeText={(t) => setDeliveryTime(maskTime(t))} />
              </View>
            </View>
          </View>

          {/* ── Status ── */}
          <Text style={st.sec}>Status</Text>
          <View style={st.ugrid}>
            {STATUS_OPTIONS.map(s => {
              const on = status === s.key;
              return (
                <TouchableOpacity key={s.key} activeOpacity={isLocked ? 1 : 0.8} disabled={isLocked}
                  style={[st.statusChip, { backgroundColor: s.bg }, on && { borderWidth: 2, borderColor: s.color }]}
                  onPress={() => {
                    if (s.key === 'delivered') {
                      setDeliveryModalAmount(remaining > 0 ? String(remaining).replace('.', ',') : '');
                      setDeliveryModalMethod('pix');
                      setShowDeliveryModal(true);
                      return;
                    }
                    setStatus(s.key);
                  }}>
                  <Text style={[st.statusChipText, { color: s.color }]}>{s.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ── Pagamentos ── */}
          <Text style={st.sec}>Pagamentos</Text>
          {payments.length > 0 && (
            <View style={st.gcard}>
              {payments.map((p, i) => (
                <View key={p.id} style={[st.grow, i > 0 && { borderTopWidth: 1, borderTopColor: LINE }]}>
                  <View style={[st.gi, { backgroundColor: '#EEF8FD' }]}>
                    <Ionicons name={PAYMENT_METHODS.find(m => m.key === p.method)?.icon || 'cash-outline'} size={16} color="#2BA7DD" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={st.growB}>{PAYMENT_METHODS.find(m => m.key === p.method)?.label || p.method}</Text>
                    <Text style={st.growS}>{p.date}</Text>
                  </View>
                  <Text style={[st.growV, { color: GREEN }]}>{fmtCurrency(p.amount)}</Text>
                  {!isLocked && (
                    <TouchableOpacity onPress={() => setPayments(prev => prev.filter(x => x.id !== p.id))}>
                      <Ionicons name="close-circle" size={18} color="#C0392B" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          )}

          {totalPrice > 0 && totalPaid > 0 && (
            <View style={st.remainingRow}>
              <Text style={st.remainingLabel}>Restante</Text>
              <Text style={st.remainingValue}>{fmtCurrency(remaining)}</Text>
            </View>
          )}

          {!isLocked && remaining > 0 && !showAddPayment && (
            <TouchableOpacity style={st.addPayBtn} onPress={() => setShowAddPayment(true)} activeOpacity={0.7}>
              <Ionicons name="add-circle-outline" size={16} color={PINK} />
              <Text style={st.addPayText}>Adicionar pagamento</Text>
            </TouchableOpacity>
          )}

          {showAddPayment && (
            <View style={st.addPayForm}>
              <View style={st.input}>
                <Text style={{ color: INK3, fontWeight: '700', fontSize: 13 }}>R$</Text>
                <TextInput style={st.inputText} value={newPaymentAmount} onChangeText={setNewPaymentAmount}
                  placeholder="0,00" placeholderTextColor={INK3} keyboardType="decimal-pad" />
              </View>
              <View style={st.ugrid}>
                {PAYMENT_METHODS.map(m => {
                  const on = newPaymentMethod === m.key;
                  return (
                    <TouchableOpacity key={m.key} onPress={() => setNewPaymentMethod(m.key)}
                      style={[st.statusChip, { backgroundColor: on ? PINK + '15' : '#fff', borderWidth: on ? 2 : 0, borderColor: PINK }]} activeOpacity={0.7}>
                      <Ionicons name={m.icon} size={14} color={on ? PINK : INK3} />
                      <Text style={[st.statusChipText, { color: on ? PINK : INK2, marginLeft: 4 }]}>{m.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                <TouchableOpacity onPress={() => { setShowAddPayment(false); setNewPaymentAmount(''); }} style={{ padding: 10 }}>
                  <Text style={{ color: INK2, fontWeight: '600' }}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleAddPayment} activeOpacity={0.85}>
                  <LinearGradient colors={['#FF6AAE', PINK]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 }}>
                    <Ionicons name="checkmark" size={16} color="#fff" />
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Adicionar</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ── Endereço de entrega (pedidos online) ── */}
          {deliveryAddress ? (
            <View style={st.addressCard}>
              <Ionicons name="location-outline" size={16} color="#1A6F96" />
              <View style={{ flex: 1 }}>
                <Text style={st.addressLabel}>Endereço de entrega</Text>
                <Text style={st.addressText}>{deliveryAddress}</Text>
              </View>
            </View>
          ) : null}

          {/* ── Observações ── */}
          <Text style={st.sec}>Observações</Text>
          <View style={[st.input, { alignItems: 'flex-start' }]}>
            <TextInput style={[st.inputText, { minHeight: 60, textAlignVertical: 'top' }]}
              value={notes} onChangeText={setNotes} multiline editable={!isLocked}
              placeholder="Ex: sem glúten, bolo rosa" placeholderTextColor={INK3} />
          </View>

          {/* ── Save button ── */}
          {!isLocked && (
            <TouchableOpacity onPress={handleSave} disabled={loading} activeOpacity={0.85}>
              <LinearGradient colors={['#FF6AAE', PINK]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.btn}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={st.btnText}>{isEditing ? 'Atualizar encomenda' : 'Salvar encomenda'}</Text>}
              </LinearGradient>
            </TouchableOpacity>
          )}

        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Modal confirmar entrega ── */}
      <Modal visible={showDeliveryModal} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 16 }}>
            {/* Título */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#DCF6E5', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="checkmark-circle" size={22} color="#1F8A48" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: INK }}>Confirmar entrega</Text>
                <Text style={{ fontSize: 12, color: INK2, marginTop: 1 }}>de {clientName || 'cliente'}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowDeliveryModal(false)}>
                <Ionicons name="close" size={22} color={INK2} />
              </TouchableOpacity>
            </View>

            {/* Resumo de pagamento */}
            <View style={{ backgroundColor: '#F5F5F7', borderRadius: 14, padding: 14, gap: 6 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 13, color: INK2 }}>Total da encomenda</Text>
                <Text style={{ fontSize: 13, fontWeight: '600', color: INK }}>R$ {totalPrice.toFixed(2).replace('.', ',')}</Text>
              </View>
              {totalPaid > 0 && (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 13, color: INK2 }}>Já recebido</Text>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#1F8A48' }}>R$ {totalPaid.toFixed(2).replace('.', ',')}</Text>
                </View>
              )}
              {remaining > 0 && (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#E5E5E5', paddingTop: 6, marginTop: 2 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: INK }}>Restante a receber</Text>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: PINK }}>R$ {remaining.toFixed(2).replace('.', ',')}</Text>
                </View>
              )}
              {remaining === 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, borderTopWidth: 1, borderTopColor: '#E5E5E5', paddingTop: 6, marginTop: 2 }}>
                  <Ionicons name="checkmark-circle" size={14} color="#1F8A48" />
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#1F8A48' }}>Pedido já quitado</Text>
                </View>
              )}
            </View>

            {/* Registro de pagamento (só se houver restante) */}
            {remaining > 0 && (
              <>
                <Text style={{ fontSize: 13, fontWeight: '700', color: INK }}>Forma de pagamento</Text>
                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                  {PAYMENT_METHODS.map(m => (
                    <TouchableOpacity key={m.key} onPress={() => setDeliveryModalMethod(m.key)} activeOpacity={0.8}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10,
                        backgroundColor: deliveryModalMethod === m.key ? PINK : '#F5F5F7',
                        borderWidth: deliveryModalMethod === m.key ? 0 : 1, borderColor: '#E5E5E5' }}>
                      <Ionicons name={m.icon} size={15} color={deliveryModalMethod === m.key ? '#fff' : INK2} />
                      <Text style={{ fontSize: 13, fontWeight: '600', color: deliveryModalMethod === m.key ? '#fff' : INK2 }}>{m.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={[st.input]}>
                  <Ionicons name="cash-outline" size={18} color={INK3} />
                  <TextInput style={st.inputText} value={deliveryModalAmount}
                    onChangeText={setDeliveryModalAmount} keyboardType="decimal-pad"
                    placeholder="Valor recebido" placeholderTextColor={INK3} />
                </View>
              </>
            )}

            {/* Botões */}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
              <TouchableOpacity onPress={() => setShowDeliveryModal(false)} activeOpacity={0.8}
                style={{ flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: '#E5E5E5' }}>
                <Text style={{ fontWeight: '600', color: INK2 }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDeliveryConfirm} disabled={loading} activeOpacity={0.85} style={{ flex: 2 }}>
                <LinearGradient colors={['#34D399', '#059669']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14 }}>
                  {loading ? <ActivityIndicator size="small" color="#fff" /> : (
                    <>
                      <Ionicons name="checkmark-circle" size={18} color="#fff" />
                      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Confirmar entrega</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Recipe picker ── */}
      <Modal visible={pickingItemIdx !== null} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
          <View style={st.modalHead}>
            <Text style={st.modalTitle}>Escolher receita</Text>
            <TouchableOpacity onPress={() => setPickingItemIdx(null)}><Ionicons name="close" size={24} color={INK} /></TouchableOpacity>
          </View>
          <FlatList data={recipes} keyExtractor={item => item.id} contentContainerStyle={{ padding: 18 }}
            renderItem={({ item, index }) => {
              const bg = THUMB_COLORS[index % THUMB_COLORS.length];
              return (
                <TouchableOpacity onPress={() => {
                  if (pickingItemIdx !== null) {
                    setItems(prev => prev.map((it, i) => i === pickingItemIdx ? { ...it, recipeName: item.name, recipeId: item.id } : it));
                    setPickingItemIdx(null);
                  }
                }} activeOpacity={0.8} style={st.pickerRow}>
                  <View style={[st.pickerThumb, { backgroundColor: bg }]}><Text style={st.pickerThumbText}>{item.name.slice(0, 2).toUpperCase()}</Text></View>
                  <View style={{ flex: 1 }}><Text style={st.pickerName}>{item.name}</Text><Text style={st.pickerMeta}>{item.yield} un · {item.ingredients.length} ingredientes</Text></View>
                  <Ionicons name="chevron-forward" size={18} color={INK3} />
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={<View style={{ alignItems: 'center', paddingTop: 40 }}><Text style={{ color: INK2 }}>Nenhuma receita cadastrada</Text></View>}
          />
        </SafeAreaView>
      </Modal>

    </SafeAreaView>
  );
};

/* ──────────────────────── STYLES ──────────────────────── */
const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  body: { flex: 1, paddingHorizontal: 18 },

  sh: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10 },
  bk: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...SHADOW },
  shT: { flex: 1 },
  shH1: { fontSize: 22, fontWeight: '700', color: INK, lineHeight: 26 },
  actPill: { height: 38, paddingHorizontal: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center', ...SHADOW },
  actPillText: { color: '#fff', fontWeight: '700', fontSize: 13.5 },

  addressCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: '#EEF8FD', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#B8DDEF',
  },
  addressLabel: { fontSize: 11, fontWeight: '700', color: '#1A6F96', marginBottom: 2 },
  addressText: { fontSize: 14, color: '#1A6F96', lineHeight: 20 },

  sec: { fontSize: 16, fontWeight: '700', color: INK, marginTop: 6, marginBottom: -2, marginLeft: 2 },
  field: { gap: 7 },
  label: { fontSize: 13, fontWeight: '700', color: INK, marginLeft: 2 },
  err: { fontSize: 12, color: colors.error, marginLeft: 2 },

  input: { backgroundColor: '#fff', borderRadius: 14, padding: 14, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', gap: 10, ...SHADOW },
  inputErr: { borderWidth: 1.5, borderColor: colors.error },
  inputText: { flex: 1, fontSize: 15, color: INK, padding: 0 },

  two: { flexDirection: 'row', gap: 11 },

  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFF1CE', borderRadius: 14, padding: 14, marginTop: -4 },
  totalLabel: { fontSize: 14, fontWeight: '600', color: '#8A5A00' },
  totalValue: { fontSize: 18, fontWeight: '800', color: PINK },

  ugrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusChip: { height: 40, minWidth: 46, paddingHorizontal: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', ...SHADOW },
  statusChipText: { fontWeight: '700', fontSize: 13.5 },

  gcard: { backgroundColor: '#fff', borderRadius: 18, overflow: 'hidden', ...SHADOW },
  grow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13, paddingHorizontal: 15 },
  gi: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  growB: { fontSize: 14.5, fontWeight: '700', color: INK },
  growS: { fontSize: 12, color: INK2, fontWeight: '500' },
  growV: { fontSize: 15, fontWeight: '700' },

  remainingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4 },
  remainingLabel: { fontSize: 13, fontWeight: '700', color: INK2 },
  remainingValue: { fontSize: 16, fontWeight: '700', color: PINK },

  itemCard: { backgroundColor: '#fff', borderRadius: 18, padding: 14, gap: 10, ...SHADOW },
  addPayBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 14, borderWidth: 1.5, borderColor: PINK, borderStyle: 'dashed' },
  addPayText: { fontSize: 13, color: PINK, fontWeight: '700' },
  addPayForm: { backgroundColor: '#fff', borderRadius: 18, padding: 14, gap: 10, ...SHADOW },

  btn: { height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center', ...SHADOW, shadowColor: PINK, shadowOpacity: 0.35 },
  btnText: { fontSize: 16, fontWeight: '700', color: '#fff' },

  sugBox: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1.5, borderColor: PINK, marginTop: -4, overflow: 'hidden', ...SHADOW, shadowOpacity: 0.12 },
  sugItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: LINE },
  sugText: { fontSize: 14, color: INK },

  saleOverlay: { flex: 1, backgroundColor: 'rgba(61,34,51,0.55)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  saleCard: { backgroundColor: CREAM, borderRadius: 26, padding: 24, width: '100%', alignItems: 'center', gap: 12, ...SHADOW, shadowOpacity: 0.18, shadowRadius: 20 },
  saleIconGrad: { width: 70, height: 70, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  saleTitle: { fontSize: 20, fontWeight: '800', color: INK, textAlign: 'center', lineHeight: 25 },
  saleDesc: { fontSize: 13.5, color: INK2, fontWeight: '500', textAlign: 'center', lineHeight: 20, maxWidth: 270 },
  saleInfoRow: { backgroundColor: '#fff', borderRadius: 16, padding: 14, paddingHorizontal: 16, width: '100%', flexDirection: 'row', alignItems: 'center', gap: 12, ...SHADOW },
  saleInfoName: { fontSize: 14.5, fontWeight: '700', color: INK },
  saleInfoClient: { fontSize: 12, color: INK2, fontWeight: '500', marginTop: 2 },
  saleInfoValue: { fontSize: 17, fontWeight: '800', color: PINK },
  saleBtns: { flexDirection: 'row', gap: 10, width: '100%', marginTop: 4 },
  saleBtnNo: { flex: 1, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', ...SHADOW },
  saleBtnNoText: { fontSize: 14, fontWeight: '700', color: INK2 },
  saleBtnYes: { height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7 },
  saleBtnYesText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18, borderBottomWidth: 1, borderBottomColor: LINE, backgroundColor: '#fff' },
  modalTitle: { fontSize: 20, fontWeight: '700', color: INK },
  pickerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 18, padding: 13, paddingHorizontal: 15, marginBottom: 8, ...SHADOW },
  pickerThumb: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  pickerThumbText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  pickerName: { fontSize: 14.5, fontWeight: '700', color: INK },
  pickerMeta: { fontSize: 12, color: INK2, fontWeight: '500', marginTop: 2 },
});
