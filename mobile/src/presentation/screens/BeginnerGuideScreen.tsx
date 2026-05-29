import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootStackParamList } from '../navigation/types';
import { isDemoMode } from '../../data/demo/demoMode';
import { statsApi } from '../../data/api/statsApi';
import { demoStatsApi } from '../../data/demo/demoApi';
import { useTranslation } from 'react-i18next';
import { useAdInterstitial } from '../ads';
import { useEffect } from 'react';

const GUIDE_DISMISSED_KEY = '@docepreco_beginner_guide_dismissed';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// ── Design tokens ──
const INK = '#3D2233';
const INK2 = '#9A7E8C';
const INK3 = '#C4B0BB';
const CREAM = '#FFF6F0';
const CREAM2 = '#FCEFE6';
const LINE = '#F1E2DA';
const PINK = '#EA4B92';
const GREEN = '#43BE6E';

type StepStatus = 'done' | 'current' | 'lock';

const SHADOW = {
  shadowColor: INK,
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.07,
  shadowRadius: 12,
  elevation: 4,
};

interface Props {
  onComplete?: () => void;
}

export const BeginnerGuideScreen: React.FC<Props> = ({ onComplete }) => {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp>();
  const { showInterstitial } = useAdInterstitial();

  useEffect(() => { showInterstitial(); }, []);

  const [ingredientsCount, setIngredientsCount] = useState(0);
  const [recipesCount, setRecipesCount] = useState(0);

  const steps = [
    {
      id: 'ingredients',
      n: '1',
      title: t('beginnerGuide.step1Title'),
      desc: t('beginnerGuide.step1Desc'),
      route: 'CreateIngredient' as const,
      actionLabel: t('beginnerGuide.step1Action'),
      isDone: ingredientsCount >= 1,
    },
    {
      id: 'recipe',
      n: '2',
      title: t('beginnerGuide.step2Title'),
      desc: t('beginnerGuide.step2Desc'),
      route: 'CreateRecipe' as const,
      actionLabel: t('beginnerGuide.step2Action'),
      isDone: recipesCount >= 1,
    },
    {
      id: 'margin',
      n: '3',
      title: t('beginnerGuide.step3Title'),
      desc: t('beginnerGuide.step3Desc'),
      route: 'Recipes' as const,
      actionLabel: t('beginnerGuide.step3Action'),
      isDone: recipesCount >= 1,
    },
  ];

  const loadStats = async () => {
    try {
      const api = isDemoMode() ? demoStatsApi : statsApi;
      const data = await api.getStats();
      setIngredientsCount(data.ingredientsCount);
      setRecipesCount(data.recipesCount);
    } catch {}
  };

  useFocusEffect(useCallback(() => { loadStats(); }, []));

  const getStatus = (index: number): StepStatus => {
    if (steps[index].isDone) return 'done';
    if (index === 0) return 'current';
    return steps[index - 1].isDone ? 'current' : 'lock';
  };

  const completedCount = steps.filter(s => s.isDone).length;
  const progress = completedCount / steps.length;

  const dismissGuide = () => {
    console.log('[BeginnerGuide] dismissGuide called, onComplete:', !!onComplete, 'canGoBack:', navigation.canGoBack());
    AsyncStorage.setItem(GUIDE_DISMISSED_KEY, 'true').catch(() => {});
    if (onComplete) {
      onComplete();
      return;
    }
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    // Fallback: navigate to Home tab
    (navigation as any).reset({ index: 0, routes: [{ name: 'Main' }] });
  };

  const STATUS_COLORS: Record<StepStatus, [string, string]> = {
    done: [GREEN, '#fff'],
    current: [PINK, '#fff'],
    lock: [CREAM2, INK3],
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* ── Header ── */}
        <View style={s.header}>
          <TouchableOpacity onPress={dismissGuide} style={s.backBtn} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={20} color={INK} />
          </TouchableOpacity>
          <View style={s.headerTitle}>
            <Text style={s.headerTitleText}>Primeiros passos</Text>
          </View>
          <TouchableOpacity onPress={dismissGuide} style={s.skipBtn} activeOpacity={0.7}>
            <Text style={s.skipText}>Pular</Text>
          </TouchableOpacity>
        </View>

        <View style={s.body}>
          {/* ── Hero ── */}
          <LinearGradient
            colors={['#FF6AAE', PINK, '#C7367A']}
            locations={[0, 0.52, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.hero}
          >
            <View style={s.heroRow}>
              <View style={s.heroIcon}>
                <Ionicons name="school" size={26} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.heroTitle}>Vamos começar!</Text>
                <Text style={s.heroSub}>{completedCount} de {steps.length} passos concluídos</Text>
              </View>
            </View>
            <View style={s.heroTrack}>
              <View style={[s.heroFill, { width: `${progress * 100}%` as any }]} />
            </View>
          </LinearGradient>

          {/* ── Steps timeline ── */}
          <View style={s.timeline}>
            {steps.map((step, i) => {
              const status = getStatus(i);
              const [bg, fg] = STATUS_COLORS[status];
              const isLast = i === steps.length - 1;

              return (
                <View key={step.id} style={s.step}>
                  {/* Left: number + connector */}
                  <View style={s.stepLeft}>
                    <View style={[s.stepNum, { backgroundColor: bg }]}>
                      {status === 'done' ? (
                        <Ionicons name="checkmark" size={20} color={fg} />
                      ) : status === 'lock' ? (
                        <Ionicons name="lock-closed" size={14} color={fg} />
                      ) : (
                        <Text style={[s.stepNumText, { color: fg }]}>{step.n}</Text>
                      )}
                    </View>
                    {!isLast && <View style={[s.connector, status === 'done' && s.connectorDone]} />}
                  </View>

                  {/* Right: card */}
                  <View
                    style={[
                      s.stepCard,
                      status === 'current' && s.stepCardCurrent,
                      status === 'lock' && s.stepCardLock,
                    ]}
                  >
                    <Text style={s.stepTitle}>{step.title}</Text>
                    <Text style={s.stepDesc}>{step.desc}</Text>
                    {status === 'current' && (
                      <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={() => navigation.navigate(step.route as never)}
                      >
                        <LinearGradient
                          colors={['#FF6AAE', PINK]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={s.stepBtn}
                        >
                          <Text style={s.stepBtnText}>{step.actionLabel}</Text>
                          <Ionicons name="chevron-forward" size={16} color="#fff" />
                        </LinearGradient>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </View>
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

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: CREAM },
  body: { paddingHorizontal: 18, gap: 16 },

  /* ── Header ── */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW,
  },
  headerTitle: { flex: 1 },
  headerTitleText: { fontSize: 22, fontWeight: '700', color: INK },
  skipBtn: {
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    ...SHADOW,
  },
  skipText: { fontSize: 13.5, fontWeight: '700', color: INK },

  /* ── Hero ── */
  hero: {
    borderRadius: 26,
    padding: 18,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: { fontSize: 19, fontWeight: '700', color: '#fff' },
  heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.92)', fontWeight: '500', marginTop: 2 },
  heroTrack: {
    height: 8,
    borderRadius: 99,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginTop: 14,
    overflow: 'hidden',
  },
  heroFill: {
    height: '100%',
    borderRadius: 99,
    backgroundColor: '#fff',
  },

  /* ── Timeline ── */
  timeline: { gap: 0 },
  step: {
    flexDirection: 'row',
    gap: 14,
  },
  stepLeft: {
    alignItems: 'center',
    width: 42,
  },
  stepNum: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  stepNumText: { fontSize: 18, fontWeight: '800' },
  connector: {
    width: 2,
    flex: 1,
    backgroundColor: LINE,
    marginVertical: -2,
    zIndex: 1,
  },
  connectorDone: { backgroundColor: GREEN },

  /* ── Step card ── */
  stepCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 18,
    ...SHADOW,
  },
  stepCardCurrent: {
    borderWidth: 2,
    borderColor: PINK,
  },
  stepCardLock: {
    opacity: 0.65,
  },
  stepTitle: { fontSize: 15.5, fontWeight: '700', color: INK, lineHeight: 19 },
  stepDesc: { fontSize: 12.5, color: INK2, fontWeight: '500', marginTop: 5, lineHeight: 18 },
  stepBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 42,
    borderRadius: 14,
    marginTop: 11,
  },
  stepBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
