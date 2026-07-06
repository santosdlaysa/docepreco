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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Clipboard from 'expo-clipboard';
import { RootStackParamList } from '../navigation/types';
import { StoreProduct, StoreSettings } from '../../domain/entities/StoreProduct';
import { Order, OrderStatus } from '../../domain/entities/Order';
import { storeApi } from '../../data/api/storeApi';
import { orderApi } from '../../data/api/orderApi';
import { demoStoreApi } from '../../data/demo/demoApi';
import { isDemoMode } from '../../data/demo/demoMode';
import { useToast } from '../context/ToastContext';
import { usePaywall } from '../premium/usePaywall';
import { Skeleton } from '../components/Skeleton';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'Store'>;
type StoreTab = 'catalog' | 'orders' | 'settings';

const ORDER_STATUS_META: Record<OrderStatus, { label: string; color: string; bg: string }> = {
  pending:     { label: 'Pendente',    color: '#C8870B', bg: '#FFF1CE' },
  in_progress: { label: 'Em preparo',  color: '#7C3AED', bg: '#EDE4FB' },
  done:        { label: 'Pronto',      color: '#1A6F96', bg: '#EEF8FD' },
  delivered:   { label: 'Entregue',    color: '#2E9E5B', bg: '#DCF6E5' },
  cancelled:   { label: 'Cancelado',   color: '#C0392B', bg: '#FBE4E0' },
};

// Etapas do fluxo de um pedido e a ação que leva à próxima etapa.
const ORDER_STAGES: OrderStatus[] = ['pending', 'in_progress', 'done', 'delivered'];
const NEXT_ACTION: Partial<Record<OrderStatus, { next: OrderStatus; label: string; icon: keyof typeof Ionicons.glyphMap }>> = {
  pending:     { next: 'in_progress', label: 'Confirmar pedido',      icon: 'checkmark-circle-outline' },
  in_progress: { next: 'done',        label: 'Marcar como pronto',    icon: 'cube-outline' },
  done:        { next: 'delivered',   label: 'Marcar como entregue',  icon: 'bag-check-outline' },
};

const INK = '#3D2233';
const INK2 = '#9A7E8C';
const INK3 = '#C4B0BB';
const PINK = '#EA4B92';
const PINK_LIGHT = '#FF6AAE';
const GREEN = '#43BE6E';
const CREAM = '#FFF6F0';
const SHADOW = {
  shadowColor: INK,
  shadowOffset: { width: 0, height: 2 } as const,
  shadowOpacity: 0.07,
  shadowRadius: 8,
  elevation: 3,
};

const fmtCurrency = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

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

export const StoreScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { guardMaster } = usePaywall();
  const { showToast } = useToast();

  const sApi = isDemoMode() ? demoStoreApi : storeApi;

  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [backendReady, setBackendReady] = useState(true);
  const [togglingActive, setTogglingActive] = useState(false);
  const [togglingProduct, setTogglingProduct] = useState<string | null>(null);
  const [tab, setTab] = useState<StoreTab>(route.params?.initialTab ?? 'catalog');
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

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
      setOrders(all.filter(o => o.source === 'online'));
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

  const confirmCancelOrder = (order: Order) => {
    Alert.alert('Recusar pedido?', `O pedido de "${order.clientName}" será marcado como cancelado.`, [
      { text: 'Voltar', style: 'cancel' },
      { text: 'Recusar', style: 'destructive', onPress: () => changeOrderStatus(order, 'cancelled') },
    ]);
  };

  const load = async () => {
    setLoading(true);
    try {
      const [s, p] = await Promise.all([sApi.getSettings(), sApi.getProducts()]);
      setSettings(s);
      setProducts(p);
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
          <LinearGradient colors={['#FFE3EF', '#FFD0E4']} style={st.pendingCard}>
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
            colors={['#EA4B92']}
            tintColor="#EA4B92"
          />
        }
      >

        {/* ── Status card ── */}
        <LinearGradient
          colors={settings?.active ? ['#FFE3EF', '#FFD0E4'] : ['#FFF6FA', '#FFEDF4']}
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
          {settings?.active && (
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
                {products.map(product => (
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
                <Text style={st.hint}>Pressione e segure um produto para excluí-lo.</Text>
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

                    {/* Itens */}
                    <View style={st.modalItems}>
                      {itemList.map((it, i) => (
                        <View key={i} style={st.modalItemRow}>
                          <Text style={st.modalItemQty}>{it.quantity}x</Text>
                          <Text style={st.modalItemName} numberOfLines={1}>{it.recipeName}</Text>
                          <Text style={st.modalItemPrice}>{fmtCurrency(it.unitPrice * it.quantity)}</Text>
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
                            onPress={() => changeOrderStatus(o, action.next)}
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
  modalTotalRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 10, borderTopWidth: 1, borderTopColor: '#EDE6EA',
  },
  modalTotalLabel: { fontSize: 14, fontWeight: '700', color: INK },
  modalTotalValue: { fontSize: 17, fontWeight: '800', color: PINK },

  modalNotes: {
    backgroundColor: '#FFF1CE', borderRadius: 12, padding: 12, marginTop: 10,
  },
  modalNotesText: { fontSize: 13, color: '#8A6D1B', lineHeight: 18 },

  modalActions: { marginTop: 18, gap: 10 },
  primaryAction: {
    height: 52, borderRadius: 15, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  primaryActionText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  cancelAction: { alignItems: 'center', paddingVertical: 12 },
  cancelActionText: { fontSize: 14, fontWeight: '700', color: '#C0392B' },
  modalFinal: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14,
  },
  modalFinalText: { fontSize: 15, fontWeight: '700' },
});
