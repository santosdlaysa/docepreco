import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, Modal, TextInput, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { adminApi, AdminUser, PremiumEvent } from '../../../data/api/adminApi';
import { useAuth } from '../../../context/AuthContext';
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

// Deixa o tipo de evento (snake_case vindo do backend) legível
const formatEventType = (t: string) => {
  const spaced = t.replace(/_/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
};

const fmtAmount = (cents: number | null) =>
  cents != null ? `R$ ${(cents / 100).toFixed(2).replace('.', ',')}` : null;

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
  const { startImpersonation } = useAuth();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [premiumHistory, setPremiumHistory] = useState<PremiumEvent[]>([]);
  const [showResetModal, setShowResetModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [resetting, setResetting] = useState(false);

  const load = async () => {
    // Usuário e histórico são independentes: uma falha não pode zerar o outro
    try { setUser(await adminApi.getUser(userId)); } catch {}
    try { setPremiumHistory(await adminApi.getPremiumHistory(userId)); } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, [userId]);

  const confirm = (title: string, msg: string, action: () => Promise<void>) => {
    Alert.alert(title, msg, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Confirmar', onPress: async () => { setActing(true); try { await action(); await load(); } catch (e: any) { Alert.alert('Erro', e?.message); } finally { setActing(false); } } },
    ]);
  };

  const handleGrantPremium = () => confirm('Conceder Premium', 'Ativar Premium por 30 dias?', () => adminApi.setPremium(userId, true, 30, 'premium'));
  const handleGrantMaster = () => confirm('Conceder Master', 'Ativar Master por 30 dias?', () => adminApi.setPremium(userId, true, 30, 'master'));
  const handleRevokePremium = () => confirm('Remover acesso', 'Remover o acesso pago (Premium/Master)?', () => adminApi.setPremium(userId, false));
  const handleTrial = () => confirm('Conceder Trial (7 dias)', 'Ativar período de teste gratuito?', () => adminApi.grantTrial(userId, 7));
  const handleToggleActive = () => confirm(
    user?.isActive ? 'Desativar conta' : 'Ativar conta',
    user?.isActive ? 'Desativar este usuário?' : 'Reativar este usuário?',
    () => adminApi.toggleActive(userId, user?.isActive ?? true),
  );

  const handleOpenWhatsApp = () => {
    if (!user?.phone) return;
    const digits = user.phone.replace(/\D/g, '');
    Linking.openURL(`https://wa.me/${digits}`).catch(() => {
      Alert.alert('Erro', 'Não foi possível abrir o WhatsApp.');
    });
  };

  const handleConfirmReset = async () => {
    if (newPassword.length < 6) {
      Alert.alert('Senha muito curta', 'A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    setResetting(true);
    try {
      await adminApi.resetPassword(userId, newPassword);
      setShowResetModal(false);
      setNewPassword('');
      Alert.alert('Sucesso', 'Senha redefinida com sucesso.');
    } catch (e: any) {
      Alert.alert('Erro', e?.response?.data?.error ?? e?.message ?? 'Não foi possível redefinir a senha.');
    } finally {
      setResetting(false);
    }
  };

  const handleImpersonate = () => {
    Alert.alert(
      'Ver como empresa',
      `Entrar no app como "${user?.companyName}"? Você verá tudo como este usuário vê. Use "Voltar ao admin" no topo da tela para sair.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Entrar',
          onPress: async () => {
            setActing(true);
            try {
              await startImpersonation(userId);
            } catch (e: any) {
              Alert.alert('Erro', e?.message ?? 'Não foi possível entrar como este usuário');
              setActing(false);
            }
          },
        },
      ],
    );
  };

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
              user.planTier === 'master' ? (
                <View style={[styles.tag, { backgroundColor: '#EDE4FB' }]}>
                  <Ionicons name="diamond" size={12} color="#7C3AED" />
                  <Text style={[styles.tagText, { color: '#7C3AED' }]}>Master</Text>
                </View>
              ) : (
                <View style={[styles.tag, { backgroundColor: '#FEF3C7' }]}>
                  <Ionicons name="star" size={12} color="#D97706" />
                  <Text style={[styles.tagText, { color: '#D97706' }]}>Premium</Text>
                </View>
              )
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

        {/* Histórico de assinatura */}
        <Text style={styles.sectionLabel}>Histórico de assinatura</Text>
        <View style={styles.card}>
          {premiumHistory.length === 0 ? (
            <View style={{ padding: 16 }}>
              <Text style={{ color: colors.textMuted, fontSize: 13 }}>Nenhum evento registrado.</Text>
            </View>
          ) : (
            premiumHistory.map((ev, idx) => {
              const amount = fmtAmount(ev.amountCents);
              return (
                <View
                  key={ev.id}
                  style={[styles.infoRow, idx === premiumHistory.length - 1 && { borderBottomWidth: 0 }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.historyType}>{formatEventType(ev.eventType)}</Text>
                    <Text style={styles.historyMeta}>
                      {fmtDateTime(ev.createdAt)}
                      {ev.platform ? ` · ${PLATFORM_LABELS[ev.platform] ?? ev.platform}` : ''}
                    </Text>
                  </View>
                  {amount && <Text style={styles.historyAmount}>{amount}</Text>}
                </View>
              );
            })
          )}
        </View>

        {/* Actions */}
        <Text style={styles.sectionLabel}>Ações</Text>
        <View style={styles.actionsWrap}>
          {acting ? (
            <ActivityIndicator color={colors.primary} style={{ margin: 20 }} />
          ) : (
            <>
              <ActionBtn label="Ver como empresa" icon="eye-outline" color={colors.primary} onPress={handleImpersonate} />
              {!!user.phone && (
                <ActionBtn label="Chamar no WhatsApp" icon="logo-whatsapp" color="#25D366" onPress={handleOpenWhatsApp} />
              )}
              {!user.isPremium && (
                <ActionBtn label="Conceder Premium (30d)" icon="star" color="#D97706" onPress={handleGrantPremium} />
              )}
              {user.planTier !== 'master' && (
                <ActionBtn label="Conceder Master (30d)" icon="diamond" color="#7C3AED" onPress={handleGrantMaster} />
              )}
              {user.isPremium && (
                <ActionBtn label="Remover acesso" icon="close-circle-outline" color={colors.error} onPress={handleRevokePremium} />
              )}
              <ActionBtn label="Conceder Trial" icon="gift-outline" color="#43BE6E" onPress={handleTrial} />
              <ActionBtn label="Redefinir senha" icon="key-outline" color="#2563EB" onPress={() => setShowResetModal(true)} />
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

      {/* Modal: redefinir senha */}
      <Modal
        visible={showResetModal}
        transparent
        animationType="fade"
        onRequestClose={() => { if (!resetting) { setShowResetModal(false); setNewPassword(''); } }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Redefinir senha</Text>
            <Text style={styles.modalSubtitle}>Defina uma nova senha para {user.companyName}</Text>
            <TextInput
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Nova senha (mín. 6 caracteres)"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              autoFocus
              style={styles.modalInput}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => { setShowResetModal(false); setNewPassword(''); }}
                activeOpacity={0.8}
                style={styles.modalCancelBtn}
                disabled={resetting}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleConfirmReset}
                activeOpacity={0.8}
                style={[styles.modalConfirmBtn, (resetting || newPassword.length < 6) && { opacity: 0.5 }]}
                disabled={resetting || newPassword.length < 6}
              >
                {resetting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.modalConfirmText}>Confirmar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  historyType: { fontSize: 13, color: colors.text, fontWeight: '600' },
  historyMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  historyAmount: { fontSize: 13, color: colors.text, fontWeight: '700', marginLeft: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 24 },
  modalCard: { backgroundColor: colors.surface, borderRadius: 20, padding: 24, gap: 14 },
  modalTitle: { fontSize: 17, fontWeight: '800', color: colors.text },
  modalSubtitle: { fontSize: 13, color: colors.textMuted, marginTop: -8 },
  modalInput: { height: 48, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, fontSize: 14, color: colors.text },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  modalCancelBtn: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: colors.border },
  modalCancelText: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
  modalConfirmBtn: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 14, backgroundColor: colors.primary },
  modalConfirmText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
