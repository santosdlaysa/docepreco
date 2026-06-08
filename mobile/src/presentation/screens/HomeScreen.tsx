import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useAuth } from '../../context/AuthContext';
import { statsApi, AppStats } from '../../data/api/statsApi';
import { saleApi } from '../../data/api/saleApi';
import { Sale } from '../../domain/entities/Sale';
import { isDemoMode } from '../../data/demo/demoMode';
import { demoStatsApi, demoSaleApi } from '../../data/demo/demoApi';
import { usePremium } from '../context/PremiumContext';
import { useDemoGuard } from '../hooks/useDemoGuard';
import { usePaywall } from '../premium/usePaywall';
import { AdBanner } from '../ads';
import { SupportFab } from '../components/SupportFab';
import { isGuideAvailable } from './BeginnerGuideScreen';
import { bannerApi, Banner } from '../../data/api/bannerApi';
import { bannerStorage } from '../../data/storage/bannerStorage';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ── Design tokens (from reference) ──
const INK = '#3D2233';
const INK2 = '#9A7E8C';
const INK3 = '#C4B0BB';
const CREAM = '#FFF6F0';
const LINE = '#F1E2DA';
const PINK = '#EA4B92';
const GREEN = '#43BE6E';

const BANNER_CONFIG: Record<Banner['type'], { bg: string; border: string; icon: string; iconColor: string }> = {
  info:    { bg: '#EEF8FD', border: '#B8DDEF', icon: 'information-circle-outline', iconColor: '#2BA7DD' },
  warning: { bg: '#FFF8E1', border: '#FFE082', icon: 'warning-outline',            iconColor: '#F57F17' },
  promo:   { bg: '#FFF0F6', border: '#FFD6E9', icon: 'gift-outline',               iconColor: PINK },
  update:  { bg: '#DCF6E5', border: '#A8E6C0', icon: 'arrow-up-circle-outline',    iconColor: GREEN },
};

const formatCurrency = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 });

const formatCurrencyFull = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const THUMB_COLORS = ['#5E3A23', '#EA4B92', '#FFB01F', '#90BE6D', '#7B68EE', '#FF6B6B', '#4ECDC4', '#FF9F43'];
const DAY_LABELS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { companyName, companyLogo } = useAuth();
  const { isPremium, isMaster } = usePremium();
  const { guardAction, DemoGuardModal } = useDemoGuard();
  const { requirePremium } = usePaywall();

  const [stats, setStats] = useState<AppStats | null>(null);
  const [allSales, setAllSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGuide, setShowGuide] = useState(false);
  const [banners, setBanners] = useState<Banner[]>([]);

  const sApi = isDemoMode() ? demoSaleApi : saleApi;
  const stApi = isDemoMode() ? demoStatsApi : statsApi;

  const dismissBanner = async (id: string) => {
    await bannerStorage.dismiss(id);
    setBanners(prev => prev.filter(b => b.id !== id));
  };

  useEffect(() => {
    isGuideAvailable().then(setShowGuide).catch(() => {});
    bannerApi.getActive().then(async active => {
      await bannerStorage.clearExpired(active.map(b => b.id));
      const dismissed = await bannerStorage.getDismissedIds();
      setBanners(active.filter(b => !dismissed.includes(b.id)));
    }).catch(() => {});
    Promise.all([
      stApi.getStats().then(setStats).catch(() => {}),
      sApi.getAll().then(setAllSales).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  const today = new Date().toISOString().split('T')[0];

  const todaySales = useMemo(() => allSales.filter(s => s.saleDate === today), [allSales, today]);
  const todayRevenue = useMemo(() => todaySales.reduce((sum, s) => sum + s.totalRevenue, 0), [todaySales]);
  const todayProfit = useMemo(() => Math.round(todayRevenue * 0.58), [todayRevenue]);

  const weeklyData = useMemo(() => {
    const days: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      days.push(allSales.filter(s => s.saleDate === key).reduce((sum, s) => sum + s.totalRevenue, 0));
    }
    return days;
  }, [allSales]);

  const weeklyDayLabels = useMemo(() => {
    const labels: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      labels.push(DAY_LABELS[d.getDay()]);
    }
    return labels;
  }, []);

  const maxWeekly = Math.max(...weeklyData, 1);

  const recentSales = useMemo(
    () => [...allSales].sort((a, b) => {
      const dc = b.saleDate.localeCompare(a.saleDate);
      return dc !== 0 ? dc : b.createdAt.localeCompare(a.createdAt);
    }).slice(0, 3),
    [allSales],
  );

  const now = new Date();
  const weekday = now.toLocaleDateString('pt-BR', { weekday: 'long' });
  const dayMonth = now.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });
  const dateLabel = `${weekday.charAt(0).toUpperCase() + weekday.slice(1)}, ${dayMonth}`;
  const firstName = companyName?.split(' ')[0] || 'Confeiteira';

  if (loading) {
    return (
      <SafeAreaView style={s.safeArea} edges={['top']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={PINK} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safeArea} edges={['top']}>
      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>

        {/* ═══════ TOP BAR ═══════ */}
        <View style={s.topbar}>
          <View style={s.topbarLeft}>
            <View style={s.logoBadge}>
              <Image source={require('../../../assets/icon.png')} style={s.logoImg} />
            </View>
            <View>
              <Text style={s.dateText}>{dateLabel}</Text>
              <Text style={s.greeting}>Oi, {firstName}!</Text>
            </View>
          </View>
          <View style={s.topbarRight}>
            {!isPremium && (
              <TouchableOpacity
                onPress={() => navigation.navigate('Paywall', { trigger: { kind: 'manual' } })}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#FFC53D', '#FFB01F']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={s.proChip}
                >
                  <Ionicons name="trophy" size={11} color="#7A4E00" />
                  <Text style={s.proChipText}>Seja PRO</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={s.profileBtn}
              onPress={() => navigation.navigate('Profile' as never)}
              activeOpacity={0.7}
            >
              {companyLogo ? (
                <Image source={{ uri: companyLogo }} style={s.profileImg} />
              ) : (
                <Ionicons name="person-circle-outline" size={38} color={PINK} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* ═══════ HERO REVENUE ═══════ */}
        <View style={s.heroWrap}>
          <LinearGradient
            colors={['#FF6AAE', PINK, '#C7367A']}
            locations={[0, 0.52, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.hero}
          >
            <Text style={s.heroLabel}>Faturamento de hoje</Text>
            <Text style={s.heroBig}>{formatCurrencyFull(todayRevenue)}</Text>
            <Text style={s.heroSub}>
              {todaySales.length} venda{todaySales.length !== 1 ? 's' : ''} · lucro estimado {formatCurrency(todayProfit)}
            </Text>

            <View style={s.heroStats}>
              <View style={s.heroStat}>
                <Text style={s.heroStatVal}>{formatCurrency(stats?.monthlyRevenue ?? 0)}</Text>
                <Text style={s.heroStatLbl}>no mês</Text>
              </View>
              <View style={s.heroStat}>
                <Text style={s.heroStatVal}>58%</Text>
                <Text style={s.heroStatLbl}>margem{'\n'}média</Text>
              </View>
              <View style={s.heroStat}>
                <Text style={s.heroStatVal}>{stats?.monthlySalesCount ?? 0}</Text>
                <Text style={s.heroStatLbl}>vendas</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* ═══════ NOTIFICATION BANNERS ═══════ */}
        {banners.map(banner => {
          const cfg = BANNER_CONFIG[banner.type];
          const hasLink = !!(banner.actionUrl && banner.actionUrl.trim());
          const openLink = () => {
            if (banner.actionUrl) Linking.openURL(banner.actionUrl).catch(() => {});
          };
          return (
            <View key={banner.id} style={[s.notifBanner, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
              <Ionicons name={cfg.icon as any} size={22} color={cfg.iconColor} style={{ marginTop: 1 }} />
              <TouchableOpacity
                style={{ flex: 1 }}
                activeOpacity={hasLink ? 0.6 : 1}
                disabled={!hasLink}
                onPress={openLink}
              >
                <Text style={[s.notifTitle, { color: cfg.iconColor }]}>{banner.title}</Text>
                <Text style={s.notifMsg}>{banner.message}</Text>
                {hasLink && (
                  <Text style={[s.notifLink, { color: cfg.iconColor }]}>Ver mais →</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => dismissBanner(banner.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={18} color={INK2} />
              </TouchableOpacity>
            </View>
          );
        })}

        <View style={s.adWrap}><AdBanner /></View>

        {/* ═══════ QUICK ACTIONS (2×2 grid) ═══════ */}
        <View style={s.qaGrid}>
          <View style={s.qaGridRow}>
            <TouchableOpacity style={s.qaItem} onPress={() => guardAction(() => navigation.navigate('CreateIngredient'))} activeOpacity={0.7}>
              <View style={[s.qaIco, { backgroundColor: '#FFF1CE' }]}>
                <Ionicons name="basket-outline" size={22} color="#C8870B" />
              </View>
              <Text style={s.qaLabel}>Cadastrar ingrediente</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.qaItem} onPress={() => guardAction(() => navigation.navigate('CreateRecipe'))} activeOpacity={0.7}>
              <View style={[s.qaIco, { backgroundColor: '#FFF0F6' }]}>
                <Ionicons name="restaurant-outline" size={22} color={PINK} />
              </View>
              <Text style={s.qaLabel}>Nova receita</Text>
            </TouchableOpacity>
          </View>
          <View style={s.qaGridRow}>
            <TouchableOpacity style={s.qaItem} onPress={() => guardAction(() => navigation.navigate('CreateSale'))} activeOpacity={0.7}>
              <View style={[s.qaIco, { backgroundColor: '#DCF6E5' }]}>
                <Ionicons name="cart-outline" size={22} color={GREEN} />
              </View>
              <Text style={s.qaLabel}>Registrar venda</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.qaItem} onPress={() => guardAction(() => { if (!requirePremium('ordersManagement')) return; navigation.navigate('CreateOrder'); })} activeOpacity={0.7}>
              <View style={[s.qaIco, { backgroundColor: '#EEF8FD' }]}>
                <Ionicons name="document-text-outline" size={22} color="#2BA7DD" />
              </View>
              <Text style={s.qaLabel}>Nova encomenda</Text>
              {!isPremium && <Ionicons name="lock-closed" size={12} color="#C8870B" />}
            </TouchableOpacity>
          </View>
        </View>

        {/* ═══════ BEGINNER GUIDE ═══════ */}
        {showGuide && (
          <TouchableOpacity
            style={s.guideBanner}
            onPress={() => navigation.navigate('BeginnerGuide')}
            activeOpacity={0.85}
          >
            <View style={s.guideIcon}>
              <Ionicons name="school" size={20} color={PINK} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.guideTitle}>Primeiros passos</Text>
              <Text style={s.guideSub}>Aprenda a usar o DocePreço em 3 passos</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={PINK} />
          </TouchableOpacity>
        )}

        {/* ═══════ WEEKLY CHART ═══════ */}
        <View style={s.secHeader}>
          <Text style={s.secTitle}>Últimos 7 dias</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Reports' as never)} activeOpacity={0.7}>
            <Text style={s.secLink}>Relatórios</Text>
          </TouchableOpacity>
        </View>

        <View style={s.chartCard}>
          {/* Resumo semanal */}
          <View style={s.chartSummary}>
            <View>
              <Text style={s.chartSumLabel}>Total da semana</Text>
              <Text style={s.chartSumValue}>{formatCurrency(weeklyData.reduce((a, b) => a + b, 0))}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={s.chartSumLabel}>Hoje</Text>
              <Text style={[s.chartSumValue, { color: PINK }]}>{formatCurrency(weeklyData[6] ?? 0)}</Text>
            </View>
          </View>
          {/* Barras */}
          <View style={s.chartBars}>
            {weeklyData.map((val, i) => {
              const h = Math.max((val / maxWeekly) * 72, 6);
              const isToday2 = i === 6;
              return (
                <View key={i} style={s.chartCol}>
                  {val > 0 && (
                    <Text style={[s.chartValLabel, isToday2 && { color: PINK }]}>
                      {formatCurrency(val)}
                    </Text>
                  )}
                  {isToday2 ? (
                    <LinearGradient
                      colors={['#FF6AAE', PINK]}
                      style={[s.chartBar, { height: h }]}
                    />
                  ) : (
                    <View style={[s.chartBar, { height: h, backgroundColor: '#FFE3EF' }]} />
                  )}
                  <Text style={[s.chartLbl, isToday2 && { color: PINK, fontWeight: '700' }]}>{weeklyDayLabels[i]}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* ═══════ RECENT SALES ═══════ */}
        <View style={s.secHeader}>
          <Text style={s.secTitle}>Vendas recentes</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Sales' as never)} activeOpacity={0.7}>
            <Text style={s.secLink}>Ver todas</Text>
          </TouchableOpacity>
        </View>

        {recentSales.length === 0 ? (
          <View style={s.emptyBox}>
            <Ionicons name="receipt-outline" size={28} color={INK3} />
            <Text style={s.emptyTxt}>Nenhuma venda registrada</Text>
          </View>
        ) : (
          <View style={s.salesCard}>
            {recentSales.map((sale, idx) => {
              const initials = sale.recipeName.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');
              const bgColor = THUMB_COLORS[idx % THUMB_COLORS.length];
              const isToday2 = sale.saleDate === today;
              const meta = isToday2
                ? `${sale.quantitySold} un · ${new Date(sale.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
                : `${sale.quantitySold} un · ${sale.saleDate === new Date(Date.now() - 86400000).toISOString().split('T')[0] ? 'ontem' : new Date(sale.saleDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`;

              return (
                <View key={sale.id} style={[s.saleRow, idx > 0 && s.saleRowBorder]}>
                  <View style={[s.saleThumb, { backgroundColor: bgColor }]}>
                    <Text style={s.saleThumbTxt}>{initials}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.saleName} numberOfLines={1}>{sale.recipeName}</Text>
                    <Text style={s.saleMeta}>{meta}</Text>
                  </View>
                  <Text style={s.saleAmt}>+ {formatCurrency(sale.totalRevenue)}</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* ═══════ FEATURES GRID (free + premium) ═══════ */}
        <View style={[s.secHeader, { marginTop: 20 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={s.secTitle}>{isPremium ? 'Atalhos' : 'Recursos PRO'}</Text>
            {!isPremium && (
              <View style={s.premBadge}>
                <Text style={s.premBadgeTxt}>PREMIUM</Text>
              </View>
            )}
          </View>
        </View>

        <View style={s.proGrid}>
          {([
            { icon: 'bar-chart-outline' as const, bg: '#FFF0F6', ic: PINK, title: 'Relatórios', sub: 'Gráficos e análises', route: 'Reports' },
            { icon: 'people-outline' as const, bg: '#EEF8FD', ic: '#2BA7DD', title: 'Clientes', sub: 'Contatos e aniversários', route: 'Clients' },
            { icon: 'clipboard-outline' as const, bg: '#DCF6E5', ic: GREEN, title: 'Encomendas', sub: 'Entregas e pagamento', route: 'Orders' },
            { icon: 'pricetag-outline' as const, bg: '#FFF1CE', ic: '#C8870B', title: 'Épocas', sub: 'Ajuste sazonal de preços', route: 'Seasons' },
            { icon: 'cash-outline' as const, bg: '#EDE4FB', ic: '#7C3AED', title: 'Financeiro', sub: 'Resultado e DRE', route: 'Finance', master: true },
            { icon: 'cube-outline' as const, bg: '#E9F6FF', ic: '#2BA7DD', title: 'Estoque', sub: 'Baixa automática', route: 'Stock', master: true },
            { icon: 'bulb-outline' as const, bg: '#FFF6D6', ic: '#D99A00', title: 'Dicas de vendas', sub: 'Precificação inteligente e modelos de story para Instagram', route: 'SalesTips', master: true },
          ] as const).map(item => {
            const isMasterItem = 'master' in item && item.master;
            const locked = isMasterItem ? !isMaster : !isPremium;
            return (
              <TouchableOpacity
                key={item.title}
                style={s.proTile}
                onPress={() => navigation.navigate(item.route as never)}
                activeOpacity={0.8}
              >
                {locked && (
                  <View style={[s.proLock, isMasterItem && { backgroundColor: '#EDE4FB' }]}>
                    <Ionicons name="lock-closed" size={10} color={isMasterItem ? '#7C3AED' : '#C8870B'} />
                  </View>
                )}
                {!locked && (
                  <View style={s.proUnlocked}>
                    <Ionicons name="checkmark" size={10} color={GREEN} />
                  </View>
                )}
                <View style={[s.proTileIco, { backgroundColor: item.bg }]}>
                  <Ionicons name={item.icon} size={22} color={item.ic} />
                </View>
                <Text style={s.proTileTitle}>{item.title}</Text>
                <Text style={s.proTileSub}>{item.sub}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* PRO CTA (only free) */}
        {!isPremium && (
          <TouchableOpacity
            style={s.proCtaWrap}
            onPress={() => navigation.navigate('Paywall', { trigger: { kind: 'manual' } })}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#FFF1CE', '#FFE3EF']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={s.proCta}
            >
              <View style={s.proCtaIco}>
                <Ionicons name="sparkles" size={20} color={PINK} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.proCtaTitle}>Desbloqueie tudo no PRO</Text>
                <Text style={s.proCtaSub}>R$ 14,90/mês ou R$ 10 no PIX</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={PINK} />
            </LinearGradient>
          </TouchableOpacity>
        )}

        <View style={s.adWrap}><AdBanner /></View>
      </ScrollView>
      <SupportFab />
      <DemoGuardModal />
    </SafeAreaView>
  );
};

// ──────────────────────── STYLES ────────────────────────

const SHADOW = {
  shadowColor: INK,
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.07,
  shadowRadius: 12,
  elevation: 4,
};

const s = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: CREAM },
  scroll: { flex: 1 },

  /* ── Top bar ── */
  topbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 14,
  },
  topbarLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  topbarRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoBadge: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...SHADOW,
  },
  logoImg: { width: 46, height: 46, borderRadius: 15 },
  dateText: { fontSize: 13, color: INK2, fontWeight: '600' },
  greeting: { fontSize: 23, fontWeight: '700', color: INK, marginTop: 2 },
  proChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 26,
    paddingHorizontal: 9,
    borderRadius: 999,
    shadowColor: '#FFB01F',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  proChipText: { color: '#7A4E00', fontSize: 10.5, fontWeight: '700' },
  profileBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileImg: { width: 46, height: 46, borderRadius: 23 },

  /* ── Hero revenue ── */
  heroWrap: { paddingHorizontal: 18, marginBottom: 18 },
  hero: {
    borderRadius: 26,
    padding: 18,
    paddingBottom: 16,
  },
  heroLabel: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.92)', letterSpacing: 0.2 },
  heroBig: { fontSize: 38, fontWeight: '800', color: '#fff', marginTop: 6, letterSpacing: 0.3 },
  heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.9)', marginTop: 7, fontWeight: '500', marginBottom: 16 },
  heroStats: { flexDirection: 'row', gap: 10 },
  heroStat: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    borderRadius: 15,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  heroStatVal: { fontSize: 20, fontWeight: '700', color: '#fff' },
  heroStatLbl: { fontSize: 11.5, color: 'rgba(255,255,255,0.92)', marginTop: 4, fontWeight: '500', lineHeight: 14 },

  /* ── Quick actions (2×2 grid) ── */
  qaGrid: {
    paddingHorizontal: 18,
    gap: 10,
    marginBottom: 20,
  },
  qaGridRow: {
    flexDirection: 'row',
    gap: 10,
  },
  qaItem: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 18,
    paddingVertical: 13,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    ...SHADOW,
  },
  qaIco: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qaLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: INK,
    lineHeight: 15,
    flexShrink: 1,
  },

  /* ── Section header ── */
  secHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  secTitle: { fontSize: 17, fontWeight: '700', color: INK },
  secLink: { fontSize: 13, fontWeight: '700', color: PINK },

  /* ── Weekly chart ── */
  chartCard: {
    marginHorizontal: 18,
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 16,
    marginBottom: 20,
    ...SHADOW,
  },
  chartSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  chartSumLabel: { fontSize: 12, color: INK2, fontWeight: '500' },
  chartSumValue: { fontSize: 20, fontWeight: '800', color: INK, marginTop: 2 },
  chartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: 100,
  },
  chartCol: { alignItems: 'center', justifyContent: 'flex-end', flex: 1 },
  chartValLabel: { fontSize: 8.5, color: INK2, fontWeight: '600', marginBottom: 3 },
  chartBar: { width: 20, borderTopLeftRadius: 7, borderTopRightRadius: 7, borderBottomLeftRadius: 4, borderBottomRightRadius: 4, marginBottom: 7 },
  chartLbl: { fontSize: 10.5, color: INK2, fontWeight: '600' },

  /* ── Recent sales ── */
  salesCard: {
    marginHorizontal: 18,
    backgroundColor: '#fff',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 8,
    ...SHADOW,
  },
  saleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
  },
  saleRowBorder: {
    borderTopWidth: 1,
    borderTopColor: LINE,
  },
  saleThumb: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  saleThumbTxt: { fontSize: 18, fontWeight: '700', color: '#fff' },
  saleName: { fontSize: 14.5, fontWeight: '700', color: INK },
  saleMeta: { fontSize: 12, color: INK2, fontWeight: '500', marginTop: 2 },
  saleAmt: { fontSize: 15.5, fontWeight: '700', color: GREEN, marginLeft: 8 },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 28,
    marginHorizontal: 18,
    backgroundColor: '#fff',
    borderRadius: 22,
    gap: 8,
    marginBottom: 8,
    ...SHADOW,
  },
  emptyTxt: { fontSize: 13, color: INK3 },

  /* ── PRO section ── */
  premBadge: {
    backgroundColor: '#FFF1CE',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  premBadgeTxt: { fontSize: 10.5, fontWeight: '800', color: '#8A5A00', letterSpacing: 0.3 },
  proGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 18,
    gap: 11,
    marginBottom: 14,
  },
  proTile: {
    width: (SCREEN_WIDTH - 47) / 2,
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 14,
    paddingBottom: 13,
    position: 'relative',
    ...SHADOW,
  },
  proLock: {
    position: 'absolute',
    top: 11,
    right: 11,
    width: 22,
    height: 22,
    borderRadius: 7,
    backgroundColor: '#FFF1CE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  proUnlocked: {
    position: 'absolute',
    top: 11,
    right: 11,
    width: 22,
    height: 22,
    borderRadius: 7,
    backgroundColor: '#DCF6E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  proTileIco: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 9,
  },
  proTileTitle: { fontSize: 14, fontWeight: '700', color: INK },
  proTileSub: { fontSize: 11, color: INK2, fontWeight: '500', marginTop: 2, lineHeight: 14 },
  proCtaWrap: { marginHorizontal: 18, borderRadius: 20, overflow: 'hidden' },
  proCta: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    paddingHorizontal: 16,
    borderRadius: 20,
    gap: 13,
  },
  proCtaIco: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW,
  },
  proCtaTitle: { fontSize: 15.5, fontWeight: '700', color: INK },
  proCtaSub: { fontSize: 12, color: INK2, fontWeight: '500', marginTop: 2 },
  adWrap: { paddingHorizontal: 18, marginBottom: 14 },
  notifBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginHorizontal: 18,
    marginBottom: 10,
    borderRadius: 16,
    padding: 13,
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  notifTitle: { fontSize: 13.5, fontWeight: '700', marginBottom: 2 },
  notifMsg: { fontSize: 12.5, color: INK2, fontWeight: '500', lineHeight: 17 },
  notifLink: { fontSize: 12.5, fontWeight: '700', marginTop: 6 },
  guideBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 18,
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#FFE3EF',
    ...SHADOW,
    shadowOpacity: 0.04,
  },
  guideIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFF0F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  guideTitle: { fontSize: 15, fontWeight: '700', color: INK },
  guideSub: { fontSize: 12, color: INK2, fontWeight: '500', marginTop: 2 },
});
