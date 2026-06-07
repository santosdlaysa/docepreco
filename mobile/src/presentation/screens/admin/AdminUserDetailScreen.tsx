import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { adminApi, AdminUser } from '../../../data/api/adminApi';
import { colors } from '../../theme/colors';
import { AdminStackParamList } from './types';

type Route = RouteProp<AdminStackParamList, 'AdminUserDetail'>;

const fmtDate = (s?: string | null) => s ? new Date(s).toLocaleDateString('pt-BR') : '—';
const fmtDateTime = (s?: string | null) => s ? new Date(s).toLocaleString('pt-BR') : '—';

// Rótulos amigáveis para a origem do pagamento (premium_platform)
const PLATFORM_LABELS: Record<string, string> = {
  ios: 'App Store',
  android: 'Google Play',
  manual: 'Manual',
  card: 'Cartão',
};

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function ActionBtn({ label, icon, color, onPress }: { label: string; icon: keyof typeof Ionicons.glyphMap; color: string; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={[styles.actionBtn, { borderColor: color }]}>
      <Ionicons name={icon} size={18} color={color} />
      <Text style={[styles.actionBtnText, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

export const AdminUserDetailScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<Route>();
  const { userId } = route.params;
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  const load = async () => {
    try { setUser(await adminApi.getUser(userId)); } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [userId]);

  const confirm = (title: string, msg: string, action: () => Promise<void>) => {
    Alert.alert(title, msg, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Confirmar', onPress: async () => { setActing(true); try { await action(); await load(); } catch (e: any) { Alert.alert('Erro', e?.message); } finally { setActing(false); } } },
    ]);
  };

  const handleGrantPremium = () => confirm('Conceder Premium', 'Ativar premium por 30 dias?', () => adminApi.setPremium(userId, true, 30));
  const handleRevokePremium = () => confirm('Remover Premium', 'Remover o status premium?', () => adminApi.setPremium(userId, false));
  const handleTrial = () => confirm('Conceder Trial (7 dias)', 'Ativar período de teste gratuito?', () => adminApi.grantTrial(userId, 7));
  const handleToggleActive = () => confirm(
    user?.isActive ? 'Desativar conta' : 'Ativar conta',
    user?.isActive ? 'Desativar este usuário?' : 'Reativar este usuário?',
    () => adminApi.toggleActive(userId, user?.isActive ?? true),
  );

  if (loading) return (
    <SafeAreaView style={styles.root}>
      <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
    </SafeAreaView>
  );

  if (!user) return (
    <SafeAreaView style={styles.root}>
      <Text style={{ color: colors.textMuted, textAlign: 'center', marginTop: 40 }}>Usuário não encontrado</Text>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title} numberOfLines={1}>{user.companyName}</Text>
        </View>

        {/* Avatar + status */}
        <View style={styles.profileCard}>
          <View style={styles.bigAvatar}>
            <Text style={styles.bigAvatarText}>{(user.companyName?.[0] ?? '?').toUpperCase()}</Text>
          </View>
          <View style={styles.tags}>
            {user.isPremium && (
              <View style={[styles.tag, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="star" size={12} color="#D97706" />
                <Text style={[styles.tagText, { color: '#D97706' }]}>Premium</Text>
              </View>
            )}
            {!user.isActive && (
              <View style={[styles.tag, { backgroundColor: '#FEE2E2' }]}>
                <Text style={[styles.tagText, { color: colors.error }]}>Inativo</Text>
              </View>
            )}
            {user.premiumPlatform && (
              <View style={[styles.tag, { backgroundColor: '#EDE9FE' }]}>
                <Text style={[styles.tagText, { color: '#7C3AED' }]}>{PLATFORM_LABELS[user.premiumPlatform] ?? user.premiumPlatform}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Info */}
        <Text style={styles.sectionLabel}>Dados</Text>
        <View style={styles.card}>
          <InfoRow label="Email" value={user.email} />
          <InfoRow label="Telefone" value={user.phone ?? '—'} />
          <InfoRow label="Cadastro" value={fmtDateTime(user.createdAt)} />
          <InfoRow label="Último acesso" value={fmtDateTime(user.lastSeenAt)} />
          <InfoRow label="Premium até" value={fmtDate(user.premiumUntil)} />
        </View>

        {/* Actions */}
        <Text style={styles.sectionLabel}>Ações</Text>
        <View style={styles.actionsWrap}>
          {acting ? (
            <ActivityIndicator color={colors.primary} style={{ margin: 20 }} />
          ) : (
            <>
              {user.isPremium
                ? <ActionBtn label="Remover Premium" icon="star-outline" color={colors.error} onPress={handleRevokePremium} />
                : <ActionBtn label="Conceder Premium (30d)" icon="star" color="#D97706" onPress={handleGrantPremium} />
              }
              <ActionBtn label="Conceder Trial" icon="gift-outline" color="#7C3AED" onPress={handleTrial} />
              <ActionBtn
                label={user.isActive ? 'Desativar conta' : 'Ativar conta'}
                icon={user.isActive ? 'ban-outline' : 'checkmark-circle-outline'}
                color={user.isActive ? colors.error : colors.success}
                onPress={handleToggleActive}
              />
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingBottom: 12, gap: 12 },
  title: { flex: 1, fontSize: 20, fontWeight: '800', color: colors.text },
  profileCard: { alignItems: 'center', paddingVertical: 16, gap: 10 },
  bigAvatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  bigAvatarText: { fontSize: 28, fontWeight: '800', color: colors.primary },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  tagText: { fontSize: 12, fontWeight: '700' },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', color: colors.textMuted, marginHorizontal: 20, marginTop: 16, marginBottom: 8 },
  card: { marginHorizontal: 20, backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  infoLabel: { fontSize: 13, color: colors.textMuted },
  infoValue: { fontSize: 13, color: colors.text, fontWeight: '500', flexShrink: 1, textAlign: 'right', marginLeft: 12 },
  actionsWrap: { marginHorizontal: 20, gap: 10 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1.5, backgroundColor: colors.surface },
  actionBtnText: { fontSize: 14, fontWeight: '600' },
});
