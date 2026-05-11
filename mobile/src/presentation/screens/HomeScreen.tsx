import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
  Image,
  ActivityIndicator,
  Dimensions,
  Modal,
  TextInput,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { Card } from '../components/Card';
import { shopeeBanners, ShopeeBanner } from '../data/shopeeBanners';
import { useAuth } from '../../context/AuthContext';
import { statsApi, AppStats } from '../../data/api/statsApi';
import { isDemoMode } from '../../data/demo/demoMode';
import { demoStatsApi, demoBannerApi } from '../../data/demo/demoApi';
import { usePremium } from '../context/PremiumContext';
import { goalApi, RevenueGoal } from '../../data/api/goalApi';
import { bannerApi, Banner } from '../../data/api/bannerApi';
import { bannerStorage } from '../../data/storage/bannerStorage';
import { generateInsights, Insight } from '../utils/generateInsights';
import { isGuideAvailable } from './BeginnerGuideScreen';
import { useTranslation } from 'react-i18next';
import { AdBanner, AdBannerAlways } from '../ads';
import { useDemoGuard } from '../hooks/useDemoGuard';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface QuickActionItem {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description: string;
  route: keyof RootStackParamList;
  color: string;
  premium?: boolean;
}

// Cache em memória para não re-buscar a mesma URL
const ogImageCache = new Map<string, string | null>();

const SHOPEE_CDN = 'https://down-br.img.susercontent.com/file/';

const fetchOgImage = async (url: string): Promise<string | null> => {
  if (ogImageCache.has(url)) return ogImageCache.get(url) ?? null;
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9',
      },
    });
    const html = await res.text();

    // 1ª tentativa: __NEXT_DATA__ (JSON do produto embutido no HTML pelo Shopee/Next.js)
    //   contém a imagem real do anúncio
    const nextDataMatch = html.match(/<script[^>]+id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if (nextDataMatch) {
      try {
        const data = JSON.parse(nextDataMatch[1]);
        const item =
          data?.props?.pageProps?.initialData?.data?.item ||
          data?.props?.pageProps?.productItem;
        const images: string[] | undefined = item?.images;
        if (images?.[0]) {
          const imgUrl = images[0].startsWith('http') ? images[0] : `${SHOPEE_CDN}${images[0]}`;
          ogImageCache.set(url, imgUrl);
          return imgUrl;
        }
      } catch {
        // JSON inválido, segue para próxima tentativa
      }
    }

    // 2ª tentativa: og:image (vários formatos possíveis)
    const patterns = [
      /property=["']og:image["'][^>]*content=["']([^"']+)["']/i,
      /content=["']([^"']+)["'][^>]*property=["']og:image["']/i,
      /"og:image","content":"([^"]+)"/,
    ];
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match?.[1]) {
        ogImageCache.set(url, match[1]);
        return match[1];
      }
    }

    ogImageCache.set(url, null);
    return null;
  } catch {
    ogImageCache.set(url, null);
    return null;
  }
};

// Hook: usa `image` direto se informado, senão busca automaticamente da URL
const useOgImage = (url: string, image?: string) => {
  const [imageUrl, setImageUrl] = useState<string | null>(image ?? null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (image) { setImageUrl(image); return; } // foto manual tem prioridade
    const isPlaceholder = !url || url === 'SEU_LINK_AFILIADO_AQUI';
    if (isPlaceholder) return;
    if (ogImageCache.has(url)) { setImageUrl(ogImageCache.get(url) ?? null); return; }
    setLoading(true);
    fetchOgImage(url).then((img) => { setImageUrl(img); setLoading(false); });
  }, [url, image]);

  return { imageUrl, loading };
};

// Banner de produto — scroll horizontal
const BANNER_WIDTH = Dimensions.get('window').width - 40; // 20px padding cada lado
const ShopeeBannerCard: React.FC<{ product: ShopeeBanner; onPress: () => void }> = ({
  product,
  onPress,
}) => {
  const { t } = useTranslation();
  const { imageUrl, loading } = useOgImage(product.url, product.image);
  return (
    <TouchableOpacity
      style={[styles.shopeeFeatured, { width: BANNER_WIDTH }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={styles.shopeeFeaturedContent}>
        <View style={styles.shopeeFeaturedTag}>
          <Text style={styles.shopeeFeaturedTagText}>Shopee</Text>
        </View>
        <Text style={styles.shopeeFeaturedName}>{product.name}</Text>
        <Text style={styles.shopeeFeaturedDesc}>{product.description}</Text>
        <View style={styles.shopeeButton}>
          <Text style={styles.shopeeButtonText}>{t('home.viewOnShopee')}</Text>
          <Ionicons name="open-outline" size={13} color="#fff" />
        </View>
      </View>
      <View style={styles.shopeeFeaturedImageBox}>
        {loading ? (
          <ActivityIndicator size="large" color="#EE4D2D" />
        ) : imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.shopeeFeaturedImage} resizeMode="cover" />
        ) : (
          <Text style={styles.shopeeFeaturedEmoji}>{product.emoji}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

// quickActions moved inside component for i18n

export const HomeScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp>();
  const { companyName, isDemoMode: isDemo, companyLogo } = useAuth();
  const { isPremium } = usePremium();
  const [stats, setStats] = useState<AppStats | null>(null);
  const [goal, setGoal] = useState<RevenueGoal | null>(null);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [showGuide, setShowGuide] = useState(false);
  const [insightsCollapsed, setInsightsCollapsed] = useState(false);
  const { guardAction, DemoGuardModal } = useDemoGuard();
  const api = isDemoMode() ? demoStatsApi : statsApi;

  const quickActions: QuickActionItem[] = [
    {
      icon: 'book-outline',
      label: t('home.myRecipes'),
      description: t('home.manageRecipes'),
      route: 'Recipes',
      color: colors.primary,
    },
    {
      icon: 'basket-outline',
      label: t('home.ingredientsLabel'),
      description: t('home.registerIngredients'),
      route: 'Ingredients',
      color: colors.secondary,
    },
    {
      icon: 'calculator-outline',
      label: t('home.newRecipe'),
      description: t('home.calculateIdealPrice'),
      route: 'CreateRecipe',
      color: '#9C27B0',
    },
    {
      icon: 'calendar-outline',
      label: t('home.orders'),
      description: t('home.manageOrders'),
      route: 'Orders',
      color: '#FF6B35',
      premium: true,
    },
    {
      icon: 'people-outline',
      label: t('home.clients'),
      description: t('home.clientRegistry'),
      route: 'Clients',
      color: '#4CAF50',
      premium: true,
    },
    {
      icon: 'stats-chart-outline',
      label: t('home.reports'),
      description: t('home.revenueAndStats'),
      route: 'Reports',
      color: '#2196F3',
      premium: true,
    },
    {
      icon: 'pricetag-outline',
      label: t('home.seasons'),
      description: t('home.seasonalPrices'),
      route: 'Seasons',
      color: '#9C27B0',
      premium: true,
    },
  ];

  useEffect(() => {
    api.getStats().then(setStats).catch(() => {});
    if (!isDemoMode()) {
      const now = new Date();
      goalApi.get(now.getMonth() + 1, now.getFullYear()).then(setGoal).catch(() => {});
    }

    // Fetch banners
    const bApi = isDemoMode() ? demoBannerApi : bannerApi;
    bApi.getActive().then(async (active) => {
      const dismissed = await bannerStorage.getDismissedIds();
      await bannerStorage.clearExpired(active.map(b => b.id));
      setBanners(active.filter(b => !dismissed.includes(b.id)));
    }).catch(() => {});

    // Check beginner guide: show only if user hasn't completed all steps
    Promise.all([
      isGuideAvailable(),
      api.getStats(),
    ]).then(([notDismissed, s]) => {
      const allDone = s.ingredientsCount >= 1 && s.recipesCount >= 1;
      setShowGuide(notDismissed && !allDone);
    }).catch(() => {});
  }, []);

  const [showGoalInput, setShowGoalInput] = useState(false);
  const [goalInputValue, setGoalInputValue] = useState('');

  const handleSetGoal = () => {
    if (Platform.OS === 'ios') {
      Alert.prompt(
        t('home.goalPromptTitle'),
        t('home.goalPromptMessage'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.save'),
            onPress: async (value) => {
              const amount = parseFloat((value ?? '').replace(',', '.'));
              if (!isNaN(amount) && amount > 0) {
                const now = new Date();
                const saved = await goalApi.set(amount, now.getMonth() + 1, now.getFullYear());
                setGoal(saved);
              }
            },
          },
        ],
        'plain-text',
        goal ? String(goal.amount) : '',
        'numeric'
      );
    } else {
      setGoalInputValue(goal ? String(goal.amount) : '');
      setShowGoalInput(true);
    }
  };

  const saveGoalAndroid = async () => {
    const amount = parseFloat(goalInputValue.replace(',', '.'));
    if (!isNaN(amount) && amount > 0) {
      const now = new Date();
      const saved = await goalApi.set(amount, now.getMonth() + 1, now.getFullYear());
      setGoal(saved);
    }
    setShowGoalInput(false);
  };

  const dismissBanner = async (id: string) => {
    await bannerStorage.dismiss(id);
    setBanners(prev => prev.filter(b => b.id !== id));
  };

  const openShopeeLink = async (url: string) => {
    if (url === 'SEU_LINK_AFILIADO_AQUI') {
      Alert.alert(t('home.configureLink'), t('home.configureLinkMessage'));
      return;
    }
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert(t('common.error'), t('home.cannotOpenShopee'));
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>{t('home.greeting', { name: companyName || t('home.greetingDefault') })}</Text>
            <Text style={styles.subtitle}>{t('home.subtitle')}</Text>
          </View>
          <TouchableOpacity
            style={styles.logoContainer}
            onPress={() => navigation.navigate('Profile' as never)}
            activeOpacity={0.7}
          >
            {companyLogo ? (
              <Image source={{ uri: companyLogo }} style={styles.logoImage} />
            ) : (
              <Ionicons name="person-circle-outline" size={32} color={colors.primary} />
            )}
          </TouchableOpacity>
        </View>

        {isDemo && (
          <View style={styles.demoBanner}>
            <Ionicons name="information-circle-outline" size={18} color="#6D5000" />
            <Text style={styles.demoBannerText}>{t('home.demoMode')}</Text>
          </View>
        )}

        {banners.map(b => {
          const cfg = {
            info:    { bg: '#EBF5FF', border: '#BFDBFE', text: '#1E40AF', icon: 'information-circle-outline' as const },
            warning: { bg: '#FFF8E1', border: '#FFE082', text: '#6D5000', icon: 'warning-outline' as const },
            promo:   { bg: '#ECFDF5', border: '#A7F3D0', text: '#065F46', icon: 'gift-outline' as const },
            update:  { bg: '#F3E8FF', border: '#C4B5FD', text: '#5B21B6', icon: 'rocket-outline' as const },
          }[b.type];
          return (
            <View
              key={b.id}
              style={[styles.appBanner, { backgroundColor: cfg.bg, borderColor: cfg.border }]}
            >
              <Ionicons name={cfg.icon} size={20} color={cfg.text} style={{ marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.appBannerTitle, { color: cfg.text }]}>{b.title}</Text>
                <Text style={[styles.appBannerMessage, { color: cfg.text }]}>{b.message}</Text>
                {b.actionUrl && (
                  <TouchableOpacity onPress={() => Linking.openURL(b.actionUrl!)}>
                    <Text style={[styles.appBannerLink, { color: cfg.text }]}>{t('common.learnMore')}</Text>
                  </TouchableOpacity>
                )}
              </View>
              <TouchableOpacity onPress={() => dismissBanner(b.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={18} color={cfg.text} />
              </TouchableOpacity>
            </View>
          );
        })}

        {showGuide && (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => navigation.navigate('BeginnerGuide' as never)}
          >
            <Card style={styles.guideCard}>
              <View style={styles.guideIconWrap}>
                <Ionicons name="school-outline" size={28} color={colors.primary} />
              </View>
              <View style={styles.guideContent}>
                <Text style={styles.guideTitle}>{t('home.beginnerGuide')}</Text>
                <Text style={styles.guideSubtitle}>
                  {t('home.beginnerGuideSubtitle')}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.primary} />
            </Card>
          </TouchableOpacity>
        )}

        <Card style={styles.heroBanner}>
          <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>{t('home.heroTitle')}</Text>
            <Text style={styles.heroText}>
              {t('home.heroText')}
            </Text>
          </View>
          <View style={styles.heroDecoration}>
            <Text style={styles.heroEmoji}>🎂</Text>
          </View>
        </Card>

        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
          <Text style={styles.infoText}>
            {t('home.infoText')}
          </Text>
        </View>

        {stats && (
          <Card style={styles.statsCard}>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Ionicons name="book-outline" size={20} color={colors.primary} />
                <Text style={styles.statValue}>{stats.recipesCount}</Text>
                <Text style={styles.statLabel}>{t('home.recipes')}</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="basket-outline" size={20} color={colors.secondary} />
                <Text style={styles.statValue}>{stats.ingredientsCount}</Text>
                <Text style={styles.statLabel}>{t('home.ingredients')}</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="cash-outline" size={20} color={colors.success} />
                <Text style={styles.statValue}>{stats.monthlySalesCount}</Text>
                <Text style={styles.statLabel}>{t('home.salesMonth')}</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="trending-up-outline" size={20} color={colors.warning} />
                <Text style={styles.statValue}>
                  {stats.monthlyRevenue.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  })}
                </Text>
                <Text style={styles.statLabel}>{t('home.revenue')}</Text>
              </View>
            </View>
          </Card>
        )}

        {(() => {
          const now = new Date();
          const isCurrentMonth = goal && goal.month === now.getMonth() + 1 && goal.year === now.getFullYear();
          const revenue = stats?.monthlyRevenue ?? 0;
          const progress = isCurrentMonth ? Math.min(revenue / goal!.amount, 1) : 0;
          const pct = Math.round(progress * 100);
          return (
            <TouchableOpacity onPress={handleSetGoal} activeOpacity={0.85}>
              <Card style={styles.goalCard}>
                <View style={styles.goalHeader}>
                  <View style={styles.goalIconWrap}>
                    <Ionicons name="flag-outline" size={18} color={colors.primary} />
                  </View>
                  <Text style={styles.goalTitle}>
                    {isCurrentMonth ? t('home.monthGoalPercent', { pct }) : t('home.monthGoal')}
                  </Text>
                  <Ionicons name="pencil-outline" size={14} color={colors.textMuted} />
                </View>
                {isCurrentMonth ? (
                  <>
                    <View style={styles.goalTrack}>
                      <View style={[styles.goalBar, { width: `${pct}%` as any }]} />
                    </View>
                    <Text style={styles.goalSub}>
                      {revenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      {' ' + t('home.of') + ' '}
                      {goal!.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      {pct >= 100 ? ` 🎉 ${t('home.goalReached')}` : ''}
                    </Text>
                  </>
                ) : (
                  <Text style={styles.goalSub}>{t('home.tapToSetGoal')}</Text>
                )}
              </Card>
            </TouchableOpacity>
          );
        })()}

        {(() => {
          if (!stats) return null;
          const now2 = new Date();
          const isCurrentMonth2 = goal && goal.month === now2.getMonth() + 1 && goal.year === now2.getFullYear();
          const insights = generateInsights(stats, isCurrentMonth2 ? goal : null);
          if (insights.length === 0) return null;

          const insightColors: Record<Insight['type'], { bg: string; border: string; text: string }> = {
            positive: { bg: '#ECFDF5', border: '#A7F3D0', text: '#065F46' },
            warning:  { bg: '#FFF8E1', border: '#FFE082', text: '#6D5000' },
            neutral:  { bg: '#EBF5FF', border: '#BFDBFE', text: '#1E40AF' },
            tip:      { bg: '#F3E8FF', border: '#C4B5FD', text: '#5B21B6' },
          };

          return (
            <>
              <TouchableOpacity
                style={styles.insightsHeader}
                onPress={() => setInsightsCollapsed(!insightsCollapsed)}
                activeOpacity={0.7}
              >
                <Ionicons name="sparkles-outline" size={18} color={colors.primary} />
                <Text style={[styles.sectionTitle, { flex: 1 }]}>{t('home.insights')}</Text>
                <Ionicons
                  name={insightsCollapsed ? 'chevron-down' : 'chevron-up'}
                  size={18}
                  color={colors.textMuted}
                />
              </TouchableOpacity>
              {!insightsCollapsed && insights.map((insight) => {
                const c = insightColors[insight.type];
                return (
                  <View
                    key={insight.id}
                    style={[styles.insightCard, { backgroundColor: c.bg, borderColor: c.border }]}
                  >
                    <Ionicons
                      name={insight.icon as keyof typeof Ionicons.glyphMap}
                      size={20}
                      color={c.text}
                    />
                    <Text style={[styles.insightText, { color: c.text }]}>
                      {insight.message}
                    </Text>
                  </View>
                );
              })}
            </>
          );
        })()}

        <AdBanner />

        <Text style={styles.sectionTitle}>{t('home.quickAccess')}</Text>

        {quickActions.map((action) => (
          <TouchableOpacity
            key={action.route}
            onPress={() => {
              if (action.route.startsWith('Create')) {
                guardAction(() => navigation.navigate(action.route as never));
              } else {
                navigation.navigate(action.route as never);
              }
            }}
            activeOpacity={0.8}
          >
            <Card style={styles.actionCard}>
              <View style={[styles.actionIcon, { backgroundColor: action.color + '20' }]}>
                <Ionicons name={action.icon} size={28} color={action.color} />
              </View>
              <View style={styles.actionContent}>
                <View style={styles.actionLabelRow}>
                  <Text style={styles.actionLabel}>{action.label}</Text>
                  {action.premium && !isPremium && (
                    <View style={styles.premiumBadge}>
                      <Ionicons name="sparkles" size={10} color="#fff" />
                      <Text style={styles.premiumBadgeText}>Premium</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.actionDescription}>{action.description}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </Card>
          </TouchableOpacity>
        ))}

        <View style={styles.shopeeSection}>
          {/* Cabeçalho */}
          <View style={styles.shopeeSectionHeader}>
            <View style={styles.shopeeBadge}>
              <Text style={styles.shopeeBadgeText}>SHOPEE</Text>
            </View>
            <Text style={styles.shopeeSectionTitle}>{t('home.shopeeProducts')}</Text>
          </View>

          {/* Banners em scroll horizontal com snap */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={BANNER_WIDTH + 12}
            decelerationRate="fast"
            contentContainerStyle={styles.shopeeList}
          >
            {shopeeBanners.map((product) => (
              <ShopeeBannerCard
                key={product.id}
                product={product}
                onPress={() => openShopeeLink(product.url)}
              />
            ))}
          </ScrollView>
        </View>

        <View style={styles.tip}>
          <Ionicons name="bulb-outline" size={20} color={colors.warning} />
          <Text style={styles.tipText}>
            {t('home.tip')}
          </Text>
        </View>

        <AdBannerAlways />
      </ScrollView>

      {/* Android goal input modal */}
      <Modal visible={showGoalInput} transparent animationType="fade">
        <KeyboardAvoidingView behavior="padding" style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>{t('home.goalPromptTitle')}</Text>
            <Text style={styles.modalSubtitle}>{t('home.goalPromptMessage')}</Text>
            <TextInput
              style={styles.modalInput}
              value={goalInputValue}
              onChangeText={setGoalInputValue}
              keyboardType="numeric"
              placeholder="Ex: 3000"
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setShowGoalInput(false)} style={styles.modalCancel}>
                <Text style={styles.modalCancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={saveGoalAndroid} style={styles.modalSave}>
                <Text style={styles.modalSaveText}>{t('common.save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      <DemoGuardModal />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, paddingHorizontal: 20 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 16,
  },
  greeting: { ...typography.h2, color: colors.text },
  subtitle: { ...typography.body, color: colors.textSecondary, marginTop: 4 },
  logoContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  demoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF8E1',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  demoBannerText: { ...typography.bodySmall, color: '#6D5000', fontWeight: '600', flex: 1 },
  appBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  appBannerTitle: { ...typography.bodySmall, fontWeight: '700', marginBottom: 2 },
  appBannerMessage: { ...typography.bodySmall, lineHeight: 18 },
  appBannerLink: { ...typography.bodySmall, fontWeight: '700', marginTop: 6 },
  statsCard: {
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statItem: {
    width: '50%',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 4,
  },
  statValue: {
    ...typography.h3,
    color: colors.text,
  },
  statLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  heroBanner: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    marginBottom: 24,
    overflow: 'hidden',
  },
  heroContent: { flex: 1 },
  heroTitle: { ...typography.h3, color: '#fff', marginBottom: 6 },
  heroText: { ...typography.bodySmall, color: 'rgba(255,255,255,0.85)', lineHeight: 20 },
  heroDecoration: { justifyContent: 'center', paddingLeft: 12 },
  heroEmoji: { fontSize: 48 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 32 },
  modalBox: { backgroundColor: colors.surface, borderRadius: 16, padding: 24 },
  modalTitle: { ...typography.h3, color: colors.text, marginBottom: 6 },
  modalSubtitle: { ...typography.body, color: colors.textSecondary, marginBottom: 16 },
  modalInput: {
    borderWidth: 1.5, borderColor: colors.border, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    ...typography.body, color: colors.text, marginBottom: 20,
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  modalCancel: { padding: 10 },
  modalCancelText: { ...typography.body, color: colors.textSecondary, fontWeight: '600' },
  modalSave: { backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  modalSaveText: { ...typography.body, color: '#fff', fontWeight: '700' },
  goalCard: { marginBottom: 14, padding: 14 },
  goalHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  goalIconWrap: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  goalTitle: { ...typography.h4, color: colors.text, flex: 1 },
  goalTrack: {
    height: 8, backgroundColor: colors.border, borderRadius: 4,
    overflow: 'hidden', marginBottom: 6,
  },
  goalBar: { height: '100%', backgroundColor: colors.primary, borderRadius: 4 },
  goalSub: { ...typography.caption, color: colors.textSecondary },
  insightsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
    paddingVertical: 8,
  },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
  },
  insightText: {
    ...typography.bodySmall,
    flex: 1,
    lineHeight: 20,
    fontWeight: '500',
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.text,
    marginBottom: 12,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  actionContent: { flex: 1 },
  actionLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actionLabel: { ...typography.h4, color: colors.text },
  actionDescription: { ...typography.bodySmall, color: colors.textSecondary, marginTop: 2 },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.primary,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  premiumBadgeText: { fontSize: 10, fontWeight: '800' as const, color: '#fff' },
  shopeeSection: {
    marginTop: 8,
    marginBottom: 20,
  },
  shopeeSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  shopeeBadge: {
    backgroundColor: '#EE4D2D',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  shopeeBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  shopeeSectionTitle: {
    ...typography.h4,
    color: colors.text,
  },
  categoryList: {
    gap: 8,
    paddingRight: 4,
    marginBottom: 14,
  },
  categoryPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  categoryPillActive: {
    backgroundColor: '#EE4D2D',
    borderColor: '#EE4D2D',
  },
  categoryPillText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  categoryPillTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  shopeeFeatured: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF0EC',
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: '#FFB59E',
  },
  shopeeFeaturedContent: {
    flex: 1,
    gap: 6,
  },
  shopeeFeaturedTag: {
    alignSelf: 'flex-start',
    backgroundColor: '#EE4D2D',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  shopeeFeaturedTagText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  shopeeFeaturedName: {
    ...typography.h4,
    color: colors.text,
  },
  shopeeFeaturedDesc: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  shopeeFeaturedImageBox: {
    width: 90,
    height: 90,
    borderRadius: 12,
    marginLeft: 14,
    backgroundColor: '#FFE5DC',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  shopeeFeaturedImage: {
    width: 90,
    height: 90,
  },
  shopeeFeaturedEmoji: {
    fontSize: 48,
  },
  shopeeList: {
    gap: 12,
    paddingRight: 4,
  },
  shopeeCard: {
    width: 140,
    backgroundColor: '#FFF5F3',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FFD4C8',
    alignItems: 'center',
    gap: 6,
  },
  shopeeCardImageBox: {
    width: 100,
    height: 100,
    borderRadius: 10,
    backgroundColor: '#FFE5DC',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 2,
  },
  shopeeCardImg: {
    width: 100,
    height: 100,
  },
  shopeeEmoji: {
    fontSize: 40,
  },
  shopeeProductName: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  shopeeProductDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 15,
  },
  shopeeButton: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EE4D2D',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 4,
  },
  shopeeButtonText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  tip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF8E1',
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
    marginBottom: 32,
    gap: 10,
  },
  tipText: { ...typography.bodySmall, color: '#6D5000', flex: 1, lineHeight: 20 },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.primaryLight,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  infoText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 18,
  },
  guideCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    borderColor: colors.primary,
    borderWidth: 1.5,
    backgroundColor: '#FFF0F6',
  },
  guideIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  guideContent: {
    flex: 1,
  },
  guideTitle: {
    ...typography.h4,
    color: colors.primary,
  },
  guideSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
