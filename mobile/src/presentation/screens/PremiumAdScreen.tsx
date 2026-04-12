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
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

interface Props {
  onViewPlans: () => void;
  onSkip: () => void;
}

const BENEFITS: Array<{ icon: keyof typeof Ionicons.glyphMap; title: string; description: string }> = [
  {
    icon: 'infinite-outline',
    title: 'Receitas ilimitadas',
    description: 'Chega de limite. Cadastre quantas receitas quiser.',
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

export const PremiumAdScreen: React.FC<Props> = ({ onViewPlans, onSkip }) => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.badge}>
            <Ionicons name="sparkles" size={32} color="#fff" />
          </View>
          <Text style={styles.title}>Conheça o DocePreço Premium</Text>
          <Text style={styles.subtitle}>
            Ferramentas profissionais pra você crescer e lucrar mais com sua confeitaria.
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
          <Text style={styles.ctaText}>Ver planos</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.skipBtn} onPress={onSkip} activeOpacity={0.7}>
          <Text style={styles.skipText}>Agora não</Text>
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
