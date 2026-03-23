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
  onRegister: () => void;
  onGoToLogin: () => void;
}

export const RegisterScreen: React.FC<Props> = ({ onRegister, onGoToLogin }) => {
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!companyName.trim()) e.companyName = 'Nome da empresa obrigatório';
    if (!email.trim()) e.email = 'Email obrigatório';
    if (!password || password.length < 6) e.password = 'Senha deve ter pelo menos 6 caracteres';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await authApi.register(companyName.trim(), email.trim(), password);
      onRegister();
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erro ao cadastrar';
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
          </View>

          <View style={styles.form}>
            <Text style={styles.title}>Criar conta</Text>
            <Text style={styles.subtitle}>Comece a precificar seus doces do jeito certo</Text>

            {errors.general && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle-outline" size={16} color={colors.error} />
                <Text style={styles.errorBannerText}>{errors.general}</Text>
              </View>
            )}

            <Input
              label="Nome da empresa / confeitaria *"
              placeholder="Ex: Doces da Maria"
              value={companyName}
              onChangeText={setCompanyName}
              error={errors.companyName}
            />
            <Input
              label="Email *"
              placeholder="seu@email.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              error={errors.email}
            />
            <Input
              label="Senha *"
              placeholder="Mínimo 6 caracteres"
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
              title="Criar conta"
              onPress={handleRegister}
              loading={loading}
              size="lg"
              style={styles.btn}
            />

            <TouchableOpacity onPress={onGoToLogin} style={styles.switchLink}>
              <Text style={styles.switchText}>
                Já tem conta? <Text style={styles.switchTextBold}>Entrar</Text>
              </Text>
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
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  appName: { ...typography.h1, color: colors.text },
  form: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: { ...typography.h2, color: colors.text, marginBottom: 4 },
  subtitle: { ...typography.bodySmall, color: colors.textSecondary, marginBottom: 20 },
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
});
