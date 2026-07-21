import { colors } from '../../theme/colors';
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { adminApi, PixRequest } from '../../../data/api/adminApi';

const STATUS = {
  pending: { label: 'Pendente', color: '#F59E0B', icon: 'hourglass-outline' as const },
  approved: { label: 'Aprovado', color: '#22C55E', icon: 'checkmark-circle' as const },
  rejected: { label: 'Recusado', color: colors.red, icon: 'close-circle' as const },
};

const fmtCents = (c: number) => (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const AdminPixScreen: React.FC = () => {
  const navigation = useNavigation();
  const [requests, setRequests] = useState<PixRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [acting, setActing] = useState<string | null>(null);

  const load = useCallback(async () => {
    try { setRequests(await adminApi.listPixRequests()); } catch {}
  }, []);

  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const filtered = filter === 'all' ? requests : requests.filter(r => r.status === filter);
  const pendingCount = requests.filter(r => r.status === 'pending').length;

  const handleApprove = (r: PixRequest) => {
    Alert.alert('Aprovar PIX', `Aprovar ${fmtCents(r.amountCents)} de ${r.companyName}?\nPlano: ${r.planLabel}`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Aprovar', onPress: async () => {
          setActing(r.id);
          try { await adminApi.approvePixRequest(r.id); await load(); }
          catch (e: any) { Alert.alert('Erro', e?.message); }
          finally { setActing(null); }
        },
      },
    ]);
  };

  const handleReject = (r: PixRequest) => {
    Alert.alert('Recusar PIX', `Recusar solicitação de ${r.companyName}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Recusar', style: 'destructive', onPress: async () => {
          setActing(r.id);
          try { await adminApi.rejectPixRequest(r.id); await load(); }
          catch (e: any) { Alert.alert('Erro', e?.message); }
          finally { setActing(null); }
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
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>PIX</Text>
          {pendingCount > 0 && <Text style={{ fontSize: 12, color: '#F59E0B' }}>{pendingCount} aguardando</Text>}
        </View>
        <TouchableOpacity onPress={onRefresh} hitSlop={8}>
          <Ionicons name="refresh" size={22} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Filter */}
      <View style={styles.filterRow}>
        {(['all', 'pending', 'approved', 'rejected'] as const).map(f => (
          <TouchableOpacity key={f} onPress={() => setFilter(f)} activeOpacity={0.75}>
            <View style={[styles.filterBtn, filter === f && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
              <Text style={[styles.filterText, filter === f && { color: '#fff' }]}>
                {f === 'all' ? 'Todos' : STATUS[f].label}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={r => r.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          contentContainerStyle={{ paddingBottom: 40 }}
          ItemSeparatorComponent={() => <View style={styles.divider} />}
          renderItem={({ item: r }) => {
            const cfg = STATUS[r.status];
            const isActing = acting === r.id;
            return (
              <View style={[styles.card, isActing && { opacity: 0.5 }]}>
                <View style={styles.cardHeader}>
                  <View style={[styles.statusDot, { backgroundColor: cfg.color + '20' }]}>
                    <Ionicons name={cfg.icon} size={16} color={cfg.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardName} numberOfLines={1}>{r.companyName}</Text>
                    <Text style={styles.cardEmail} numberOfLines={1}>{r.email}</Text>
                  </View>
                  <Text style={styles.cardAmount}>{fmtCents(r.amountCents)}</Text>
                </View>
                <Text style={styles.cardPlan}>Plano: {r.planLabel}</Text>
                <Text style={styles.cardDate}>{new Date(r.createdAt).toLocaleString('pt-BR')}</Text>
                {r.status === 'pending' && (
                  <View style={styles.actions}>
                    <TouchableOpacity onPress={() => handleReject(r)} style={styles.rejectBtn} disabled={isActing}>
                      <Text style={styles.rejectText}>Recusar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleApprove(r)} style={styles.approveBtn} disabled={isActing}>
                      {isActing ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.approveText}>Aprovar</Text>}
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={{ padding: 48, alignItems: 'center' }}>
              <Ionicons name="checkmark-circle-outline" size={40} color={colors.textMuted} />
              <Text style={{ color: colors.textMuted, marginTop: 12 }}>Nenhuma solicitação</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingBottom: 8, gap: 12 },
  title: { fontSize: 22, fontWeight: '800', color: colors.text },
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 8 },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  filterText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  divider: { height: 8 },
  card: { marginHorizontal: 16, backgroundColor: colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  statusDot: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cardName: { fontSize: 14, fontWeight: '700', color: colors.text },
  cardEmail: { fontSize: 12, color: colors.textMuted },
  cardAmount: { fontSize: 18, fontWeight: '800', color: colors.text },
  cardPlan: { fontSize: 13, color: colors.textSecondary, marginBottom: 2 },
  cardDate: { fontSize: 11, color: colors.textMuted, marginBottom: 12 },
  actions: { flexDirection: 'row', gap: 10 },
  rejectBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: colors.red, alignItems: 'center' },
  rejectText: { color: colors.red, fontWeight: '700' },
  approveBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: '#22C55E', alignItems: 'center' },
  approveText: { color: '#fff', fontWeight: '700' },
});
