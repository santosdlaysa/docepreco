import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Order, OrderStatus } from '../../domain/entities/Order';
import { orderStorage } from '../../data/storage/orderStorage';
import { saleApi } from '../../data/api/saleApi';
import { isDemoMode } from '../../data/demo/demoMode';
import { demoSaleApi } from '../../data/demo/demoApi';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { Card } from '../components/Card';
import { Header } from '../components/Header';
import { usePaywall } from '../premium/usePaywall';
import { useToast } from '../context/ToastContext';
import { useTranslation } from 'react-i18next';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const formatCurrency = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

type Section = { title: string; data: Order[] };

export const OrdersScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { guardScreen } = usePaywall();
  const { showToast } = useToast();
  const { t } = useTranslation();
  const sApi = isDemoMode() ? demoSaleApi : saleApi;

  const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }> = {
    pending: { label: t('orders.pending'), color: '#FF9800', icon: 'time-outline' },
    in_progress: { label: t('orders.inProgress'), color: '#2196F3', icon: 'construct-outline' },
    done: { label: t('orders.done'), color: '#4CAF50', icon: 'checkmark-circle-outline' },
    delivered: { label: t('orders.delivered'), color: '#9E9E9E', icon: 'gift-outline' },
  };

  const FILTER_OPTIONS: { key: OrderStatus | 'all'; label: string }[] = [
    { key: 'all', label: t('orders.all') },
    { key: 'pending', label: t('orders.pending') },
    { key: 'in_progress', label: t('orders.production') },
    { key: 'done', label: t('orders.done') },
    { key: 'delivered', label: t('orders.delivered') },
  ];

  const formatDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.getTime() === today.getTime()) return t('common.today');
    if (date.getTime() === tomorrow.getTime()) return t('common.tomorrow');
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  };
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<OrderStatus | 'all'>('all');
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (!guardScreen('ordersManagement')) {
        return;
      }
      loadOrders();
    }, [])
  );

  const loadOrders = async () => {
    try {
      const data = await orderStorage.getAll();
      setOrders(data);
    } finally {
      setLoading(false);
    }
  };

  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter);

  const sections: Section[] = (() => {
    const map = new Map<string, Order[]>();
    const sorted = [...filtered].sort((a, b) => a.deliveryDate.localeCompare(b.deliveryDate));
    for (const order of sorted) {
      const key = order.deliveryDate;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(order);
    }
    return Array.from(map.entries()).map(([date, data]) => ({
      title: formatDate(date),
      data,
    }));
  })();

  const handleDelete = (order: Order) => {
    Alert.alert(t('orders.deleteTitle'), t('orders.deleteMessage', { recipe: order.recipeName, client: order.clientName }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          await orderStorage.delete(order.id);
          loadOrders();
        },
      },
    ]);
  };

  const registerSale = async (order: Order) => {
    try {
      await sApi.create({
        recipeId: order.recipeId || '',
        quantitySold: order.quantity,
        salePrice: order.unitPrice,
        saleDate: new Date().toISOString().split('T')[0],
        notes: t('orders.orderFrom', { name: order.clientName }),
      });
      showToast(t('orders.saleRegistered'), 'success');
    } catch {
      showToast(t('orders.saleError'), 'warning');
    }
  };

  const changeStatus = async (order: Order, newStatus: OrderStatus) => {
    if (newStatus === 'delivered') {
      Alert.alert(
        t('orders.paymentTitle'),
        t('orders.paymentMessage', { client: order.clientName }),
        [
          {
            text: t('orders.notYet'),
            style: 'cancel',
            onPress: async () => {
              await orderStorage.update(order.id, { status: 'delivered', paid: false });
              loadOrders();
            },
          },
          {
            text: t('orders.yesPaid'),
            onPress: async () => {
              await orderStorage.update(order.id, { status: 'delivered', paid: true });
              await registerSale(order);
              loadOrders();
            },
          },
        ],
      );
      return;
    }
    await orderStorage.update(order.id, { status: newStatus });
    loadOrders();
  };

  const STATUS_LIST: OrderStatus[] = ['pending', 'in_progress', 'done', 'delivered'];

  const renderOrder = ({ item }: { item: Order }) => {
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => navigation.navigate('EditOrder', { orderId: item.id })}
        onLongPress={() => handleDelete(item)}
      >
        <Card style={styles.orderCard}>
          <View style={styles.orderHeader}>
            <View style={styles.orderInfo}>
              <Text style={styles.recipeName}>{item.recipeName}</Text>
              <Text style={styles.clientName}>
                <Ionicons name="person-outline" size={13} color={colors.textSecondary} />{' '}
                {item.clientName}
              </Text>
            </View>
          </View>
          <View style={styles.orderDetails}>
            <Text style={styles.orderDetail}>
              {item.quantity}x {formatCurrency(item.unitPrice)}
            </Text>
            <View style={styles.orderTotalRow}>
              {item.status === 'delivered' && (
                <TouchableOpacity
                  onPress={async () => {
                    const wasPaid = item.paid;
                    await orderStorage.update(item.id, { paid: !wasPaid });
                    if (!wasPaid) await registerSale(item);
                    loadOrders();
                  }}
                  style={[styles.paidBadge, item.paid ? styles.paidBadgeYes : styles.paidBadgeNo]}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={item.paid ? 'checkmark-circle' : 'alert-circle-outline'}
                    size={13}
                    color={item.paid ? '#fff' : '#fff'}
                  />
                  <Text style={styles.paidBadgeText}>
                    {item.paid ? t('orders.paid') : t('orders.notPaid')}
                  </Text>
                </TouchableOpacity>
              )}
              <Text style={styles.orderTotal}>{formatCurrency(item.totalPrice)}</Text>
            </View>
          </View>
          {(item.paidAmount != null && item.paidAmount > 0) && (
            <View style={styles.paidInfoRow}>
              <Ionicons name="wallet-outline" size={13} color={item.paidAmount >= item.totalPrice ? colors.success : colors.warning} />
              <Text style={[styles.paidInfoText, { color: item.paidAmount >= item.totalPrice ? colors.success : colors.warning }]}>
                {t('orders.paidAmount', { amount: formatCurrency(item.paidAmount) })}
                {item.paidAmount < item.totalPrice
                  ? ` • ${t('orders.remaining', { amount: formatCurrency(item.totalPrice - item.paidAmount) })}`
                  : ` • ${t('orders.settled')}`}
              </Text>
            </View>
          )}
          {item.paymentMethod && (
            <View style={styles.paymentMethodRow}>
              <Ionicons name="card-outline" size={13} color={colors.textSecondary} />
              <Text style={styles.paymentMethodText}>
                {t(`orders.paymentMethod${item.paymentMethod.charAt(0).toUpperCase() + item.paymentMethod.slice(1)}`)}
              </Text>
            </View>
          )}
          {item.deliveryTime && (
            <Text style={styles.deliveryTime}>
              <Ionicons name="time-outline" size={12} color={colors.textMuted} /> {item.deliveryTime}
            </Text>
          )}
          {item.notes ? <Text style={styles.notes} numberOfLines={1}>{item.notes}</Text> : null}
          <View style={styles.statusRow}>
            {STATUS_LIST.map((s) => {
              const cfg = STATUS_CONFIG[s];
              const active = item.status === s;
              return (
                <TouchableOpacity
                  key={s}
                  onPress={() => changeStatus(item, s)}
                  style={[
                    styles.statusBtn,
                    active && { backgroundColor: cfg.color + '20', borderColor: cfg.color },
                  ]}
                  activeOpacity={0.7}
                >
                  <Ionicons name={cfg.icon} size={14} color={active ? cfg.color : colors.textMuted} />
                  <Text style={[styles.statusBtnText, active && { color: cfg.color, fontWeight: '700' }]}>
                    {cfg.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Header title={t('orders.title')} subtitle={t('orders.subtitle')} showBack onBack={() => navigation.goBack()} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title={t('orders.title')}
        subtitle={t('orders.subtitle')}
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity
            onPress={() => navigation.navigate('CreateOrder')}
            style={styles.addBtn}
          >
            <Ionicons name="add" size={22} color="#fff" />
          </TouchableOpacity>
        }
      />
      <View style={styles.filterRow}>
        {FILTER_OPTIONS.map(opt => (
          <TouchableOpacity
            key={opt.key}
            onPress={() => setFilter(opt.key)}
            style={[styles.filterPill, filter === opt.key && styles.filterPillActive]}
          >
            <Text style={[styles.filterText, filter === opt.key && styles.filterTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <SectionList
        sections={sections}
        keyExtractor={item => item.id}
        renderItem={renderOrder}
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionHeader}>{section.title}</Text>
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="calendar-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>{t('orders.emptyText')}</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('CreateOrder')}
              style={styles.emptyCta}
            >
              <Text style={styles.emptyCtaText}>{t('orders.createOrder')}</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: { ...typography.caption, color: colors.textSecondary, fontWeight: '600' },
  filterTextActive: { color: '#fff' },
  list: { paddingHorizontal: 20, paddingBottom: 32 },
  sectionHeader: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  orderCard: { marginBottom: 10 },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  orderInfo: { flex: 1, marginRight: 8 },
  recipeName: { ...typography.h4, color: colors.text },
  clientName: { ...typography.bodySmall, color: colors.textSecondary, marginTop: 2 },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  statusBtn: {
    flexBasis: '47%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  statusBtnText: { fontSize: 11, color: colors.textMuted, fontWeight: '500' },
  orderDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderDetail: { ...typography.bodySmall, color: colors.textSecondary },
  orderTotalRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  orderTotal: { ...typography.h4, color: colors.primary },
  paidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  paidBadgeYes: { backgroundColor: '#4CAF50' },
  paidBadgeNo: { backgroundColor: '#F44336' },
  paidBadgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  paidInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  paidInfoText: { ...typography.caption, fontWeight: '600' },
  paymentMethodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  paymentMethodText: { ...typography.caption, color: colors.textSecondary },
  deliveryTime: { ...typography.caption, color: colors.textMuted, marginTop: 4 },
  notes: { ...typography.caption, color: colors.textMuted, marginTop: 4, fontStyle: 'italic' },
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
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { ...typography.body, color: colors.textMuted },
  emptyCta: {
    marginTop: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  emptyCtaText: { ...typography.button, color: '#fff' },
});
