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
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { authApi, SocialLoginResult } from '../../data/api/authApi';
import { signInWithApple } from '../../data/auth/socialSignIn';
import { getAppleAuthModule } from '../../data/native/optionalNative';
import { identifyRevenueCatUser, setRevenueCatLocationAttributes } from '../../data/premium/revenueCat';
import { AuthHero } from '../components/AuthHero';
import { Input } from '../components/Input';
import { useTranslation } from 'react-i18next';
import { getEmailTypoSuggestion } from '../utils/emailTypoCheck';
import { useAuthLayout } from '../hooks/useAuthLayout';

const AppleAuthentication = getAppleAuthModule();

interface Props {
  onLogin: () => void | Promise<void>;
  onGoToRegister: () => void;
  onGoToForgotPassword?: () => void;
  onDemoLogin?: () => void;
  onSocialLogin?: (isNew: boolean) => void | Promise<void>;
}

export const LoginScreen: React.FC<Props> = ({ onLogin, onGoToRegister, onGoToForgotPassword, onDemoLogin, onSocialLogin }) => {
  const { t } = useTranslation();
  const L = useAuthLayout();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'apple' | null>(null);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  // Cadastro Apple com email oculto aguardando a pessoa dizer se já tem conta.
  const [pendingLink, setPendingLink] = useState<string | null>(null);
  const [linkLoading, setLinkLoading] = useState<'link' | 'create' | null>(null);

  const fadeIn = useRef(new Animated.Value(0)).current;
  const cardSlide = useRef(new Animated.Value(60)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(cardSlide, { toValue: 0, tension: 40, friction: 9, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    if (Platform.OS === 'ios' && AppleAuthentication) {
      AppleAuthentication.isAvailableAsync().then(setAppleAvailable).catch(() => setAppleAvailable(false));
    }
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
    if (loading || socialLoading || linkLoading || !validate()) return;
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

  const finishSocialLogin = async (result: SocialLoginResult | null) => {
    if (!result) return;
    if (result.linkRequired) {
      setPendingLink(result.pendingToken);
      return;
    }
    await identifyRevenueCatUser(result.user.id);
    void setRevenueCatLocationAttributes();
    if (onSocialLogin) await onSocialLogin(result.isNew);
    else await onLogin();
  };

  const handleAppleLogin = async () => {
    setSocialLoading('apple');
    setErrors({});
    try {
      await finishSocialLogin(await signInWithApple());
    } catch (error: any) {
      if (error?.code !== 'ERR_REQUEST_CANCELED') {
        setErrors({ general: error instanceof Error ? error.message : t('login.socialLoginError') });
      }
    } finally {
      setSocialLoading(null);
    }
  };

  const handleLinkExisting = async () => {
    if (!pendingLink || !validate()) return;
    setLinkLoading('link');
    try {
      await finishSocialLogin(await authApi.completeSocialSignup(pendingLink, { email: email.trim(), password }));
    } catch (error) {
      setErrors({ general: error instanceof Error ? error.message : t('login.socialLoginError') });
      setLinkLoading(null);
    }
  };

  const handleCreateNew = async () => {
    if (!pendingLink) return;
    setLinkLoading('create');
    setErrors({});
    try {
      await finishSocialLogin(await authApi.completeSocialSignup(pendingLink));
    } catch (error) {
      setErrors({ general: error instanceof Error ? error.message : t('login.socialLoginError') });
      setLinkLoading(null);
    }
  };

  const cancelLink = () => {
    setPendingLink(null);
    setErrors({});
  };

  const errorBanner = errors.general ? (
    <View style={styles.errorBanner} accessibilityLiveRegion="polite">
      <Ionicons name="alert-circle" size={16} color={colors.error} />
      <Text style={styles.errorText}>{errors.general}</Text>
    </View>
  ) : null;

  const credentialFields = (
    <>
      <Input
        wrapperStyle={styles.fieldWrapper}
        label={t('login.email')}
        placeholder={t('login.emailPlaceholder')}
        value={email}
        onChangeText={(v) => { setEmail(v); if (errors.email) setErrors(prev => ({ ...prev, email: '' })); }}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        accessibilityLabel={t('login.email')}
        leftElement={<Ionicons name="mail-outline" size={19} color={colors.textSecondary} style={{ marginLeft: 14 }} />}
        error={errors.email}
        containerStyle={{ marginBottom: L.fieldGap }}
      />

      <Input
        wrapperStyle={styles.fieldWrapper}
        label={t('login.password')}
        placeholder={t('login.passwordPlaceholder')}
        value={password}
        onChangeText={(v) => { setPassword(v); if (errors.password) setErrors(prev => ({ ...prev, password: '' })); }}
        secureTextEntry={!showPassword}
        autoCapitalize="none"
        autoComplete="current-password"
        textContentType="password"
        accessibilityLabel={t('login.password')}
        returnKeyType="go"
        onSubmitEditing={pendingLink ? handleLinkExisting : handleLogin}
        leftElement={<Ionicons name="lock-closed-outline" size={19} color={colors.textSecondary} style={{ marginLeft: 14 }} />}
        error={errors.password}
        containerStyle={{ marginBottom: L.fieldGap }}
        rightElement={
          <TouchableOpacity onPress={() => setShowPassword(v => !v)} accessibilityRole="button" accessibilityLabel={t(showPassword ? 'login.hidePassword' : 'login.showPassword')} style={{ padding: 10 }}>
            <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color={colors.textMuted} />
          </TouchableOpacity>
        }
      />

      {onGoToForgotPassword && (
        <TouchableOpacity onPress={onGoToForgotPassword} style={[styles.forgotRow, { marginBottom: L.fieldGap }]}>
          <Text style={styles.forgotText}>{t('login.forgotPassword')}</Text>
        </TouchableOpacity>
      )}
    </>
  );

  const linkCard = (
    <>
      <Text style={[styles.cardTitle, { marginBottom: 8 }]}>{t('login.linkTitle')}</Text>
      <Text style={[styles.linkDescription, { marginBottom: L.cardTitleGap }]}>{t('login.linkDescription')}</Text>

      {errorBanner}
      {credentialFields}

      <TouchableOpacity
        style={[styles.loginBtn, linkLoading && { opacity: 0.6 }]}
        onPress={handleLinkExisting}
        disabled={Boolean(linkLoading)}
        activeOpacity={0.85}
      >
        {linkLoading === 'link' && <ActivityIndicator size="small" color="#fff" />}
        <Text style={styles.loginBtnText}>{t('login.linkButton')}</Text>
      </TouchableOpacity>

      <View style={[styles.orRow, { marginTop: L.blockGap, marginBottom: L.fieldGap }]}>
        <View style={styles.orLine} />
        <Text style={styles.orText}>{t('common.or')}</Text>
        <View style={styles.orLine} />
      </View>

      <TouchableOpacity
        onPress={handleCreateNew}
        style={[styles.demoBtn, linkLoading && { opacity: 0.6 }]}
        disabled={Boolean(linkLoading)}
        activeOpacity={0.7}
      >
        {linkLoading === 'create'
          ? <ActivityIndicator size="small" color={colors.primary} />
          : <Ionicons name="person-add-outline" size={20} color={colors.primary} />}
        <Text style={styles.demoBtnText}>{t('login.linkCreateNew')}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={cancelLink} disabled={Boolean(linkLoading)} style={[styles.registerRow, { marginTop: L.smallGap }]}>
        <Text style={styles.registerLabel}>{t('common.cancel')}</Text>
      </TouchableOpacity>
    </>
  );

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF3E8" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          <AuthHero compact={L.compact} />
          <Animated.View style={[styles.card, { paddingTop: L.compact ? 16 : 28, marginBottom: L.cardMarginBottom, opacity: fadeIn, transform: [{ translateY: cardSlide }] }]}>
            {pendingLink ? linkCard : (
            <>
            <View style={styles.accountSwitch}>
              <View style={styles.activeTab} accessibilityRole="text"><Text style={styles.activeTabText}>{t('login.loginButton')}</Text></View>
              <TouchableOpacity style={styles.inactiveTab} onPress={onGoToRegister} accessibilityRole="button"><Text style={styles.inactiveTabText}>{t('login.createAccount')}</Text></TouchableOpacity>
            </View>
            <Text style={[styles.cardTitle, { marginBottom: 10 }]}>{t('login.title')}</Text>
            <Text style={[styles.linkDescription, { marginBottom: L.cardTitleGap }]}>{t('login.subtitle')}</Text>

            {errorBanner}
            {credentialFields}

            <TouchableOpacity
              style={[styles.loginBtn, loading && { opacity: 0.6 }]}
              onPress={handleLogin}
              disabled={loading || Boolean(socialLoading)}
              activeOpacity={0.85}
            >
              {loading && <ActivityIndicator size="small" color="#fff" />}
              <Text style={styles.loginBtnText}>{loading ? t('login.loggingIn') : t('login.loginButton')}</Text>
              {!loading && <Ionicons name="arrow-forward" size={18} color="#fff" />}
            </TouchableOpacity>

            {appleAvailable && (
              <>
                <View style={[styles.orRow, { marginTop: L.blockGap, marginBottom: L.fieldGap }]}>
                  <View style={styles.orLine} />
                  <Text style={styles.orText}>{t('common.or')}</Text>
                  <View style={styles.orLine} />
                </View>

                {appleAvailable && AppleAuthentication && (
                  <View style={styles.socialButtonWrap} pointerEvents={socialLoading ? 'none' : 'auto'}>
                    <AppleAuthentication.AppleAuthenticationButton
                      buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
                      buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                      cornerRadius={12}
                      style={styles.appleButton}
                      onPress={() => void handleAppleLogin()}
                    />
                    {socialLoading === 'apple' && <ActivityIndicator style={styles.socialSpinner} color="#fff" />}
                  </View>
                )}
              </>
            )}

            {onDemoLogin && (
              <TouchableOpacity onPress={onDemoLogin} style={styles.discover} activeOpacity={0.7} accessibilityRole="button">
                <Image source={require('../../../assets/login-sweets.png')} style={styles.discoverImage} resizeMode="contain" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.discoverTitle}>{t('login.headline')}</Text>
                  <View style={styles.discoverAction}>
                    <Ionicons name="play-circle-outline" size={18} color="#B91665" />
                    <Text style={styles.discoverLink}>{t('login.tryWithoutAccount')}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            )}
            </>
            )}

            <Text style={[styles.version, { marginTop: L.blockGap }]}>v{Constants.expoConfig?.version ?? '?'}</Text>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFF3E8' },
  scrollContent: { flexGrow: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 28, width: '100%', maxWidth: 480, alignSelf: 'center' },
  logoWrap: { width: 40, height: 40, borderRadius: 20 },
  brand: { fontSize: 21, fontWeight: '800', color: '#29252B', letterSpacing: -0.7 },
  card: { width: '100%', maxWidth: 480, alignSelf: 'center', paddingHorizontal: 28, paddingBottom: 24, backgroundColor: '#FFFFFF', borderTopLeftRadius: 32, borderTopRightRadius: 32, marginTop: -22 },
  accountSwitch: { flexDirection: 'row', backgroundColor: '#FFF0F5', borderRadius: 12, padding: 5, marginBottom: 28 },
  activeTab: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 9, minHeight: 44, alignItems: 'center', justifyContent: 'center', padding: 8 },
  inactiveTab: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', padding: 8 },
  activeTabText: { fontSize: 14, fontWeight: '700', color: '#B52467' },
  inactiveTabText: { fontSize: 14, fontWeight: '600', color: '#766D70' },
  cardTitle: { fontSize: 29, fontWeight: '700', color: '#542936', letterSpacing: -0.8, maxWidth: 320 },
  fieldWrapper: { backgroundColor: '#FFFAFC', borderColor: '#F0DFE6', borderWidth: 1, borderRadius: 12, minHeight: 54 },
  discover: { flexDirection: 'row', alignItems: 'center', gap: 14, borderTopWidth: 1, borderColor: '#EEE7E9', marginTop: 28, paddingVertical: 18, paddingHorizontal: 8, borderBottomLeftRadius: 16, borderBottomRightRadius: 16, backgroundColor: '#FFF9FC' },
  discoverImage: { width: 88, height: 88 },
  discoverTitle: { fontSize: 13, lineHeight: 19, color: '#29252B', fontWeight: '600' },
  discoverAction: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10 },
  discoverLink: { flex: 1, fontSize: 12, lineHeight: 18, color: '#B91665', fontWeight: '600' },

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
  linkDescription: { fontSize: 14, lineHeight: 20, color: colors.textSecondary },

  // Forgot
  forgotRow: { alignSelf: 'flex-end', minHeight: 44, justifyContent: 'center', marginTop: -8, marginBottom: 16 },
  forgotText: { fontSize: 13, color: colors.primary, fontWeight: '600' },

  // Login button
  loginBtn: {
    backgroundColor: '#BC276D',
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    gap: 8,
    shadowColor: '#BC276D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
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
    flexWrap: 'wrap',
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
    backgroundColor: '#F8F6FA',
  },
  demoBtnText: { fontSize: 14, fontWeight: '600', color: colors.text },
  socialButtonWrap: { position: 'relative', marginBottom: 10 },
  appleButton: { width: '100%', height: 48 },
  socialSpinner: { position: 'absolute', right: 18, top: 14 },

  version: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 24,
  },
});
