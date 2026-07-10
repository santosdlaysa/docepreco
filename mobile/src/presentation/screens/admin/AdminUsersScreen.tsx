import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, TextInput, RefreshControl, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { adminApi, AdminUser } from '../../../data/api/adminApi';
import { colors } from '../../theme/colors';
import { AdminStackParamList } from './types';

type Nav = NativeStackNavigationProp<AdminStackParamList>;

// Rótulos amigáveis para a origem do pagamento (premium_platform)
const PLATFORM_LABELS: Record<string, string> = {
  ios: 'App Store',
  android: 'Google Play',
  manual: 'Manual',
  card: 'Cartão',
  pix: 'PIX',
};
const platformLabel = (p: string) => PLATFORM_LABELS[p] ?? p;

// Rótulos amigáveis para o nível de plano (planTier)
const PLAN_TIER_LABELS: Record<string, string> = {
  free: 'Grátis',
  premium: 'Premium',
  master: 'Master',
};
const planTierLabel = (p: string) => PLAN_TIER_LABELS[p] ?? p;

type SortBy = 'recent' | 'revenue' | 'sales';
const SORT_OPTIONS: { key: SortBy; label: string }[] = [
  { key: 'recent', label: 'Recentes' },
  { key: 'revenue', label: 'Receita' },
  { key: 'sales', label: 'Vendas' },
];

export const AdminUsersScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState('');
  const [platform, setPlatform] = useState<string | null>(null);
  const [planTier, setPlanTier] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortBy>('recent');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (q?: string) => {
    try {
      const data = await adminApi.listUsers(q);
      setUsers(data);
    } catch {}
  }, []);

  // Plataformas presentes entre os assinantes carregados (para os chips de filtro)
  const platforms = useMemo(() => {
    const set = new Set<string>();
    users.forEach(u => { if (u.premiumPlatform) set.add(u.premiumPlatform); });
    return Array.from(set).sort();
  }, [users]);

  // Níveis de plano presentes entre os usuários carregados (para os chips de filtro)
  const planTiers = useMemo(() => {
    const set = new Set<string>();
    users.forEach(u => { if (u.planTier) set.add(u.planTier); });
    return Array.from(set).sort();
  }, [users]);

  // Lista exibida: aplica os filtros de plataforma e plano sobre os usuários carregados
  const filtered = useMemo(() => {
    let list = users;
    if (platform) list = list.filter(u => u.premiumPlatform === platform);
    if (planTier) list = list.filter(u => u.planTier === planTier);
    return list;
  }, [users, platform, planTier]);

  // Ordena a lista já filtrada, sem nova chamada à API
  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      if (sortBy === 'revenue') return (b.totalRevenue ?? 0) - (a.totalRevenue ?? 0);
      if (sortBy === 'sales') return (b.saleCount ?? 0) - (a.saleCount ?? 0);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return arr;
  }, [filtered, sortBy]);

  // Se o filtro ativo deixar de existir nos dados, volta para "Todas"
  useEffect(() => {
    if (platform && !platforms.includes(platform)) setPlatform(null);
  }, [platforms, platform]);

  useEffect(() => {
    if (planTier && !planTiers.includes(planTier)) setPlanTier(null);
  }, [planTiers, planTier]);

  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);

  // Debounce search — envia para API após 400ms
  useEffect(() => {
    const t = setTimeout(() => load(search || undefined), 400);
    return () => clearTimeout(t);
  }, [search]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Usuários</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{sorted.length}</Text>
        </View>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={colors.textMuted} style={{ marginRight: 8 }} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar por nome ou email..."
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {platforms.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          <TouchableOpacity
            onPress={() => setPlatform(null)}
            style={[styles.chip, platform === null && styles.chipActive]}
            activeOpacity={0.8}
          >
            <Text style={[styles.chipText, platform === null && styles.chipTextActive]}>Todas</Text>
          </TouchableOpacity>
          {platforms.map(p => (
            <TouchableOpacity
              key={p}
              onPress={() => setPlatform(p)}
              style={[styles.chip, platform === p && styles.chipActive]}
              activeOpacity={0.8}
            >
              <Text style={[styles.chipText, platform === p && styles.chipTextActive]}>{platformLabel(p)}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {planTiers.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          <TouchableOpacity
            onPress={() => setPlanTier(null)}
            style={[styles.chip, planTier === null && styles.chipActive]}
            activeOpacity={0.8}
          >
            <Text style={[styles.chipText, planTier === null && styles.chipTextActive]}>Todos os planos</Text>
          </TouchableOpacity>
          {planTiers.map(p => (
            <TouchableOpacity
              key={p}
              onPress={() => setPlanTier(p)}
              style={[styles.chip, planTier === p && styles.chipActive]}
              activeOpacity={0.8}
            >
              <Text style={[styles.chipText, planTier === p && styles.chipTextActive]}>{planTierLabel(p)}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
      >
        {SORT_OPTIONS.map(opt => (
          <TouchableOpacity
            key={opt.key}
            onPress={() => setSortBy(opt.key)}
            style={[styles.chip, sortBy === opt.key && styles.chipActive]}
            activeOpacity={0.8}
          >
            <Ionicons
              name="swap-vertical"
              size={12}
              color={sortBy === opt.key ? '#fff' : colors.textMuted}
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.chipText, sortBy === opt.key && styles.chipTextActive]}>{opt.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={u => u.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          contentContainerStyle={{ paddingBottom: 40 }}
          ItemSeparatorComponent={() => <View style={styles.divider} />}
          renderItem={({ item: u }) => (
            <TouchableOpacity
              onPress={() => navigation.navigate('AdminUserDetail', { userId: u.id })}
              activeOpacity={0.75}
              style={styles.row}
            >
              <View style={[styles.avatar, !u.isActive && { opacity: 0.4 }]}>
                <Text style={styles.avatarText}>{(u.companyName?.[0] ?? '?').toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.name} numberOfLines={1}>{u.companyName}</Text>
                  {u.isPremium && <Ionicons name="star" size={12} color={colors.primary} />}
                  {!u.isActive && <Text style={styles.inactiveTag}>inativo</Text>}
                </View>
                <Text style={styles.email} numberOfLines={1}>{u.email}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={{ padding: 40, alignItems: 'center' }}>
              <Text style={{ color: colors.textMuted }}>Nenhum usuário encontrado</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingBottom: 12, gap: 12 },
  title: { flex: 1, fontSize: 22, fontWeight: '800', color: colors.text },
  countBadge: { backgroundColor: colors.border, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  countText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  searchWrap: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginBottom: 12, backgroundColor: colors.surface, borderRadius: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.border },
  searchInput: { flex: 1, height: 44, fontSize: 14, color: colors.text },
  chipsRow: { paddingHorizontal: 20, paddingBottom: 12, gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  chipTextActive: { color: '#fff' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 20, gap: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 15, fontWeight: '700', color: colors.primary },
  name: { fontSize: 14, fontWeight: '600', color: colors.text },
  email: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  inactiveTag: { fontSize: 10, color: colors.error, fontWeight: '700', backgroundColor: '#FEE2E2', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 },
  divider: { height: 1, backgroundColor: colors.border, marginLeft: 72 },
});
