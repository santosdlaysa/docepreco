import { colors } from '../theme/colors';
import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { typography } from '../theme/typography';
import { useTranslation } from 'react-i18next';

interface Props {
  onViewPlans: () => void;
  onSkip: () => void;
}

// BENEFITS moved inside component for i18n

export const PremiumAdScreen: React.FC<Props> = ({ onViewPlans, onSkip }) => {
  const { t } = useTranslation();

  const BENEFITS: Array<{ icon: keyof typeof Ionicons.glyphMap; title: string; description: string }> = [
    { icon: 'infinite-outline', title: t('paywall.unlimitedRecipes'), description: t('paywall.unlimitedRecipesDesc') },
    { icon: 'resize-outline', title: t('paywall.scaleCalc'), description: t('paywall.scaleCalcDesc') },
    { icon: 'copy-outline', title: t('paywall.duplicateRecipes'), description: t('paywall.duplicateRecipesDesc') },
    { icon: 'calendar-outline', title: t('paywall.orderAgenda'), description: t('paywall.orderAgendaDesc') },
    { icon: 'people-outline', title: t('paywall.clientManagement'), description: t('paywall.clientManagementDesc') },
    { icon: 'calculator-outline', title: t('paywall.proCalc'), description: t('paywall.proCalcDesc') },
    { icon: 'stats-chart-outline', title: t('paywall.fullReports'), description: t('paywall.fullReportsDesc') },
    { icon: 'document-text-outline', title: t('paywall.customPdf'), description: t('paywall.customPdfDesc') },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.badge}>
            <Ionicons name="sparkles" size={32} color="#fff" />
          </View>
          <Text style={styles.title}>{t('premiumAd.title')}</Text>
          <Text style={styles.subtitle}>
            {t('premiumAd.subtitle')}
          </Text>
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

        <TouchableOpacity style={styles.cta} onPress={onViewPlans} activeOpacity={0.85}>
          <Ionicons name="sparkles" size={18} color="#fff" />
          <Text style={styles.ctaText}>{t('premiumAd.viewPlans')}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.skipBtn} onPress={onSkip} activeOpacity={0.7}>
          <Text style={styles.skipText}>{t('premiumAd.notNow')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  scroll: {
    padding: 20,
    paddingTop: 40,
    paddingBottom: 40,
    flexGrow: 1,
    justifyContent: 'center',
  },
  hero: { alignItems: 'center', marginBottom: 28 },
  badge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    ...typography.h1,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 16,
    lineHeight: 22,
  },
  benefits: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 28,
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
  skipBtn: {
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 4,
  },
  skipText: {
    ...typography.body,
    color: colors.textMuted,
    fontWeight: '600',
  },
});
