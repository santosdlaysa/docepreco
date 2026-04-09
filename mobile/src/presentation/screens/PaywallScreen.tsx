import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { useToast } from '../context/ToastContext';
import { usePremium } from '../context/PremiumContext';
import {
  fetchOfferings,
  purchasePackage,
  restorePurchases,
  PremiumPackage,
  isRevenueCatConfigured,
} from '../../data/premium/revenueCat';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'Paywall'>;
type RouteType = RouteProp<RootStackParamList, 'Paywall'>;

const BENEFITS: Array<{ icon: keyof typeof Ionicons.glyphMap; title: string; description: string }> = [
  {
    icon: 'infinite-outline',
    title: 'Ingredientes e receitas ilimitados',
    description: 'Chega de limite. Cadastre quantos quiser.',
  },
  {
    icon: 'calendar-outline',
    title: 'Agenda de encomendas',
    description: 'Organize os pedidos, status e lembretes de entrega.',
  },
  {
    icon: 'people-outline',
    title: 'Gestão de clientes',
    description: 'Histórico, aniversários e WhatsApp direto.',
  },
  {
    icon: 'calculator-outline',
    title: 'Cálculo profissional',
    description: 'Inclua mão de obra e custos fixos no preço real.',
  },
  {
    icon: 'stats-chart-outline',
    title: 'Relatórios completos',
    description: 'Gráficos de faturamento e receitas mais lucrativas.',
  },
  {
    icon: 'document-text-outline',
    title: 'PDF personalizado',
    description: 'Sua logo, suas cores, sem marca do DocePreço.',
  },
];

export const PaywallScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteType>();
  const { showToast } = useToast();
  const { refresh } = usePremium();

  const [packages, setPackages] = useState<PremiumPackage[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [configured, setConfigured] = useState(isRevenueCatConfigured());

  const trigger = route.params?.trigger;

  useEffect(() => {
    (async () => {
      try {
        const offerings = await fetchOfferings();
        setPackages(offerings);
        // Default to annual if present, else first
        const annual = offerings.find(o => o.identifier.toLowerCase().includes('annual'));
        setSelected((annual ?? offerings[0])?.identifier ?? null);
      } catch {
        setPackages([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const headline = (() => {
    if (trigger?.kind === 'limit') {
      if (trigger.feature === 'ingredients') return 'Você atingiu o limite de ingredientes';
      if (trigger.feature === 'recipes') return 'Você atingiu o limite de receitas';
    }
    return 'Desbloqueie todo o DocePreço';
  })();

  const subheadline = (() => {
    if (trigger?.kind === 'limit') {
      return 'Vire Premium e adicione quantos quiser, sem limite nenhum.';
    }
    return 'Ferramentas pra levar sua confeitaria pro próximo nível.';
  })();

  const handlePurchase = async () => {
    if (!selected) return;
    const pkg = packages?.find(p => p.identifier === selected);
    if (!pkg) return;
    setPurchasing(pkg.identifier);
    try {
      const result = await purchasePackage(pkg);
      if (result === 'success') {
        showToast('Bem-vindo ao Premium! 🎉', 'success');
        await refresh();
        navigation.goBack();
      } else if (result === 'cancelled') {
        // silent
      } else {
        showToast('Não foi possível concluir a compra', 'error');
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erro na compra';
      showToast(msg, 'error');
    } finally {
      setPurchasing(null);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      const active = await restorePurchases();
      if (active) {
        showToast('Compras restauradas! 🎉', 'success');
        await refresh();
        navigation.goBack();
      } else {
        showToast('Nenhuma compra ativa encontrada', 'info');
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erro ao restaurar';
      showToast(msg, 'error');
    } finally {
      setRestoring(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
          <Ionicons name="close" size={26} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleRestore} disabled={restoring}>
          {restoring ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={styles.restoreText}>Restaurar</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.crownBadge}>
            <Ionicons name="sparkles" size={28} color="#fff" />
          </View>
          <Text style={styles.title}>{headline}</Text>
          <Text style={styles.subtitle}>{subheadline}</Text>
        </View>

        <View style={styles.benefits}>
          {BENEFITS.map(b => (
            <View key={b.title} style={styles.benefitRow}>
              <View style={styles.benefitIcon}>
                <Ionicons name={b.icon} size={20} color={colors.primary} />
              </View>
              <View style={styles.benefitText}>
                <Text style={styles.benefitTitle}>{b.title}</Text>
                <Text style={styles.benefitDescription}>{b.description}</Text>
              </View>
            </View>
          ))}
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : !configured || !packages || packages.length === 0 ? (
          <View style={styles.unavailableBox}>
            <Ionicons name="information-circle-outline" size={24} color={colors.warning} />
            <Text style={styles.unavailableText}>
              {!configured
                ? 'Assinatura ainda não configurada. Entre em contato com o suporte.'
                : 'Não conseguimos carregar os planos. Verifique sua conexão e tente novamente.'}
            </Text>
          </View>
        ) : (
          <View style={styles.plans}>
            {packages.map(pkg => {
              const isSelected = selected === pkg.identifier;
              return (
                <TouchableOpacity
                  key={pkg.identifier}
                  onPress={() => setSelected(pkg.identifier)}
                  activeOpacity={0.8}
                  style={[styles.planCard, isSelected && styles.planCardSelected]}
                >
                  {pkg.badge && (
                    <View style={styles.planBadge}>
                      <Text style={styles.planBadgeText}>{pkg.badge}</Text>
                    </View>
                  )}
                  <View style={styles.radio}>
                    {isSelected && <View style={styles.radioInner} />}
                  </View>
                  <View style={styles.planInfo}>
                    <Text style={styles.planTitle}>{pkg.title}</Text>
                    {pkg.subtitle && <Text style={styles.planSubtitle}>{pkg.subtitle}</Text>}
                  </View>
                  <Text style={styles.planPrice}>{pkg.priceLabel}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <TouchableOpacity
          style={[styles.cta, (!selected || purchasing || !configured) && styles.ctaDisabled]}
          onPress={handlePurchase}
          disabled={!selected || !!purchasing || !configured}
          activeOpacity={0.85}
        >
          {purchasing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="lock-open" size={18} color="#fff" />
              <Text style={styles.ctaText}>Assinar Premium</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          A assinatura é renovada automaticamente até você cancelar. Você pode cancelar a qualquer momento nas configurações da loja.
        </Text>

        <View style={styles.linksRow}>
          <TouchableOpacity onPress={() => navigation.navigate('PrivacyPolicy')}>
            <Text style={styles.link}>Privacidade</Text>
          </TouchableOpacity>
          <Text style={styles.linkSeparator}> · </Text>
          <TouchableOpacity
            onPress={() =>
              Linking.openURL('https://www.apple.com/legal/internet-services/itunes/dev/stdeula/')
            }
          >
            <Text style={styles.link}>Termos</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  restoreText: { ...typography.bodySmall, color: colors.primary, fontWeight: '700' },
  scroll: { padding: 20, paddingTop: 8, paddingBottom: 40 },
  hero: { alignItems: 'center', marginBottom: 24 },
  crownBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  title: {
    ...typography.h1,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  benefits: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
  },
  benefitIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  benefitText: { flex: 1 },
  benefitTitle: { ...typography.h4, color: colors.text },
  benefitDescription: { ...typography.bodySmall, color: colors.textSecondary, marginTop: 2 },
  loadingBox: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  unavailableBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.warning,
    marginBottom: 20,
  },
  unavailableText: { ...typography.bodySmall, color: colors.textSecondary, flex: 1 },
  plans: { gap: 10, marginBottom: 20 },
  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 2,
    borderColor: colors.border,
    position: 'relative',
  },
  planCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.cream,
  },
  planBadge: {
    position: 'absolute',
    top: -10,
    right: 16,
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  planBadgeText: { ...typography.caption, color: '#fff', fontWeight: '800' },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  planInfo: { flex: 1 },
  planTitle: { ...typography.h4, color: colors.text },
  planSubtitle: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  planPrice: { ...typography.h3, color: colors.primary, fontWeight: '800' },
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
  ctaDisabled: { opacity: 0.5 },
  ctaText: { ...typography.button, color: '#fff', fontSize: 17 },
  disclaimer: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 17,
  },
  linksRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
  },
  link: { ...typography.bodySmall, color: colors.primary, fontWeight: '600' },
  linkSeparator: { ...typography.bodySmall, color: colors.textMuted },
});
