import { colors } from '../theme/colors';
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { authApi } from '../../data/api/authApi';
import { typography } from '../theme/typography';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { useTranslation } from 'react-i18next';
import { getEmailTypoSuggestion } from '../utils/emailTypoCheck';

type Step = 'email' | 'code' | 'password';

interface Props {
  onBack: () => void;
}

export const ForgotPasswordScreen: React.FC<Props> = ({ onBack }) => {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const codeInputRefs = useRef<(TextInput | null)[]>([]);

  const handleSendCode = async () => {
    setError('');
    if (!email.trim()) {
      setError(t('forgotPassword.emailRequired'));
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError(t('forgotPassword.emailInvalid'));
      return;
    }
    const typoSuggestion = getEmailTypoSuggestion(email.trim());
    if (typoSuggestion) {
      setError(t('forgotPassword.emailTypo', { suggestion: typoSuggestion }));
      return;
    }
    setLoading(true);
    try {
      await authApi.forgotPassword(email.trim());
      setStep('code');
      setSuccess(t('forgotPassword.codeSent'));
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('forgotPassword.sendError');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (value: string, index: number) => {
    if (value.length > 1) {
      // Handle paste: distribute digits across inputs
      const digits = value.replace(/\D/g, '').slice(0, 6).split('');
      const newCode = [...code];
      digits.forEach((d, i) => {
        if (index + i < 6) newCode[index + i] = d;
      });
      setCode(newCode);
      const nextIndex = Math.min(index + digits.length, 5);
      codeInputRefs.current[nextIndex]?.focus();
      return;
    }
    const newCode = [...code];
    newCode[index] = value.replace(/\D/g, '');
    setCode(newCode);
    if (value && index < 5) {
      codeInputRefs.current[index + 1]?.focus();
    }
  };

  const handleCodeKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !code[index] && index > 0) {
      codeInputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyCode = async () => {
    setError('');
    setSuccess('');
    const fullCode = code.join('');
    if (fullCode.length !== 6) {
      setError(t('forgotPassword.codeRequired'));
      return;
    }
    setStep('password');
  };

  const handleResetPassword = async () => {
    setError('');
    setSuccess('');
    if (!password) {
      setError(t('forgotPassword.passwordRequired'));
      return;
    }
    if (password.length < 6) {
      setError(t('forgotPassword.passwordMin'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('forgotPassword.passwordMismatch'));
      return;
    }
    setLoading(true);
    try {
      await authApi.resetPassword(email.trim(), code.join(''), password);
      setSuccess(t('forgotPassword.resetSuccess'));
      setTimeout(() => onBack(), 2000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('forgotPassword.resetError');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const renderEmailStep = () => (
    <>
      <Text style={styles.description}>
        {t('forgotPassword.emailDescription')}
      </Text>
      <Input
        label={t('common.email')}
        placeholder="seu@email.com"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <Button
        title={t('forgotPassword.sendCode')}
        onPress={handleSendCode}
        loading={loading}
        size="lg"
        style={styles.btn}
      />
    </>
  );

  const renderCodeStep = () => (
    <>
      <Text style={styles.description}>
        {t('forgotPassword.codeDescription')}{' '}
        <Text style={styles.emailHighlight}>{email}</Text>
      </Text>
      <View style={styles.codeContainer}>
        {code.map((digit, index) => (
          <TextInput
            key={index}
            ref={(ref) => { codeInputRefs.current[index] = ref; }}
            style={[styles.codeInput, digit ? styles.codeInputFilled : null]}
            value={digit}
            onChangeText={(value) => handleCodeChange(value, index)}
            onKeyPress={({ nativeEvent }) => handleCodeKeyPress(nativeEvent.key, index)}
            keyboardType="number-pad"
            maxLength={index === 0 ? 6 : 1}
            selectTextOnFocus
          />
        ))}
      </View>
      <Button
        title={t('forgotPassword.verifyButton')}
        onPress={handleVerifyCode}
        loading={loading}
        size="lg"
        style={styles.btn}
      />
      <TouchableOpacity onPress={() => { setCode(['', '', '', '', '', '']); handleSendCode(); }} style={styles.resendLink}>
        <Text style={styles.resendText}>{t('forgotPassword.resendCode')}</Text>
      </TouchableOpacity>
    </>
  );

  const renderPasswordStep = () => (
    <>
      <Text style={styles.description}>
        {t('forgotPassword.passwordDescription')}
      </Text>
      <Input
        label={t('forgotPassword.newPasswordLabel')}
        placeholder={t('forgotPassword.newPasswordPlaceholder')}
        value={password}
        onChangeText={setPassword}
        secureTextEntry={!showPassword}
        rightElement={
          <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={{ padding: 4 }}>
            <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textMuted} />
          </TouchableOpacity>
        }
      />
      <Input
        label={t('forgotPassword.confirmPassword')}
        placeholder={t('forgotPassword.confirmPlaceholder')}
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry={!showPassword}
      />
      <Button
        title={t('forgotPassword.resetButton')}
        onPress={handleResetPassword}
        loading={loading}
        size="lg"
        style={styles.btn}
      />
    </>
  );

  const stepTitles: Record<Step, string> = {
    email: t('forgotPassword.title'),
    code: t('forgotPassword.verifyCode'),
    password: t('forgotPassword.newPassword'),
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

          <View style={styles.logoArea}>
            <View style={styles.logoIcon}>
              <Ionicons name="lock-closed" size={40} color={colors.primary} />
            </View>
          </View>

          <View style={styles.form}>
            <Text style={styles.title}>{stepTitles[step]}</Text>

            {error ? (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle-outline" size={16} color={colors.error} />
                <Text style={styles.errorBannerText}>{error}</Text>
              </View>
            ) : null}

            {success ? (
              <View style={styles.successBanner}>
                <Ionicons name="checkmark-circle-outline" size={16} color={colors.success} />
                <Text style={styles.successBannerText}>{success}</Text>
              </View>
            ) : null}

            {step === 'email' && renderEmailStep()}
            {step === 'code' && renderCodeStep()}
            {step === 'password' && renderPasswordStep()}

            <TouchableOpacity onPress={onBack} style={styles.backLink}>
              <Ionicons name="arrow-back" size={16} color={colors.primary} />
              <Text style={styles.backText}>{t('forgotPassword.backToLogin')}</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  logoArea: { alignItems: 'center', marginBottom: 32 },
  logoIcon: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  form: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: { ...typography.h2, color: colors.text, marginBottom: 8 },
  description: { ...typography.body, color: colors.textSecondary, marginBottom: 20 },
  emailHighlight: { fontWeight: '700', color: colors.text },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFEBEE',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorBannerText: { ...typography.bodySmall, color: colors.error, flex: 1 },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.greenBgSoft,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  successBannerText: { ...typography.bodySmall, color: colors.success, flex: 1 },
  btn: { marginTop: 8 },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 16,
  },
  codeInput: {
    flex: 1,
    height: 56,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.cream,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  codeInputFilled: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  resendLink: { marginTop: 16, alignItems: 'center' },
  resendText: { ...typography.body, color: colors.primary, fontWeight: '600' },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 20,
  },
  backText: { ...typography.body, color: colors.primary, fontWeight: '600' },
});
