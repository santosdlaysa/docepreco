import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  RefreshControl,
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
import { demoStatsApi, demoSaleApi, demoStoreApi } from '../../data/demo/demoApi';
import { storeApi } from '../../data/api/storeApi';
import { getMissingStoreItems } from '../utils/storeSetup';
import { usePremium } from '../context/PremiumContext';
import { useDemoGuard } from '../hooks/useDemoGuard';
import { usePaywall } from '../premium/usePaywall';
import { AdBanner, AdBanner2 } from '../ads';
import { SupportFab } from '../components/SupportFab';
import { StoreCityRequiredModal } from '../components/StoreCityRequiredModal';
import { isGuideAvailable } from './BeginnerGuideScreen';
import { bannerApi, Banner, CarouselBanner, PlanBanner } from '../../data/api/bannerApi';
import { bannerStorage, carouselCache } from '../../data/storage/bannerStorage';
import { useCurrencyFormat } from '../hooks/useCurrencyFormat';
import { planConfigApi } from '../../data/api/planConfigApi';
import { orderApi } from '../../data/api/orderApi';
import { notificationReadStorage } from '../../data/storage/notificationReadStorage';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PLAN_BANNER_WIDTH = SCREEN_WIDTH - 36;

// ── Design tokens (from reference) ──
const INK = '#3D2233';
const INK2 = '#9A7E8C';
const CREAM = '#FFF6F0';
const PINK = '#EA4B92';
const GREEN = '#43BE6E';

const BANNER_CONFIG: Record<Banner['type'], { bg: string; border: string; icon: string; iconColor: string }> = {
  info:    { bg: '#EEF8FD', border: '#B8DDEF', icon: 'information-circle-outline', iconColor: '#2BA7DD' },
  warning: { bg: '#FFF8E1', border: '#FFE082', icon: 'warning-outline',            iconColor: '#F57F17' },
  promo:   { bg: '#FFF0F6', border: '#FFD6E9', icon: 'gift-outline',               iconColor: PINK },
  update:  { bg: '#DCF6E5', border: '#A8E6C0', icon: 'arrow-up-circle-outline',    iconColor: GREEN },
};

const DAY_LABELS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { companyName, companyLogo } = useAuth();
  const { isPremium, isMaster, isAdmin, isInTrial, daysLeft } = usePremium();
  const { guardAction, DemoGuardModal } = useDemoGuard();
  const { requirePremium } = usePaywall();

  const [stats, setStats] = useState<AppStats | null>(null);
  const [allSales, setAllSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [hasMandatoryAlert, setHasMandatoryAlert] = useState(false);
  const [hasUnreadOrders, setHasUnreadOrders] = useState(false);
  const [carouselBanners, setCarouselBanners] = useState<CarouselBanner[]>([]);
  const [planBanners, setPlanBanners] = useState<PlanBanner[]>([]);
  const [planBannerIndex, setPlanBannerIndex] = useState(0);
  const [premiumPriceLabel, setPremiumPriceLabel] = useState('R$ 14,90');
  const [masterPriceLabel, setMasterPriceLabel] = useState('R$ 30,00');
  const [showCityModal, setShowCityModal] = useState(false);
  const planBannerRef = useRef<ScrollView>(null);

  const sApi = isDemoMode() ? demoSaleApi : saleApi;
  const stApi = isDemoMode() ? demoStatsApi : statsApi;
  const storeSettingsApi = isDemoMode() ? demoStoreApi : storeApi;

  const { formatCurrency } = useCurrencyFormat();

  const dismissBanner = async (id: string) => {
    await bannerStorage.dismiss(id);
    setBanners(prev => prev.filter(b => b.id !== id));
  };

  const loadData = async () => {
    isGuideAvailable().then(setShowGuide).catch(() => {});
    bannerApi.getActive().then(async active => {
      await bannerStorage.clearExpired(active.map(b => b.id));
      const dismissed = await bannerStorage.getDismissedIds();
      setBanners(active.filter(b => !dismissed.includes(b.id)));
    }).catch(() => {});
    // Banners patrocinados: mostra o cache local na hora, atualiza da rede em seguida.
    carouselCache.get().then(cached => {
      if (cached.length) setCarouselBanners(cached);
    }).catch(() => {});
    bannerApi.getCarousel().then(list => {
      setCarouselBanners(list);
      carouselCache.set(list);
    }).catch(() => {});
    bannerApi.getPlan().then(setPlanBanners).catch(() => {});
    if (isMaster) {
      storeSettingsApi.getSettings()
        .then(s => {
          setHasMandatoryAlert(getMissingStoreItems(s).length > 0);
          // Loja online sem cidade não aparece no filtro por região do marketplace
          if (!isDemoMode() && s.active && !s.city?.trim()) setShowCityModal(true);
        })
        .catch(() => setHasMandatoryAlert(false));
      orderApi.getAll().then(async all => {
        const readIds = await notificationReadStorage.getReadIds();
        const unread = all.some(o => o.source === 'online' && !readIds.includes(`order:${o.id}`));
        setHasUnreadOrders(unread);
      }).catch(() => setHasUnreadOrders(false));
    } else {
      setHasMandatoryAlert(false);
      setHasUnreadOrders(false);
    }
    await Promise.all([
      stApi.getStats().then(setStats).catch(() => {}),
      sApi.getAll().then(setAllSales).catch(() => {}),
    ]);
  };

  useEffect(() => {
    loadData().finally(() => setLoading(false));
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  useEffect(() => {
    if (isPremium && !isAdmin) return;
    planConfigApi.getPixConfig().then(config => {
      if (!config) return;
      setPremiumPriceLabel(config.monthly.priceLabel);
      setMasterPriceLabel(config.masterMonthly.priceLabel);
    }).catch(() => {});
  }, [isPremium, isAdmin]);

  // Banners institucionais do carrossel visíveis conforme o plano do usuário.
  const visiblePlanBanners = planBanners.filter(b => {
    if (isAdmin) return true;
    if (b.audience === 'master') return isMaster;
    if (b.audience === 'non_master') return !isMaster;
    return true; // 'all'
  });

  // Nº de slides do carrossel = planos (só p/ não-premium) + institucionais
  // (Loja Online, por público) + patrocinados + slide "anuncie".
  const planSlideCount = (!isPremium || isAdmin) ? 2 : 0;
  const totalSlides = planSlideCount + visiblePlanBanners.length + carouselBanners.length + 1;

  // Auto-rotação genérica entre todos os slides.
  useEffect(() => {
    if (totalSlides <= 1) return;
    const interval = setInterval(() => {
      setPlanBannerIndex(current => {
        const next = (current + 1) % totalSlides;
        planBannerRef.current?.scrollTo({ x: next * PLAN_BANNER_WIDTH, animated: true });
        return next;
      });
    }, 4500);
    return () => clearInterval(interval);
  }, [totalSlides]);

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
      <ScrollView
        style={s.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[PINK]} tintColor={PINK} />
        }
      >

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
              style={s.bellBtn}
              onPress={() => navigation.navigate('Notifications')}
              activeOpacity={0.7}
            >
              <Ionicons name="notifications-outline" size={22} color={INK} />
              {(banners.length > 0 || hasMandatoryAlert || hasUnreadOrders) && (
                <View style={[s.bellDot, hasMandatoryAlert && { backgroundColor: '#C0392B' }]} />
              )}
            </TouchableOpacity>
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

        {/* ═══════ TRIAL BANNER ═══════ */}
        {isInTrial && daysLeft !== null && (
          <View style={[s.trialBanner, { backgroundColor: '#FFF0F6', borderColor: '#FFD6E9' }]}>
            <Ionicons name="gift-outline" size={24} color={PINK} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={s.trialBannerTitle}>
                {daysLeft === 1 ? '1 dia grátis restante' : `${daysLeft} dias grátis restantes`}
              </Text>
              <Text style={s.trialBannerSub}>Aproveite todos os recursos Premium</Text>
            </View>
          </View>
        )}

        {/* ═══════ SUBSCRIPTION PLANS + SPONSORED ═══════ */}
        {totalSlides > 0 && (
          <View style={s.planBannerSection}>
            <ScrollView
              ref={planBannerRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              decelerationRate="fast"
              snapToInterval={PLAN_BANNER_WIDTH}
              onMomentumScrollEnd={event => {
                const next = Math.round(event.nativeEvent.contentOffset.x / PLAN_BANNER_WIDTH);
                setPlanBannerIndex(Math.min(totalSlides - 1, Math.max(0, next)));
              }}
            >
              {(!isPremium || isAdmin) && ([
                {
                  key: 'premium',
                  gradient: ['#FF8FC0', '#EA4B92', '#C42C74'] as const,
                  accent: PINK,
                  titleColor: '#FFFFFF',
                  eyebrowColor: 'rgba(255,255,255,0.85)',
                  blob: 'rgba(255,255,255,0.16)',
                  icon: 'diamond' as const,
                  eyebrow: 'PLANO PREMIUM',
                  title: 'Faça sua confeitaria crescer',
                  price: premiumPriceLabel,
                  link: 'Ver benefícios',
                  trigger: { kind: 'manual' as const },
                },
                {
                  key: 'master',
                  gradient: ['#A97BF0', '#7C3AED', '#5B21B6'] as const,
                  accent: '#7C3AED',
                  titleColor: '#FFFFFF',
                  eyebrowColor: 'rgba(255,255,255,0.85)',
                  blob: 'rgba(255,255,255,0.16)',
                  icon: 'trophy' as const,
                  eyebrow: 'PLANO MASTER',
                  title: 'Controle total do seu negócio',
                  price: masterPriceLabel,
                  link: 'Conhecer o Master',
                  trigger: { kind: 'master' as const },
                },
              ]).map(plan => (
                <TouchableOpacity
                  key={plan.key}
                  style={{ width: PLAN_BANNER_WIDTH }}
                  activeOpacity={0.9}
                  onPress={() => navigation.navigate('Paywall', { trigger: plan.trigger })}
                >
                  <LinearGradient
                    colors={plan.gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={s.planBanner}
                  >
                    {/* Decoração de fundo */}
                    <View style={[s.planBlob, s.planBlobOne, { backgroundColor: plan.blob }]} />
                    <View style={[s.planBlob, s.planBlobTwo, { backgroundColor: plan.blob }]} />
                    <Ionicons name={plan.icon} size={128} color="rgba(255,255,255,0.12)" style={s.planWatermark} />

                    <View style={s.planBannerOverlay}>
                      <View style={s.planIconBox}><Ionicons name={plan.icon} size={22} color={plan.accent} /></View>
                      <View style={s.planBannerContent}>
                        <Text style={[s.planBannerEyebrow, { color: plan.eyebrowColor }]}>{plan.eyebrow}</Text>
                        <Text style={[s.planBannerTitle, { color: plan.titleColor }]}>{plan.title}</Text>
                        <Text style={[s.planBannerPrice, { color: '#FFFFFF' }]}>{plan.price}<Text style={s.planBannerPeriod}>/mês</Text></Text>
                        <View style={s.planBannerLink}>
                          <Text style={[s.planBannerLinkText, { color: plan.accent }]}>{plan.link}</Text>
                          <Ionicons name="arrow-forward" size={12} color={plan.accent} />
                        </View>
                      </View>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              ))}

              {/* Loja Online: banners institucionais do carrossel (gerenciáveis no painel web) */}
              {visiblePlanBanners.map(pb => (
                <TouchableOpacity
                  key={pb.id}
                  style={{ width: PLAN_BANNER_WIDTH }}
                  activeOpacity={0.9}
                  onPress={() => navigation.navigate('Store' as never)}
                >
                  <LinearGradient
                    colors={['#2DD4BF', '#0D9488', '#0F766E']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={s.planBanner}
                  >
                    <View style={[s.planBlob, s.planBlobOne, { backgroundColor: 'rgba(255,255,255,0.16)' }]} />
                    <View style={[s.planBlob, s.planBlobTwo, { backgroundColor: 'rgba(255,255,255,0.16)' }]} />
                    <Ionicons name="storefront" size={128} color="rgba(255,255,255,0.12)" style={s.planWatermark} />
                    <View style={s.planBannerOverlay}>
                      <View style={s.planIconBox}><Ionicons name="storefront" size={22} color="#0D9488" /></View>
                      <View style={s.planBannerContent}>
                        {!!pb.eyebrow && <Text style={[s.planBannerEyebrow, { color: 'rgba(255,255,255,0.85)' }]}>{pb.eyebrow}</Text>}
                        <Text style={[s.planBannerTitle, { color: '#FFFFFF' }]}>{pb.title}</Text>
                        <Text style={s.planBannerDesc} numberOfLines={2}>{pb.message}</Text>
                        {!!pb.ctaLabel && (
                          <View style={s.planBannerLink}>
                            <Text style={[s.planBannerLinkText, { color: '#0D9488' }]}>{pb.ctaLabel}</Text>
                            <Ionicons name="arrow-forward" size={12} color="#0D9488" />
                          </View>
                        )}
                      </View>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              ))}

              {carouselBanners.map(banner => (
                <TouchableOpacity
                  key={banner.id}
                  style={{ width: PLAN_BANNER_WIDTH }}
                  activeOpacity={banner.actionUrl ? 0.9 : 1}
                  disabled={!banner.actionUrl}
                  onPress={() => { if (banner.actionUrl) Linking.openURL(banner.actionUrl).catch(() => {}); }}
                >
                  {banner.imageUrl ? (
                    <Image source={{ uri: banner.imageUrl }} style={s.sponsoredBanner} resizeMode="cover" />
                  ) : (
                    <View style={[s.sponsoredBanner, s.sponsoredFallback]}>
                      <Text style={s.sponsoredFallbackTitle} numberOfLines={2}>{banner.title}</Text>
                      {!!banner.message && <Text style={s.sponsoredFallbackMsg} numberOfLines={2}>{banner.message}</Text>}
                    </View>
                  )}
                  <View style={s.sponsoredTag}><Text style={s.sponsoredTagTxt}>Anúncio</Text></View>
                </TouchableOpacity>
              ))}

              {/* Slide de convite: confeitaria anuncia no carrossel */}
              <TouchableOpacity
                style={{ width: PLAN_BANNER_WIDTH }}
                activeOpacity={0.9}
                onPress={() => navigation.navigate('AnnounceBanner')}
              >
                <View style={[s.planBanner, s.announceBanner]}>
                  <View style={s.announceIconBox}>
                    <Ionicons name="megaphone" size={24} color={PINK} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.announceEyebrow}>SUA CONFEITARIA AQUI</Text>
                    <Text style={s.announceTitle}>Anuncie no carrossel da Home</Text>
                    <View style={s.announceCtaPill}>
                      <Text style={s.announceCtaTxt}>Quero anunciar</Text>
                      <Ionicons name="arrow-forward" size={12} color="#fff" />
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            </ScrollView>
            <View style={s.planBannerDots}>
              {Array.from({ length: totalSlides }).map((_, index) => (
                <View key={index} style={[s.planBannerDot, index === planBannerIndex && s.planBannerDotActive]} />
              ))}
            </View>
          </View>
        )}

        {/* ═══════ HERO REVENUE ═══════ */}
        <View style={s.heroWrap}>
          <LinearGradient
            colors={['#E23B87', '#EA4B92', '#F56FAC']}
            locations={[0, 0.52, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={s.hero}
          >
            <View style={s.heroTopRow}>
              <Text style={s.heroLabel}>Faturamento de hoje</Text>
              <View style={s.heroSalesPill}>
                <Ionicons name="cart" size={12} color="#fff" />
                <Text style={s.heroSalesPillTxt}>{todaySales.length} venda{todaySales.length !== 1 ? 's' : ''}</Text>
              </View>
            </View>

            <Text style={s.heroBig} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72}>{formatCurrency(todayRevenue)}</Text>

            <View style={s.heroFooter}>
              <View style={s.heroFooterItem}>
                <Text style={s.heroFooterLbl}>Lucro estimado hoje</Text>
                <Text style={s.heroFooterVal}>{formatCurrency(todayProfit)}</Text>
              </View>
              <View style={s.heroFooterDivider} />
              <View style={s.heroFooterItem}>
                <Text style={s.heroFooterLbl}>Faturamento no mês</Text>
                <Text style={s.heroFooterVal}>{formatCurrency(stats?.monthlyRevenue ?? 0)}</Text>
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
            { icon: 'storefront-outline' as const, bg: '#EDE4FB', ic: '#7C3AED', title: 'Loja Online', sub: 'Link de pedidos para clientes', route: 'Store', master: true },
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
                <Text style={s.proCtaSub}>Mensal R$ 14,90  ·  Anual R$ 120 no PIX</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={PINK} />
            </LinearGradient>
          </TouchableOpacity>
        )}

        <View style={s.adWrap}><AdBanner2 /></View>
      </ScrollView>
      <SupportFab />
      <DemoGuardModal />
      <StoreCityRequiredModal
        visible={showCityModal}
        onFill={() => {
          setShowCityModal(false);
          navigation.navigate('StoreSettings');
        }}
        onLater={() => setShowCityModal(false)}
      />
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
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
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
  bellBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellDot: {
    position: 'absolute',
    top: 9,
    right: 10,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: PINK,
    borderWidth: 1.5,
    borderColor: '#fff',
  },

  /* ── Subscription plans carousel ── */
  planBannerSection: { marginHorizontal: 18, marginBottom: 14 },
  planBanner: {
    height: 168,
    borderRadius: 22,
    overflow: 'hidden',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowColor: INK,
    elevation: 5,
  },
  planBlob: { position: 'absolute', borderRadius: 999 },
  planBlobOne: { width: 180, height: 180, top: -70, right: -40 },
  planBlobTwo: { width: 120, height: 120, bottom: -50, right: 60 },
  planWatermark: { position: 'absolute', right: -14, bottom: -18, transform: [{ rotate: '-12deg' }] },
  planBannerOverlay: { width: '80%', paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 13 },
  planIconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: INK,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 3,
  },
  planBannerContent: { flex: 1 },
  planBannerEyebrow: { fontSize: 9.5, fontWeight: '900', letterSpacing: 1 },
  planBannerTitle: { fontSize: 16, lineHeight: 19, fontWeight: '800', marginTop: 4 },
  planBannerPrice: { fontSize: 18, fontWeight: '800', marginTop: 5 },
  planBannerDesc: { fontSize: 11.5, lineHeight: 15, fontWeight: '600', color: 'rgba(255,255,255,0.92)', marginTop: 5 },
  planBannerPeriod: { fontSize: 9.5, fontWeight: '600', color: 'rgba(255,255,255,0.8)' },
  planBannerLink: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    marginTop: 10,
    paddingVertical: 5,
    paddingHorizontal: 11,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
  },
  planBannerLinkText: { fontSize: 10.5, fontWeight: '800' },
  planBannerDots: { flexDirection: 'row', justifyContent: 'center', gap: 5, marginTop: 9 },
  planBannerDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#E6CFDA' },
  planBannerDotActive: { width: 18, backgroundColor: PINK },

  /* ── Sponsored (confeitaria) carousel banner ── */
  sponsoredBanner: {
    width: '100%',
    height: 168,
    borderRadius: 22,
    backgroundColor: '#F1E2DA',
    overflow: 'hidden',
  },
  sponsoredFallback: { alignItems: 'flex-start', justifyContent: 'center', padding: 18 },
  sponsoredFallbackTitle: { fontSize: 17, fontWeight: '800', color: INK },
  sponsoredFallbackMsg: { fontSize: 12.5, color: INK2, fontWeight: '500', marginTop: 6, lineHeight: 17 },
  sponsoredTag: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  sponsoredTagTxt: { fontSize: 9, fontWeight: '700', color: '#fff', letterSpacing: 0.3 },
  announceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 18,
    backgroundColor: '#FFF0F6',
    borderWidth: 1.5,
    borderColor: '#FFD6E9',
    borderStyle: 'dashed',
  },
  announceIconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  announceEyebrow: { fontSize: 9.5, fontWeight: '900', letterSpacing: 1, color: PINK },
  announceTitle: { fontSize: 16, lineHeight: 19, fontWeight: '800', color: INK, marginTop: 4 },
  announceCtaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    marginTop: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: PINK,
  },
  announceCtaTxt: { fontSize: 11, fontWeight: '800', color: '#fff' },

  /* ── Hero revenue ── */
  heroWrap: { paddingHorizontal: 18, marginBottom: 18 },
  hero: {
    borderRadius: 26,
    padding: 18,
    paddingBottom: 16,
    shadowColor: '#D8377F',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 5,
  },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroLabel: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.95)', letterSpacing: 0.2 },
  heroSalesPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  heroSalesPillTxt: { fontSize: 11.5, fontWeight: '700', color: '#fff' },
  heroBig: { fontSize: 38, fontWeight: '800', color: '#fff', marginTop: 6, letterSpacing: 0.1 },
  heroFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  heroFooterItem: { flex: 1 },
  heroFooterDivider: { width: 1, alignSelf: 'stretch', backgroundColor: 'rgba(255,255,255,0.3)', marginHorizontal: 14 },
  heroFooterLbl: { fontSize: 11.5, color: 'rgba(255,255,255,0.9)', fontWeight: '500' },
  heroFooterVal: { fontSize: 18, fontWeight: '800', color: '#fff', marginTop: 3 },

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

  /* ── Trial banner ── */
  trialBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 18,
    marginBottom: 14,
    marginTop: -4,
    borderRadius: 16,
    padding: 13,
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  trialBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: PINK,
    marginBottom: 2,
  },
  trialBannerSub: {
    fontSize: 12,
    color: INK2,
    fontWeight: '500',
  },
});
