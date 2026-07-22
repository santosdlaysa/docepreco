import { colors } from '../../theme/colors';
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator,
  Alert, RefreshControl, Modal, TextInput, KeyboardAvoidingView, Platform, ScrollView, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { adminApi, AppNotification } from '../../../data/api/adminApi';

const TARGETS: { value: AppNotification['target']; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'premium', label: 'Premium' },
  { value: 'master', label: 'Master' },
  { value: 'free', label: 'Gratuito' },
  { value: 'expired', label: 'Plano expirado' },
];
const targetLabel = (t: AppNotification['target']) => TARGETS.find(x => x.value === t)?.label ?? t;

const TARGET_COLORS: Record<AppNotification['target'], string> = {
  all: colors.textSecondary,
  premium: '#B45309',
  master: '#9333EA',
  free: '#2563EB',
  expired: '#D97706',
};

const STATUS: Record<AppNotification['status'], { label: string; color: string }> = {
  pending: { label: 'Pendente', color: '#F59E0B' },
  scheduled: { label: 'Agendada', color: colors.indigo },
  sent: { label: 'Enviada', color: '#22C55E' },
  failed: { label: 'Falhou', color: colors.red },
};

const fmtDate = (iso: string) => new Date(iso).toLocaleString('pt-BR');

const EMPTY_FORM = {
  title: '',
  body: '',
  target: 'all' as AppNotification['target'],
  schedule: false,
  scheduledAt: '',
};

// Aceita "DD/MM/AAAA HH:MM" (não há date picker nativo no projeto)
const parseSchedule = (raw: string): Date | null => {
  const m = raw.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})[\s,]+(\d{2}):(\d{2})$/);
  if (!m) return null;
  const [dd, mm, yyyy, hh, min] = m.slice(1).map(Number);
  const d = new Date(yyyy, mm - 1, dd, hh, min);
  if (d.getDate() !== dd || d.getMonth() !== mm - 1 || hh > 23 || min > 59) return null;
  return d;
};

export const AdminNotificationsScreen: React.FC = () => {
  const navigation = useNavigation();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [acting, setActing] = useState<string | null>(null);

  const load = useCallback(async () => {
    try { setItems(await adminApi.listNotifications()); } catch {}
  }, []);

  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const openCreate = () => { setForm(EMPTY_FORM); setModalVisible(true); };

  const handleSend = async () => {
    if (!form.title.trim() || !form.body.trim()) {
      Alert.alert('Atenção', 'Preencha o título e o corpo da notificação.');
      return;
    }
    let scheduledAt: string | undefined;
    if (form.schedule) {
      const d = parseSchedule(form.scheduledAt);
      if (!d) {
        Alert.alert('Atenção', 'Informe a data de agendamento no formato DD/MM/AAAA HH:MM.');
        return;
      }
      scheduledAt = d.toISOString();
    }
    setSaving(true);
    try {
      await adminApi.createNotification({
        title: form.title.trim(),
        body: form.body.trim(),
        target: form.target,
        scheduledAt,
      });
      setModalVisible(false);
      await load();
    } catch (e: any) {
      Alert.alert('Erro', e?.response?.data?.error || e?.message || 'Falha ao enviar notificação.');
    } finally {
      setSaving(false);
    }
  };

  const handleResend = async (n: AppNotification) => {
    setActing(n.id);
    try { await adminApi.sendNotification(n.id); await load(); }
    catch (e: any) { Alert.alert('Erro', e?.response?.data?.error || e?.message); }
    finally { setActing(null); }
  };

  const handleDelete = (n: AppNotification) => {
    Alert.alert('Excluir notificação', `Excluir "${n.title}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir', style: 'destructive', onPress: async () => {
          try { await adminApi.deleteNotification(n.id); await load(); }
          catch (e: any) { Alert.alert('Erro', e?.message); }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Notificações</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{items.length}</Text>
        </View>
        <TouchableOpacity onPress={openCreate} hitSlop={8} style={styles.addBtn}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={n => n.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          contentContainerStyle={{ paddingBottom: 40 }}
          ItemSeparatorComponent={() => <View style={styles.divider} />}
          renderItem={({ item: n }) => {
            const status = STATUS[n.status];
            const isActing = acting === n.id;
            const canSend = n.status === 'pending' || n.status === 'scheduled' || n.status === 'failed';
            return (
              <View style={[styles.card, isActing && { opacity: 0.5 }]}>
                <View style={styles.cardHeader}>
                  <View style={[styles.targetBadge, { backgroundColor: TARGET_COLORS[n.target] + '20' }]}>
                    <Text style={[styles.targetText, { color: TARGET_COLORS[n.target] }]}>{targetLabel(n.target)}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: status.color + '20' }]}>
                    <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                  </View>
                  <View style={{ flex: 1 }} />
                  <TouchableOpacity onPress={() => handleDelete(n)} hitSlop={8}>
                    <Ionicons name="trash-outline" size={18} color={colors.red} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.cardTitle} numberOfLines={1}>{n.title}</Text>
                <Text style={styles.cardBody} numberOfLines={2}>{n.body}</Text>
                <View style={styles.metaRow}>
                  <Text style={styles.metaText}>{fmtDate(n.createdAt)}</Text>
                  {n.status === 'sent' && <Text style={styles.metaText}>{n.recipientsCount} destinatário(s)</Text>}
                </View>
                {!!n.scheduledAt && n.status !== 'sent' && (
                  <Text style={styles.metaText}>Agendada para {fmtDate(n.scheduledAt)}</Text>
                )}
                {canSend && (
                  <TouchableOpacity onPress={() => handleResend(n)} disabled={isActing} style={styles.sendBtn}>
                    {isActing ? <ActivityIndicator size="small" color="#fff" /> : (
                      <>
                        <Ionicons name="send-outline" size={14} color="#fff" />
                        <Text style={styles.sendText}>{n.status === 'failed' ? 'Reenviar' : 'Enviar agora'}</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={{ padding: 48, alignItems: 'center' }}>
              <Ionicons name="notifications-outline" size={40} color={colors.textMuted} />
              <Text style={{ color: colors.textMuted, marginTop: 12 }}>Nenhuma notificação enviada</Text>
            </View>
          }
        />
      )}

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nova notificação</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} hitSlop={8}>
                <Ionicons name="close" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Título</Text>
              <TextInput
                style={styles.input}
                value={form.title}
                onChangeText={t => setForm(f => ({ ...f, title: t }))}
                placeholder="Título da notificação"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={styles.label}>Mensagem</Text>
              <TextInput
                style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                value={form.body}
                onChangeText={t => setForm(f => ({ ...f, body: t }))}
                placeholder="Texto da notificação"
                placeholderTextColor={colors.textMuted}
                multiline
              />

              <Text style={styles.label}>Destinatários</Text>
              <View style={styles.chipsRow}>
                {TARGETS.map(t => (
                  <TouchableOpacity
                    key={t.value}
                    onPress={() => setForm(f => ({ ...f, target: t.value }))}
                    style={[styles.chip, form.target === t.value && styles.chipActive]}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.chipText, form.target === t.value && styles.chipTextActive]}>{t.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.scheduleRow}>
                <Text style={styles.scheduleLabel}>Agendar envio</Text>
                <Switch
                  value={form.schedule}
                  onValueChange={v => setForm(f => ({ ...f, schedule: v }))}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#fff"
                />
              </View>
              {form.schedule ? (
                <TextInput
                  style={styles.input}
                  value={form.scheduledAt}
                  onChangeText={t => setForm(f => ({ ...f, scheduledAt: t }))}
                  placeholder="DD/MM/AAAA HH:MM"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numbers-and-punctuation"
                />
              ) : (
                <Text style={styles.hint}>Sem agendamento, a notificação é enviada imediatamente ao criar.</Text>
              )}

              <TouchableOpacity onPress={handleSend} disabled={saving} style={styles.saveBtn}>
                {saving ? <ActivityIndicator size="small" color="#fff" /> : (
                  <Text style={styles.saveText}>{form.schedule ? 'Agendar notificação' : 'Enviar notificação'}</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingBottom: 12, gap: 12 },
  title: { flex: 1, fontSize: 22, fontWeight: '800', color: colors.text },
  countBadge: { backgroundColor: colors.border, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  countText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  addBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  divider: { height: 10 },
  card: { marginHorizontal: 16, backgroundColor: colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  targetBadge: { backgroundColor: colors.border, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  targetText: { fontSize: 11, fontWeight: '700', color: colors.textSecondary },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '700' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 2 },
  cardBody: { fontSize: 13, color: colors.textSecondary, marginBottom: 6 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  metaText: { fontSize: 11, color: colors.textMuted },
  sendBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 10, marginTop: 8 },
  sendText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  label: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: colors.text, backgroundColor: colors.background },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  chipTextActive: { color: '#fff' },
  hint: { fontSize: 11, color: colors.textMuted, marginTop: 10 },
  scheduleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 },
  scheduleLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  saveBtn: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 20, marginBottom: 12 },
  saveText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
