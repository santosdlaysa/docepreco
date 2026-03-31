import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { authApi } from '../../data/api/authApi';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { Button } from '../components/Button';
import { Input } from '../components/Input';

interface Props {
  onLogin: () => void;
  onGoToRegister: () => void;
  onDemoLogin?: () => void;
}

export const LoginScreen: React.FC<Props> = ({ onLogin, onGoToRegister, onDemoLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!email.trim()) e.email = 'Email obrigatório';
    if (!password) e.password = 'Senha obrigatória';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await authApi.login(email.trim(), password);
      onLogin();
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erro ao entrar';
      setErrors({ general: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

          <View style={styles.logoArea}>
            <View style={styles.logoIcon}>
              <Ionicons name="storefront" size={40} color={colors.primary} />
            </View>
            <Text style={styles.appName}>Precifica Doces</Text>
            <Text style={styles.appSubtitle}>Gestão inteligente para confeiteiros</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.title}>Entrar</Text>

            {errors.general && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle-outline" size={16} color={colors.error} />
                <Text style={styles.errorBannerText}>{errors.general}</Text>
              </View>
            )}

            <Input
              label="Email"
              placeholder="seu@email.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              error={errors.email}
            />
            <Input
              label="Senha"
              placeholder="••••••"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              error={errors.password}
              rightElement={
                <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={{ padding: 4 }}>
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textMuted} />
                </TouchableOpacity>
              }
            />

            <Button
              title="Entrar"
              onPress={handleLogin}
              loading={loading}
              size="lg"
              style={styles.btn}
            />

            <TouchableOpacity onPress={onGoToRegister} style={styles.switchLink}>
              <Text style={styles.switchText}>
                Não tem conta? <Text style={styles.switchTextBold}>Cadastre-se</Text>
              </Text>
            </TouchableOpacity>
          </View>

          {onDemoLogin && (
            <View style={styles.demoSection}>
              <View style={styles.separator}>
                <View style={styles.separatorLine} />
                <Text style={styles.separatorText}>ou</Text>
                <View style={styles.separatorLine} />
              </View>
              <TouchableOpacity onPress={onDemoLogin} style={styles.demoButton} activeOpacity={0.8}>
                <Ionicons name="play-outline" size={20} color={colors.secondary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.demoButtonText}>Entrar em modo demonstração</Text>
                  <Text style={styles.demoButtonSub}>Explore o app sem criar conta</Text>
                </View>
              </TouchableOpacity>
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  logoArea: { alignItems: 'center', marginBottom: 40 },
  logoIcon: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: colors.primaryLight,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  appName: { ...typography.h1, color: colors.text },
  appSubtitle: { ...typography.bodySmall, color: colors.textSecondary, marginTop: 4 },
  form: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: { ...typography.h2, color: colors.text, marginBottom: 20 },
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
  btn: { marginTop: 8 },
  switchLink: { marginTop: 16, alignItems: 'center' },
  switchText: { ...typography.body, color: colors.textSecondary },
  switchTextBold: { color: colors.primary, fontWeight: '700' },
  demoSection: { marginTop: 24, alignItems: 'center' },
  separator: { flexDirection: 'row', alignItems: 'center', width: '100%', marginBottom: 16 },
  separatorLine: { flex: 1, height: 1, backgroundColor: colors.border },
  separatorText: { ...typography.bodySmall, color: colors.textMuted, marginHorizontal: 12 },
  demoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1.5,
    borderColor: colors.secondary,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    width: '100%',
    backgroundColor: colors.cream,
  },
  demoButtonText: { ...typography.body, color: colors.secondary, fontWeight: '600' },
  demoButtonSub: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
});
