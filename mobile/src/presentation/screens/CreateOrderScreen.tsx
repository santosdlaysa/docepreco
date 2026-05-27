import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { OrderStatus, OrderPayment, PaymentMethodType } from '../../domain/entities/Order';
import { Recipe } from '../../domain/entities/Recipe';
import { Client } from '../../domain/entities/Client';
import { orderStorage } from '../../data/storage/orderStorage';
import { clientStorage } from '../../data/storage/clientStorage';
import { recipeApi } from '../../data/api/recipeApi';
import { isDemoMode } from '../../data/demo/demoMode';
import { demoRecipeApi } from '../../data/demo/demoApi';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Header } from '../components/Header';
import { useToast } from '../context/ToastContext';
import { useTranslation } from 'react-i18next';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'EditOrder'>;

export const CreateOrderScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { t } = useTranslation();
  const orderId = (route.params as any)?.orderId as string | undefined;
  const isEditing = !!orderId;

  const STATUS_OPTIONS: { key: OrderStatus; label: string; color: string }[] = [
    { key: 'pending', label: t('orders.pending'), color: '#FF9800' },
    { key: 'in_progress', label: t('orders.inProgress'), color: '#2196F3' },
    { key: 'done', label: t('orders.done'), color: '#4CAF50' },
    { key: 'delivered', label: t('orders.delivered'), color: '#9E9E9E' },
    { key: 'cancelled', label: t('orders.cancelled'), color: '#F44336' },
  ];

  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [recipeName, setRecipeName] = useState('');
  const [recipeId, setRecipeId] = useState<string | undefined>();
  const [quantity, setQuantity] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliveryTime, setDeliveryTime] = useState('');
  const [status, setStatus] = useState<OrderStatus>('pending');
  const [notes, setNotes] = useState('');
  const [payments, setPayments] = useState<OrderPayment[]>([]);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [newPaymentAmount, setNewPaymentAmount] = useState('');
  const [newPaymentMethod, setNewPaymentMethod] = useState<PaymentMethodType>('pix');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [isDelivered, setIsDelivered] = useState(false);

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [showRecipePicker, setShowRecipePicker] = useState(false);
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);
  const { showToast } = useToast();
  const rApi = isDemoMode() ? demoRecipeApi : recipeApi;

  // DD-MM-AAAA → YYYY-MM-DD (para armazenamento)
  const toIso = (d: string) => {
    const [dd, mm, aaaa] = d.split('-');
    return `${aaaa}-${mm}-${dd}`;
  };
  // YYYY-MM-DD → DD-MM-AAAA (para exibição)
  const fromIso = (d: string) => {
    const [aaaa, mm, dd] = d.split('-');
    return `${dd}-${mm}-${aaaa}`;
  };

  useEffect(() => {
    rApi.getAll().then(setRecipes).catch(() => {});
    clientStorage.getAll().then(setClients).catch(() => {});
    if (orderId) {
      orderStorage.getById(orderId).then(order => {
        if (!order) return;
        setClientName(order.clientName);
        setClientPhone(order.clientPhone || '');
        setRecipeName(order.recipeName);
        setRecipeId(order.recipeId);
        setQuantity(String(order.quantity));
        setUnitPrice(String(order.unitPrice));
        setDeliveryDate(fromIso(order.deliveryDate));
        setDeliveryTime(order.deliveryTime || '');
        setStatus(order.status);
        if (order.status === 'delivered' || order.status === 'cancelled') setIsDelivered(true);
        if (order.payments && order.payments.length > 0) {
          setPayments(order.payments);
        } else if (order.paidAmount && order.paidAmount > 0) {
          setPayments([{
            id: 'migrated',
            amount: order.paidAmount,
            method: 'cash',
            date: order.createdAt.split('T')[0],
          }]);
        }
        setNotes(order.notes || '');
      });
    }
  }, []);

  const totalPrice = (parseFloat(quantity) || 0) * (parseFloat(unitPrice) || 0);
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const remaining = Math.max(totalPrice - totalPaid, 0);

  const filteredClients = clientName.trim().length >= 2
    ? clients.filter(c => c.name.toLowerCase().includes(clientName.toLowerCase()))
    : [];

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!clientName.trim()) newErrors.clientName = t('createOrder.clientRequired');
    if (!recipeName.trim()) newErrors.recipeName = t('createOrder.recipeRequired');
    if (!quantity || parseFloat(quantity) <= 0) newErrors.quantity = t('createOrder.quantityRequired');
    if (!unitPrice || parseFloat(unitPrice) <= 0) newErrors.unitPrice = t('createOrder.priceRequired');
    if (!deliveryDate.trim()) newErrors.deliveryDate = t('createOrder.dateRequired');
    if (deliveryDate && !/^\d{2}-\d{2}-\d{4}$/.test(deliveryDate)) {
      newErrors.deliveryDate = t('createOrder.deliveryDateFormat');
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const data = {
        clientName: clientName.trim(),
        clientPhone: clientPhone.trim() || undefined,
        recipeId,
        recipeName: recipeName.trim(),
        quantity: parseFloat(quantity),
        unitPrice: parseFloat(unitPrice),
        totalPrice,
        deliveryDate: toIso(deliveryDate.trim()),
        deliveryTime: deliveryTime.trim() || undefined,
        status,
        paidAmount: totalPaid,
        payments,
        notes: notes.trim() || undefined,
      };
      if (isEditing) {
        await orderStorage.update(orderId!, data);
        showToast(t('createOrder.updated'), 'success');
      } else {
        await orderStorage.create(data);
        showToast(t('createOrder.created'), 'success');
      }
      navigation.goBack();
    } catch {
      showToast(t('createOrder.saveError'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const selectRecipe = (recipe: Recipe) => {
    setRecipeName(recipe.name);
    setRecipeId(recipe.id);
    setShowRecipePicker(false);
  };

  const selectClient = (client: Client) => {
    setClientName(client.name);
    if (client.phone) setClientPhone(client.phone);
    setShowClientSuggestions(false);
  };

  const formatCurrency = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const generatePaymentId = () =>
    Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  const handleAddPayment = async () => {
    const amount = parseFloat(newPaymentAmount);
    if (!amount || amount <= 0) return;
    const payment: OrderPayment = {
      id: generatePaymentId(),
      amount,
      method: newPaymentMethod,
      date: new Date().toISOString().split('T')[0],
    };
    const updatedPayments = [...payments, payment];
    setPayments(updatedPayments);
    setNewPaymentAmount('');
    setNewPaymentMethod('pix');
    setShowAddPayment(false);
    if (isDelivered && orderId) {
      const newPaidAmount = updatedPayments.reduce((sum, p) => sum + p.amount, 0);
      await orderStorage.update(orderId, {
        payments: updatedPayments,
        paidAmount: newPaidAmount,
        paid: newPaidAmount >= totalPrice,
      });
      showToast(t('createOrder.paymentAdded'), 'success');
    }
  };

  const handleRemovePayment = (paymentId: string) => {
    setPayments(prev => prev.filter(p => p.id !== paymentId));
  };

  const PAYMENT_METHODS: { key: PaymentMethodType; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'pix', icon: 'qr-code-outline' },
    { key: 'cash', icon: 'cash-outline' },
    { key: 'credit', icon: 'card-outline' },
    { key: 'debit', icon: 'card-outline' },
  ];

  const getMethodLabel = (method: string) => {
    const key = method.charAt(0).toUpperCase() + method.slice(1);
    return t(`createOrder.paymentMethod${key}`, { defaultValue: method });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title={isEditing ? t('createOrder.titleEdit') : t('createOrder.titleNew')}
        subtitle={t('createOrder.subtitle')}
        showBack
        onBack={() => navigation.goBack()}
      />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
          <Card style={isDelivered ? { ...styles.section, ...styles.readOnlySection } : styles.section}>
            <Text style={styles.sectionTitle}>{t('createOrder.clientSection')}</Text>
            <View>
              <Input
                label={t('createOrder.clientName')}
                placeholder={t('createOrder.clientPlaceholder')}
                value={clientName}
                onChangeText={(text) => {
                  setClientName(text);
                  setShowClientSuggestions(true);
                }}
                error={errors.clientName}
                editable={!isDelivered}
              />
              {!isDelivered && showClientSuggestions && filteredClients.length > 0 && (
                <View style={styles.suggestions}>
                  {filteredClients.slice(0, 5).map(client => (
                    <TouchableOpacity
                      key={client.id}
                      onPress={() => selectClient(client)}
                      style={styles.suggestionItem}
                    >
                      <Ionicons name="person-outline" size={16} color={colors.textSecondary} />
                      <Text style={styles.suggestionText}>{client.name}</Text>
                      {client.phone && (
                        <Text style={styles.suggestionSub}>{client.phone}</Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
            <Input
              label={t('common.phone')}
              placeholder={t('createOrder.phonePlaceholder')}
              value={clientPhone}
              onChangeText={setClientPhone}
              keyboardType="phone-pad"
              maxLength={15}
              editable={!isDelivered}
            />
          </Card>

          <Card style={isDelivered ? { ...styles.section, ...styles.readOnlySection } : styles.section}>
            <Text style={styles.sectionTitle}>{t('createOrder.productSection')}</Text>
            <TouchableOpacity activeOpacity={0.7} onPress={() => { if (!isDelivered) setShowRecipePicker(true); }}>
              <View pointerEvents="none">
                <Input
                  label={t('createOrder.recipeLabel')}
                  placeholder={t('createOrder.recipePlaceholder')}
                  value={recipeName}
                  editable={false}
                  error={errors.recipeName}
                  rightElement={
                    <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
                  }
                />
              </View>
            </TouchableOpacity>
            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Input
                  label={t('createOrder.quantityLabel')}
                  placeholder="10"
                  value={quantity}
                  onChangeText={setQuantity}
                  keyboardType="number-pad"
                  error={errors.quantity}
                  editable={!isDelivered}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Input
                  label={t('createOrder.unitPriceLabel')}
                  placeholder="5,00"
                  value={unitPrice}
                  onChangeText={setUnitPrice}
                  keyboardType="decimal-pad"
                  suffix="R$"
                  error={errors.unitPrice}
                  editable={!isDelivered}
                />
              </View>
            </View>
            {totalPrice > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>{t('common.total')}</Text>
                <Text style={styles.totalValue}>{formatCurrency(totalPrice)}</Text>
              </View>
            )}
          </Card>

          <Card style={isDelivered ? { ...styles.section, ...styles.readOnlySection } : styles.section}>
            <Text style={styles.sectionTitle}>{t('createOrder.deliverySection')}</Text>
            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Input
                  label={t('createOrder.deliveryDate')}
                  placeholder="15-01-2025"
                  value={deliveryDate}
                  onChangeText={(text) => {
                    const nums = text.replace(/\D/g, '').slice(0, 8);
                    let masked = '';
                    if (nums.length > 4) {
                      masked = `${nums.slice(0, 2)}-${nums.slice(2, 4)}-${nums.slice(4)}`;
                    } else if (nums.length > 2) {
                      masked = `${nums.slice(0, 2)}-${nums.slice(2)}`;
                    } else {
                      masked = nums;
                    }
                    setDeliveryDate(masked);
                  }}
                  keyboardType="number-pad"
                  maxLength={10}
                  error={errors.deliveryDate}
                  editable={!isDelivered}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Input
                  label={t('createOrder.time')}
                  placeholder="14:00"
                  value={deliveryTime}
                  onChangeText={(text) => {
                    const nums = text.replace(/\D/g, '').slice(0, 4);
                    let masked = '';
                    if (nums.length > 2) {
                      masked = `${nums.slice(0, 2)}:${nums.slice(2)}`;
                    } else {
                      masked = nums;
                    }
                    setDeliveryTime(masked);
                  }}
                  keyboardType="number-pad"
                  maxLength={5}
                  editable={!isDelivered}
                />
              </View>
            </View>
          </Card>

          <Card style={isDelivered ? { ...styles.section, ...styles.readOnlySection } : styles.section}>
            <Text style={styles.sectionTitle}>{t('createOrder.statusSection')}</Text>
            <View style={styles.statusGrid}>
              {STATUS_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt.key}
                  onPress={() => { if (!isDelivered) setStatus(opt.key); }}
                  disabled={isDelivered}
                  style={[
                    styles.statusCard,
                    status === opt.key && { borderColor: opt.color, backgroundColor: opt.color + '15' },
                    isDelivered && status !== opt.key && { opacity: 0.4 },
                  ]}
                  activeOpacity={isDelivered ? 1 : 0.7}
                >
                  <View style={[styles.statusDot, { backgroundColor: opt.color }]} />
                  <Text
                    style={[
                      styles.statusLabel,
                      status === opt.key && { color: opt.color, fontWeight: '700' },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Card>

          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>{t('createOrder.paymentSection')}</Text>
            <Text style={styles.sectionSubtitle}>{t('createOrder.paymentHint')}</Text>

            {payments.length > 0 && (
              <View style={styles.paymentsList}>
                {payments.map(payment => (
                  <View key={payment.id} style={styles.paymentItem}>
                    <View style={styles.paymentItemLeft}>
                      <Ionicons
                        name={PAYMENT_METHODS.find(m => m.key === payment.method)?.icon || 'cash-outline'}
                        size={16}
                        color={colors.primary}
                      />
                      <View>
                        <Text style={styles.paymentItemAmount}>{formatCurrency(payment.amount)}</Text>
                        <Text style={styles.paymentItemMethod}>{getMethodLabel(payment.method)}</Text>
                      </View>
                    </View>
                    {!isDelivered && (
                      <TouchableOpacity onPress={() => handleRemovePayment(payment.id)} activeOpacity={0.7}>
                        <Ionicons name="close-circle" size={20} color={colors.error || '#F44336'} />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>
            )}

            {totalPrice > 0 && totalPaid > 0 && (
              <View style={[styles.remainingRow, remaining === 0 && styles.settledRow]}>
                <Ionicons
                  name={remaining === 0 ? 'checkmark-circle' : 'wallet-outline'}
                  size={16}
                  color={remaining === 0 ? colors.success || '#4CAF50' : colors.warning}
                />
                <Text style={[styles.remainingText, remaining === 0 && { color: colors.success || '#4CAF50' }]}>
                  {remaining > 0
                    ? t('createOrder.amountRemaining', { amount: formatCurrency(remaining) })
                    : t('createOrder.allPaid')}
                </Text>
              </View>
            )}

            {(!totalPrice || remaining > 0) && !showAddPayment && (
              <TouchableOpacity
                style={styles.addPaymentBtn}
                onPress={() => setShowAddPayment(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
                <Text style={styles.addPaymentText}>{t('createOrder.addPayment')}</Text>
              </TouchableOpacity>
            )}

            {showAddPayment && (
              <View style={styles.addPaymentForm}>
                <Input
                  label={t('createOrder.paymentAmount')}
                  placeholder="0,00"
                  value={newPaymentAmount}
                  onChangeText={setNewPaymentAmount}
                  keyboardType="decimal-pad"
                  suffix="R$"
                />
                <Text style={[styles.inputLabel, { marginTop: 8 }]}>{t('createOrder.paymentMethodLabel')}</Text>
                <View style={styles.paymentMethodGrid}>
                  {PAYMENT_METHODS.map(({ key, icon }) => {
                    const selected = newPaymentMethod === key;
                    return (
                      <TouchableOpacity
                        key={key}
                        onPress={() => setNewPaymentMethod(key)}
                        style={[
                          styles.paymentMethodBtn,
                          selected && { borderColor: colors.primary, backgroundColor: colors.primary + '15' },
                        ]}
                        activeOpacity={0.7}
                      >
                        <Ionicons name={icon} size={16} color={selected ? colors.primary : colors.textMuted} />
                        <Text style={[styles.paymentMethodText, selected && { color: colors.primary, fontWeight: '700' }]}>
                          {getMethodLabel(key)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <View style={styles.addPaymentActions}>
                  <TouchableOpacity
                    onPress={() => { setShowAddPayment(false); setNewPaymentAmount(''); }}
                    style={styles.addPaymentCancel}
                  >
                    <Text style={styles.addPaymentCancelText}>{t('common.cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleAddPayment} style={styles.addPaymentConfirm}>
                    <Ionicons name="checkmark" size={18} color="#fff" />
                    <Text style={styles.addPaymentConfirmText}>{t('createOrder.addPayment')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </Card>

          <Card style={isDelivered ? { ...styles.section, ...styles.readOnlySection } : styles.section}>
            <Text style={styles.sectionTitle}>{t('createOrder.notesSection')}</Text>
            <Input
              placeholder={t('createOrder.notesPlaceholder')}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              editable={!isDelivered}
            />
          </Card>

          {!isDelivered && (
            <Button
              title={isEditing ? t('createOrder.updateButton') : t('createOrder.saveButton')}
              onPress={handleSave}
              loading={loading}
              size="lg"
              style={styles.saveButton}
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={showRecipePicker} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('createOrder.selectRecipe')}</Text>
            <TouchableOpacity onPress={() => setShowRecipePicker(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={recipes}
            keyExtractor={item => item.id}
            contentContainerStyle={{ padding: 20 }}
            renderItem={({ item }) => (
              <TouchableOpacity onPress={() => selectRecipe(item)} activeOpacity={0.8}>
                <Card style={styles.recipeCard}>
                  <View>
                    <Text style={styles.recipeCardName}>{item.name}</Text>
                    <Text style={styles.recipeCardInfo}>
                      {t('createOrder.recipeYield', { yield: item.yield, count: item.ingredients.length })}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                </Card>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <Text style={styles.emptyText}>{t('createOrder.noRecipes')}</Text>
            }
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, padding: 20 },
  section: { marginBottom: 16 },
  readOnlySection: { opacity: 0.5, backgroundColor: '#F5F5F5' },
  sectionTitle: { ...typography.h4, color: colors.text, marginBottom: 16 },
  sectionSubtitle: { ...typography.caption, color: colors.textSecondary, marginTop: -12, marginBottom: 12 },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.primaryLight,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  infoText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 18,
  },
  paymentsList: { gap: 8, marginBottom: 8 },
  paymentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
  },
  paymentItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  paymentItemAmount: { ...typography.body, color: colors.text, fontWeight: '700' },
  paymentItemMethod: { ...typography.caption, color: colors.textSecondary },
  remainingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF8E1',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  settledRow: { backgroundColor: '#E8F5E9' },
  remainingText: { ...typography.body, color: '#F57F17', fontWeight: '600' },
  addPaymentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderStyle: 'dashed',
  },
  addPaymentText: { ...typography.body, color: colors.primary, fontWeight: '600' },
  addPaymentForm: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    marginTop: 10,
  },
  addPaymentActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 12 },
  addPaymentCancel: { paddingVertical: 8, paddingHorizontal: 16 },
  addPaymentCancelText: { ...typography.body, color: colors.textSecondary },
  addPaymentConfirm: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  addPaymentConfirmText: { ...typography.body, color: '#fff', fontWeight: '600' },
  row: { flexDirection: 'row' },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.cream,
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
  },
  totalLabel: { ...typography.body, color: colors.textSecondary, fontWeight: '600' },
  totalValue: { ...typography.h3, color: colors.primary },
  statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusCard: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusLabel: { ...typography.bodySmall, color: colors.textSecondary },
  inputLabel: { ...typography.bodySmall, color: colors.textSecondary, fontWeight: '600', marginBottom: 6 },
  paymentMethodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  paymentMethodBtn: {
    flexBasis: '30%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  paymentMethodText: { fontSize: 12, color: colors.textMuted, fontWeight: '500' },
  saveButton: { marginBottom: 32 },
  suggestions: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    marginTop: -8,
    marginBottom: 8,
    overflow: 'hidden',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  suggestionText: { ...typography.body, color: colors.text, flex: 1 },
  suggestionSub: { ...typography.caption, color: colors.textMuted },
  modalContainer: { flex: 1, backgroundColor: colors.background },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  modalTitle: { ...typography.h3, color: colors.text },
  recipeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  recipeCardName: { ...typography.body, color: colors.text, fontWeight: '600' },
  recipeCardInfo: { ...typography.bodySmall, color: colors.textSecondary, marginTop: 2 },
  emptyText: { ...typography.body, color: colors.textMuted, textAlign: 'center', marginTop: 32 },
});
