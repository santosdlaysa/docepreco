import React, { useEffect, useRef, useState } from 'react';
import {
  AppState,
  AppStateStatus,
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
import { pixApi, LEGACY_MONTHLY_CENTS } from '../../data/api/pixApi';
import { stripeApi } from '../../data/api/stripeApi';
import { planConfigApi } from '../../data/api/planConfigApi';
import { premiumApi } from '../../data/api/premiumApi';
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

// Recursos exclusivos do Master (somados a tudo do Premium).
const MASTER_EXTRA = [
  'Gestão financeira completa (DRE)',
  'Controle de estoque com baixa automática',
  'Dicas de vendas e precificação',
];

const PURPLE = '#7C3AED';

export const PaywallScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteType>();
  const { showToast } = useToast();
  const { refresh, isPremium } = usePremium();

  const [packages, setPackages] = useState<PremiumPackage[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [configured] = useState(isRevenueCatConfigured());
  const [cardLoading, setCardLoading] = useState(false);
  const [trialLoading, setTrialLoading] = useState(false);
  const [trialDays, setTrialDays] = useState<number | null>(null);
  // Overlay "verificando pagamento" enquanto consulta o backend após voltar do Stripe
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const appState = useRef(AppState.currentState);
  // Marca que o usuário saiu para pagar no cartão (Stripe) — habilita o polling no retorno
  const initiatedPayment = useRef(false);
  // Espelha o isPremium para poder consultá-lo dentro do loop de polling
  const premiumRef = useRef(isPremium);
  const [pixPlan, setPixPlan] = useState<'monthly' | 'annual' | null>(null);
  // Nível escolhido pelo usuário no paywall (Premium ou Master)
  const [tier, setTier] = useState<'premium' | 'master'>('premium');
  // Assinante legado: já pagou o mensal de R$ 10,00 — mantém esse preço na renovação
  const [legacyMonthly, setLegacyMonthly] = useState(false);
  // Rótulos de preço PIX gerenciados pelo painel web (fallback nos valores fixos)
  const [pixMonthlyLabel, setPixMonthlyLabel] = useState('R$ 14,90');
  const [pixAnnualLabel, setPixAnnualLabel] = useState('R$ 120,00');
  const [pixMasterMonthlyLabel, setPixMasterMonthlyLabel] = useState('R$ 30,00');
  const [pixMasterAnnualLabel, setPixMasterAnnualLabel] = useState('R$ 300,00');
  // PIX Master mensal já vem embutido no app → sempre disponível, sem depender do backend.
  const masterPixAvailable = true;
  const [masterPrice, setMasterPrice] = useState(30);
  const [premiumPrice] = useState('R$ 14,90');

  // Troca de nível: limpa as seleções para não carregar um plano de outro tier
  const switchTier = (next: 'premium' | 'master') => {
    setTier(next);
    setSelected(null);
    setPixPlan(null);
  };

  const trigger = route.params?.trigger;

  // Recurso exclusivo do Master → já abre o paywall no nível Master.
  useEffect(() => {
    if (trigger?.kind === 'master') setTier('master');
  }, [trigger]);

  useEffect(() => {
    (async () => {
      try {
        const offerings = await fetchOfferings();
        setPackages(offerings);
        // Não pré-seleciona nenhum plano — o usuário escolhe ativamente
      } catch { setPackages([]); }
      finally { setLoading(false); }
    })();
  }, []);

  // Detecta direito ao preço antigo do PIX (última cobrança de R$ 10,00)
  useEffect(() => {
    (async () => {
      try {
        const status = await pixApi.getStatus();
        if (status?.amount_cents === LEGACY_MONTHLY_CENTS) setLegacyMonthly(true);
      } catch {}
    })();
  }, []);

  // Mantém o premiumRef em dia para o loop de polling poder encerrar cedo
  useEffect(() => { premiumRef.current = isPremium; }, [isPremium]);

  // Assim que o pagamento (Stripe/PIX) é detectado, fecha o paywall automaticamente
  useEffect(() => {
    if (isPremium && initiatedPayment.current) {
      initiatedPayment.current = false;
      setVerifyingPayment(false);
      showToast('Pagamento confirmado! Bem-vinda ao PRO 🎉', 'success');
      navigation.goBack();
    }
  }, [isPremium, navigation, showToast]);

  // Quando o app volta ao foco após o usuário pagar no browser, verifica se virou premium.
  // Se ele iniciou um pagamento no cartão, faz polling para dar tempo ao webhook do Stripe.
  useEffect(() => {
    const sub = AppState.addEventListener('change', async (next: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && next === 'active') {
        if (initiatedPayment.current) {
          setVerifyingPayment(true);
          // Tenta algumas vezes (webhook pode demorar alguns segundos para confirmar)
          for (let i = 0; i < 6 && !premiumRef.current; i++) {
            await refresh();
            if (premiumRef.current) break;
            await new Promise((r) => setTimeout(r, 2000));
          }
          // Se após o polling ainda não confirmou, encerra o overlay (o watcher acima
          // fecha o paywall caso o premium chegue durante as tentativas)
          if (!premiumRef.current) setVerifyingPayment(false);
        } else {
          await refresh();
        }
      }
      appState.current = next;
    });
    return () => sub.remove();
  }, [refresh]);

  // Carrega rótulos de preço do PIX e infos do Master gerenciados pelo painel web
  useEffect(() => {
    (async () => {
      const cfg = await planConfigApi.getPixConfig();
      if (cfg) {
        setPixMonthlyLabel(cfg.monthly.priceLabel);
        setPixAnnualLabel(cfg.annual.priceLabel);
        if (cfg.masterMonthly) setPixMasterMonthlyLabel(cfg.masterMonthly.priceLabel);
        if (cfg.masterAnnual) setPixMasterAnnualLabel(cfg.masterAnnual.priceLabel);
      }
      const mi = await planConfigApi.getMasterInfo();
      if (mi) setMasterPrice(mi.price);

      // Carrega config de trial
      const trial = await planConfigApi.getTrialConfig();
      if (trial) {
        const days = tier === 'master' ? trial.masterFreeDays : trial.premiumFreeDays;
        setTrialDays(days);
      }
    })();
  }, [tier]);

  // Quebra "R$ 14,90" em parte inteira + centavos para o layout dos cards
  const splitPrice = (label: string): [string, string] => {
    const i = label.indexOf(',');
    return i === -1 ? [label, ''] : [label.slice(0, i), label.slice(i)];
  };
  const isMasterTier = tier === 'master';
  const pixMonthlyShown = isMasterTier ? pixMasterMonthlyLabel : (legacyMonthly ? 'R$ 10,00' : pixMonthlyLabel);
  const pixAnnualShown = isMasterTier ? pixMasterAnnualLabel : pixAnnualLabel;
  const [monthlyMain, monthlyCents] = splitPrice(pixMonthlyShown);
  const [annualMain, annualCents] = splitPrice(pixAnnualShown);

  // O Master é só mensal — exclui qualquer pacote/PIX anual do Master.
  const isAnnualId = (id: string) => {
    const s = id.toLowerCase();
    return s.includes('anual') || s.includes('annual') || s.includes('year');
  };
  const showAnnual = !isMasterTier;
  // Pacotes da loja filtrados pelo nível (e sem o anual quando for Master)
  const tierPackages = (packages ?? []).filter(p => p.tier === tier && (showAnnual || !isAnnualId(p.identifier)));
  // Lista de benefícios mostrada conforme o nível
  const feats = isMasterTier ? [...FEATS, ...MASTER_EXTRA] : FEATS;
  const accent = isMasterTier ? PURPLE : PINK;
  // PIX disponível para o nível: Premium sempre; Master só após configuração no painel
  const pixAvailable = isMasterTier ? masterPixAvailable : true;

  const handleCardPayment = async (plan: 'monthly' | 'annual') => {
    setCardLoading(true);
    try {
      const url = await stripeApi.createCheckout(plan, tier);
      initiatedPayment.current = true;
      await Linking.openURL(url);
    } catch {
      showToast('Erro ao abrir pagamento. Tente novamente.', 'error');
    } finally {
      setCardLoading(false);
    }
  };

  const syncPremiumWithBackend = async () => {
    try {
      const expiresAt = await getActiveEntitlementExpiration();
      const platform = Platform.OS === 'android' ? 'android' : 'ios';
      await authApi.syncPremium(true, expiresAt, platform as 'ios' | 'android');
    } catch { /* fallback */ }
    await refresh();
  };

  const selectedPkg = tierPackages.find(p => p.identifier === selected) ?? null;
  const hasStorePlans = configured && tierPackages.length > 0;

  const handlePurchase = async () => {
    if (!selected || !selectedPkg) return;
    setPurchasing(selectedPkg.identifier);
    try {
      const result = await purchasePackage(selectedPkg);
      if (result === 'success') {
        showToast('Bem-vinda ao PRO! 🎉', 'success');
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

  const handleRequestTrial = async () => {
    setTrialLoading(true);
    try {
      await premiumApi.requestTrial();
      showToast(`Trial de ${trialDays} dias ativado! 🎉`, 'success');
      await refresh();
      navigation.goBack();
    } catch (error: any) {
      const msg = error?.message || 'Erro ao ativar trial';
      if (msg.includes('PAYMENT_METHOD_REQUIRED')) {
        showToast('Cadastre um cartão de crédito primeiro', 'error');
      } else if (msg.includes('Trial already used')) {
        showToast('Você já usou seu período de trial', 'error');
      } else {
        showToast(msg, 'error');
      }
    } finally {
      setTrialLoading(false);
    }
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
          <Text style={st.heroSub}>
            {isMasterTier
              ? 'Tudo do Premium + financeiro, estoque e dicas de vendas.'
              : 'Desbloqueie 9 recursos PRO e leve seu negócio de doces a sério.'}
          </Text>
        </LinearGradient>

        <View style={st.body}>

          {/* ── Tier selector (Premium | Master) ── */}
          <View style={st.tierTabs}>
            <TouchableOpacity style={[st.tierTab, !isMasterTier && st.tierTabOn]} onPress={() => switchTier('premium')} activeOpacity={0.85}>
              <Text style={[st.tierTabName, !isMasterTier && { color: PINK }]}>Premium</Text>
              <Text style={st.tierTabPrice}>{premiumPrice}/mês</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[st.tierTab, isMasterTier && st.tierTabOnMaster]} onPress={() => switchTier('master')} activeOpacity={0.85}>
              <View style={st.tierTabBadge}><Text style={st.tierTabBadgeText}>COMPLETO</Text></View>
              <Text style={[st.tierTabName, isMasterTier && { color: PURPLE }]}>Master</Text>
              <Text style={st.tierTabPrice}>R$ {masterPrice.toFixed(2).replace('.', ',')}/mês</Text>
            </TouchableOpacity>
          </View>

          {/* ── Plans (store) ── */}
          {loading ? (
            <View style={{ paddingVertical: 40, alignItems: 'center' }}>
              <ActivityIndicator size="large" color={accent} />
            </View>
          ) : hasStorePlans ? (
            <View style={st.plans}>
              {tierPackages.map(pkg => {
                const on = selected === pkg.identifier;
                return (
                  <TouchableOpacity key={pkg.identifier} style={[st.plan, on && (isMasterTier ? st.planOnMaster : st.planOn)]} onPress={() => setSelected(pkg.identifier)} activeOpacity={0.8}>
                    {pkg.badge && <View style={[st.save, isMasterTier && { backgroundColor: PURPLE, shadowColor: PURPLE }]}><Text style={st.saveText}>{pkg.badge}</Text></View>}
                    <View style={[st.radio, on && (isMasterTier ? st.radioOnMaster : st.radioOn)]}>
                      {on && <Ionicons name="checkmark" size={12} color="#fff" />}
                    </View>
                    <Text style={st.planName}>{pkg.title}</Text>
                    <Text style={st.planPrice}>{pkg.priceLabel}</Text>
                    {pkg.subtitle && <Text style={st.planPer}>{pkg.subtitle}</Text>}
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : isMasterTier && !pixAvailable ? (
            <View style={st.soon}>
              <Ionicons name="time-outline" size={20} color={PURPLE} />
              <Text style={st.soonText}>O plano Master chega em breve. Fique de olho!</Text>
            </View>
          ) : null}

          {/* ── Features ── */}
          <View style={st.featCard}>
            {feats.map((f, i) => {
              const isExtra = isMasterTier && i >= FEATS.length;
              return (
                <View key={i} style={[st.feat, i > 0 && { borderTopWidth: 1, borderTopColor: LINE }]}>
                  <View style={[st.featCheck, isExtra && { backgroundColor: '#EDE4FB' }]}>
                    <Ionicons name={isExtra ? 'star' : 'checkmark'} size={16} color={isExtra ? PURPLE : GREEN} />
                  </View>
                  <Text style={st.featText}>{f}</Text>
                </View>
              );
            })}
          </View>

          {/* ── Trial Request ── */}
          {trialDays && (
            <>
              <View style={st.trialCard}>
                <Ionicons name="gift-outline" size={24} color={accent} style={{ marginBottom: 8 }} />
                <Text style={st.trialTitle}>{trialDays} dias grátis</Text>
                <Text style={st.trialText}>Teste tudo sem pagar agora. Começamos a cobrar depois.</Text>
                <TouchableOpacity onPress={handleRequestTrial} disabled={trialLoading} activeOpacity={0.85}>
                  <LinearGradient colors={isMasterTier ? ['#9B6BF0', PURPLE] : ['#FF6AAE', PINK]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.trialCta}>
                    {trialLoading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="sparkles" size={18} color="#fff" />
                        <Text style={st.ctaText}>Ativar trial grátis</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* ── Store CTA (only when the store sells this tier) ── */}
          {hasStorePlans && (
            <>
              <TouchableOpacity onPress={handlePurchase} disabled={!!purchasing || !selectedPkg} activeOpacity={0.85}>
                <LinearGradient colors={isMasterTier ? ['#9B6BF0', PURPLE] : ['#FF6AAE', PINK]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[st.cta, !selectedPkg && { opacity: 0.5 }]}>
                  {purchasing ? <ActivityIndicator color="#fff" /> : (
                    <>
                      <Ionicons name="trophy" size={20} color="#fff" />
                      <Text style={st.ctaText}>{selectedPkg ? 'Começar agora' : 'Escolha um plano'}</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <Text style={st.foot}>Cancele quando quiser · sem compromisso</Text>
            </>
          )}

          {/* ── Pix section (Master only when configured no painel) ── */}
          {pixAvailable && (
            <>
              <View style={st.orDivider}>
                <View style={st.orLine} />
                <Text style={st.orText}>{hasStorePlans ? 'ou pague com PIX' : 'pague com PIX'}</Text>
                <View style={st.orLine} />
              </View>

              <View style={st.plans}>
                <TouchableOpacity style={[st.plan, pixPlan === 'monthly' && (isMasterTier ? st.planOnMaster : st.planOn)]} onPress={() => setPixPlan('monthly')} activeOpacity={0.8}>
                  <View style={[st.radio, pixPlan === 'monthly' && (isMasterTier ? st.radioOnMaster : st.radioOn)]}>
                    {pixPlan === 'monthly' && <Ionicons name="checkmark" size={12} color="#fff" />}
                  </View>
                  <Text style={st.planName}>Mensal</Text>
                  <Text style={st.planPrice}>{monthlyMain}<Text style={st.planPriceSm}>{monthlyCents}</Text></Text>
                  <Text style={st.planPer}>por mês</Text>
                </TouchableOpacity>
                {showAnnual && (
                  <TouchableOpacity style={[st.plan, pixPlan === 'annual' && st.planOn]} onPress={() => setPixPlan('annual')} activeOpacity={0.8}>
                    <View style={[st.radio, pixPlan === 'annual' && st.radioOn]}>
                      {pixPlan === 'annual' && <Ionicons name="checkmark" size={12} color="#fff" />}
                    </View>
                    <Text style={st.planName}>Anual</Text>
                    <Text style={st.planPrice}>{annualMain}<Text style={st.planPriceSm}>{annualCents}</Text></Text>
                    <Text style={st.planPer}>R$ 10,00/mês</Text>
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity onPress={() => pixPlan && navigation.navigate('PixPayment', { plan: pixPlan, tier })} disabled={!pixPlan} activeOpacity={0.85}>
                <View style={[st.pixCta, !pixPlan && { opacity: 0.5 }]}>
                  <Ionicons name="qr-code-outline" size={20} color="#fff" />
                  <Text style={st.ctaText}>{pixPlan ? 'Pagar com Pix' : 'Escolha um plano acima'}</Text>
                </View>
              </TouchableOpacity>
            </>
          )}

          {/* ── Cartão de crédito (Stripe) ── */}
          <View style={st.orDivider}>
            <View style={st.orLine} />
            <Text style={st.orText}>ou pague com cartão</Text>
            <View style={st.orLine} />
          </View>

          <View style={st.plans}>
            <TouchableOpacity
              style={[st.plan, isMasterTier && { borderColor: PURPLE }]}
              onPress={() => handleCardPayment('monthly')}
              activeOpacity={0.8}
              disabled={cardLoading}
            >
              <Ionicons name="card-outline" size={18} color={isMasterTier ? PURPLE : PINK} style={{ marginBottom: 4 }} />
              <Text style={st.planName}>Mensal</Text>
              <Text style={st.planPrice}>{isMasterTier ? 'R$ 30' : 'R$ 14'}<Text style={st.planPriceSm}>{isMasterTier ? ',00' : ',90'}</Text></Text>
              <Text style={st.planPer}>por mês</Text>
            </TouchableOpacity>
            {showAnnual && (
              <TouchableOpacity
                style={st.plan}
                onPress={() => handleCardPayment('annual')}
                activeOpacity={0.8}
                disabled={cardLoading}
              >
                <View style={[st.save, { backgroundColor: '#2563EB' }]}><Text style={st.saveText}>ECONOMIZE</Text></View>
                <Ionicons name="card-outline" size={18} color={PINK} style={{ marginBottom: 4 }} />
                <Text style={st.planName}>Anual</Text>
                <Text style={st.planPrice}>R$ 120<Text style={st.planPriceSm}>,00</Text></Text>
                <Text style={st.planPer}>R$ 10/mês</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={[st.cardCtaRow]}>
            {cardLoading && <ActivityIndicator color={isMasterTier ? PURPLE : PINK} style={{ marginBottom: 8 }} />}
            <Text style={st.foot}>Pagamento seguro via Stripe · Visa, Master, Amex</Text>
          </View>

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

      {/* ── Overlay: verificando pagamento após retorno do Stripe ── */}
      {verifyingPayment && (
        <View style={st.verifyOverlay}>
          <View style={st.verifyCard}>
            <ActivityIndicator size="large" color={accent} />
            <Text style={st.verifyText}>Confirmando seu pagamento…</Text>
            <Text style={st.verifySub}>Isso pode levar alguns segundos.</Text>
          </View>
        </View>
      )}
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

  /* tier tabs */
  tierTabs: { flexDirection: 'row', gap: 11 },
  tierTab: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 2,
    borderColor: LINE,
    alignItems: 'center',
    position: 'relative',
    ...SHADOW,
  },
  tierTabOn: { borderColor: PINK, backgroundColor: '#FFF1F7' },
  tierTabOnMaster: { borderColor: PURPLE, backgroundColor: '#F4EEFD' },
  tierTabName: { fontSize: 15, fontWeight: '800', color: INK },
  tierTabPrice: { fontSize: 12, fontWeight: '600', color: INK2, marginTop: 2 },
  tierTabBadge: {
    position: 'absolute',
    top: -10,
    backgroundColor: PURPLE,
    paddingHorizontal: 9,
    paddingVertical: 2,
    borderRadius: 999,
  },
  tierTabBadgeText: { fontSize: 9.5, fontWeight: '800', color: '#fff', letterSpacing: 0.4 },

  /* "em breve" (Master ainda não vendável) */
  soon: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F4EEFD',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 16,
  },
  soonText: { fontSize: 13.5, fontWeight: '700', color: PURPLE, flexShrink: 1, textAlign: 'center' },

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
  planOnMaster: { borderColor: PURPLE, shadowColor: PURPLE, shadowOpacity: 0.16, elevation: 5 },
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
  radioOnMaster: { borderColor: PURPLE, backgroundColor: PURPLE },
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

  cardCtaRow: { alignItems: 'center', gap: 4 },
  link: { fontSize: 13.5, fontWeight: '700', color: '#2BA7DD' },

  legal: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  legalLink: { fontSize: 12.5, fontWeight: '600', color: INK2 },

  /* trial */
  trialCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 18,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: LINE,
    ...SHADOW,
  },
  trialTitle: { fontSize: 18, fontWeight: '700', color: INK },
  trialText: { fontSize: 13, color: INK2, textAlign: 'center', marginTop: 4, marginBottom: 12, lineHeight: 16 },
  trialCta: {
    width: '100%',
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

  /* overlay "verificando pagamento" */
  verifyOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(61,34,51,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  verifyCard: {
    backgroundColor: '#fff',
    borderRadius: 22,
    paddingVertical: 28,
    paddingHorizontal: 28,
    alignItems: 'center',
    gap: 12,
    ...SHADOW,
  },
  verifyText: { fontSize: 16, fontWeight: '700', color: INK, textAlign: 'center' },
  verifySub: { fontSize: 13, fontWeight: '500', color: INK2, textAlign: 'center' },
});
