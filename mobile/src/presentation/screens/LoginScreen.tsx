import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Animated,
  Image,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { authApi } from '../../data/api/authApi';
import { identifyRevenueCatUser, setRevenueCatLocationAttributes } from '../../data/premium/revenueCat';
import { colors } from '../theme/colors';
import { Input } from '../components/Input';
import { useTranslation } from 'react-i18next';
import { getEmailTypoSuggestion } from '../utils/emailTypoCheck';

interface Props {
  onLogin: () => void | Promise<void>;
  onGoToRegister: () => void;
  onGoToForgotPassword?: () => void;
  onDemoLogin?: () => void;
}

export const LoginScreen: React.FC<Props> = ({ onLogin, onGoToRegister, onGoToForgotPassword, onDemoLogin }) => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fadeIn = useRef(new Animated.Value(0)).current;
  const cardSlide = useRef(new Animated.Value(60)).current;
  const logoScale = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(logoScale, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
      Animated.timing(fadeIn, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(cardSlide, { toValue: 0, tension: 40, friction: 9, useNativeDriver: true }),
    ]).start();
  }, []);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!email.trim()) {
      e.email = t('login.emailRequired');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      e.email = t('login.emailInvalid');
    } else {
      const typoSuggestion = getEmailTypoSuggestion(email.trim());
      if (typoSuggestion) {
        e.email = t('login.emailTypo', { suggestion: typoSuggestion });
      }
    }
    if (!password) e.password = t('login.passwordRequired');
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const user = await authApi.login(email.trim(), password);
      await identifyRevenueCatUser(user.id);
      void setRevenueCatLocationAttributes();
      await onLogin();
    } catch (error) {
      const msg = error instanceof Error ? error.message : t('login.loginError');
      setErrors({ general: msg });
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          {/* Header colorido */}
          <View style={styles.header}>
            <Animated.View style={[styles.logoArea, { opacity: fadeIn, transform: [{ scale: logoScale }] }]}>
              <View style={styles.logoWrap}>
                <Image
                  source={require('../../../assets/icon.png')}
                  style={styles.logoImg}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.brand}>Doce Preço</Text>
              <Text style={styles.tagline}>{t('login.tagline')}</Text>
            </Animated.View>
          </View>

          {/* Card sobreposto */}
          <Animated.View style={[styles.card, { opacity: fadeIn, transform: [{ translateY: cardSlide }] }]}>
            <Text style={styles.cardTitle}>{t('login.title')}</Text>

            {errors.general && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={16} color={colors.error} />
                <Text style={styles.errorText}>{errors.general}</Text>
              </View>
            )}

            <Input
              label={t('login.email')}
              placeholder={t('login.emailPlaceholder')}
              value={email}
              onChangeText={(v) => { setEmail(v); if (errors.email) setErrors(prev => ({ ...prev, email: '' })); }}
              keyboardType="email-address"
              autoCapitalize="none"
              error={errors.email}
            />

            <Input
              label={t('login.password')}
              placeholder={t('login.passwordPlaceholder')}
              value={password}
              onChangeText={(v) => { setPassword(v); if (errors.password) setErrors(prev => ({ ...prev, password: '' })); }}
              secureTextEntry={!showPassword}
              error={errors.password}
              rightElement={
                <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={{ padding: 6 }}>
                  <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color={colors.textMuted} />
                </TouchableOpacity>
              }
            />

            {onGoToForgotPassword && (
              <TouchableOpacity onPress={onGoToForgotPassword} style={styles.forgotRow}>
                <Text style={styles.forgotText}>{t('login.forgotPassword')}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.loginBtn, loading && { opacity: 0.6 }]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading && <ActivityIndicator size="small" color="#fff" />}
              <Text style={styles.loginBtnText}>{loading ? t('login.loggingIn') : t('login.loginButton')}</Text>
              {!loading && <Ionicons name="arrow-forward" size={18} color="#fff" />}
            </TouchableOpacity>

            <View style={styles.registerRow}>
              <Text style={styles.registerLabel}>{t('login.noAccount')}</Text>
              <TouchableOpacity onPress={onGoToRegister} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.registerLink}>{t('login.createAccount')}</Text>
              </TouchableOpacity>
            </View>

            {onDemoLogin && (
              <>
                <View style={styles.orRow}>
                  <View style={styles.orLine} />
                  <Text style={styles.orText}>ou</Text>
                  <View style={styles.orLine} />
                </View>

                <TouchableOpacity onPress={onDemoLogin} style={styles.demoBtn} activeOpacity={0.7}>
                  <Ionicons name="play-circle-outline" size={20} color={colors.primary} />
                  <Text style={styles.demoBtnText}>{t('login.tryWithoutAccount')}</Text>
                </TouchableOpacity>
              </>
            )}

            <Text style={styles.version}>v{Constants.expoConfig?.version ?? '?'}</Text>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const CARD_OVERLAP = 40;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  scrollContent: { flexGrow: 1 },

  // Header rosa
  header: {
    backgroundColor: colors.primary,
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: CARD_OVERLAP + 32,
    alignItems: 'center',
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  logoArea: { alignItems: 'center' },
  logoWrap: {
    width: 90,
    height: 90,
    borderRadius: 26,
    overflow: 'hidden',
    marginBottom: 14,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  logoImg: { width: 90, height: 90 },
  brand: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },

  // Card sobreposto
  card: {
    backgroundColor: colors.surface,
    marginTop: -CARD_OVERLAP,
    marginHorizontal: 20,
    borderRadius: 24,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 8,
    marginBottom: 32,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 24,
  },

  // Error
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  errorText: { fontSize: 13, color: colors.error, flex: 1, fontWeight: '500' },

  // Forgot
  forgotRow: { alignSelf: 'flex-end', marginTop: -8, marginBottom: 16 },
  forgotText: { fontSize: 13, color: colors.primary, fontWeight: '600' },

  // Login button
  loginBtn: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  loginBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },

  // Register
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 20,
  },
  registerLabel: { fontSize: 14, color: colors.textSecondary },
  registerLink: { fontSize: 14, color: colors.primary, fontWeight: '700' },

  // Demo
  orRow: { flexDirection: 'row', alignItems: 'center', marginTop: 24, marginBottom: 16 },
  orLine: { flex: 1, height: 1, backgroundColor: colors.border },
  orText: { marginHorizontal: 12, fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  demoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.cream,
  },
  demoBtnText: { fontSize: 14, fontWeight: '600', color: colors.text },

  version: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 24,
  },
});
