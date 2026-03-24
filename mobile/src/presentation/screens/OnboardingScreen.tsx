import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

const { width } = Dimensions.get('window');

const ONBOARDING_KEY = '@docepreco_onboarding_done';

type Slide = {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
  title: string;
  description: string;
};

const SLIDES: Slide[] = [
  {
    id: '1',
    icon: 'sad-outline',
    iconColor: '#E91E8C',
    iconBg: '#F8BBD9',
    title: 'Você sabe se está lucrando?',
    description:
      'Muitas confeiteiras vendem muito, mas no final do mês o dinheiro some. O problema está no preço — calculado no "achismo", sem considerar todos os custos.',
  },
  {
    id: '2',
    icon: 'calculator-outline',
    iconColor: '#8B4513',
    iconBg: '#F5E6D0',
    title: 'Calcule o custo real de cada receita',
    description:
      'Cadastre seus ingredientes com preço e quantidade. O DocePreço calcula automaticamente quanto custa cada grama, cada unidade e cada receita completa.',
  },
  {
    id: '3',
    icon: 'trending-up-outline',
    iconColor: '#4CAF50',
    iconBg: '#E8F5E9',
    title: 'Defina sua margem de lucro',
    description:
      'Escolha quanto quer lucrar — 30%, 50%, 100% ou mais. O app mostra o preço de venda ideal para você nunca mais trabalhar no prejuízo.',
  },
  {
    id: '4',
    icon: 'cash-outline',
    iconColor: '#FF9800',
    iconBg: '#FFF3E0',
    title: 'Acompanhe suas vendas',
    description:
      'Registre o que vendeu, em qual quantidade e por qual preço. Veja seu faturamento por dia, semana ou mês e entenda quando seu negócio cresce.',
  },
];

type Props = {
  onDone: () => void;
};

export const OnboardingScreen: React.FC<Props> = ({ onDone }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const finish = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    onDone();
  };

  const next = () => {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
      setCurrentIndex(currentIndex + 1);
    } else {
      finish();
    }
  };

  const isLast = currentIndex === SLIDES.length - 1;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <TouchableOpacity style={styles.skipBtn} onPress={finish}>
        <Text style={styles.skipText}>Pular</Text>
      </TouchableOpacity>

      <FlatList
        ref={flatListRef}
        data={SLIDES}
        keyExtractor={item => item.id}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={styles.slide}>
            <View style={[styles.iconCircle, { backgroundColor: item.iconBg }]}>
              <Ionicons name={item.icon} size={72} color={item.iconColor} />
            </View>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.description}>{item.description}</Text>
          </View>
        )}
      />

      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === currentIndex && styles.dotActive]}
            />
          ))}
        </View>

        <TouchableOpacity style={styles.nextBtn} onPress={next} activeOpacity={0.85}>
          <Text style={styles.nextBtnText}>
            {isLast ? 'Começar agora' : 'Próximo'}
          </Text>
          <Ionicons
            name={isLast ? 'rocket-outline' : 'arrow-forward'}
            size={20}
            color="#fff"
            style={{ marginLeft: 8 }}
          />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export const hasSeenOnboarding = async (): Promise<boolean> => {
  const val = await AsyncStorage.getItem(ONBOARDING_KEY);
  return val === 'true';
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  skipBtn: {
    alignSelf: 'flex-end',
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 4,
  },
  skipText: {
    ...typography.body,
    color: colors.textMuted,
  },
  slide: {
    width,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
    paddingBottom: 40,
  },
  iconCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  title: {
    ...typography.h2,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 24,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  dotActive: {
    width: 24,
    backgroundColor: colors.primary,
  },
  nextBtn: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextBtnText: {
    ...typography.button,
    color: '#fff',
  },
});
