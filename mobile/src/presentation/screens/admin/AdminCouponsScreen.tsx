import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator,
  Alert, RefreshControl, Modal, TextInput, KeyboardAvoidingView, Platform, ScrollView, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { adminApi, Coupon } from '../../../data/api/adminApi';
import { colors } from '../../theme/colors';

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

function getStatus(c: Coupon): { label: string; color: string } {
  if (!c.isActive) return { label: 'Inativo', color: colors.textMuted };
  if (c.expiresAt && new Date(c.expiresAt).getTime() < Date.now()) return { label: 'Expirado', color: '#F59E0B' };
  if (c.maxUses > 0 && c.usedCount >= c.maxUses) return { label: 'Esgotado', color: '#EF4444' };
  return { label: 'Ativo', color: '#22C55E' };
}

const EMPTY_FORM = {
  code: '',
  discountPercent: '10',
  maxUses: '',
  expiresAt: '',
  isActive: true,
};

export const AdminCouponsScreen: React.FC = () => {
  const navigation = useNavigation();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const load = useCallback(async () => {
    try { setCoupons(await adminApi.listCoupons()); } catch {}
  }, []);

  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setModalVisible(true); };
  const openEdit = (c: Coupon) => {
    setEditing(c);
    setForm({
      code: c.code,
      discountPercent: String(c.discountPercent),
      maxUses: c.maxUses ? String(c.maxUses) : '',
      expiresAt: c.expiresAt ? c.expiresAt.slice(0, 10) : '',
      isActive: c.isActive,
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!form.code.trim() || !form.discountPercent) {
      Alert.alert('Atenção', 'Preencha o código e o percentual de desconto.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        code: form.code.trim().toUpperCase(),
        discountPercent: parseInt(form.discountPercent, 10) || 0,
        maxUses: form.maxUses ? parseInt(form.maxUses, 10) || 0 : 0,
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
        isActive: form.isActive,
      };
      if (editing) await adminApi.updateCoupon(editing.id, payload);
      else await adminApi.createCoupon(payload);
      setModalVisible(false);
      await load();
    } catch (e: any) {
      Alert.alert('Erro', e?.response?.data?.error || e?.message || 'Falha ao salvar cupom.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (c: Coupon) => {
    Alert.alert('Excluir cupom', `Excluir o cupom "${c.code}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir', style: 'destructive', onPress: async () => {
          try { await adminApi.deleteCoupon(c.id); await load(); }
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
        <Text style={styles.title}>Cupons</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{coupons.length}</Text>
        </View>
        <TouchableOpacity onPress={openCreate} hitSlop={8} style={styles.addBtn}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={coupons}
          keyExtractor={c => c.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          contentContainerStyle={{ paddingBottom: 40 }}
          ItemSeparatorComponent={() => <View style={styles.divider} />}
          renderItem={({ item: c }) => {
            const status = getStatus(c);
            return (
              <TouchableOpacity onPress={() => openEdit(c)} activeOpacity={0.75} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.codeWrap}>
                    <Ionicons name="pricetag-outline" size={14} color={colors.primary} />
                    <Text style={styles.code}>{c.code}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: status.color + '20' }]}>
                    <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                  </View>
                  <TouchableOpacity onPress={() => handleDelete(c)} hitSlop={8}>
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.discount}>{c.discountPercent}% de desconto</Text>
                <View style={styles.metaRow}>
                  <Text style={styles.metaText}>
                    Uso: {c.usedCount}{c.maxUses > 0 ? `/${c.maxUses}` : ' (ilimitado)'}
                  </Text>
                  <Text style={styles.metaText}>{c.expiresAt ? `Expira em ${fmtDate(c.expiresAt)}` : 'Sem validade'}</Text>
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={{ padding: 48, alignItems: 'center' }}>
              <Ionicons name="pricetag-outline" size={40} color={colors.textMuted} />
              <Text style={{ color: colors.textMuted, marginTop: 12 }}>Nenhum cupom cadastrado</Text>
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
              <Text style={styles.modalTitle}>{editing ? 'Editar cupom' : 'Novo cupom'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} hitSlop={8}>
                <Ionicons name="close" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Código</Text>
              <TextInput
                style={styles.input}
                value={form.code}
                onChangeText={t => setForm(f => ({ ...f, code: t.toUpperCase().replace(/\s/g, '') }))}
                placeholder="EX: PROMO20"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="characters"
              />

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Desconto (%)</Text>
                  <TextInput
                    style={styles.input}
                    value={form.discountPercent}
                    onChangeText={t => setForm(f => ({ ...f, discountPercent: t.replace(/[^0-9]/g, '') }))}
                    placeholder="10"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Máx. de usos</Text>
                  <TextInput
                    style={styles.input}
                    value={form.maxUses}
                    onChangeText={t => setForm(f => ({ ...f, maxUses: t.replace(/[^0-9]/g, '') }))}
                    placeholder="0 = ilimitado"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <Text style={styles.label}>Data de expiração (opcional)</Text>
              <TextInput
                style={styles.input}
                value={form.expiresAt}
                onChangeText={t => setForm(f => ({ ...f, expiresAt: t }))}
                placeholder="AAAA-MM-DD"
                placeholderTextColor={colors.textMuted}
              />

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
                  <Text style={styles.saveText}>{editing ? 'Salvar' : 'Criar cupom'}</Text>
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
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  codeWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  code: { fontSize: 15, fontWeight: '800', color: colors.text, letterSpacing: 0.5 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '700' },
  discount: { fontSize: 14, fontWeight: '700', color: '#22C55E', marginBottom: 6 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between' },
  metaText: { fontSize: 12, color: colors.textMuted },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  label: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: colors.text, backgroundColor: colors.background },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  saveBtn: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 24, marginBottom: 12 },
  saveText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
