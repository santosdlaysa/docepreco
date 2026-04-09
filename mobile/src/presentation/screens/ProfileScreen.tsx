import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, Linking, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useAuth } from '../../context/AuthContext';
import { usePremium } from '../context/PremiumContext';
import { tokenStorage } from '../../data/storage/tokenStorage';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { Card } from '../components/Card';
import { Header } from '../components/Header';
import { Button } from '../components/Button';

const SUPPORT_WHATSAPP = '5595991371313';

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { logout, isDemoMode } = useAuth();
  const { isPremium, premiumUntil, daysLeft, refresh } = usePremium();
  const [user, setUser] = useState<{ companyName: string; email: string } | null>(null);

  useEffect(() => {
    tokenStorage.getUser().then(setUser);
    void refresh();
  }, []);

  const premiumUntilLabel = premiumUntil
    ? new Date(premiumUntil).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : null;

  const handleLogout = () => {
    Alert.alert('Sair', 'Deseja sair da sua conta?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: logout },
    ]);
  };

  const handleSupport = async () => {
    const who = user?.companyName ? ` da ${user.companyName}` : '';
    const message = `Olá! Sou${who} e preciso de ajuda com o app DocePreço.`;
    const url = `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(message)}`;
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert(
        'Ops',
        'Não foi possível abrir o WhatsApp. Verifique se o app está instalado.'
      );
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="Minha Conta" showBack onBack={() => navigation.goBack()} />
      <View style={styles.container}>
        <Card style={styles.card}>
          <View style={styles.avatarRow}>
            <View style={styles.avatar}>
              <Ionicons name="storefront" size={32} color={colors.primary} />
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.companyName}>{user?.companyName || '—'}</Text>
              <View style={styles.emailRow}>
                <Text style={styles.email}>{user?.email || '—'}</Text>
                {isDemoMode && (
                  <View style={styles.demoBadge}>
                    <Text style={styles.demoBadgeText}>Demo</Text>
                  </View>
                )}
                {Platform.OS === 'ios' && isPremium && (
                  <View style={styles.premiumBadge}>
                    <Ionicons name="sparkles" size={10} color="#fff" />
                    <Text style={styles.premiumBadgeText}>Premium</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </Card>

        {Platform.OS === 'ios' && (isPremium ? (
          <Card style={styles.premiumActiveCard}>
            <View style={styles.premiumActiveRow}>
              <View style={styles.premiumIconWrap}>
                <Ionicons name="sparkles" size={22} color="#fff" />
              </View>
              <View style={styles.premiumActiveText}>
                <Text style={styles.premiumActiveTitle}>Você é Premium ✨</Text>
                <Text style={styles.premiumActiveSubtitle}>
                  {premiumUntilLabel
                    ? daysLeft !== null && daysLeft <= 7
                      ? `Renova em ${daysLeft} dia${daysLeft === 1 ? '' : 's'} (${premiumUntilLabel})`
                      : `Válido até ${premiumUntilLabel}`
                    : 'Todos os recursos liberados'}
                </Text>
              </View>
            </View>
          </Card>
        ) : (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => navigation.navigate('Paywall', { trigger: { kind: 'manual' } })}
          >
            <Card style={styles.premiumCtaCard}>
              <View style={styles.premiumCtaRow}>
                <View style={styles.premiumIconWrap}>
                  <Ionicons name="sparkles" size={22} color="#fff" />
                </View>
                <View style={styles.premiumCtaText}>
                  <Text style={styles.premiumCtaTitle}>Virar Premium</Text>
                  <Text style={styles.premiumCtaSubtitle}>
                    Ingredientes e receitas ilimitados, encomendas, PDF sem marca e mais.
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.primary} />
              </View>
            </Card>
          </TouchableOpacity>
        ))}

        <Text style={styles.sectionTitle}>Ajuda</Text>
        <Card style={styles.menuCard}>
          <TouchableOpacity style={styles.menuItem} onPress={handleSupport}>
            <View style={[styles.iconBadge, { backgroundColor: '#E7F9EF' }]}>
              <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
            </View>
            <View style={styles.menuTextWrap}>
              <Text style={styles.menuText}>Suporte via WhatsApp</Text>
              <Text style={styles.menuSubtext}>Fale com a gente, tire dúvidas</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </Card>

        <Text style={styles.sectionTitle}>Sobre</Text>
        <Card style={styles.menuCard}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('PrivacyPolicy')}
          >
            <View style={[styles.iconBadge, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />
            </View>
            <View style={styles.menuTextWrap}>
              <Text style={styles.menuText}>Política de Privacidade</Text>
              <Text style={styles.menuSubtext}>Como usamos os seus dados</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </Card>

        <Card style={styles.dangerCard}>
          <Button
            title="Sair da conta"
            onPress={handleLogout}
            variant="outline"
            style={styles.logoutBtn}
          />
        </Card>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, padding: 20 },
  card: { marginBottom: 16 },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfo: { flex: 1 },
  companyName: { ...typography.h3, color: colors.text },
  email: { ...typography.bodySmall, color: colors.textSecondary },
  emailRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  demoBadge: {
    backgroundColor: '#FFF8E1',
    borderWidth: 1,
    borderColor: '#FFE082',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  demoBadgeText: { fontSize: 11, fontWeight: '700', color: '#6D5000' },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.primary,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  premiumBadgeText: { fontSize: 10, fontWeight: '800', color: '#fff' },
  premiumActiveCard: {
    marginBottom: 16,
    backgroundColor: colors.cream,
    borderColor: colors.primary,
    borderWidth: 1.5,
  },
  premiumActiveRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  premiumActiveText: { flex: 1 },
  premiumActiveTitle: { ...typography.h4, color: colors.text },
  premiumActiveSubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
  premiumCtaCard: {
    marginBottom: 16,
    backgroundColor: colors.cream,
    borderColor: colors.primary,
    borderWidth: 1.5,
  },
  premiumCtaRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  premiumCtaText: { flex: 1 },
  premiumCtaTitle: { ...typography.h4, color: colors.text },
  premiumCtaSubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
  premiumIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  menuCard: { marginBottom: 16 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 6,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTextWrap: {
    flex: 1,
  },
  menuText: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  menuSubtext: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
  dangerCard: { borderColor: '#FFCDD2', backgroundColor: '#FFF5F5' },
  logoutBtn: { borderColor: colors.error },
});
