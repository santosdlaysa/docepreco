import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { useToast } from '../context/ToastContext';
import { usePremium } from '../context/PremiumContext';
import {
  fetchOfferings,
  purchasePackage,
  restorePurchases,
  getActiveEntitlementExpiration,
  PremiumPackage,
  isRevenueCatConfigured,
} from '../../data/premium/revenueCat';
import { authApi } from '../../data/api/authApi';
import { useTranslation } from 'react-i18next';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'Paywall'>;
type RouteType = RouteProp<RootStackParamList, 'Paywall'>;

/* ─── Design tokens ─── */
const INK = '#3D2233';
const INK2 = '#9A7E8C';
const INK3 = '#C4B0BB';
const PINK = '#EA4B92';
const GREEN = '#43BE6E';
const CREAM = '#FFF6F0';
const LINE = '#F1E2DA';
const SHADOW = { shadowColor: INK, shadowOffset: { width: 0, height: 2 } as const, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 };

const FEATS = [
  'Ingredientes e receitas ilimitados',
  'Seu logo personalizado no PDF',
  'Relatórios avançados com gráficos',
  'Gestão de clientes e aniversários',
  'Sistema de encomendas e entregas',
  'Cálculo de mão de obra',
  'Templates de receitas prontos',
  'Precificação sazonal avançada',
  'Histórico de preços de ingredientes',
];

export const PaywallScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteType>();
  const { showToast } = useToast();
  const { refresh } = usePremium();

  const [packages, setPackages] = useState<PremiumPackage[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [configured] = useState(isRevenueCatConfigured());
  const [pixPlan, setPixPlan] = useState<'monthly' | 'annual'>('annual');

  const trigger = route.params?.trigger;

  useEffect(() => {
    (async () => {
      try {
        const offerings = await fetchOfferings();
        setPackages(offerings);
        const annual = offerings.find(o => o.identifier.toLowerCase().includes('annual'));
        setSelected((annual ?? offerings[0])?.identifier ?? null);
      } catch { setPackages([]); }
      finally { setLoading(false); }
    })();
  }, []);

  const syncPremiumWithBackend = async () => {
    try {
      const expiresAt = await getActiveEntitlementExpiration();
      const platform = Platform.OS === 'android' ? 'android' : 'ios';
      await authApi.syncPremium(true, expiresAt, platform as 'ios' | 'android');
    } catch { /* fallback */ }
    await refresh();
  };

  const selectedPkg = packages?.find(p => p.identifier === selected) ?? null;

  const handlePurchase = async () => {
    if (!selected || !selectedPkg) return;
    setPurchasing(selectedPkg.identifier);
    try {
      const result = await purchasePackage(selectedPkg);
      if (result === 'success') {
        showToast(selectedPkg.isTrialEligible ? `Bem-vinda ao teste grátis de ${selectedPkg.trialDays} dias! 🎉` : 'Bem-vinda ao PRO! 🎉', 'success');
        await syncPremiumWithBackend();
        navigation.goBack();
      } else if (result !== 'cancelled') {
        showToast('Erro na compra. Tente novamente.', 'error');
      }
    } catch (error) {
      showToast((error as Error).message || 'Erro na compra', 'error');
    } finally { setPurchasing(null); }
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      const active = await restorePurchases();
      if (active) { showToast('Compra restaurada! 🎉', 'success'); await syncPremiumWithBackend(); navigation.goBack(); }
      else { showToast('Nenhuma assinatura ativa encontrada.', 'info'); }
    } catch (error) { showToast((error as Error).message || 'Erro ao restaurar', 'error'); }
    finally { setRestoring(false); }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: CREAM }} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── Hero (pink gradient) ── */}
        <LinearGradient
          colors={['#FF6AAE', PINK, '#B92C6B']}
          locations={[0, 0.48, 1]}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={st.hero}
        >
          {/* Decorative circles */}
          <View style={[st.deco, { width: 150, height: 150, left: -40, top: -50 }]} />
          <View style={[st.deco, { width: 90, height: 90, right: -20, bottom: -30 }]} />

          {/* Close button */}
          <TouchableOpacity onPress={() => navigation.goBack()} style={st.closeBtn}>
            <Ionicons name="close" size={20} color="#fff" />
          </TouchableOpacity>

          {/* Crown */}
          <View style={st.crown}>
            <Ionicons name="trophy" size={26} color="#FFE08A" />
          </View>

          <Text style={st.heroTitle}>Tudo ilimitado para{'\n'}sua confeitaria</Text>
          <Text style={st.heroSub}>Desbloqueie 9 recursos PRO e leve seu negócio de doces a sério.</Text>
        </LinearGradient>

        <View style={st.body}>

          {/* ── Plans ── */}
          {loading ? (
            <View style={{ paddingVertical: 40, alignItems: 'center' }}>
              <ActivityIndicator size="large" color={PINK} />
            </View>
          ) : !configured || !packages || packages.length === 0 ? (
            /* fallback static plans */
            <View style={st.plans}>
              <TouchableOpacity style={[st.plan, pixPlan === 'monthly' && st.planOn]} onPress={() => setPixPlan('monthly')} activeOpacity={0.8}>
                <View style={[st.radio, pixPlan === 'monthly' && st.radioOn]}>
                  {pixPlan === 'monthly' && <Ionicons name="checkmark" size={12} color="#fff" />}
                </View>
                <Text style={st.planName}>Mensal</Text>
                <Text style={st.planPrice}>R$ 14<Text style={st.planPriceSm}>,90</Text></Text>
                <Text style={st.planPer}>por mês</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[st.plan, pixPlan === 'annual' && st.planOn]} onPress={() => setPixPlan('annual')} activeOpacity={0.8}>
                <View style={st.save}><Text style={st.saveText}>Economize 50%</Text></View>
                <View style={[st.radio, pixPlan === 'annual' && st.radioOn]}>
                  {pixPlan === 'annual' && <Ionicons name="checkmark" size={12} color="#fff" />}
                </View>
                <Text style={st.planName}>Anual</Text>
                <Text style={st.planPrice}>R$ 7<Text style={st.planPriceSm}>,49</Text></Text>
                <Text style={st.planPer}>R$ 89,90/ano</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* RevenueCat plans */
            <View style={st.plans}>
              {packages.map(pkg => {
                const on = selected === pkg.identifier;
                return (
                  <TouchableOpacity key={pkg.identifier} style={[st.plan, on && st.planOn]} onPress={() => setSelected(pkg.identifier)} activeOpacity={0.8}>
                    {pkg.badge && <View style={st.save}><Text style={st.saveText}>{pkg.badge}</Text></View>}
                    {pkg.isTrialEligible && !pkg.badge && !pkg.identifier.toLowerCase().includes('annual') && <View style={[st.save, { backgroundColor: '#2ecc71' }]}><Text style={st.saveText}>{pkg.trialDays} dias grátis</Text></View>}
                    <View style={[st.radio, on && st.radioOn]}>
                      {on && <Ionicons name="checkmark" size={12} color="#fff" />}
                    </View>
                    <Text style={st.planName}>{pkg.title}</Text>
                    <Text style={st.planPrice}>{pkg.priceLabel}</Text>
                    {pkg.subtitle && <Text style={st.planPer}>{pkg.subtitle}</Text>}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* ── Features ── */}
          <View style={st.featCard}>
            {FEATS.map((f, i) => (
              <View key={i} style={[st.feat, i > 0 && { borderTopWidth: 1, borderTopColor: LINE }]}>
                <View style={st.featCheck}>
                  <Ionicons name="checkmark" size={16} color={GREEN} />
                </View>
                <Text style={st.featText}>{f}</Text>
              </View>
            ))}
          </View>

          {/* ── CTA ── */}
          <TouchableOpacity
            onPress={configured && selectedPkg ? handlePurchase : () => navigation.navigate('PixPayment', { plan: pixPlan })}
            disabled={!!purchasing}
            activeOpacity={0.85}
          >
            <LinearGradient colors={['#FF6AAE', PINK]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.cta}>
              {purchasing ? <ActivityIndicator color="#fff" /> : (
                <>
                  <Ionicons name="trophy" size={20} color="#fff" />
                  <Text style={st.ctaText}>Começar agora</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <Text style={st.foot}>
            {selectedPkg?.isTrialEligible && !selectedPkg.identifier.toLowerCase().includes('annual')
              ? `${selectedPkg.trialDays} dias grátis · depois ${selectedPkg.priceLabel} · cancele quando quiser`
              : 'Cancele quando quiser · sem compromisso'}
          </Text>

          {/* ── Pix separator ── */}
          <View style={st.orDivider}>
            <View style={st.orLine} />
            <Text style={st.orText}>ou pague com PIX</Text>
            <View style={st.orLine} />
          </View>

          {/* ── Pix plans ── */}
          <View style={st.plans}>
            <TouchableOpacity style={[st.plan, pixPlan === 'monthly' && st.planOn]} onPress={() => setPixPlan('monthly')} activeOpacity={0.8}>
              <View style={[st.radio, pixPlan === 'monthly' && st.radioOn]}>
                {pixPlan === 'monthly' && <Ionicons name="checkmark" size={12} color="#fff" />}
              </View>
              <Text style={st.planName}>Mensal</Text>
              <Text style={st.planPrice}>R$ 10<Text style={st.planPriceSm}>,00</Text></Text>
              <Text style={st.planPer}>por mês</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[st.plan, pixPlan === 'annual' && st.planOn]} onPress={() => setPixPlan('annual')} activeOpacity={0.8}>
              <View style={[st.save, { backgroundColor: GREEN }]}><Text style={st.saveText}>Economize 33%</Text></View>
              <View style={[st.radio, pixPlan === 'annual' && st.radioOn]}>
                {pixPlan === 'annual' && <Ionicons name="checkmark" size={12} color="#fff" />}
              </View>
              <Text style={st.planName}>Anual</Text>
              <Text style={st.planPrice}>R$ 120<Text style={st.planPriceSm}>,00</Text></Text>
              <Text style={st.planPer}>R$ 10,00/mês</Text>
            </TouchableOpacity>
          </View>

          {/* ── Pix CTA ── */}
          <TouchableOpacity onPress={() => navigation.navigate('PixPayment', { plan: pixPlan })} activeOpacity={0.85}>
            <View style={st.pixCta}>
              <Ionicons name="qr-code-outline" size={20} color="#fff" />
              <Text style={st.ctaText}>Pagar com Pix</Text>
            </View>
          </TouchableOpacity>

          {/* ── Restore ── */}
          <TouchableOpacity onPress={handleRestore} disabled={restoring} style={{ alignItems: 'center', paddingVertical: 8 }}>
            {restoring ? <ActivityIndicator size="small" color={PINK} /> : <Text style={st.link}>Restaurar compra</Text>}
          </TouchableOpacity>

          {/* ── Legal ── */}
          <View style={st.legal}>
            <TouchableOpacity onPress={() => navigation.navigate('PrivacyPolicy')}>
              <Text style={st.legalLink}>Privacidade</Text>
            </TouchableOpacity>
            <Text style={{ color: INK3 }}> · </Text>
            <TouchableOpacity onPress={() => Linking.openURL(Platform.OS === 'android' ? 'https://play.google.com/intl/pt-BR/about/play-terms/' : 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/')}>
              <Text style={st.legalLink}>Termos de uso</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 44 }} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

/* ──────────────────────── STYLES ──────────────────────── */
const st = StyleSheet.create({
  /* hero */
  hero: {
    paddingTop: 54,
    paddingHorizontal: 22,
    paddingBottom: 26,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  deco: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  closeBtn: {
    position: 'absolute',
    top: 54,
    right: 18,
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  crown: {
    width: 62,
    height: 62,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  heroTitle: {
    fontSize: 27,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    lineHeight: 31,
    letterSpacing: 0.2,
  },
  heroSub: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.94)',
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 16,
    lineHeight: 20,
  },

  body: { paddingHorizontal: 18, paddingTop: 24, gap: 16 },

  /* plans */
  plans: { flexDirection: 'row', gap: 11 },
  plan: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 15,
    paddingHorizontal: 14,
    borderWidth: 2,
    borderColor: LINE,
    position: 'relative',
    ...SHADOW,
  },
  planOn: { borderColor: PINK, shadowColor: PINK, shadowOpacity: 0.16, elevation: 5 },
  planName: { fontSize: 13, fontWeight: '700', color: INK2 },
  planPrice: { fontSize: 26, fontWeight: '800', color: INK, marginTop: 7, lineHeight: 28 },
  planPriceSm: { fontSize: 13, fontWeight: '600', color: INK2 },
  planPer: { fontSize: 12, color: INK2, fontWeight: '500', marginTop: 4 },
  radio: {
    position: 'absolute',
    top: 13,
    right: 13,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: INK3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { borderColor: PINK, backgroundColor: PINK },
  save: {
    position: 'absolute',
    top: -11,
    left: '50%' as any,
    transform: [{ translateX: -50 }],
    backgroundColor: GREEN,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  saveText: { fontSize: 11, fontWeight: '700', color: '#fff' },

  /* features */
  featCard: { backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6, ...SHADOW },
  feat: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 },
  featCheck: {
    width: 26,
    height: 26,
    borderRadius: 9,
    backgroundColor: '#DCF6E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featText: { fontSize: 14.5, fontWeight: '600', color: INK, flex: 1, lineHeight: 18 },

  /* CTA */
  cta: {
    height: 54,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: PINK,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  ctaText: { fontSize: 17, fontWeight: '700', color: '#fff' },

  foot: { fontSize: 12, color: INK2, fontWeight: '500', textAlign: 'center', lineHeight: 17 },

  orDivider: { flexDirection: 'row', alignItems: 'center' },
  orLine: { flex: 1, height: 1, backgroundColor: LINE },
  orText: { fontSize: 12.5, color: INK3, fontWeight: '600', marginHorizontal: 12 },

  pixCta: {
    height: 54, borderRadius: 18, backgroundColor: '#00A86B',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    shadowColor: '#00A86B', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 4,
  },

  link: { fontSize: 13.5, fontWeight: '700', color: '#2BA7DD' },

  legal: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  legalLink: { fontSize: 12.5, fontWeight: '600', color: INK2 },
});
