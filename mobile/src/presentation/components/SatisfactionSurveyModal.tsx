import React, { useEffect, useState } from 'react';
import {
  Alert,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

const SURVEY_URL = 'https://forms.gle/uQ4JdcuFfG5mMMTw6';
// Troque a versão ao publicar uma nova pesquisa para convidar as pessoas novamente.
const STORAGE_KEY = '@docepreco_satisfaction_survey_2026_09';
const SNOOZE_MS = 3 * 24 * 60 * 60 * 1000;

type SurveyState = {
  action: 'opened' | 'later';
  at: number;
};

interface Props {
  enabled: boolean;
}

export const SatisfactionSurveyModal: React.FC<Props> = ({ enabled }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let active = true;

    if (!enabled) {
      setVisible(false);
      return () => { active = false; };
    }

    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (!active) return;

        if (!stored) {
          setVisible(true);
          return;
        }

        const state = JSON.parse(stored) as SurveyState;
        const shouldShow = state.action === 'later' && Date.now() - state.at >= SNOOZE_MS;
        setVisible(shouldShow);
      } catch {
        // Um valor local inválido não deve impedir o convite de aparecer.
        if (active) setVisible(true);
      }
    })();

    return () => { active = false; };
  }, [enabled]);

  const remember = async (action: SurveyState['action']) => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ action, at: Date.now() }));
  };

  const handleLater = () => {
    setVisible(false);
    void remember('later');
  };

  const handleOpenSurvey = async () => {
    try {
      await Linking.openURL(SURVEY_URL);
      setVisible(false);
      await remember('opened');
    } catch {
      Alert.alert('Não foi possível abrir a pesquisa', 'Verifique sua conexão e tente novamente.');
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleLater}
    >
      <Pressable style={styles.backdrop} onPress={handleLater}>
        <Pressable style={styles.card} onPress={() => {}}>
          <View style={styles.iconCircle}>
            <Ionicons name="chatbubble-ellipses-outline" size={32} color={colors.primary} />
          </View>

          <Text style={styles.title}>Queremos ouvir você!</Text>
          <Text style={styles.message}>
            Responda algumas perguntas rápidas e ajude a deixar o DocePreço ainda melhor para você.
          </Text>

          <View style={styles.timeBadge}>
            <Ionicons name="time-outline" size={16} color={colors.primaryDark} />
            <Text style={styles.timeText}>Leva apenas alguns minutos</Text>
          </View>

          <TouchableOpacity style={styles.primaryButton} onPress={handleOpenSurvey} activeOpacity={0.85}>
            <Text style={styles.primaryButtonText}>Responder pesquisa</Text>
            <Ionicons name="open-outline" size={18} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.laterButton} onPress={handleLater} activeOpacity={0.7}>
            <Text style={styles.laterButtonText}>Agora não</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'rgba(45, 27, 20, 0.58)',
  },
  card: {
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    padding: 26,
    borderRadius: 24,
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 12,
  },
  iconCircle: {
    width: 68,
    height: 68,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    borderRadius: 34,
    backgroundColor: colors.pinkBg,
  },
  title: {
    color: colors.text,
    fontSize: 21,
    fontWeight: '800',
    textAlign: 'center',
  },
  message: {
    marginTop: 9,
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.pinkBg2,
  },
  timeText: {
    color: colors.primaryDark,
    fontSize: 12.5,
    fontWeight: '700',
  },
  primaryButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 22,
    paddingVertical: 15,
    borderRadius: 15,
    backgroundColor: colors.primary,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 15.5,
    fontWeight: '800',
  },
  laterButton: {
    marginTop: 10,
    paddingHorizontal: 18,
    paddingVertical: 9,
  },
  laterButtonText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
});
