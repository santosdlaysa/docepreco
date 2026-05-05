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
import { identifyRevenueCatUser } from '../../data/premium/revenueCat';
import { colors } from '../theme/colors';
import { Input } from '../components/Input';

interface Props {
  onRegister: () => void;
  onGoToLogin: () => void;
}

export const RegisterScreen: React.FC<Props> = ({ onRegister, onGoToLogin }) => {
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
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
    if (!companyName.trim()) e.companyName = 'Nome da empresa obrigatório';
    if (!email.trim()) {
      e.email = 'Email obrigatório';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      e.email = 'Email inválido';
    }
    if (phone.trim()) {
      const digits = phone.replace(/\D/g, '');
      if (digits.length < 10 || digits.length > 13) e.phone = 'Número de celular inválido';
    }
    if (!password || password.length < 6) e.password = 'Senha deve ter pelo menos 6 caracteres';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const user = await authApi.register(companyName.trim(), email.trim(), password, phone.trim() || undefined);
      await identifyRevenueCatUser(user.id);
      onRegister();
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erro ao cadastrar';
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
            <Text style={styles.cardTitle}>Criar conta</Text>
            <Text style={styles.cardSubtitle}>Comece a precificar seus doces do jeito certo</Text>

            {errors.general && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={16} color={colors.error} />
                <Text style={styles.errorText}>{errors.general}</Text>
              </View>
            )}

            <Input
              label="Nome da empresa / confeitaria *"
              placeholder="Ex: Doces da Maria"
              value={companyName}
              onChangeText={(t) => { setCompanyName(t); if (errors.companyName) setErrors(prev => ({ ...prev, companyName: '' })); }}
              error={errors.companyName}
            />
            <Input
              label="Email *"
              placeholder="seu@email.com"
              value={email}
              onChangeText={(t) => { setEmail(t); if (errors.email) setErrors(prev => ({ ...prev, email: '' })); }}
              keyboardType="email-address"
              autoCapitalize="none"
              error={errors.email}
            />
            <Input
              label="Celular"
              placeholder="(99) 99999-9999"
              value={phone}
              onChangeText={(t) => { setPhone(t); if (errors.phone) setErrors(prev => ({ ...prev, phone: '' })); }}
              keyboardType="phone-pad"
              error={errors.phone}
            />
            <Input
              label="Senha *"
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChangeText={(t) => { setPassword(t); if (errors.password) setErrors(prev => ({ ...prev, password: '' })); }}
              secureTextEntry={!showPassword}
              error={errors.password}
              rightElement={
                <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={{ padding: 6 }}>
                  <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color={colors.textMuted} />
                </TouchableOpacity>
              }
            />

            <TouchableOpacity
              style={[styles.registerBtn, loading && { opacity: 0.6 }]}
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.85}
            >
              <Text style={styles.registerBtnText}>{loading ? 'Cadastrando...' : 'Criar conta'}</Text>
              {!loading && <Ionicons name="arrow-forward" size={18} color="#fff" />}
            </TouchableOpacity>

            <View style={styles.loginRow}>
              <Text style={styles.loginLabel}>Já tem conta?</Text>
              <TouchableOpacity onPress={onGoToLogin} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.loginLink}>Entrar</Text>
              </TouchableOpacity>
            </View>
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
