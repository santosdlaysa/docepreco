import { colors } from '../../theme/colors';
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator,
  Alert, RefreshControl, Modal, TextInput, KeyboardAvoidingView, Platform, ScrollView, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { adminApi, Banner } from '../../../data/api/adminApi';

const TYPES: { value: Banner['type']; label: string; color: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'info', label: 'Info', color: colors.indigo, icon: 'information-circle-outline' },
  { value: 'warning', label: 'Aviso', color: '#F59E0B', icon: 'warning-outline' },
  { value: 'promo', label: 'Promoção', color: colors.primary, icon: 'megaphone-outline' },
  { value: 'update', label: 'Atualização', color: '#16A34A', icon: 'sparkles-outline' },
];
const typeConfig = (t: Banner['type']) => TYPES.find(x => x.value === t) ?? TYPES[0];

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

const EMPTY_FORM = {
  title: '',
  message: '',
  type: 'info' as Banner['type'],
  actionUrl: '',
  startsAt: '',
  endsAt: '',
  isActive: true,
  targetPlans: ['all'] as Array<'all' | 'free' | 'premium' | 'master'>,
};

export const AdminBannersScreen: React.FC = () => {
  const navigation = useNavigation();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Banner | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const load = useCallback(async () => {
    try { setBanners(await adminApi.listBanners()); } catch {}
  }, []);

  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setModalVisible(true); };
  const openEdit = (b: Banner) => {
    setEditing(b);
    setForm({
      title: b.title,
      message: b.message,
      type: b.type,
      actionUrl: b.actionUrl ?? '',
      startsAt: b.startsAt ? b.startsAt.slice(0, 10) : '',
      endsAt: b.endsAt ? b.endsAt.slice(0, 10) : '',
      isActive: b.isActive,
      targetPlans: b.targetPlans?.length ? b.targetPlans : ['all'],
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.message.trim()) {
      Alert.alert('Atenção', 'Preencha o título e a mensagem.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        message: form.message.trim(),
        type: form.type,
        actionUrl: form.actionUrl.trim() || undefined,
        startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : undefined,
        endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : undefined,
        isActive: form.isActive,
        targetPlans: form.targetPlans,
      };
      if (editing) await adminApi.updateBanner(editing.id, payload);
      else await adminApi.createBanner(payload);
      setModalVisible(false);
      await load();
    } catch (e: any) {
      Alert.alert('Erro', e?.response?.data?.error || e?.message || 'Falha ao salvar banner.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (b: Banner) => {
    Alert.alert('Excluir banner', `Excluir o banner "${b.title}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir', style: 'destructive', onPress: async () => {
          try { await adminApi.deleteBanner(b.id); await load(); }
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
        <Text style={styles.title}>Banners</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{banners.length}</Text>
        </View>
        <TouchableOpacity onPress={openCreate} hitSlop={8} style={styles.addBtn}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={banners}
          keyExtractor={b => b.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          contentContainerStyle={{ paddingBottom: 40 }}
          ItemSeparatorComponent={() => <View style={styles.divider} />}
          renderItem={({ item: b }) => {
            const cfg = typeConfig(b.type);
            return (
              <TouchableOpacity onPress={() => openEdit(b)} activeOpacity={0.75} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={[styles.typeBadge, { backgroundColor: cfg.color + '20' }]}>
                    <Ionicons name={cfg.icon} size={12} color={cfg.color} />
                    <Text style={[styles.typeText, { color: cfg.color }]}>{cfg.label}</Text>
                  </View>
                  {!b.isActive && (
                    <View style={styles.inactiveBadge}>
                      <Text style={styles.inactiveText}>Inativo</Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }} />
                  <TouchableOpacity onPress={() => handleDelete(b)} hitSlop={8}>
                    <Ionicons name="trash-outline" size={18} color={colors.red} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.cardTitle} numberOfLines={1}>{b.title}</Text>
                <Text style={styles.cardMessage} numberOfLines={2}>{b.message}</Text>
                {(b.startsAt || b.endsAt) && (
                  <Text style={styles.cardDates}>
                    {b.startsAt ? `De ${fmtDate(b.startsAt)}` : ''}{b.endsAt ? ` até ${fmtDate(b.endsAt)}` : ''}
                  </Text>
                )}
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={{ padding: 48, alignItems: 'center' }}>
              <Ionicons name="megaphone-outline" size={40} color={colors.textMuted} />
              <Text style={{ color: colors.textMuted, marginTop: 12 }}>Nenhum banner cadastrado</Text>
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
              <Text style={styles.modalTitle}>{editing ? 'Editar banner' : 'Novo banner'}</Text>
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
                placeholder="Título do banner"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={styles.label}>Mensagem</Text>
              <TextInput
                style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                value={form.message}
                onChangeText={t => setForm(f => ({ ...f, message: t }))}
                placeholder="Texto exibido no banner"
                placeholderTextColor={colors.textMuted}
                multiline
              />

              <Text style={styles.label}>Tipo</Text>
              <View style={styles.chipsRow}>
                {TYPES.map(t => (
                  <TouchableOpacity
                    key={t.value}
                    onPress={() => setForm(f => ({ ...f, type: t.value }))}
                    style={[styles.chip, form.type === t.value && { backgroundColor: t.color, borderColor: t.color }]}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.chipText, form.type === t.value && { color: '#fff' }]}>{t.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>URL de ação (opcional)</Text>
              <TextInput
                style={styles.input}
                value={form.actionUrl}
                onChangeText={t => setForm(f => ({ ...f, actionUrl: t }))}
                placeholder="https://..."
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
              />

              <Text style={styles.label}>Exibir para quais planos?</Text>
              <View style={styles.chipsRow}>
                {(['all', 'free', 'premium', 'master'] as const).map(plan => {
                  const selected = form.targetPlans.includes(plan);
                  const label = plan === 'all' ? 'Todos' : plan[0].toUpperCase() + plan.slice(1);
                  return <TouchableOpacity key={plan} onPress={() => setForm(f => {
                    if (plan === 'all') return { ...f, targetPlans: ['all'] };
                    const next = f.targetPlans.filter(p => p !== 'all' && p !== plan);
                    return { ...f, targetPlans: selected ? (next.length ? next : ['all']) : [...next, plan] };
                  })} style={[styles.chip, selected && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
                    <Text style={[styles.chipText, selected && { color: '#fff' }]}>{label}</Text>
                  </TouchableOpacity>;
                })}
              </View>

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Início (opcional)</Text>
                  <TextInput
                    style={styles.input}
                    value={form.startsAt}
                    onChangeText={t => setForm(f => ({ ...f, startsAt: t }))}
                    placeholder="AAAA-MM-DD"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Fim (opcional)</Text>
                  <TextInput
                    style={styles.input}
                    value={form.endsAt}
                    onChangeText={t => setForm(f => ({ ...f, endsAt: t }))}
                    placeholder="AAAA-MM-DD"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              </View>

              <View style={styles.switchRow}>
                <Text style={styles.label}>Ativo</Text>
                <Switch
                  value={form.isActive}
                  onValueChange={v => setForm(f => ({ ...f, isActive: v }))}
                  trackColor={{ false: colors.border, true: colors.primaryLight }}
                  thumbColor={form.isActive ? colors.primary : '#fff'}
                />
              </View>

              <TouchableOpacity onPress={handleSave} disabled={saving} style={styles.saveBtn}>
                {saving ? <ActivityIndicator size="small" color="#fff" /> : (
                  <Text style={styles.saveText}>{editing ? 'Salvar' : 'Criar banner'}</Text>
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
  typeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  typeText: { fontSize: 11, fontWeight: '700' },
  inactiveBadge: { backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  inactiveText: { fontSize: 11, fontWeight: '700', color: colors.textMuted },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 2 },
  cardMessage: { fontSize: 13, color: colors.textSecondary, marginBottom: 6 },
  cardDates: { fontSize: 11, color: colors.textMuted },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '88%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  label: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: colors.text, backgroundColor: colors.background },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  saveBtn: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 24, marginBottom: 12 },
  saveText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
