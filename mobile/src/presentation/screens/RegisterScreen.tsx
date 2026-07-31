import { colors } from '../theme/colors';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { authApi } from '../../data/api/authApi';
import { identifyRevenueCatUser, setRevenueCatLocationAttributes } from '../../data/premium/revenueCat';
import { Input } from '../components/Input';
import { useTranslation } from 'react-i18next';
import { getEmailTypoSuggestion, isValidEmail } from '../utils/emailTypoCheck';
import { CountryCodePicker } from '../components/CountryCodePicker';
import { LgpdConsentModal } from '../components/LgpdConsentModal';

interface Props {
  onRegister: () => void;
  onGoToLogin: () => void;
}

export const RegisterScreen: React.FC<Props> = ({ onRegister, onGoToLogin }) => {
  const { t } = useTranslation();
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+55');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [acceptedLgpd, setAcceptedLgpd] = useState(false);
  const [showLgpd, setShowLgpd] = useState(false);

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
    if (!companyName.trim()) e.companyName = t('register.companyRequired');
    if (!email.trim()) {
      e.email = t('register.emailRequired');
    } else if (!isValidEmail(email.trim())) {
      e.email = t('register.emailInvalid');
    } else {
      const typoSuggestion = getEmailTypoSuggestion(email.trim());
      if (typoSuggestion) {
        e.email = t('register.emailTypo', { suggestion: typoSuggestion });
      } else {
        const domain = email.trim().split('@')[1].toLowerCase();
        const blocked = ['exemple.com', 'example.com', 'test.com', 'teste.com', 'email.com', 'mail.com', 'temp.com', 'fake.com', 'abc.com', 'xyz.com', 'aaa.com', 'bbb.com', 'asdf.com', 'qwerty.com', 'noreply.com', 'noemail.com'];
        if (blocked.includes(domain)) {
          e.email = t('register.emailInvalid');
        }
      }
    }
    if (!phone.trim()) {
      e.phone = 'Informe seu telefone com DDD.';
    } else {
      const digits = phone.replace(/\D/g, '');
      if (digits.length < 8 || digits.length > 12) e.phone = t('register.phoneInvalid');
    }
    if (!password || password.length < 6) e.password = t('register.passwordMin');
    else if (password !== confirmPassword) e.confirmPassword = 'As senhas não coincidem';
    if (!acceptedLgpd) e.lgpd = 'Você precisa aceitar a Política de Privacidade (LGPD).';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const fullPhone = phone.trim() ? `${countryCode.replace('+', '')}${phone.replace(/\D/g, '')}` : undefined;
      const refCode = referralCode.trim() ? referralCode.trim().toUpperCase() : undefined;
      const user = await authApi.register(companyName.trim(), email.trim(), password, fullPhone, refCode);
      await identifyRevenueCatUser(user.id);
      void setRevenueCatLocationAttributes();
      onRegister();
    } catch (error) {
      const msg = error instanceof Error ? error.message : t('register.registerError');
      setErrors({ general: msg });
    } finally {
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
            </Animated.View>
          </View>

          {/* Card sobreposto */}
          <Animated.View style={[styles.card, { opacity: fadeIn, transform: [{ translateY: cardSlide }] }]}>
            <Text style={styles.cardTitle}>{t('register.title')}</Text>
            <Text style={styles.cardSubtitle}>{t('register.subtitle')}</Text>

            {errors.general && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={16} color={colors.error} />
                <Text style={styles.errorText}>{errors.general}</Text>
              </View>
            )}

            <Input
              label={t('register.companyName')}
              placeholder={t('register.companyPlaceholder')}
              value={companyName}
              onChangeText={(v) => { setCompanyName(v); if (errors.companyName) setErrors(prev => ({ ...prev, companyName: '' })); }}
              error={errors.companyName}
              maxLength={30}
            />
            <Input
              label={t('register.emailLabel')}
              placeholder="seu@email.com"
              value={email}
              onChangeText={(v) => { setEmail(v); if (errors.email) setErrors(prev => ({ ...prev, email: '' })); }}
              keyboardType="email-address"
              autoCapitalize="none"
              error={errors.email}
            />
            <Input
              label={t('register.phoneLabel')}
              placeholder={t('register.phonePlaceholder')}
              value={phone}
              onChangeText={(v) => { setPhone(v); if (errors.phone) setErrors(prev => ({ ...prev, phone: '' })); }}
              keyboardType="phone-pad"
              maxLength={15}
              error={errors.phone}
              leftElement={<CountryCodePicker value={countryCode} onChange={setCountryCode} />}
            />
            <Input
              label={t('register.passwordLabel')}
              placeholder={t('register.passwordPlaceholder')}
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
            <Input
              label="Confirmar senha"
              placeholder="Digite a senha novamente"
              value={confirmPassword}
              onChangeText={(v) => { setConfirmPassword(v); if (errors.confirmPassword) setErrors(prev => ({ ...prev, confirmPassword: '' })); }}
              secureTextEntry={!showPassword}
              error={errors.confirmPassword}
            />
            <Input
              label="Código de indicação (opcional)"
              placeholder="Quem te indicou?"
              value={referralCode}
              onChangeText={(v) => setReferralCode(v.toUpperCase())}
              autoCapitalize="characters"
              maxLength={8}
            />

            {/* Aceite LGPD */}
            <TouchableOpacity
              style={styles.lgpdRow}
              onPress={() => { setAcceptedLgpd(v => !v); if (errors.lgpd) setErrors(prev => ({ ...prev, lgpd: '' })); }}
              activeOpacity={0.7}
            >
              <Ionicons
                name={acceptedLgpd ? 'checkbox' : 'square-outline'}
                size={22}
                color={acceptedLgpd ? colors.primary : colors.textMuted}
              />
              <Text style={styles.lgpdText}>
                Li e aceito a{' '}
                <Text style={styles.lgpdLink} onPress={() => setShowLgpd(true)}>
                  Política de Privacidade e o tratamento dos meus dados (LGPD)
                </Text>
                .
              </Text>
            </TouchableOpacity>
            {errors.lgpd ? <Text style={styles.lgpdError}>{errors.lgpd}</Text> : null}

            <TouchableOpacity
              style={[styles.registerBtn, loading && { opacity: 0.6 }]}
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.85}
            >
              <Text style={styles.registerBtnText}>{loading ? t('register.registering') : t('register.registerButton')}</Text>
              {!loading && <Ionicons name="arrow-forward" size={18} color="#fff" />}
            </TouchableOpacity>

            <View style={styles.loginRow}>
              <Text style={styles.loginLabel}>{t('register.hasAccount')}</Text>
              <TouchableOpacity onPress={onGoToLogin} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.loginLink}>{t('register.login')}</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      <LgpdConsentModal
        visible={showLgpd}
        onClose={() => setShowLgpd(false)}
        onAccept={() => { setAcceptedLgpd(true); setShowLgpd(false); setErrors(prev => ({ ...prev, lgpd: '' })); }}
      />
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
    paddingBottom: CARD_OVERLAP + 24,
    alignItems: 'center',
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
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
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

  // Aceite LGPD
  lgpdRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 8, marginBottom: 2 },
  lgpdText: { flex: 1, fontSize: 12.5, color: colors.textSecondary, lineHeight: 18 },
  lgpdLink: { color: colors.primary, fontWeight: '700' },
  lgpdError: { fontSize: 12, color: colors.error, marginTop: 4 },

  // Register button
  registerBtn: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  registerBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },

  // Login row
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 20,
  },
  loginLabel: { fontSize: 14, color: colors.textSecondary },
  loginLink: { fontSize: 14, color: colors.primary, fontWeight: '700' },
});
