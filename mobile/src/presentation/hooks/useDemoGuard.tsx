import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../theme/colors';

export function useDemoGuard() {
  const { isDemoMode, goToRegister } = useAuth();
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const scaleAnim = React.useRef(new Animated.Value(0.85)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;

  const open = useCallback(() => {
    setVisible(true);
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 65,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const close = useCallback(() => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0.85,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => setVisible(false));
  }, []);

  const guardAction = useCallback(
    (callback?: () => void): boolean => {
      if (!isDemoMode) {
        callback?.();
        return true;
      }
      open();
      return false;
    },
    [isDemoMode, open],
  );

  const DemoGuardModal = useCallback(
    () =>
      !visible ? null : (
        <Modal visible transparent animationType="none" statusBarTranslucent>
          <Animated.View style={[styles.overlay, { opacity: opacityAnim }]}>
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={close}
            />
            <Animated.View
              style={[
                styles.card,
                { opacity: opacityAnim, transform: [{ scale: scaleAnim }] },
              ]}
            >
              {/* Illustration area */}
              <View style={styles.iconCircle}>
                <Ionicons name="lock-closed" size={32} color={colors.primary} />
              </View>

              <Text style={styles.title}>{t('demoGuard.title')}</Text>
              <Text style={styles.message}>{t('demoGuard.message')}</Text>

              {/* Benefits */}
              <View style={styles.benefits}>
                {['demoGuard.benefit1', 'demoGuard.benefit2', 'demoGuard.benefit3'].map(
                  (key) => (
                    <View key={key} style={styles.benefitRow}>
                      <Ionicons
                        name="checkmark-circle"
                        size={18}
                        color={colors.success}
                      />
                      <Text style={styles.benefitText}>{t(key)}</Text>
                    </View>
                  ),
                )}
              </View>

              {/* CTA */}
              <TouchableOpacity
                onPress={() => {
                  close();
                  setTimeout(() => goToRegister(), 200);
                }}
                style={styles.ctaBtn}
                activeOpacity={0.85}
              >
                <Ionicons name="person-add-outline" size={18} color="#fff" />
                <Text style={styles.ctaBtnText}>
                  {t('demoGuard.createAccount')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={close} style={styles.cancelBtn}>
                <Text style={styles.cancelText}>
                  {t('demoGuard.keepExploring')}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>
        </Modal>
      ),
    [visible, close, goToRegister, t, opacityAnim, scaleAnim],
  );

  return { guardAction, isDemoMode, DemoGuardModal };
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 28,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 28,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  benefits: {
    width: '100%',
    backgroundColor: colors.cream,
    borderRadius: 14,
    padding: 14,
    gap: 10,
    marginBottom: 24,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  benefitText: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '500',
    flex: 1,
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    width: '100%',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  ctaBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelBtn: {
    marginTop: 14,
    paddingVertical: 8,
  },
  cancelText: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: '600',
  },
});
