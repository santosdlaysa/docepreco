import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { bannerApi, Banner } from '../../data/api/bannerApi';
import { bannerStorage } from '../../data/storage/bannerStorage';
import { storeApi } from '../../data/api/storeApi';
import { demoStoreApi } from '../../data/demo/demoApi';
import { isDemoMode } from '../../data/demo/demoMode';
import { usePremium } from '../context/PremiumContext';
import { getMissingStoreItems, MissingStoreItem } from '../utils/storeSetup';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const INK = '#3D2233';
const INK2 = '#9A7E8C';
const INK3 = '#C4B0BB';
const PINK = '#EA4B92';
const CREAM = '#FFF6F0';
const LINE = '#F1E2DA';
const RED = '#C0392B';
const SHADOW = {
  shadowColor: INK,
  shadowOffset: { width: 0, height: 2 } as const,
  shadowOpacity: 0.07,
  shadowRadius: 8,
  elevation: 3,
};

const BANNER_CONFIG: Record<Banner['type'], { bg: string; border: string; icon: string; iconColor: string }> = {
  info:    { bg: '#EEF8FD', border: '#B8DDEF', icon: 'information-circle-outline', iconColor: '#2BA7DD' },
  warning: { bg: '#FFF8E1', border: '#FFE082', icon: 'warning-outline',            iconColor: '#F57F17' },
  promo:   { bg: '#FFF0F6', border: '#FFD6E9', icon: 'gift-outline',               iconColor: PINK },
  update:  { bg: '#DCF6E5', border: '#A8E6C0', icon: 'arrow-up-circle-outline',    iconColor: '#43BE6E' },
};

export const NotificationsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { isMaster } = usePremium();
  const sApi = isDemoMode() ? demoStoreApi : storeApi;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [missingItems, setMissingItems] = useState<MissingStoreItem[]>([]);

  const loadData = useCallback(async () => {
    const bannersPromise = bannerApi.getActive().then(async active => {
      await bannerStorage.clearExpired(active.map(b => b.id));
      const dismissed = await bannerStorage.getDismissedIds();
      setBanners(active.filter(b => !dismissed.includes(b.id)));
    }).catch(() => {});

    const storePromise = isMaster
      ? sApi.getSettings().then(s => setMissingItems(getMissingStoreItems(s))).catch(() => setMissingItems([]))
      : Promise.resolve(setMissingItems([]));

    await Promise.all([bannersPromise, storePromise]);
  }, [isMaster]);

  useFocusEffect(useCallback(() => { loadData().finally(() => setLoading(false)); }, [loadData]));

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const dismissBanner = async (id: string) => {
    await bannerStorage.dismiss(id);
    setBanners(prev => prev.filter(b => b.id !== id));
  };

  const hasMandatory = missingItems.length > 0;

  return (
    <SafeAreaView style={st.safe}>
      <View style={st.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={st.backBtn}>
          <Ionicons name="arrow-back" size={20} color={INK} />
        </TouchableOpacity>
        <Text style={st.headerTitle}>Notificações</Text>
        <View style={{ width: 38 }} />
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={PINK} />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={st.body}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[PINK]} />}
        >
          {/* ── Obrigatório ── */}
          {hasMandatory && (
            <View style={{ marginBottom: 22 }}>
              <Text style={st.sectionTitle}>Obrigatório</Text>
              <View style={st.mandatoryCard}>
                <View style={st.mandatoryHead}>
                  <Ionicons name="alert-circle" size={22} color={RED} />
                  <Text style={st.mandatoryTitle}>Complete o cadastro da loja</Text>
                </View>
                <Text style={st.mandatoryDesc}>
                  Falta preencher {missingItems.length === 1 ? 'este item' : 'estes itens'} na configuração da loja:
                </Text>
                {missingItems.map(item => (
                  <View key={item.key} style={st.mandatoryItemRow}>
                    <Ionicons name="ellipse" size={6} color={RED} />
                    <Text style={st.mandatoryItemText}>{item.label}</Text>
                  </View>
                ))}
                <TouchableOpacity
                  style={st.mandatoryBtn}
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate('StoreSettings')}
                >
                  <Text style={st.mandatoryBtnText}>Completar cadastro</Text>
                  <Ionicons name="arrow-forward" size={14} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ── Notificações do app ── */}
          <Text style={st.sectionTitle}>Notificações do app</Text>
          {banners.length === 0 ? (
            <View style={st.empty}>
              <View style={st.emptyIco}><Ionicons name="notifications-outline" size={32} color={PINK} /></View>
              <Text style={st.emptyTitle}>Nenhuma notificação</Text>
              <Text style={st.emptyDesc}>Novidades e avisos do app vão aparecer aqui.</Text>
            </View>
          ) : (
            banners.map(banner => {
              const cfg = BANNER_CONFIG[banner.type];
              const hasLink = !!(banner.actionUrl && banner.actionUrl.trim());
              const openLink = () => {
                if (banner.actionUrl) Linking.openURL(banner.actionUrl).catch(() => {});
              };
              return (
                <View key={banner.id} style={[st.notifCard, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
                  <Ionicons name={cfg.icon as any} size={22} color={cfg.iconColor} style={{ marginTop: 1 }} />
                  <TouchableOpacity
                    style={{ flex: 1 }}
                    activeOpacity={hasLink ? 0.6 : 1}
                    disabled={!hasLink}
                    onPress={openLink}
                  >
                    <Text style={[st.notifTitle, { color: cfg.iconColor }]}>{banner.title}</Text>
                    <Text style={st.notifMsg}>{banner.message}</Text>
                    {hasLink && <Text style={[st.notifLink, { color: cfg.iconColor }]}>Ver mais →</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => dismissBanner(banner.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="close" size={18} color={INK2} />
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10, gap: 12,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    ...SHADOW,
  },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: '700', color: INK, textAlign: 'center' },

  body: { paddingHorizontal: 18, paddingBottom: 40 },

  sectionTitle: { fontSize: 13, fontWeight: '700', color: INK2, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 10 },

  /* mandatory card */
  mandatoryCard: {
    backgroundColor: '#FDEDEC', borderRadius: 18, borderWidth: 1, borderColor: '#F5C6C0',
    padding: 16, ...SHADOW,
  },
  mandatoryHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  mandatoryTitle: { fontSize: 15, fontWeight: '700', color: RED },
  mandatoryDesc: { fontSize: 12.5, color: INK2, fontWeight: '500', marginBottom: 8, lineHeight: 18 },
  mandatoryItemRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  mandatoryItemText: { fontSize: 13.5, color: INK, fontWeight: '600' },
  mandatoryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: RED, borderRadius: 12, paddingVertical: 11, marginTop: 12,
  },
  mandatoryBtnText: { color: '#fff', fontWeight: '700', fontSize: 13.5 },

  /* app notification card */
  notifCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    marginBottom: 10, borderRadius: 16, padding: 13, paddingHorizontal: 14, borderWidth: 1,
  },
  notifTitle: { fontSize: 13.5, fontWeight: '700', marginBottom: 2 },
  notifMsg: { fontSize: 12.5, color: INK2, fontWeight: '500', lineHeight: 17 },
  notifLink: { fontSize: 12.5, fontWeight: '700', marginTop: 6 },

  /* empty */
  empty: { alignItems: 'center', paddingTop: 30, paddingBottom: 20, gap: 8 },
  emptyIco: {
    width: 64, height: 64, borderRadius: 22, backgroundColor: '#FFF0F6',
    alignItems: 'center', justifyContent: 'center',
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: INK },
  emptyDesc: { fontSize: 13, color: INK2, fontWeight: '500', textAlign: 'center', lineHeight: 19, maxWidth: 260 },
});
