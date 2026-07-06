import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
  ActivityIndicator,
  Switch,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Clipboard from 'expo-clipboard';
import { RootStackParamList } from '../navigation/types';
import { StoreProduct, StoreSettings } from '../../domain/entities/StoreProduct';
import { storeApi } from '../../data/api/storeApi';
import { demoStoreApi } from '../../data/demo/demoApi';
import { isDemoMode } from '../../data/demo/demoMode';
import { useToast } from '../context/ToastContext';
import { usePaywall } from '../premium/usePaywall';
import { Skeleton } from '../components/Skeleton';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const INK = '#3D2233';
const INK2 = '#9A7E8C';
const INK3 = '#C4B0BB';
const PINK = '#EA4B92';
const GREEN = '#43BE6E';
const CREAM = '#FFF6F0';
const PURPLE = '#7C3AED';
const SHADOW = {
  shadowColor: INK,
  shadowOffset: { width: 0, height: 2 } as const,
  shadowOpacity: 0.07,
  shadowRadius: 8,
  elevation: 3,
};

const fmtCurrency = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const StoreScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { guardMaster } = usePaywall();
  const { showToast } = useToast();

  const sApi = isDemoMode() ? demoStoreApi : storeApi;

  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [backendReady, setBackendReady] = useState(true);
  const [togglingActive, setTogglingActive] = useState(false);
  const [togglingProduct, setTogglingProduct] = useState<string | null>(null);

  useFocusEffect(useCallback(() => {
    if (!guardMaster()) return;
    load();
  }, []));

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
          <LinearGradient colors={['#EDE4FB', '#DDD0F8']} style={st.pendingCard}>
            <Ionicons name="storefront-outline" size={48} color={PURPLE} />
            <Text style={st.pendingTitle}>Loja em ativação</Text>
            <Text style={st.pendingDesc}>
              Sua loja online está sendo configurada. Em breve você poderá cadastrar produtos e receber pedidos pelo link.
            </Text>
            <TouchableOpacity onPress={load} style={st.retryBtn} activeOpacity={0.7}>
              <Ionicons name="refresh-outline" size={16} color={PURPLE} />
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

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 40 }}>

        {/* ── Status card ── */}
        <LinearGradient
          colors={settings?.active ? ['#EDE4FB', '#DDD0F8'] : ['#F8F4FF', '#F0EAFA']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={st.statusCard}
        >
          <View style={st.statusRow}>
            <View style={st.statusIconBox}>
              <Ionicons name="storefront-outline" size={26} color={PURPLE} />
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
              <ActivityIndicator size="small" color={PURPLE} />
            ) : (
              <Switch
                value={settings?.active ?? false}
                onValueChange={toggleStoreActive}
                trackColor={{ true: PURPLE, false: '#D0C8D8' }}
                thumbColor="#fff"
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
              <Ionicons name="chevron-forward" size={14} color={PURPLE} />
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
                <Ionicons name="copy-outline" size={16} color={PURPLE} />
                <Text style={[st.linkBtnText, { color: PURPLE }]}>Copiar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[st.linkBtn, { backgroundColor: PURPLE }]} onPress={handleShare} activeOpacity={0.8}>
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

        {/* ── Products section ── */}
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
              <Ionicons name="bag-outline" size={34} color={PURPLE} />
            </View>
            <Text style={st.emptyTitle}>Nenhum produto ainda</Text>
            <Text style={st.emptyDesc}>
              Adicione os produtos que você vende para que clientes possam fazer pedidos pelo link.
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('StoreProductForm')}
              activeOpacity={0.85}
            >
              <LinearGradient colors={['#9B5DE5', PURPLE]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.emptyBtn}>
                <Text style={st.emptyBtnText}>Adicionar primeiro produto</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {products.map(product => (
              <TouchableOpacity
                key={product.id}
                style={st.productCard}
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
                <View style={st.productRight}>
                  {togglingProduct === product.id ? (
                    <ActivityIndicator size="small" color={PURPLE} />
                  ) : (
                    <Switch
                      value={product.available}
                      onValueChange={() => toggleProductAvailable(product)}
                      trackColor={{ true: GREEN, false: '#D0C8D8' }}
                      thumbColor="#fff"
                    />
                  )}
                  <Text style={[st.productAvailLabel, { color: product.available ? GREEN : INK3 }]}>
                    {product.available ? 'Ativo' : 'Oculto'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Text style={st.hint}>
          Pressione e segure um produto para excluí-lo.
        </Text>
      </ScrollView>
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
    borderTopWidth: 1, borderTopColor: 'rgba(124,58,237,0.15)',
  },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: GREEN },
  statusBadgeText: { fontSize: 12, fontWeight: '600', color: PURPLE },

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
    borderWidth: 1.5, borderColor: PURPLE,
  },
  linkBtnText: { fontSize: 13, fontWeight: '700' },

  secRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 12,
  },
  secTitle: { fontSize: 16, fontWeight: '700', color: INK },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: PURPLE, paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 12, ...SHADOW,
  },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  productCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 12,
    flexDirection: 'row', alignItems: 'center', gap: 12, ...SHADOW,
  },
  productThumb: { width: 56, height: 56, borderRadius: 12 },
  productThumbPlaceholder: {
    backgroundColor: '#F0EAF8', alignItems: 'center', justifyContent: 'center',
  },
  productName: { fontSize: 14.5, fontWeight: '700', color: INK },
  productDesc: { fontSize: 12, color: INK2, fontWeight: '500', marginTop: 2 },
  productPrice: { fontSize: 14, fontWeight: '700', color: PURPLE, marginTop: 4 },
  productRight: { alignItems: 'center', gap: 4 },
  productAvailLabel: { fontSize: 10.5, fontWeight: '700' },

  empty: { alignItems: 'center', paddingTop: 40, gap: 10, paddingHorizontal: 16 },
  emptyIcon: {
    width: 72, height: 72, borderRadius: 24,
    backgroundColor: '#F0EAF8', alignItems: 'center', justifyContent: 'center',
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
  pendingTitle: { fontSize: 20, fontWeight: '800', color: PURPLE, textAlign: 'center' },
  pendingDesc: { fontSize: 13.5, color: INK2, textAlign: 'center', lineHeight: 20, maxWidth: 270 },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 8, paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: 12, borderWidth: 1.5, borderColor: PURPLE, backgroundColor: '#fff',
  },
  retryBtnText: { fontSize: 14, fontWeight: '700', color: PURPLE },
});
