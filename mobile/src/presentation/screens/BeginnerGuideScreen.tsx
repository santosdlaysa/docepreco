import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { Card } from '../components/Card';
import { isDemoMode } from '../../data/demo/demoMode';
import { statsApi } from '../../data/api/statsApi';
import { demoStatsApi } from '../../data/demo/demoApi';

const GUIDE_DISMISSED_KEY = '@docepreco_beginner_guide_dismissed';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type StepStatus = 'locked' | 'current' | 'done';

interface GuideStep {
  id: string;
  number: number;
  icon: keyof typeof Ionicons.glyphMap;
  iconDone: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  tip: string;
  action: string;
  route: keyof RootStackParamList;
  color: string;
  colorLight: string;
  checkDone: (stats: { ingredientsCount: number; recipesCount: number }) => boolean;
}

const STEPS: GuideStep[] = [
  {
    id: 'ingredients',
    number: 1,
    icon: 'basket-outline',
    iconDone: 'basket',
    title: 'Cadastre seus ingredientes',
    description:
      'Comece adicionando os ingredientes que voce usa nas suas receitas. Informe o nome, a quantidade da embalagem e o preco que pagou.',
    tip: 'Dica: Cadastre pelo menos 3 ingredientes para poder montar uma receita completa.',
    action: 'Cadastrar ingrediente',
    route: 'CreateIngredient',
    color: colors.secondary,
    colorLight: '#F5E6D0',
    checkDone: (stats) => stats.ingredientsCount >= 1,
  },
  {
    id: 'recipe',
    number: 2,
    icon: 'book-outline',
    iconDone: 'book',
    title: 'Crie sua primeira receita',
    description:
      'Agora monte uma receita usando os ingredientes cadastrados. Adicione cada ingrediente e a quantidade utilizada — o app calcula o custo automaticamente.',
    tip: 'Dica: Comece com a receita que voce mais vende. Assim, ja descobre se o preco esta certo!',
    action: 'Criar receita',
    route: 'CreateRecipe',
    color: colors.primary,
    colorLight: colors.primaryLight,
    checkDone: (stats) => stats.recipesCount >= 1,
  },
  {
    id: 'margin',
    number: 3,
    icon: 'trending-up-outline',
    iconDone: 'trending-up',
    title: 'Defina sua margem de lucro',
    description:
      'Na tela da receita, defina a margem de lucro desejada (ex: 50%, 100%). O app calcula o preco de venda ideal para voce nunca ter prejuizo.',
    tip: 'Dica: A maioria das confeiteiras usa margem entre 50% e 150%. Comece com 100% e ajuste conforme seu mercado.',
    action: 'Ver minhas receitas',
    route: 'Recipes',
    color: '#4CAF50',
    colorLight: '#E8F5E9',
    checkDone: (stats) => stats.recipesCount >= 1,
  },
];

const { width } = Dimensions.get('window');

export const BeginnerGuideScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [ingredientsCount, setIngredientsCount] = useState(0);
  const [recipesCount, setRecipesCount] = useState(0);
  const [expandedStep, setExpandedStep] = useState<string | null>(null);
  const [animations] = useState(() =>
    STEPS.map(() => new Animated.Value(0))
  );

  const stats = { ingredientsCount, recipesCount };

  const loadStats = async () => {
    try {
      const api = isDemoMode() ? demoStatsApi : statsApi;
      const data = await api.getStats();
      setIngredientsCount(data.ingredientsCount);
      setRecipesCount(data.recipesCount);
    } catch {}
  };

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [])
  );

  const getStepStatus = (step: GuideStep, index: number): StepStatus => {
    if (step.checkDone(stats)) return 'done';
    if (index === 0) return 'current';
    const prevDone = STEPS[index - 1].checkDone(stats);
    return prevDone ? 'current' : 'locked';
  };

  const completedCount = STEPS.filter((s) => s.checkDone(stats)).length;
  const progress = completedCount / STEPS.length;
  const allDone = completedCount === STEPS.length;

  const toggleExpand = (stepId: string, index: number) => {
    const isExpanding = expandedStep !== stepId;
    setExpandedStep(isExpanding ? stepId : null);
    Animated.spring(animations[index], {
      toValue: isExpanding ? 1 : 0,
      useNativeDriver: false,
      tension: 40,
      friction: 8,
    }).start();
    // Collapse others
    animations.forEach((anim, i) => {
      if (i !== index) {
        Animated.spring(anim, {
          toValue: 0,
          useNativeDriver: false,
          tension: 40,
          friction: 8,
        }).start();
      }
    });
  };

  const handleAction = (step: GuideStep) => {
    navigation.navigate(step.route as never);
  };

  const dismissGuide = async () => {
    await AsyncStorage.setItem(GUIDE_DISMISSED_KEY, 'true');
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          <TouchableOpacity onPress={dismissGuide} style={styles.dismissBtn}>
            <Text style={styles.dismissText}>Pular guia</Text>
          </TouchableOpacity>
        </View>

        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroIconCircle}>
            <Ionicons name="school-outline" size={40} color={colors.primary} />
          </View>
          <Text style={styles.heroTitle}>
            {allDone ? 'Parabens! Voce completou o guia!' : 'Modo Iniciante'}
          </Text>
          <Text style={styles.heroSubtitle}>
            {allDone
              ? 'Voce ja sabe o basico para precificar seus doces com seguranca.'
              : 'Siga os 3 passos abaixo para comecar a precificar seus doces com seguranca.'}
          </Text>
        </View>

        {/* Progress */}
        <Card style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>Seu progresso</Text>
            <Text style={styles.progressCount}>
              {completedCount}/{STEPS.length} passos
            </Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressBar, { width: `${progress * 100}%` as any }]} />
          </View>
          {allDone && (
            <View style={styles.completeBanner}>
              <Ionicons name="trophy" size={20} color="#FF9800" />
              <Text style={styles.completeText}>
                Incrivel! Agora explore todas as funcionalidades do app.
              </Text>
            </View>
          )}
        </Card>

        {/* Steps */}
        {STEPS.map((step, index) => {
          const status = getStepStatus(step, index);
          const isExpanded = expandedStep === step.id;
          const maxHeight = animations[index].interpolate({
            inputRange: [0, 1],
            outputRange: [0, 250],
          });
          const opacity = animations[index].interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: [0, 0, 1],
          });

          return (
            <TouchableOpacity
              key={step.id}
              activeOpacity={0.85}
              onPress={() => status !== 'locked' && toggleExpand(step.id, index)}
              disabled={status === 'locked'}
            >
              <Card
                style={StyleSheet.flatten([
                  styles.stepCard,
                  status === 'current' && styles.stepCardCurrent,
                  status === 'done' && styles.stepCardDone,
                  status === 'locked' && styles.stepCardLocked,
                ]) as ViewStyle}
              >
                {/* Step header row */}
                <View style={styles.stepRow}>
                  {/* Step number / check */}
                  <View
                    style={[
                      styles.stepNumberCircle,
                      {
                        backgroundColor:
                          status === 'done'
                            ? '#4CAF50'
                            : status === 'current'
                            ? step.color
                            : colors.border,
                      },
                    ]}
                  >
                    {status === 'done' ? (
                      <Ionicons name="checkmark" size={18} color="#fff" />
                    ) : (
                      <Text style={styles.stepNumberText}>{step.number}</Text>
                    )}
                  </View>

                  {/* Title + subtitle */}
                  <View style={styles.stepContent}>
                    <View style={styles.stepTitleRow}>
                      <Text
                        style={[
                          styles.stepTitle,
                          status === 'locked' && styles.stepTitleLocked,
                          status === 'done' && styles.stepTitleDone,
                        ]}
                      >
                        {step.title}
                      </Text>
                    </View>
                    <Text style={styles.stepStatusText}>
                      {status === 'done'
                        ? 'Concluido!'
                        : status === 'current'
                        ? 'Toque para ver detalhes'
                        : 'Complete o passo anterior'}
                    </Text>
                  </View>

                  {/* Icon */}
                  <View style={[styles.stepIcon, { backgroundColor: step.colorLight }]}>
                    <Ionicons
                      name={status === 'done' ? step.iconDone : step.icon}
                      size={24}
                      color={status === 'locked' ? colors.textMuted : step.color}
                    />
                  </View>
                </View>

                {/* Expandable details */}
                <Animated.View style={[styles.stepDetails, { maxHeight, opacity }]}>
                  <View style={styles.stepDivider} />
                  <Text style={styles.stepDescription}>{step.description}</Text>
                  <View style={styles.stepTip}>
                    <Ionicons name="bulb-outline" size={16} color={colors.warning} />
                    <Text style={styles.stepTipText}>{step.tip}</Text>
                  </View>
                  {status === 'current' && (
                    <TouchableOpacity
                      style={[styles.stepActionBtn, { backgroundColor: step.color }]}
                      onPress={() => handleAction(step)}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="arrow-forward" size={18} color="#fff" />
                      <Text style={styles.stepActionText}>{step.action}</Text>
                    </TouchableOpacity>
                  )}
                </Animated.View>
              </Card>

              {/* Connector line */}
              {index < STEPS.length - 1 && (
                <View style={styles.connector}>
                  <View
                    style={[
                      styles.connectorLine,
                      status === 'done' && styles.connectorLineDone,
                    ]}
                  />
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        {/* Bottom CTA */}
        {allDone && (
          <TouchableOpacity
            style={styles.finishBtn}
            onPress={dismissGuide}
            activeOpacity={0.85}
          >
            <Ionicons name="rocket-outline" size={20} color="#fff" />
            <Text style={styles.finishBtnText}>Explorar o app</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

export const isGuideAvailable = async (): Promise<boolean> => {
  const dismissed = await AsyncStorage.getItem(GUIDE_DISMISSED_KEY);
  return dismissed !== 'true';
};

export const resetGuide = async (): Promise<void> => {
  await AsyncStorage.removeItem(GUIDE_DISMISSED_KEY);
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  dismissBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  dismissText: {
    ...typography.bodySmall,
    color: colors.textMuted,
  },
  hero: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 24,
  },
  heroIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    ...typography.h2,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  heroSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 12,
  },
  progressCard: {
    marginBottom: 24,
    padding: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  progressTitle: {
    ...typography.h4,
    color: colors.text,
  },
  progressCount: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '700',
  },
  progressTrack: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  completeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    backgroundColor: '#FFF8E1',
    borderRadius: 10,
    padding: 10,
  },
  completeText: {
    ...typography.bodySmall,
    color: '#6D5000',
    flex: 1,
    fontWeight: '600',
  },
  stepCard: {
    marginBottom: 0,
    padding: 16,
  },
  stepCardCurrent: {
    borderColor: colors.primary,
    borderWidth: 1.5,
  },
  stepCardDone: {
    borderColor: '#4CAF50',
    borderWidth: 1,
    opacity: 0.9,
  },
  stepCardLocked: {
    opacity: 0.5,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepNumberCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    ...typography.body,
    color: '#fff',
    fontWeight: '700',
  },
  stepContent: {
    flex: 1,
  },
  stepTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepTitle: {
    ...typography.h4,
    color: colors.text,
  },
  stepTitleLocked: {
    color: colors.textMuted,
  },
  stepTitleDone: {
    textDecorationLine: 'line-through',
    color: colors.textSecondary,
  },
  stepStatusText: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  stepIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  stepDetails: {
    overflow: 'hidden',
  },
  stepDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginTop: 14,
    marginBottom: 14,
  },
  stepDescription: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: 12,
  },
  stepTip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FFF8E1',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
  },
  stepTipText: {
    ...typography.bodySmall,
    color: '#6D5000',
    flex: 1,
    lineHeight: 18,
  },
  stepActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 14,
  },
  stepActionText: {
    ...typography.button,
    color: '#fff',
  },
  connector: {
    alignItems: 'center',
    height: 20,
  },
  connectorLine: {
    width: 2,
    height: 20,
    backgroundColor: colors.border,
  },
  connectorLineDone: {
    backgroundColor: '#4CAF50',
  },
  finishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    marginTop: 24,
  },
  finishBtnText: {
    ...typography.button,
    color: '#fff',
  },
});
