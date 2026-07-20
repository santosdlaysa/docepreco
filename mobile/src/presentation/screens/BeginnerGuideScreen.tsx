import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Easing,
  Image,
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

const GUIDE_DISMISSED_KEY = '@docepreco_beginner_guide_dismissed';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// ── Design tokens (Doce Preço — Onboarding) ──
const PRIMARY = '#E91E8C';
const PRIMARY_LIGHT = '#F8BBD9';
const PRIMARY_DARK = '#C2185B';
const SECONDARY = '#8B4513';
const SECONDARY_LIGHT = '#D2B48C';
const BACKGROUND = '#FFFFFF';
const SURFACE = '#FFFFFF';
const TEXT = '#2D1B14';
const TEXT_SECONDARY = '#8B7355';
const TEXT_MUTED = '#B5A090';
const SUCCESS = '#4CAF50';
const BORDER = '#F0D5DC';
const BEIGE = '#F5E6D0';
const CREAM = '#FFF8F0';

// ── Tipografia ──
const SERIF = 'PlayfairDisplay_700Bold';
const SERIF_ITALIC = 'PlayfairDisplay_400Regular_Italic';
const SANS = 'DMSans_400Regular';
const SANS_MED = 'DMSans_500Medium';
const SANS_SEMI = 'DMSans_600SemiBold';
const SANS_BOLD = 'DMSans_700Bold';

type StepStatus = 'done' | 'current' | 'lock';

const SHADOW = {
  shadowColor: SECONDARY,
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.08,
  shadowRadius: 12,
  elevation: 3,
};

const CONFETTI_COLORS = [PRIMARY, SUCCESS, '#FF9800', SECONDARY, PRIMARY_LIGHT, SECONDARY_LIGHT];

// ── Confetti ──
interface ConfettiConf {
  left: number;      // % horizontal de partida
  drift: number;     // deslocamento horizontal
  size: number;
  color: string;
  delay: number;
  duration: number;
  spin: number;      // graus de rotação
}

const ConfettiPiece: React.FC<{ conf: ConfettiConf; play: boolean }> = ({ conf, play }) => {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!play) return;
    anim.setValue(0);
    Animated.timing(anim, {
      toValue: 1,
      duration: conf.duration,
      delay: conf.delay,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [play]);

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [-30, 320] });
  const translateX = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, conf.drift * 0.5, conf.drift] });
  const rotate = anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${conf.spin}deg`] });
  const opacity = anim.interpolate({ inputRange: [0, 0.15, 0.85, 1], outputRange: [0, 1, 1, 0] });

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: 0,
        left: `${conf.left}%`,
        width: conf.size,
        height: conf.size * 1.4,
        borderRadius: 2,
        backgroundColor: conf.color,
        transform: [{ translateX }, { translateY }, { rotate }],
        opacity,
      }}
    />
  );
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
      n: '01',
      icon: 'basket-outline' as const,
      color: PRIMARY,
      time: '~2 min',
      title: t('beginnerGuide.step1Title'),
      desc: t('beginnerGuide.step1Desc'),
      tip: t('beginnerGuide.step1Tip'),
      route: 'CreateIngredient' as const,
      actionLabel: t('beginnerGuide.step1Action'),
      isDone: ingredientsCount >= 1,
    },
    {
      id: 'recipe',
      n: '02',
      icon: 'book-outline' as const,
      color: SECONDARY,
      time: '~3 min',
      title: t('beginnerGuide.step2Title'),
      desc: t('beginnerGuide.step2Desc'),
      tip: t('beginnerGuide.step2Tip'),
      route: 'CreateRecipe' as const,
      actionLabel: t('beginnerGuide.step2Action'),
      isDone: recipesCount >= 1,
    },
    {
      id: 'margin',
      n: '03',
      icon: 'trending-up-outline' as const,
      color: TEXT_SECONDARY,
      time: '~1 min',
      title: t('beginnerGuide.step3Title'),
      desc: t('beginnerGuide.step3Desc'),
      tip: t('beginnerGuide.step3Tip'),
      route: 'Recipes' as const,
      actionLabel: t('beginnerGuide.step3Action'),
      isDone: recipesCount >= 1,
    },
  ];

  const completedCount = steps.filter(s => s.isDone).length;
  const progress = completedCount / steps.length;
  const allDone = completedCount === steps.length;

  const loadStats = async () => {
    try {
      const api = isDemoMode() ? demoStatsApi : statsApi;
      const data = await api.getStats();
      setIngredientsCount(data.ingredientsCount);
      setRecipesCount(data.recipesCount);
    } catch {}
  };

  useFocusEffect(useCallback(() => { loadStats(); }, []));

  // ── Animações ──
  const progressAnim = useRef(new Animated.Value(0)).current;
  const enterAnim = useRef(new Animated.Value(0)).current;
  const celebrateScale = useRef(new Animated.Value(0)).current;
  const [confettiPlay, setConfettiPlay] = useState(false);

  // Entrada suave da tela
  useEffect(() => {
    Animated.timing(enterAnim, {
      toValue: 1,
      duration: 420,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);

  // Barra de progresso animada
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 600,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [progress]);

  // Dispara a celebração ao concluir todos os passos
  useEffect(() => {
    if (allDone) {
      setConfettiPlay(true);
      celebrateScale.setValue(0);
      Animated.spring(celebrateScale, {
        toValue: 1,
        friction: 5,
        tension: 80,
        useNativeDriver: true,
      }).start();
    } else {
      setConfettiPlay(false);
    }
  }, [allDone]);

  const confetti = useMemo<ConfettiConf[]>(() => {
    return Array.from({ length: 24 }, (_, i) => ({
      left: Math.round(Math.random() * 100),
      drift: Math.round((Math.random() - 0.5) * 180),
      size: 7 + Math.round(Math.random() * 6),
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      delay: Math.round(Math.random() * 500),
      duration: 1800 + Math.round(Math.random() * 900),
      spin: (Math.random() > 0.5 ? 1 : -1) * (360 + Math.round(Math.random() * 540)),
    }));
  }, []);

  const getStatus = (index: number): StepStatus => {
    if (steps[index].isDone) return 'done';
    if (index === 0) return 'current';
    return steps[index - 1].isDone ? 'current' : 'lock';
  };

  const dismissGuide = () => {
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

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 44 }}>
        {/* ── Header ── */}
        <View style={s.header}>
          <TouchableOpacity onPress={dismissGuide} style={s.backBtn} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={20} color={TEXT} />
          </TouchableOpacity>
          <View style={s.brandRow}>
            <Image
              source={require('../../../assets/icon.png')}
              style={s.brandLogo}
              resizeMode="contain"
            />
          </View>
          {!allDone && (
            <TouchableOpacity onPress={dismissGuide} style={s.skipBtn} activeOpacity={0.7}>
              <Text style={s.skipText}>Pular</Text>
            </TouchableOpacity>
          )}
        </View>

        <Animated.View
          style={[
            s.body,
            {
              opacity: enterAnim,
              transform: [{ translateY: enterAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
            },
          ]}
        >
          {/* ── Hero ── */}
          {allDone ? (
            <View style={s.celebrateWrap}>
              {/* Confete */}
              <View style={s.confettiLayer} pointerEvents="none">
                {confetti.map((c, i) => (
                  <ConfettiPiece key={i} conf={c} play={confettiPlay} />
                ))}
              </View>

              <View style={s.celebrateCard}>
                <Animated.View style={[s.celebrateBadge, { transform: [{ scale: celebrateScale }] }]}>
                  <Ionicons name="trophy" size={30} color="#fff" />
                </Animated.View>
                <Text style={s.eyebrow}>TUDO PRONTO</Text>
                <Text style={s.celebrateTitle}>
                  Você concluiu os{'\n'}
                  <Text style={s.celebrateTitleAccent}>primeiros passos 🎉</Text>
                </Text>
                <Text style={s.celebrateSub}>{t('beginnerGuide.completedSubtitle')}</Text>
              </View>
            </View>
          ) : (
            <View style={s.hero}>
              <Text style={s.eyebrow}>PRIMEIROS PASSOS</Text>
              <Text style={s.heroTitle}>
                Precifique suas receitas{'\n'}
                <Text style={s.heroTitleAccent}>com confiança e precisão</Text>
              </Text>
              <Text style={s.heroDesc}>
                Em três passos simples você terá o preço certo para cada produto — cobrindo todos os
                seus custos e garantindo o lucro que você merece.
              </Text>

              {/* Progresso */}
              <View style={s.progressRow}>
                <View style={s.progressTrack}>
                  <Animated.View style={[s.progressFill, { width: progressWidth }]} />
                </View>
                <Text style={s.progressLabel}>{completedCount}/{steps.length}</Text>
              </View>
            </View>
          )}

          {/* ── Steps timeline ── */}
          <View style={s.timeline}>
            {/* Linha vertical em degradê */}
            <LinearGradient
              colors={[PRIMARY_LIGHT, SECONDARY_LIGHT, BORDER]}
              style={s.timelineLine}
              pointerEvents="none"
            />

            {steps.map((step, i) => {
              const status = getStatus(i);
              const nodeColor = status === 'done' ? SUCCESS : status === 'lock' ? BEIGE : step.color;
              const nodeFg = status === 'lock' ? TEXT_MUTED : '#fff';

              return (
                <View key={step.id} style={[s.step, i === steps.length - 1 && { paddingBottom: 0 }]}>
                  {/* Nó circular */}
                  <View style={[s.stepNode, { backgroundColor: nodeColor }]}>
                    {status === 'done' ? (
                      <Ionicons name="checkmark" size={24} color={nodeFg} />
                    ) : status === 'lock' ? (
                      <Ionicons name="lock-closed" size={18} color={nodeFg} />
                    ) : (
                      <Ionicons name={step.icon} size={22} color={nodeFg} />
                    )}
                  </View>

                  {/* Card do passo */}
                  <View
                    style={[
                      s.stepCard,
                      status === 'current' && { borderColor: step.color, borderWidth: 1.5 },
                      status === 'lock' && s.stepCardLock,
                      status === 'done' && s.stepCardDone,
                    ]}
                  >
                    <View style={s.stepHead}>
                      <Text style={[s.stepEyebrow, { color: status === 'done' ? SUCCESS : step.color }]}>
                        PASSO {step.n}
                      </Text>
                      {status === 'done' ? (
                        <View style={s.donePill}>
                          <Ionicons name="checkmark-circle" size={12} color={SUCCESS} />
                          <Text style={s.donePillText}>{t('beginnerGuide.completed')}</Text>
                        </View>
                      ) : (
                        <View style={s.timePill}>
                          <Ionicons name="time-outline" size={11} color={TEXT_SECONDARY} />
                          <Text style={s.timePillText}>{step.time}</Text>
                        </View>
                      )}
                    </View>

                    <Text style={[s.stepTitle, status === 'done' && s.stepTitleDone]}>{step.title}</Text>
                    <Text style={s.stepDesc}>{step.desc}</Text>

                    {status === 'current' && (
                      <>
                        <View style={s.tipBox}>
                          <Ionicons name="bulb-outline" size={15} color={SECONDARY} style={{ marginTop: 1 }} />
                          <Text style={s.tipText}>{step.tip}</Text>
                        </View>
                        <TouchableOpacity
                          activeOpacity={0.85}
                          onPress={() => navigation.navigate(step.route as never)}
                          style={[s.stepBtn, { backgroundColor: step.color }]}
                        >
                          <Text style={s.stepBtnText}>{step.actionLabel}</Text>
                          <Ionicons name="arrow-forward" size={16} color="#fff" />
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                </View>
              );
            })}
          </View>

          {/* ── CTA final ── */}
          {allDone && (
            <TouchableOpacity activeOpacity={0.85} onPress={dismissGuide} style={s.finishBtn}>
              <Text style={s.finishBtnText}>Concluir e explorar o app</Text>
              <Ionicons name="sparkles" size={17} color="#fff" />
            </TouchableOpacity>
          )}
        </Animated.View>
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
  container: { flex: 1, backgroundColor: BACKGROUND },
  body: { paddingHorizontal: 20, gap: 24 },

  /* ── Header ── */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: BEIGE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandRow: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  brandLogo: { width: 36, height: 36, borderRadius: 10 },
  skipBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: CREAM,
    borderWidth: 1,
    borderColor: BORDER,
  },
  skipText: { fontFamily: SANS_BOLD, fontSize: 13, color: TEXT_SECONDARY },

  /* ── Eyebrow ── */
  eyebrow: {
    fontFamily: SANS_SEMI,
    fontSize: 12,
    letterSpacing: 1.6,
    color: TEXT_SECONDARY,
    marginBottom: 12,
  },

  /* ── Hero ── */
  hero: {
    paddingTop: 20,
  },
  heroTitle: {
    fontFamily: SERIF,
    fontSize: 30,
    color: TEXT,
    lineHeight: 38,
    marginBottom: 14,
  },
  heroTitleAccent: {
    fontFamily: SERIF_ITALIC,
    color: PRIMARY,
  },
  heroDesc: {
    fontFamily: SANS,
    fontSize: 15,
    color: TEXT_SECONDARY,
    lineHeight: 24,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 22,
  },
  progressTrack: {
    flex: 1,
    height: 8,
    borderRadius: 99,
    backgroundColor: BORDER,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 99,
    backgroundColor: PRIMARY,
  },
  progressLabel: { fontFamily: SANS_BOLD, fontSize: 13, color: TEXT_SECONDARY },

  /* ── Celebração ── */
  celebrateWrap: { position: 'relative', paddingTop: 12 },
  confettiLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 320,
    zIndex: 5,
    overflow: 'hidden',
  },
  celebrateCard: {
    borderRadius: 24,
    paddingVertical: 30,
    paddingHorizontal: 24,
    alignItems: 'center',
    backgroundColor: CREAM,
    borderWidth: 1,
    borderColor: BORDER,
  },
  celebrateBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: SUCCESS,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    ...SHADOW,
  },
  celebrateTitle: {
    fontFamily: SERIF,
    fontSize: 25,
    color: TEXT,
    textAlign: 'center',
    lineHeight: 33,
  },
  celebrateTitleAccent: { fontFamily: SERIF_ITALIC, color: PRIMARY },
  celebrateSub: {
    fontFamily: SANS,
    fontSize: 14,
    color: TEXT_SECONDARY,
    marginTop: 12,
    textAlign: 'center',
    lineHeight: 21,
  },

  /* ── Timeline ── */
  timeline: { position: 'relative' },
  timelineLine: {
    position: 'absolute',
    left: 26,
    top: 28,
    bottom: 60,
    width: 2,
  },
  step: {
    flexDirection: 'row',
    gap: 16,
    paddingBottom: 28,
  },
  stepNode: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: SURFACE,
    zIndex: 2,
    ...SHADOW,
  },

  /* ── Step card ── */
  stepCard: {
    flex: 1,
    backgroundColor: SURFACE,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: BORDER,
    ...SHADOW,
  },
  stepCardLock: {
    opacity: 0.7,
    backgroundColor: CREAM,
  },
  stepCardDone: {
    backgroundColor: '#F6FBF6',
    borderColor: '#DFF0DF',
  },
  stepHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  stepEyebrow: { fontFamily: SANS_BOLD, fontSize: 11, letterSpacing: 1.2 },
  stepTitle: { fontFamily: SERIF, fontSize: 19, color: TEXT, lineHeight: 25 },
  stepTitleDone: { color: TEXT_SECONDARY },
  stepDesc: { fontFamily: SANS, fontSize: 13.5, color: TEXT_SECONDARY, marginTop: 6, lineHeight: 20 },
  donePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E7F5E7',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 99,
  },
  donePillText: { fontFamily: SANS_BOLD, fontSize: 10.5, color: SUCCESS },
  timePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: CREAM,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: BEIGE,
  },
  timePillText: { fontFamily: SANS_SEMI, fontSize: 10.5, color: TEXT_SECONDARY },
  tipBox: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: CREAM,
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: BEIGE,
  },
  tipText: { flex: 1, fontFamily: SANS_MED, fontSize: 12, color: SECONDARY, lineHeight: 17 },
  stepBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    height: 46,
    borderRadius: 14,
    marginTop: 14,
    ...SHADOW,
  },
  stepBtnText: { fontFamily: SANS_SEMI, fontSize: 14, color: '#fff' },

  /* ── CTA final ── */
  finishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 54,
    borderRadius: 16,
    backgroundColor: PRIMARY,
    ...SHADOW,
  },
  finishBtnText: { fontFamily: SANS_BOLD, fontSize: 16, color: '#fff' },
});
