import { colors } from '../theme/colors';
import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Share,
  ActivityIndicator,
  Switch,
  Image,
  Modal,
  Linking,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Clipboard from 'expo-clipboard';
import { RootStackParamList } from '../navigation/types';
import { StoreAddon, StoreProduct, StoreSettings } from '../../domain/entities/StoreProduct';
import { Order, OrderStatus } from '../../domain/entities/Order';
import { storeApi } from '../../data/api/storeApi';
import { orderApi } from '../../data/api/orderApi';
import { saleApi } from '../../data/api/saleApi';
import { demoStoreApi, demoSaleApi } from '../../data/demo/demoApi';
import { isDemoMode } from '../../data/demo/demoMode';
import { PaymentMethodType } from '../../domain/entities/Order';
import { useToast } from '../context/ToastContext';
import { usePaywall } from '../premium/usePaywall';
import { Skeleton } from '../components/Skeleton';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'Store'>;
type StoreTab = 'catalog' | 'orders' | 'settings';

const ORDER_STATUS_META: Record<OrderStatus, { label: string; color: string; bg: string }> = {
  draft:       { label: 'Rascunho',    color: colors.textSecondary, bg: colors.grayBg },
  pending:     { label: 'Pendente',    color: colors.amberDark, bg: colors.amberBg },
  in_progress: { label: 'Em preparo',  color: colors.purple, bg: colors.purpleBg },
  done:        { label: 'Saiu para entrega', color: '#BC2A6C', bg: colors.pinkBg },
  delivered:   { label: 'Entregue',    color: '#2E9E5B', bg: colors.greenBg },
  cancelled:   { label: 'Cancelado',   color: colors.redDark, bg: '#FBE4E0' },
};

// Etapas do fluxo de um pedido e a ação que leva à próxima etapa.
const ORDER_STAGES: OrderStatus[] = ['pending', 'in_progress', 'done', 'delivered'];
const NEXT_ACTION: Partial<Record<OrderStatus, { next: OrderStatus; label: string; icon: keyof typeof Ionicons.glyphMap }>> = {
  pending:     { next: 'in_progress', label: 'Confirmar pedido',      icon: 'checkmark-circle-outline' },
  in_progress: { next: 'done',        label: 'Marcar como pronto',    icon: 'cube-outline' },
  done:        { next: 'delivered',   label: 'Marcar como entregue',  icon: 'bag-check-outline' },
};

const INK = colors.text;
const INK2 = colors.textSecondary;
const INK3 = colors.textMuted;
const PINK = colors.primary;
const PINK_LIGHT = colors.pinkBright;
const GREEN = colors.green;
const CREAM = colors.pinkBg3;
const SHADOW = {
  shadowColor: INK,
  shadowOffset: { width: 0, height: 2 } as const,
  shadowOpacity: 0.07,
  shadowRadius: 8,
  elevation: 3,
};

const fmtCurrency = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const PAYMENT_METHODS: { key: PaymentMethodType; icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
  { key: 'pix',    icon: 'qr-code-outline', label: 'Pix' },
  { key: 'cash',   icon: 'cash-outline',    label: 'Dinheiro' },
  { key: 'credit', icon: 'card-outline',    label: 'Crédito' },
  { key: 'debit',  icon: 'card-outline',    label: 'Débito' },
];

const num = (v: string) => parseFloat(String(v).replace(/\./g, '').replace(',', '.')) || 0;

const SettingsRow: React.FC<{
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  last?: boolean;
}> = ({ icon, label, value, last }) => (
  <View style={[st.settingsRow, last && { borderBottomWidth: 0 }]}>
    <View style={st.settingsRowLeft}>
      <Ionicons name={icon} size={17} color={PINK} />
      <Text style={st.settingsLabel}>{label}</Text>
    </View>
    <Text style={st.settingsValue} numberOfLines={1}>{value}</Text>
  </View>
);

// Agrupa os produtos por categoria para o catálogo. Categorias em ordem
// alfabética, produtos sem categoria em "Outros" no fim. Só mostra os cabeçalhos
// quando existe mais de um grupo (com categoria única não polui a tela).
const SEM_CATEGORIA = 'Outros';
function groupProductsByCategory(
  products: StoreProduct[]
): { category: string; items: StoreProduct[]; showHeader: boolean }[] {
  const map = new Map<string, StoreProduct[]>();
  for (const p of products) {
    const cat = (p.category ?? '').trim() || SEM_CATEGORIA;
    if (!map.has(cat)) map.set(cat, []);
    map.get(cat)!.push(p);
  }
  const cats = Array.from(map.keys()).sort((a, b) => {
    if (a === SEM_CATEGORIA) return 1;
    if (b === SEM_CATEGORIA) return -1;
    return a.localeCompare(b, 'pt-BR');
  });
  const showHeader = cats.length > 1;
  return cats.map(category => ({ category, items: map.get(category)!, showHeader }));
}

export const StoreScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { guardMaster } = usePaywall();
  const { showToast } = useToast();

  const sApi = isDemoMode() ? demoStoreApi : storeApi;
  const salApi = isDemoMode() ? demoSaleApi : saleApi;

  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [addons, setAddons] = useState<StoreAddon[]>([]);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  // Modal de cadastro/edição de item adicional
  const [addonModal, setAddonModal] = useState<{ id?: string; name: string; price: string } | null>(null);
  const [savingAddon, setSavingAddon] = useState(false);
  const [togglingAddon, setTogglingAddon] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [backendReady, setBackendReady] = useState(true);
  const [togglingActive, setTogglingActive] = useState(false);
  const [togglingProduct, setTogglingProduct] = useState<string | null>(null);
  const [tab, setTab] = useState<StoreTab>(route.params?.initialTab ?? 'catalog');
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [deliveryOrder, setDeliveryOrder] = useState<Order | null>(null);
  const [deliveryModalMethod, setDeliveryModalMethod] = useState<PaymentMethodType>('pix');
  const [deliveryModalAmount, setDeliveryModalAmount] = useState('');
  const [deliveryModalLoading, setDeliveryModalLoading] = useState(false);

  useFocusEffect(useCallback(() => {
    if (!guardMaster()) return;
    load();
    if (tab === 'orders') loadOrders();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []));

  const loadOrders = async () => {
    setOrdersLoading(true);
    try {
      const all = await orderApi.getAll();
      // Pedido mais recente primeiro — a aba funciona como caixa de entrada de pedidos online
      setOrders(all.filter(o => o.source === 'online').sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    } catch {
      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  };

  const selectTab = (next: StoreTab) => {
    setTab(next);
    if (next === 'orders') loadOrders();
  };

  // Notificação de pedido pode chegar com a tela já aberta → troca para a aba Pedidos.
  useEffect(() => {
    if (route.params?.initialTab) selectTab(route.params.initialTab);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.params?.initialTab]);

  const changeOrderStatus = async (order: Order, newStatus: OrderStatus) => {
    setUpdatingStatus(true);
    try {
      await orderApi.update(order.id, { status: newStatus });
      setSelectedOrder(prev => (prev && prev.id === order.id ? { ...prev, status: newStatus } : prev));
      setOrders(prev => prev.map(o => (o.id === order.id ? { ...o, status: newStatus } : o)));
      const meta = ORDER_STATUS_META[newStatus];
      showToast(`Pedido: ${meta.label.toLowerCase()}`, 'success');
    } catch {
      showToast('Erro ao atualizar o pedido', 'error');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const openDeliveryModal = (order: Order) => {
    const paid = order.paidAmount ?? 0;
    const remaining = Math.max(order.totalPrice - paid, 0);
    setDeliveryModalMethod(order.paymentMethod ?? 'pix');
    setDeliveryModalAmount(remaining > 0 ? String(remaining).replace('.', ',') : '');
    // Dois <Modal> visíveis ao mesmo tempo não são apresentados na nova arquitetura:
    // fecha o modal de detalhes e só abre o de entrega após a animação de saída.
    setSelectedOrder(null);
    setTimeout(() => setDeliveryOrder(order), 350);
  };

  const handleDeliveryConfirm = async () => {
    if (!deliveryOrder) return;
    const paid = deliveryOrder.paidAmount ?? 0;
    const remaining = Math.max(deliveryOrder.totalPrice - paid, 0);
    const modalAmount = num(deliveryModalAmount);
    if (remaining > 0 && modalAmount <= 0) {
      showToast('Informe o valor recebido', 'warning');
      return;
    }
    setDeliveryModalLoading(true);
    try {
      const existingPayments = deliveryOrder.payments ?? [];
      const newPayments = remaining > 0
        ? [...existingPayments, { id: Date.now().toString(36), amount: modalAmount, method: deliveryModalMethod, date: new Date().toISOString().split('T')[0] }]
        : existingPayments;
      const totalPaid = newPayments.reduce((s, p) => s + p.amount, 0);
      await orderApi.update(deliveryOrder.id, {
        status: 'delivered',
        paid: true,
        paidAmount: totalPaid,
        payments: newPayments,
      });
      // Registrar venda
      try {
        const firstItem = deliveryOrder.items?.[0];
        await salApi.create({
          recipeId: firstItem?.recipeId ?? '',
          quantitySold: firstItem?.quantity ?? deliveryOrder.quantity,
          salePrice: firstItem?.unitPrice ?? deliveryOrder.unitPrice,
          saleDate: new Date().toISOString().split('T')[0],
          notes: `Encomenda de ${deliveryOrder.clientName}`,
        });
      } catch { /* sale registration is best-effort */ }
      setOrders(prev => prev.map(o => o.id === deliveryOrder.id ? { ...o, status: 'delivered' } : o));
      setSelectedOrder(prev => prev?.id === deliveryOrder.id ? { ...prev, status: 'delivered' } : prev);
      setDeliveryOrder(null);
      showToast('Entregue e venda registrada!', 'success');
    } catch {
      showToast('Erro ao finalizar entrega', 'error');
    } finally {
      setDeliveryModalLoading(false);
    }
  };

  const confirmCancelOrder = (order: Order) => {
    Alert.alert('Recusar pedido?', `O pedido de "${order.clientName}" será marcado como cancelado.`, [
      { text: 'Voltar', style: 'cancel' },
      { text: 'Recusar', style: 'destructive', onPress: () => changeOrderStatus(order, 'cancelled') },
    ]);
  };

  const load = async () => {
    setLoading(true);
    try {
      const [s, p, a] = await Promise.all([sApi.getSettings(), sApi.getProducts(), sApi.getAddons()]);
      setSettings(s);
      setProducts(p);
      setAddons(a);
      setBackendReady(true);
    } catch {
      setBackendReady(false);
    } finally {
      setLoading(false);
    }
  };

  const toggleStoreActive = async (value: boolean) => {
    if (!settings) return;
    setTogglingActive(true);
    try {
      const updated = await sApi.updateSettings({ active: value });
      setSettings(updated);
    } catch {
      showToast('Erro ao atualizar status da loja', 'error');
    } finally {
      setTogglingActive(false);
    }
  };

  const toggleProductAvailable = async (product: StoreProduct) => {
    setTogglingProduct(product.id);
    try {
      const updated = await sApi.updateProduct(product.id, { available: !product.available });
      setProducts(prev => prev.map(p => (p.id === updated.id ? updated : p)));
    } catch {
      showToast('Erro ao atualizar produto', 'error');
    } finally {
      setTogglingProduct(null);
    }
  };

  const handleCopyLink = async () => {
    if (!settings?.storeLink) return;
    await Clipboard.setStringAsync(settings.storeLink);
    showToast('Link copiado!', 'success');
  };

  const handleShare = async () => {
    if (!settings?.storeLink) return;
    await Share.share({
      message: `Faça seu pedido na minha loja: ${settings.storeLink}`,
      url: settings.storeLink,
    });
  };

  const handleSaveAddon = async () => {
    if (!addonModal) return;
    const name = addonModal.name.trim();
    const price = num(addonModal.price);
    if (!name) {
      showToast('Informe o nome do adicional', 'warning');
      return;
    }
    if (price < 0) {
      showToast('Preço inválido', 'warning');
      return;
    }
    setSavingAddon(true);
    try {
      if (addonModal.id) {
        const updated = await sApi.updateAddon(addonModal.id, { name, price });
        setAddons(prev => prev.map(a => (a.id === updated.id ? updated : a)));
        showToast('Adicional atualizado', 'success');
      } else {
        const created = await sApi.createAddon({ name, price });
        setAddons(prev => [...prev, created]);
        showToast('Adicional criado', 'success');
      }
      setAddonModal(null);
    } catch {
      showToast('Erro ao salvar adicional', 'error');
    } finally {
      setSavingAddon(false);
    }
  };

  const toggleAddonAvailable = async (addon: StoreAddon) => {
    setTogglingAddon(addon.id);
    try {
      const updated = await sApi.updateAddon(addon.id, { available: !addon.available });
      setAddons(prev => prev.map(a => (a.id === updated.id ? updated : a)));
    } catch {
      showToast('Erro ao atualizar adicional', 'error');
    } finally {
      setTogglingAddon(null);
    }
  };

  const handleDeleteAddon = (addon: StoreAddon) => {
    Alert.alert('Excluir adicional?', `"${addon.name}" não aparecerá mais para os clientes.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir', style: 'destructive', onPress: async () => {
          try {
            await sApi.deleteAddon(addon.id);
            setAddons(prev => prev.filter(a => a.id !== addon.id));
            showToast('Adicional removido', 'success');
          } catch {
            showToast('Erro ao excluir adicional', 'error');
          }
        },
      },
    ]);
  };

  const handleDeleteProduct = (product: StoreProduct) => {
    Alert.alert('Excluir produto?', `"${product.name}" será removido do catálogo.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir', style: 'destructive', onPress: async () => {
          try {
            await sApi.deleteProduct(product.id);
            setProducts(prev => prev.filter(p => p.id !== product.id));
            showToast('Produto removido', 'success');
          } catch {
            showToast('Erro ao excluir produto', 'error');
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={st.safe}>
        <View style={st.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={st.backBtn}>
            <Ionicons name="arrow-back" size={20} color={INK} />
          </TouchableOpacity>
          <Text style={st.headerTitle}>Minha Loja</Text>
          <View style={{ width: 38 }} />
        </View>
        <View style={{ padding: 18, gap: 12 }}>
          <Skeleton width="100%" height={120} borderRadius={18} />
          <Skeleton width="100%" height={80} borderRadius={18} />
          {[0, 1, 2].map(i => <Skeleton key={i} width="100%" height={80} borderRadius={14} />)}
        </View>
      </SafeAreaView>
    );
  }

  if (!backendReady) {
    return (
      <SafeAreaView style={st.safe}>
        <View style={st.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={st.backBtn}>
            <Ionicons name="arrow-back" size={20} color={INK} />
          </TouchableOpacity>
          <Text style={st.headerTitle}>Minha Loja</Text>
          <View style={{ width: 38 }} />
        </View>
        <View style={st.pendingWrap}>
          <LinearGradient colors={[colors.pinkBg, '#FFD0E4']} style={st.pendingCard}>
            <Ionicons name="storefront-outline" size={48} color={PINK} />
            <Text style={st.pendingTitle}>Loja em ativação</Text>
            <Text style={st.pendingDesc}>
              Sua loja online está sendo configurada. Em breve você poderá cadastrar produtos e receber pedidos pelo link.
            </Text>
            <TouchableOpacity onPress={load} style={st.retryBtn} activeOpacity={0.7}>
              <Ionicons name="refresh-outline" size={16} color={PINK} />
              <Text style={st.retryBtnText}>Tentar novamente</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </SafeAreaView>
    );
  }

  const activeCount = products.filter(p => p.available).length;

  return (
    <SafeAreaView style={st.safe}>
      {/* ── Header ── */}
      <View style={st.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={st.backBtn}>
          <Ionicons name="arrow-back" size={20} color={INK} />
        </TouchableOpacity>
        <Text style={st.headerTitle}>Minha Loja</Text>
        <TouchableOpacity
          style={st.backBtn}
          onPress={() => navigation.navigate('StoreSettings')}
          activeOpacity={0.7}
        >
          <Ionicons name="settings-outline" size={20} color={INK} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() => { load(); loadOrders(); }}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >

        {/* ── Status card ── */}
        <LinearGradient
          colors={settings?.active ? [colors.pinkBg, '#FFD0E4'] : ['#FFF6FA', '#FFEDF4']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={st.statusCard}
        >
          <View style={st.statusRow}>
            <View style={st.statusIconBox}>
              <Ionicons name="storefront-outline" size={26} color={PINK} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={st.statusName} numberOfLines={1}>
                {settings?.storeName || 'Minha Loja'}
              </Text>
              <Text style={st.statusSub}>
                {settings?.active
                  ? `${activeCount} produto${activeCount !== 1 ? 's' : ''} disponível${activeCount !== 1 ? 'is' : ''}`
                  : 'Loja desativada'}
              </Text>
            </View>
            {togglingActive ? (
              <ActivityIndicator size="small" color={PINK} />
            ) : (
              <Switch
                value={settings?.active ?? false}
                onValueChange={toggleStoreActive}
              />
            )}
          </View>
          {settings?.active && settings?.isOpenNow !== false && (
            <TouchableOpacity
              style={st.statusBadge}
              onPress={() => navigation.navigate('Orders', { initialFilter: 'online' })}
              activeOpacity={0.7}
            >
              <View style={st.statusDot} />
              <Text style={st.statusBadgeText}>Loja online e recebendo pedidos</Text>
              <Ionicons name="chevron-forward" size={14} color={PINK} />
            </TouchableOpacity>
          )}
          {settings?.active && settings?.useBusinessHours && settings?.isOpenNow === false && (
            <View style={[st.statusBadge, { backgroundColor: 'rgba(0,0,0,0.06)' }]}>
              <Ionicons name="moon-outline" size={14} color={INK2} />
              <Text style={[st.statusBadgeText, { color: INK2 }]}>Fechada agora, fora do horário cadastrado</Text>
            </View>
          )}
        </LinearGradient>

        {/* ── Link card ── */}
        {settings?.storeLink ? (
          <View style={st.linkCard}>
            <View style={st.linkRow}>
              <Ionicons name="link-outline" size={18} color={INK2} />
              <Text style={st.linkText} numberOfLines={1}>{settings.storeLink}</Text>
            </View>
            <View style={st.linkBtns}>
              <TouchableOpacity style={st.linkBtn} onPress={handleCopyLink} activeOpacity={0.7}>
                <Ionicons name="copy-outline" size={16} color={PINK} />
                <Text style={[st.linkBtnText, { color: PINK }]}>Copiar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[st.linkBtn, { backgroundColor: PINK }]} onPress={handleShare} activeOpacity={0.8}>
                <Ionicons name="share-outline" size={16} color="#fff" />
                <Text style={[st.linkBtnText, { color: '#fff' }]}>Compartilhar</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={[st.linkCard, { alignItems: 'center', paddingVertical: 18 }]}>
            <Ionicons name="hourglass-outline" size={22} color={INK3} />
            <Text style={{ fontSize: 13, color: INK2, marginTop: 6, textAlign: 'center' }}>
              O link da sua loja será gerado pelo servidor.
            </Text>
          </View>
        )}

        {/* ── Menu de abas ── */}
        <View style={st.tabs}>
          {([
            { key: 'catalog',  label: 'Catálogo',   icon: 'bag-outline' },
            { key: 'orders',   label: 'Pedidos',    icon: 'receipt-outline' },
            { key: 'settings', label: 'Configuração', icon: 'settings-outline' },
          ] as const).map(t => {
            const active = tab === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                style={[st.tab, active && st.tabActive]}
                onPress={() => selectTab(t.key)}
                activeOpacity={0.8}
              >
                <Ionicons name={t.icon} size={17} color={active ? '#fff' : INK2} />
                <Text style={[st.tabText, active && st.tabTextActive]}>{t.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ══ CATÁLOGO ══ */}
        {tab === 'catalog' && (
          <>
            <View style={st.secRow}>
              <Text style={st.secTitle}>Produtos do catálogo</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('StoreProductForm')}
                style={st.addBtn}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={16} color="#fff" />
                <Text style={st.addBtnText}>Adicionar</Text>
              </TouchableOpacity>
            </View>

            {products.length === 0 ? (
              <View style={st.empty}>
                <View style={st.emptyIcon}>
                  <Ionicons name="bag-outline" size={34} color={PINK} />
                </View>
                <Text style={st.emptyTitle}>Nenhum produto ainda</Text>
                <Text style={st.emptyDesc}>
                  Adicione os produtos que você vende para que clientes possam fazer pedidos pelo link.
                </Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate('StoreProductForm')}
                  activeOpacity={0.85}
                >
                  <LinearGradient colors={[PINK_LIGHT, PINK]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.emptyBtn}>
                    <Text style={st.emptyBtnText}>Adicionar primeiro produto</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ gap: 10 }}>
                {groupProductsByCategory(products).map(group => (
                  <View key={group.category} style={{ gap: 10 }}>
                    {/* Cabeçalho da categoria só aparece quando há mais de um grupo */}
                    {group.showHeader && (
                      <Text style={st.catHeader}>{group.category}</Text>
                    )}
                    {group.items.map(product => (
                      <View key={product.id} style={st.productCard}>
                        <TouchableOpacity
                          style={st.productMain}
                          onPress={() => navigation.navigate('StoreProductForm', { productId: product.id })}
                          onLongPress={() => handleDeleteProduct(product)}
                          activeOpacity={0.85}
                        >
                          {product.photoUrl ? (
                            <Image source={{ uri: product.photoUrl }} style={st.productThumb} />
                          ) : (
                            <View style={[st.productThumb, st.productThumbPlaceholder]}>
                              <Ionicons name="image-outline" size={22} color={INK3} />
                            </View>
                          )}
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={st.productName} numberOfLines={1}>{product.name}</Text>
                            {product.description ? (
                              <Text style={st.productDesc} numberOfLines={1}>{product.description}</Text>
                            ) : null}
                            <Text style={st.productPrice}>{fmtCurrency(product.publicPrice)}</Text>
                          </View>
                        </TouchableOpacity>
                        <View style={st.productRight}>
                          <Switch
                            value={product.available}
                            onValueChange={() => toggleProductAvailable(product)}
                            disabled={togglingProduct === product.id}
                          />
                          <Text style={[st.productAvailLabel, { color: product.available ? GREEN : INK3 }]}>
                            {product.available ? 'Ativo' : 'Oculto'}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                ))}
                <Text style={st.hint}>Pressione e segure um produto para excluí-lo.</Text>
              </View>
            )}

            {/* ── Itens adicionais ── */}
            <View style={[st.secRow, { marginTop: 26 }]}>
              <Text style={st.secTitle}>Itens adicionais</Text>
              <TouchableOpacity
                onPress={() => setAddonModal({ name: '', price: '' })}
                style={st.addBtn}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={16} color="#fff" />
                <Text style={st.addBtnText}>Adicionar</Text>
              </TouchableOpacity>
            </View>
            <Text style={st.addonExplain}>
              Extras que o cliente pode incluir na hora de comprar (ex.: cobertura extra, embalagem para presente).
            </Text>

            {addons.length === 0 ? (
              <View style={[st.empty, { paddingTop: 20 }]}>
                <View style={[st.emptyIcon, { width: 56, height: 56, borderRadius: 18 }]}>
                  <Ionicons name="add-circle-outline" size={26} color={PINK} />
                </View>
                <Text style={st.emptyDesc}>
                  Nenhum adicional cadastrado. Eles aparecem na tela de detalhes de todos os produtos.
                </Text>
              </View>
            ) : (
              <View style={{ gap: 10 }}>
                {addons.map(addon => (
                  <View key={addon.id} style={st.productCard}>
                    <TouchableOpacity
                      style={st.productMain}
                      onPress={() => setAddonModal({ id: addon.id, name: addon.name, price: String(addon.price).replace('.', ',') })}
                      onLongPress={() => handleDeleteAddon(addon)}
                      activeOpacity={0.85}
                    >
                      <View style={[st.productThumb, st.productThumbPlaceholder, { width: 44, height: 44 }]}>
                        <Ionicons name="add-outline" size={20} color={PINK} />
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={st.productName} numberOfLines={1}>{addon.name}</Text>
                        <Text style={st.productPrice}>
                          {addon.price > 0 ? `+ ${fmtCurrency(addon.price)}` : 'Grátis'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                    <View style={st.productRight}>
                      <Switch
                        value={addon.available}
                        onValueChange={() => toggleAddonAvailable(addon)}
                        disabled={togglingAddon === addon.id}
                      />
                      <Text style={[st.productAvailLabel, { color: addon.available ? GREEN : INK3 }]}>
                        {addon.available ? 'Ativo' : 'Oculto'}
                      </Text>
                    </View>
                  </View>
                ))}
                <Text style={st.hint}>Toque para editar; pressione e segure para excluir.</Text>
              </View>
            )}
          </>
        )}

        {/* ══ PEDIDOS ══ */}
        {tab === 'orders' && (
          <>
            <View style={st.secRow}>
              <Text style={st.secTitle}>Pedidos online</Text>
              <TouchableOpacity onPress={loadOrders} style={st.refreshBtn} activeOpacity={0.7}>
                <Ionicons name="refresh-outline" size={16} color={PINK} />
              </TouchableOpacity>
            </View>

            {ordersLoading ? (
              <View style={{ gap: 10 }}>
                {[0, 1, 2].map(i => <Skeleton key={i} width="100%" height={92} borderRadius={14} />)}
              </View>
            ) : orders.length === 0 ? (
              <View style={st.empty}>
                <View style={st.emptyIcon}>
                  <Ionicons name="receipt-outline" size={34} color={PINK} />
                </View>
                <Text style={st.emptyTitle}>Nenhum pedido ainda</Text>
                <Text style={st.emptyDesc}>
                  Os pedidos feitos pelos clientes no link da sua loja aparecerão aqui.
                </Text>
              </View>
            ) : (
              <View style={{ gap: 10 }}>
                {orders.map(order => {
                  const meta = ORDER_STATUS_META[order.status];
                  const summary = order.items?.length
                    ? order.items.map(i => `${i.quantity}x ${i.recipeName}`).join(', ')
                    : `${order.quantity}x ${order.recipeName}`;
                  return (
                    <TouchableOpacity
                      key={order.id}
                      style={st.orderCard}
                      onPress={() => setSelectedOrder(order)}
                      activeOpacity={0.85}
                    >
                      <View style={st.orderTop}>
                        <Text style={st.orderClient} numberOfLines={1}>{order.clientName}</Text>
                        <View style={[st.orderBadge, { backgroundColor: meta.bg }]}>
                          <Text style={[st.orderBadgeText, { color: meta.color }]}>{meta.label}</Text>
                        </View>
                      </View>
                      <Text style={st.orderItems} numberOfLines={2}>{summary}</Text>
                      <View style={st.orderBottom}>
                        {order.deliveryAddress ? (
                          <View style={st.orderMeta}>
                            <Ionicons name="location-outline" size={13} color={INK3} />
                            <Text style={st.orderMetaText} numberOfLines={1}>{order.deliveryAddress}</Text>
                          </View>
                        ) : (
                          <View style={st.orderMeta}>
                            <Ionicons name="bag-handle-outline" size={13} color={INK3} />
                            <Text style={st.orderMetaText}>Retirada</Text>
                          </View>
                        )}
                        <Text style={st.orderTotal}>{fmtCurrency(order.totalPrice)}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </>
        )}

        {/* ══ CONFIGURAÇÃO ══ */}
        {tab === 'settings' && (
          <>
            <Text style={[st.secTitle, { marginBottom: 12 }]}>Configuração da loja</Text>
            <View style={st.settingsCard}>
              <SettingsRow icon="pricetag-outline" label="Nome" value={settings?.storeName || '—'} />
              <SettingsRow
                icon="location-outline"
                label="Endereço"
                value={settings?.address || 'Não informado'}
              />
              <SettingsRow
                icon="bicycle-outline"
                label="Entrega"
                value={settings?.acceptsDelivery ? 'Ativada' : 'Desativada'}
              />
              <SettingsRow
                icon="bag-outline"
                label="Retirada"
                value={settings?.acceptsPickup ? 'Ativada' : 'Desativada'}
              />
              <SettingsRow
                icon="cash-outline"
                label="Pedido mínimo"
                value={settings?.minOrderValue ? fmtCurrency(settings.minOrderValue) : 'Sem mínimo'}
              />
              <SettingsRow
                icon="car-outline"
                label="Taxa de entrega"
                value={settings?.deliveryFee ? fmtCurrency(settings.deliveryFee) : 'Grátis'}
                last
              />
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate('StoreSettings')}
              activeOpacity={0.85}
            >
              <LinearGradient colors={[PINK_LIGHT, PINK]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.editSettingsBtn}>
                <Ionicons name="create-outline" size={18} color="#fff" />
                <Text style={st.editSettingsText}>Editar configurações</Text>
              </LinearGradient>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      {/* ══ Modal de pedido (fluxo de status) ══ */}
      <Modal
        visible={!!selectedOrder}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedOrder(null)}
      >
        <View style={st.modalOverlay}>
          <View style={st.modalSheet}>
            {selectedOrder && (() => {
              const o = selectedOrder;
              const meta = ORDER_STATUS_META[o.status];
              const action = NEXT_ACTION[o.status];
              const itemList = o.items?.length
                ? o.items
                : [{ recipeName: o.recipeName, quantity: o.quantity, unitPrice: o.unitPrice }];
              const isFinal = o.status === 'delivered' || o.status === 'cancelled';
              const currentStageIdx = ORDER_STAGES.indexOf(o.status);
              return (
                <>
                  {/* Cabeçalho */}
                  <View style={st.modalHead}>
                    <View style={{ flex: 1 }}>
                      <Text style={st.modalClient} numberOfLines={1}>{o.clientName}</Text>
                      <View style={[st.orderBadge, { backgroundColor: meta.bg, alignSelf: 'flex-start', marginTop: 4 }]}>
                        <Text style={[st.orderBadgeText, { color: meta.color }]}>{meta.label}</Text>
                      </View>
                    </View>
                    <TouchableOpacity onPress={() => setSelectedOrder(null)} style={st.modalClose}>
                      <Ionicons name="close" size={22} color={INK} />
                    </TouchableOpacity>
                  </View>

                  <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
                    {/* Stepper de status */}
                    {o.status !== 'cancelled' && (
                      <View style={st.stepper}>
                        {ORDER_STAGES.map((stage, i) => {
                          const reached = i <= currentStageIdx;
                          return (
                            <React.Fragment key={stage}>
                              <View style={st.step}>
                                <View style={[st.stepDot, reached && st.stepDotOn]}>
                                  {reached
                                    ? <Ionicons name="checkmark" size={13} color="#fff" />
                                    : <Text style={st.stepNum}>{i + 1}</Text>}
                                </View>
                                <Text style={[st.stepLabel, reached && st.stepLabelOn]} numberOfLines={1}>
                                  {ORDER_STATUS_META[stage].label}
                                </Text>
                              </View>
                              {i < ORDER_STAGES.length - 1 && (
                                <View style={[st.stepLine, i < currentStageIdx && st.stepLineOn]} />
                              )}
                            </React.Fragment>
                          );
                        })}
                      </View>
                    )}

                    {/* Contato */}
                    {o.clientPhone ? (
                      <TouchableOpacity
                        style={st.modalRow}
                        onPress={() => Linking.openURL(`https://wa.me/${o.clientPhone!.replace(/\D/g, '')}`)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="logo-whatsapp" size={17} color={GREEN} />
                        <Text style={[st.modalRowText, { color: GREEN, fontWeight: '700' }]}>{o.clientPhone}</Text>
                      </TouchableOpacity>
                    ) : null}

                    {/* Entrega/retirada */}
                    <View style={st.modalRow}>
                      <Ionicons name={o.deliveryAddress ? 'location-outline' : 'bag-handle-outline'} size={17} color={INK2} />
                      <Text style={st.modalRowText}>
                        {o.deliveryAddress ? o.deliveryAddress : 'Retirada no local'}
                      </Text>
                    </View>

                    {/* Forma de pagamento escolhida pelo cliente */}
                    {o.paymentMethod ? (
                      <View style={st.modalRow}>
                        <Ionicons name={PAYMENT_METHODS.find(m => m.key === o.paymentMethod)?.icon ?? 'wallet-outline'} size={17} color={INK2} />
                        <Text style={st.modalRowText}>
                          Pagamento: {PAYMENT_METHODS.find(m => m.key === o.paymentMethod)?.label ?? o.paymentMethod}
                          {o.paymentMethod === 'cash' && o.changeFor ? ` · troco para ${fmtCurrency(o.changeFor)}` : ''}
                        </Text>
                      </View>
                    ) : null}

                    {/* Itens */}
                    <View style={st.modalItems}>
                      {itemList.map((it, i) => (
                        <View key={i}>
                          <View style={st.modalItemRow}>
                            <Text style={st.modalItemQty}>{it.quantity}x</Text>
                            <Text style={st.modalItemName} numberOfLines={1}>{it.recipeName}</Text>
                            <Text style={st.modalItemPrice}>{fmtCurrency(it.unitPrice * it.quantity)}</Text>
                          </View>
                          {('addons' in it && it.addons?.length) ? (
                            <Text style={st.modalItemAddons} numberOfLines={2}>
                              + {it.addons.map(a => a.name).join(', ')}
                            </Text>
                          ) : null}
                        </View>
                      ))}
                      <View style={st.modalTotalRow}>
                        <Text style={st.modalTotalLabel}>Total</Text>
                        <Text style={st.modalTotalValue}>{fmtCurrency(o.totalPrice)}</Text>
                      </View>
                    </View>

                    {/* Observações */}
                    {o.notes ? (
                      <View style={st.modalNotes}>
                        <Text style={st.modalNotesText}>{o.notes}</Text>
                      </View>
                    ) : null}
                  </ScrollView>

                  {/* Ações de status */}
                  <View style={st.modalActions}>
                    {isFinal ? (
                      <View style={st.modalFinal}>
                        <Ionicons
                          name={o.status === 'delivered' ? 'checkmark-circle' : 'close-circle'}
                          size={20}
                          color={meta.color}
                        />
                        <Text style={[st.modalFinalText, { color: meta.color }]}>
                          {o.status === 'delivered' ? 'Pedido entregue' : 'Pedido cancelado'}
                        </Text>
                      </View>
                    ) : (
                      <>
                        {action && (
                          <TouchableOpacity
                            disabled={updatingStatus}
                            onPress={() => action.next === 'delivered' ? openDeliveryModal(o) : changeOrderStatus(o, action.next)}
                            activeOpacity={0.85}
                          >
                            <LinearGradient colors={[PINK_LIGHT, PINK]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.primaryAction}>
                              {updatingStatus ? (
                                <ActivityIndicator color="#fff" />
                              ) : (
                                <>
                                  <Ionicons name={action.icon} size={18} color="#fff" />
                                  <Text style={st.primaryActionText}>{action.label}</Text>
                                </>
                              )}
                            </LinearGradient>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          disabled={updatingStatus}
                          style={st.cancelAction}
                          onPress={() => confirmCancelOrder(o)}
                          activeOpacity={0.7}
                        >
                          <Text style={st.cancelActionText}>Recusar pedido</Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                </>
              );
            })()}
          </View>
        </View>
      </Modal>
      {/* ── Modal confirmar entrega ── */}
      <Modal visible={!!deliveryOrder} transparent animationType="fade" onRequestClose={() => setDeliveryOrder(null)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }}
        >
          <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 16 }}>
            {/* Título */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.greenBg, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="checkmark-circle" size={22} color={colors.greenDark} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>Confirmar entrega</Text>
                <Text style={{ fontSize: 12, color: INK2, marginTop: 1 }}>de {deliveryOrder?.clientName ?? ''}</Text>
              </View>
              <TouchableOpacity onPress={() => setDeliveryOrder(null)}>
                <Ionicons name="close" size={22} color={INK2} />
              </TouchableOpacity>
            </View>

            {/* Resumo */}
            {deliveryOrder && (() => {
              const paid = deliveryOrder.paidAmount ?? 0;
              const remaining = Math.max(deliveryOrder.totalPrice - paid, 0);
              return (
                <>
                  <View style={{ backgroundColor: colors.grayBg, borderRadius: 14, padding: 14, gap: 6 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 13, color: INK2 }}>Total do pedido</Text>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>{fmtCurrency(deliveryOrder.totalPrice)}</Text>
                    </View>
                    {paid > 0 && (
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: 13, color: INK2 }}>Já recebido</Text>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.greenDark }}>{fmtCurrency(paid)}</Text>
                      </View>
                    )}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.grayBorder, paddingTop: 6, marginTop: 2 }}>
                      {remaining > 0 ? (
                        <>
                          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>Restante a receber</Text>
                          <Text style={{ fontSize: 13, fontWeight: '700', color: PINK }}>{fmtCurrency(remaining)}</Text>
                        </>
                      ) : (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Ionicons name="checkmark-circle" size={14} color={colors.greenDark} />
                          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.greenDark }}>Pedido já quitado</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {remaining > 0 && (
                    <>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>Forma de pagamento</Text>
                      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                        {PAYMENT_METHODS.map(m => (
                          <TouchableOpacity key={m.key} onPress={() => setDeliveryModalMethod(m.key)} activeOpacity={0.8}
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10,
                              backgroundColor: deliveryModalMethod === m.key ? PINK : colors.grayBg,
                              borderWidth: deliveryModalMethod === m.key ? 0 : 1, borderColor: colors.grayBorder }}>
                            <Ionicons name={m.icon} size={15} color={deliveryModalMethod === m.key ? '#fff' : INK2} />
                            <Text style={{ fontSize: 13, fontWeight: '600', color: deliveryModalMethod === m.key ? '#fff' : INK2 }}>{m.label}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.grayBg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 }}>
                        <Ionicons name="cash-outline" size={18} color={INK2} />
                        <TextInput
                          style={{ flex: 1, fontSize: 15, fontWeight: '600', color: colors.text }}
                          value={deliveryModalAmount}
                          onChangeText={setDeliveryModalAmount}
                          keyboardType="decimal-pad"
                          placeholder="Valor recebido"
                          placeholderTextColor={INK3}
                        />
                      </View>
                    </>
                  )}
                </>
              );
            })()}

            {/* Botões */}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
              <TouchableOpacity onPress={() => setDeliveryOrder(null)} activeOpacity={0.8}
                style={{ flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: colors.grayBorder }}>
                <Text style={{ fontWeight: '600', color: INK2 }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDeliveryConfirm} disabled={deliveryModalLoading} activeOpacity={0.85} style={{ flex: 2 }}>
                <LinearGradient colors={['#34D399', '#059669']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14 }}>
                  {deliveryModalLoading ? <ActivityIndicator size="small" color="#fff" /> : (
                    <>
                      <Ionicons name="checkmark-circle" size={18} color="#fff" />
                      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Confirmar entrega</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Modal de item adicional ── */}
      <Modal visible={!!addonModal} transparent animationType="fade" onRequestClose={() => setAddonModal(null)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }}
        >
          <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFEDF4', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="add-circle-outline" size={22} color={PINK} />
              </View>
              <Text style={{ flex: 1, fontSize: 16, fontWeight: '700', color: INK }}>
                {addonModal?.id ? 'Editar adicional' : 'Novo adicional'}
              </Text>
              <TouchableOpacity onPress={() => setAddonModal(null)}>
                <Ionicons name="close" size={22} color={INK2} />
              </TouchableOpacity>
            </View>

            <View style={st.addonInputBox}>
              <Ionicons name="pricetag-outline" size={18} color={INK2} />
              <TextInput
                style={st.addonInput}
                value={addonModal?.name ?? ''}
                onChangeText={t => setAddonModal(m => (m ? { ...m, name: t } : m))}
                placeholder="Nome (ex.: Cobertura extra)"
                placeholderTextColor={INK3}
                maxLength={120}
              />
            </View>
            <View style={st.addonInputBox}>
              <Ionicons name="cash-outline" size={18} color={INK2} />
              <TextInput
                style={st.addonInput}
                value={addonModal?.price ?? ''}
                onChangeText={t => setAddonModal(m => (m ? { ...m, price: t } : m))}
                keyboardType="decimal-pad"
                placeholder="Preço (0 = grátis)"
                placeholderTextColor={INK3}
              />
            </View>

            <TouchableOpacity onPress={handleSaveAddon} disabled={savingAddon} activeOpacity={0.85}>
              <LinearGradient colors={[PINK_LIGHT, PINK]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.primaryAction}>
                {savingAddon ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={18} color="#fff" />
                    <Text style={st.primaryActionText}>{addonModal?.id ? 'Salvar' : 'Criar adicional'}</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </SafeAreaView>
  );
};

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    ...SHADOW,
  },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: '700', color: INK, textAlign: 'center' },

  statusCard: { borderRadius: 18, padding: 16, marginBottom: 12, ...SHADOW },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statusIconBox: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    ...SHADOW,
  },
  statusName: { fontSize: 16, fontWeight: '700', color: INK },
  statusSub: { fontSize: 12.5, color: INK2, fontWeight: '500', marginTop: 2 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    marginTop: 12, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: 'rgba(234,75,146,0.15)',
  },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: GREEN },
  statusBadgeText: { fontSize: 12, fontWeight: '600', color: PINK },

  linkCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 14,
    marginBottom: 20, ...SHADOW, gap: 12,
  },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  linkText: { flex: 1, fontSize: 13, color: INK2, fontWeight: '500' },
  linkBtns: { flexDirection: 'row', gap: 8 },
  linkBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: 12,
    borderWidth: 1.5, borderColor: PINK,
  },
  linkBtnText: { fontSize: 13, fontWeight: '700' },

  // Menu de abas
  tabs: {
    flexDirection: 'row', backgroundColor: '#F3EEF1', borderRadius: 14,
    padding: 4, marginBottom: 18, gap: 4,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: 9, borderRadius: 10,
  },
  tabActive: { backgroundColor: PINK, ...SHADOW },
  tabText: { fontSize: 12.5, fontWeight: '700', color: INK2 },
  tabTextActive: { color: '#fff' },

  refreshBtn: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...SHADOW,
  },

  // Cards de pedido
  orderCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14, gap: 8, ...SHADOW },
  orderTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  orderClient: { flex: 1, fontSize: 15, fontWeight: '700', color: INK },
  orderBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  orderBadgeText: { fontSize: 11, fontWeight: '700' },
  orderItems: { fontSize: 13, color: INK2, fontWeight: '500', lineHeight: 18 },
  orderBottom: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    gap: 8, marginTop: 2, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F3EEF1',
  },
  orderMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1, minWidth: 0 },
  orderMetaText: { fontSize: 12, color: INK3, fontWeight: '500', flex: 1 },
  orderTotal: { fontSize: 15, fontWeight: '800', color: PINK },

  // Configuração
  settingsCard: { backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 14, ...SHADOW, marginBottom: 16 },
  settingsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F3EEF1',
  },
  settingsRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  settingsLabel: { fontSize: 14, fontWeight: '600', color: INK },
  settingsValue: { flex: 1, textAlign: 'right', fontSize: 14, color: INK2, fontWeight: '600' },
  editSettingsBtn: {
    height: 50, borderRadius: 14, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8,
  },
  editSettingsText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  secRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 12,
  },
  secTitle: { fontSize: 16, fontWeight: '700', color: INK },
  catHeader: { fontSize: 13, fontWeight: '800', color: INK2, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 6, marginBottom: 2, marginLeft: 2 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: PINK, paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 12, ...SHADOW,
  },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  productCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 12,
    flexDirection: 'row', alignItems: 'center', gap: 12, ...SHADOW,
  },
  productMain: {
    flex: 1, minWidth: 0,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  productThumb: { width: 56, height: 56, borderRadius: 12 },
  productThumbPlaceholder: {
    backgroundColor: '#FFEDF4', alignItems: 'center', justifyContent: 'center',
  },
  productName: { fontSize: 14.5, fontWeight: '700', color: INK },
  productDesc: { fontSize: 12, color: INK2, fontWeight: '500', marginTop: 2 },
  productPrice: { fontSize: 14, fontWeight: '700', color: PINK, marginTop: 4 },
  productRight: { alignItems: 'center', gap: 4 },
  productAvailLabel: { fontSize: 10.5, fontWeight: '700' },

  empty: { alignItems: 'center', paddingTop: 40, gap: 10, paddingHorizontal: 16 },
  emptyIcon: {
    width: 72, height: 72, borderRadius: 24,
    backgroundColor: '#FFEDF4', alignItems: 'center', justifyContent: 'center',
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: INK },
  emptyDesc: { fontSize: 13, color: INK2, textAlign: 'center', lineHeight: 19, maxWidth: 260 },
  emptyBtn: {
    height: 48, borderRadius: 14, paddingHorizontal: 24,
    alignItems: 'center', justifyContent: 'center', marginTop: 8,
  },
  emptyBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  hint: { fontSize: 11.5, color: INK3, textAlign: 'center', marginTop: 16 },

  addonExplain: { fontSize: 12, color: INK2, lineHeight: 17, marginBottom: 12, marginTop: -4 },
  addonInputBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.grayBg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
  },
  addonInput: { flex: 1, fontSize: 15, fontWeight: '600', color: INK },

  pendingWrap: { flex: 1, padding: 18, justifyContent: 'center' },
  pendingCard: {
    borderRadius: 24, padding: 28, alignItems: 'center', gap: 12,
    ...SHADOW, shadowOpacity: 0.1,
  },
  pendingTitle: { fontSize: 20, fontWeight: '800', color: PINK, textAlign: 'center' },
  pendingDesc: { fontSize: 13.5, color: INK2, textAlign: 'center', lineHeight: 20, maxWidth: 270 },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 8, paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: 12, borderWidth: 1.5, borderColor: PINK, backgroundColor: '#fff',
  },
  retryBtnText: { fontSize: 14, fontWeight: '700', color: PINK },

  // Modal de pedido
  modalOverlay: { flex: 1, backgroundColor: 'rgba(61,34,51,0.45)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 28,
  },
  modalHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  modalClient: { fontSize: 19, fontWeight: '800', color: INK },
  modalClose: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: '#F3EEF1',
    alignItems: 'center', justifyContent: 'center',
  },

  stepper: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 18, paddingHorizontal: 4 },
  step: { alignItems: 'center', width: 62 },
  stepDot: {
    width: 26, height: 26, borderRadius: 13, backgroundColor: '#EDE6EA',
    alignItems: 'center', justifyContent: 'center',
  },
  stepDotOn: { backgroundColor: PINK },
  stepNum: { fontSize: 12, fontWeight: '700', color: INK3 },
  stepLabel: { fontSize: 10.5, fontWeight: '600', color: INK3, marginTop: 5, textAlign: 'center' },
  stepLabelOn: { color: INK },
  stepLine: { flex: 1, height: 2, backgroundColor: '#EDE6EA', marginTop: 12 },
  stepLineOn: { backgroundColor: PINK },

  modalRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  modalRowText: { flex: 1, fontSize: 14, color: INK2, fontWeight: '500' },

  modalItems: {
    backgroundColor: '#FAF6F8', borderRadius: 14, padding: 14, marginTop: 8, gap: 10,
  },
  modalItemRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  modalItemQty: { fontSize: 14, fontWeight: '800', color: PINK, minWidth: 26 },
  modalItemName: { flex: 1, fontSize: 14, color: INK, fontWeight: '500' },
  modalItemPrice: { fontSize: 14, fontWeight: '600', color: INK2 },
  modalItemAddons: { fontSize: 12, color: INK2, marginLeft: 36, marginTop: 2 },
  modalTotalRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 10, borderTopWidth: 1, borderTopColor: '#EDE6EA',
  },
  modalTotalLabel: { fontSize: 14, fontWeight: '700', color: INK },
  modalTotalValue: { fontSize: 17, fontWeight: '800', color: PINK },

  modalNotes: {
    backgroundColor: colors.amberBg, borderRadius: 12, padding: 12, marginTop: 10,
  },
  modalNotesText: { fontSize: 13, color: '#8A6D1B', lineHeight: 18 },

  modalActions: { marginTop: 18, gap: 10 },
  primaryAction: {
    height: 52, borderRadius: 15, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  primaryActionText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  cancelAction: { alignItems: 'center', paddingVertical: 12 },
  cancelActionText: { fontSize: 14, fontWeight: '700', color: colors.redDark },
  modalFinal: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14,
  },
  modalFinalText: { fontSize: 15, fontWeight: '700' },
});
