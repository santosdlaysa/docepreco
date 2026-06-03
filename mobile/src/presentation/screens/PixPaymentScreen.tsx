import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
  ImageSourcePropType,
} from 'react-native';
import * as ClipboardModule from 'expo-clipboard';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { useToast } from '../context/ToastContext';
import { usePremium } from '../context/PremiumContext';
import { pixApi, LEGACY_MONTHLY_CENTS } from '../../data/api/pixApi';
import { planConfigApi, PixPlanConfig } from '../../data/api/planConfigApi';
import { useTranslation } from 'react-i18next';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'PixPayment'>;
type RouteType = RouteProp<RootStackParamList, 'PixPayment'>;

interface PixPlan {
  label: string;
  price: string;
  priceCents: number;
  pixCopyPaste: string;
  qrImage: ImageSourcePropType;
}

// Plano mensal atual (novos assinantes): R$ 14,90 — usado como fallback se o
// painel web estiver indisponível
const MONTHLY: PixPlan = {
  label: 'Mensal',
  price: 'R$ 14,90',
  priceCents: 1490,
  pixCopyPaste: '00020126330014BR.GOV.BCB.PIX011103381053280520400005303986540514.905802BR5901N6001C62150511mensalidade630450C7',
  qrImage: require('../../../assets/qrcode-pix-monthly.png'),
};

// Plano mensal legado (quem já assinou por R$ 10,00) — mantido na renovação
const MONTHLY_LEGACY: PixPlan = {
  label: 'Mensal',
  price: 'R$ 10,00',
  priceCents: 1000,
  pixCopyPaste: '00020126330014BR.GOV.BCB.PIX011103381053280520400005303986540510.005802BR5901N6001C62100506mensal63041609',
  qrImage: require('../../../assets/qrcode-pix (2).png'),
};

const ANNUAL: PixPlan = {
  label: 'Anual',
  price: 'R$ 120,00',
  priceCents: 12000,
  pixCopyPaste: '00020126330014BR.GOV.BCB.PIX0111033810532805204000053039865406120.005802BR5901N6001C62090505ANUAL6304F5D2',
  qrImage: require('../../../assets/qrcode-pix-annual.png'),
};

// Master mensal: QR e código próprios embutidos (R$ 30,00). O anual ainda não
// tem QR/código — vem do painel web quando o admin configurar.
const MASTER_QR_MONTHLY = require('../../../assets/qrcode-pix-master-monthly.png');
const MASTER_MONTHLY: PixPlan = {
  label: 'Mensal',
  price: 'R$ 30,00',
  priceCents: 3000,
  pixCopyPaste: '00020126330014BR.GOV.BCB.PIX011103381053280520400005303986540530.005802BR5901N6001C62070503***630448C1',
  qrImage: MASTER_QR_MONTHLY,
};
const MASTER_ANNUAL: PixPlan = { label: 'Anual', price: 'R$ 300,00', priceCents: 30000, pixCopyPaste: '', qrImage: ANNUAL.qrImage };

const MASTER_PURPLE = '#7C3AED';

// Converte a config vinda do painel web no formato usado pela tela.
// Mantém o QR embutido quando o admin não enviou uma imagem própria.
const toPlan = (label: string, cfg: PixPlanConfig, fallbackQr: ImageSourcePropType): PixPlan => ({
  label,
  price: cfg.priceLabel,
  priceCents: cfg.amountCents,
  pixCopyPaste: cfg.copyPaste,
  qrImage: cfg.qrImage ? { uri: cfg.qrImage } : fallbackQr,
});

type PlanType = 'monthly' | 'annual';

export const PixPaymentScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteType>();
  const { showToast } = useToast();
  const { refresh } = usePremium();

  const tier: 'premium' | 'master' = route.params?.tier === 'master' ? 'master' : 'premium';
  const isMaster = tier === 'master';
  const accent = isMaster ? MASTER_PURPLE : colors.primary;

  const [selectedPlan, setSelectedPlan] = useState<PlanType>(route.params?.plan === 'annual' ? 'annual' : 'monthly');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [checking, setChecking] = useState(false);
  const [copied, setCopied] = useState(false);
  // Assinante legado: já pagou o mensal de R$ 10,00 — mantém esse preço na renovação
  const [legacyMonthly, setLegacyMonthly] = useState(false);
  // Config de PIX vinda do painel web (valor, código e QR). Null → usa embutido.
  const [serverMonthly, setServerMonthly] = useState<PixPlan | null>(null);
  const [serverAnnual, setServerAnnual] = useState<PixPlan | null>(null);
  const [serverMasterMonthly, setServerMasterMonthly] = useState<PixPlan | null>(null);
  const [serverMasterAnnual, setServerMasterAnnual] = useState<PixPlan | null>(null);

  const monthlyPlan = isMaster
    ? (serverMasterMonthly ?? MASTER_MONTHLY)
    : (legacyMonthly ? MONTHLY_LEGACY : (serverMonthly ?? MONTHLY));
  const annualPlan = isMaster ? (serverMasterAnnual ?? MASTER_ANNUAL) : (serverAnnual ?? ANNUAL);
  // Master é só mensal — sem aba anual.
  const showAnnual = !isMaster;
  const plan = selectedPlan === 'annual' && showAnnual ? annualPlan : monthlyPlan;

  // Check if there's already a pending request
  useEffect(() => {
    (async () => {
      try {
        const status = await pixApi.getStatus();
        // Última cobrança PIX de R$ 10,00 → usuário tem direito ao preço antigo
        if (status?.amount_cents === LEGACY_MONTHLY_CENTS) {
          setLegacyMonthly(true);
        }
        if (status?.status === 'pending') {
          setSent(true);
        }
      } catch {}
    })();
  }, []);

  // Carrega valores/QR gerenciados pelo painel web
  useEffect(() => {
    (async () => {
      const cfg = await planConfigApi.getPixConfig();
      if (cfg) {
        setServerMonthly(toPlan('Mensal', cfg.monthly, MONTHLY.qrImage));
        setServerAnnual(toPlan('Anual', cfg.annual, ANNUAL.qrImage));
        if (cfg.masterMonthly) setServerMasterMonthly(toPlan('Mensal', cfg.masterMonthly, MASTER_QR_MONTHLY));
        if (cfg.masterAnnual) setServerMasterAnnual(toPlan('Anual', cfg.masterAnnual, ANNUAL.qrImage));
      }
    })();
  }, []);

  const handleCopyPix = async () => {
    await ClipboardModule.setStringAsync(plan.pixCopyPaste);
    setCopied(true);
    showToast(t('pix.pixCopied'), 'success');
    setTimeout(() => setCopied(false), 3000);
  };

  const handlePixDone = async () => {
    Alert.alert(
      t('pix.confirmTitle'),
      t('pix.confirmMessage'),
      [
        { text: t('pix.confirmCancel'), style: 'cancel' },
        {
          text: t('pix.confirmOk'),
          onPress: async () => {
            setSending(true);
            try {
              await pixApi.createRequest(plan.label, plan.priceCents, tier);
              setSent(true);
              showToast(t('pix.requestSent'), 'success');
            } catch (error) {
              const msg = error instanceof Error ? error.message : t('pix.requestError');
              showToast(msg, 'error');
            } finally {
              setSending(false);
            }
          },
        },
      ]
    );
  };

  const handleCheckStatus = useCallback(async () => {
    setChecking(true);
    try {
      const status = await pixApi.getStatus();
      if (status?.status === 'approved') {
        showToast(t('pix.approved'), 'success');
        await refresh();
        navigation.goBack();
        navigation.goBack();
      } else if (status?.status === 'rejected') {
        showToast(t('pix.rejected'), 'error');
        setSent(false);
      } else {
        showToast(t('pix.stillPending'), 'info');
      }
    } catch {
      showToast(t('pix.checkError'), 'error');
    } finally {
      setChecking(false);
    }
  }, [refresh, navigation, showToast, t]);

  // Poll status every 15s when request is sent
  useEffect(() => {
    if (!sent) return;
    const interval = setInterval(async () => {
      try {
        const status = await pixApi.getStatus();
        if (status?.status === 'approved') {
          clearInterval(interval);
          showToast(t('pix.approved'), 'success');
          await refresh();
          navigation.goBack();
          navigation.goBack();
        }
      } catch {}
    }, 15000);
    return () => clearInterval(interval);
  }, [sent, refresh, navigation, showToast, t]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('pix.title')}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {!sent ? (
          <>
            {/* Tier banner */}
            {isMaster && (
              <View style={styles.tierBanner}>
                <Ionicons name="diamond" size={15} color={MASTER_PURPLE} />
                <Text style={styles.tierBannerText}>Plano Master</Text>
              </View>
            )}

            {/* Plan selector */}
            <View style={styles.planSelector}>
              <TouchableOpacity
                style={[styles.planTab, selectedPlan === 'monthly' && [styles.planTabActive, { borderColor: accent }]]}
                onPress={() => setSelectedPlan('monthly')}
              >
                <Text style={[styles.planTabText, selectedPlan === 'monthly' && styles.planTabTextActive]}>
                  Mensal
                </Text>
                <Text style={[styles.planTabPrice, selectedPlan === 'monthly' && [styles.planTabPriceActive, { color: accent }]]}>
                  {monthlyPlan.price}
                </Text>
              </TouchableOpacity>
              {showAnnual && (
                <TouchableOpacity
                  style={[styles.planTab, selectedPlan === 'annual' && [styles.planTabActive, { borderColor: accent }]]}
                  onPress={() => setSelectedPlan('annual')}
                >
                  <View style={styles.saveBadge}>
                    <Text style={styles.saveBadgeText}>{t('pix.save33')}</Text>
                  </View>
                  <Text style={[styles.planTabText, selectedPlan === 'annual' && styles.planTabTextActive]}>
                    Anual
                  </Text>
                  <Text style={[styles.planTabPrice, selectedPlan === 'annual' && [styles.planTabPriceActive, { color: accent }]]}>
                    {annualPlan.price}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* QR Code Image */}
            <View style={styles.qrContainer}>
              <View style={[styles.qrBorder, { borderColor: accent, shadowColor: accent }]}>
                <Image
                  source={plan.qrImage}
                  style={styles.qrImage}
                  resizeMode="contain"
                />
              </View>
            </View>

            {/* Copy PIX */}
            <TouchableOpacity style={styles.copyCard} onPress={handleCopyPix} activeOpacity={0.7}>
              <Ionicons name={copied ? 'checkmark-circle' : 'copy-outline'} size={22} color={copied ? colors.success : colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.copyLabel}>{t('pix.copyPaste')}</Text>
                <Text style={styles.copyValue} numberOfLines={1} ellipsizeMode="middle">
                  {plan.pixCopyPaste}
                </Text>
              </View>
              <View style={[styles.copyBtnSmall, copied && { backgroundColor: '#E8F5E9' }]}>
                <Text style={[styles.copyBtnText, copied && { color: colors.success }]}>
                  {copied ? t('pix.copied') : t('pix.copy')}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Instructions */}
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>{t('pix.howToPay')}</Text>

              <View style={styles.step}>
                <View style={styles.stepNumber}><Text style={styles.stepNumberText}>1</Text></View>
                <Text style={styles.stepText}>{t('pix.step1')}</Text>
              </View>
              <View style={styles.step}>
                <View style={styles.stepNumber}><Text style={styles.stepNumberText}>2</Text></View>
                <Text style={styles.stepText}>{t('pix.step2')}</Text>
              </View>
              <View style={styles.step}>
                <View style={styles.stepNumber}><Text style={styles.stepNumberText}>3</Text></View>
                <Text style={styles.stepText}>{t('pix.step3')}</Text>
              </View>
            </View>

            {/* CTA */}
            <TouchableOpacity
              style={[styles.cta, { backgroundColor: accent, shadowColor: accent }]}
              onPress={handlePixDone}
              disabled={sending}
              activeOpacity={0.85}
            >
              {sending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={styles.ctaText}>{t('pix.iAlreadyPaid')}</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        ) : (
          /* Waiting for approval */
          <View style={styles.waitingContainer}>
            <View style={styles.waitingIcon}>
              <Ionicons name="time-outline" size={48} color={colors.primary} />
            </View>
            <Text style={styles.waitingTitle}>{t('pix.waitingTitle')}</Text>
            <Text style={styles.waitingSubtitle}>{t('pix.waitingSubtitle')}</Text>

            <View style={styles.waitingSteps}>
              <View style={styles.waitingStep}>
                <Ionicons name="checkmark-circle" size={24} color={colors.success} />
                <Text style={styles.waitingStepText}>{t('pix.waitingStep1')}</Text>
              </View>
              <View style={styles.waitingStep}>
                <Ionicons name="checkmark-circle" size={24} color={colors.success} />
                <Text style={styles.waitingStepText}>{t('pix.waitingStep2')}</Text>
              </View>
              <View style={styles.waitingStep}>
                <ActivityIndicator size="small" color={colors.primary} style={{ width: 24 }} />
                <Text style={styles.waitingStepText}>{t('pix.waitingStep3')}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.cta, { marginTop: 24 }]}
              onPress={handleCheckStatus}
              disabled={checking}
              activeOpacity={0.85}
            >
              {checking ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="refresh" size={20} color="#fff" />
                  <Text style={styles.ctaText}>{t('pix.checkStatus')}</Text>
                </>
              )}
            </TouchableOpacity>

            <Text style={styles.autoCheckNote}>{t('pix.autoCheckNote')}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { ...typography.h3, color: colors.text },
  scroll: { padding: 20, paddingBottom: 40 },

  // Tier banner
  tierBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F4EEFD',
    borderRadius: 12,
    paddingVertical: 8,
    marginBottom: 16,
  },
  tierBannerText: { ...typography.body, color: '#7C3AED', fontWeight: '800' },

  // Plan selector
  planSelector: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  planTab: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
    position: 'relative',
  },
  planTabActive: {
    borderColor: colors.primary,
    backgroundColor: colors.cream,
  },
  planTabText: { ...typography.body, color: colors.textSecondary, fontWeight: '600' },
  planTabTextActive: { color: colors.text },
  planTabPrice: { ...typography.h3, color: colors.textMuted, fontWeight: '800', marginTop: 4 },
  planTabPriceActive: { color: colors.primary },
  saveBadge: {
    position: 'absolute',
    top: -10,
    right: 8,
    backgroundColor: colors.success,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  saveBadgeText: { ...typography.caption, color: '#fff', fontWeight: '800', fontSize: 10 },

  // QR Code
  qrContainer: { alignItems: 'center', marginBottom: 16 },
  qrBorder: {
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  qrImage: { width: 220, height: 220 },

  // Copy card
  copyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  copyLabel: { ...typography.caption, color: colors.textMuted },
  copyValue: { ...typography.bodySmall, color: colors.text, fontWeight: '500', marginTop: 2 },
  copyBtnSmall: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  copyBtnText: { ...typography.caption, color: colors.primary, fontWeight: '700' },

  // Info
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoTitle: { ...typography.h3, color: colors.text, marginBottom: 16 },
  step: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stepNumberText: { ...typography.bodySmall, color: colors.primary, fontWeight: '800' },
  stepText: { ...typography.body, color: colors.textSecondary, flex: 1 },

  // CTA
  cta: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  ctaText: { ...typography.button, color: '#fff', fontSize: 17 },

  // Waiting
  waitingContainer: { alignItems: 'center', paddingTop: 40 },
  waitingIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  waitingTitle: { ...typography.h2, color: colors.text, textAlign: 'center', marginBottom: 8 },
  waitingSubtitle: { ...typography.body, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: 20, marginBottom: 32 },
  waitingSteps: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 16,
  },
  waitingStep: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  waitingStepText: { ...typography.body, color: colors.text, flex: 1 },
  autoCheckNote: { ...typography.caption, color: colors.textMuted, textAlign: 'center', marginTop: 12 },
});
