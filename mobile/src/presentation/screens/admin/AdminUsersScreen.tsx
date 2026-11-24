import { colors } from '../../theme/colors';
import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Modal, Pressable,
  StyleSheet, ActivityIndicator, TextInput, RefreshControl, Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { adminApi, AdminUser } from '../../../data/api/adminApi';
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
const PLATFORM_OPTIONS = ['ios', 'android', 'manual', 'card', 'pix'];

// Rótulos amigáveis para o nível de plano (planTier)
const PLAN_TIER_LABELS: Record<string, string> = {
  free: 'Grátis',
  premium: 'Premium',
  master: 'Master',
};
const planTierLabel = (p: string) => PLAN_TIER_LABELS[p] ?? p;
const PLAN_TIER_OPTIONS = ['free', 'premium', 'master'];

type SortBy = 'recent' | 'revenue' | 'sales';
type FilterKind = 'platform' | 'plan' | 'sort';
const SORT_OPTIONS: { key: SortBy; label: string }[] = [
  { key: 'recent', label: 'Mais recentes' },
  { key: 'revenue', label: 'Maior receita' },
  { key: 'sales', label: 'Mais vendas' },
];

const FILTER_OPTIONS: Record<FilterKind, { value: string | null; label: string }[]> = {
  platform: [
    { value: null, label: 'Todas as plataformas' },
    ...PLATFORM_OPTIONS.map(value => ({ value, label: platformLabel(value) })),
  ],
  plan: [
    { value: null, label: 'Todos os planos' },
    ...PLAN_TIER_OPTIONS.map(value => ({ value, label: planTierLabel(value) })),
  ],
  sort: SORT_OPTIONS.map(({ key, label }) => ({ value: key, label })),
};

export const AdminUsersScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProp<AdminStackParamList, 'AdminUsers'>>();
  const subscriptionStatus = route.params?.subscriptionStatus;
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState('');
  const [platform, setPlatform] = useState<string | null>(null);
  const [planTier, setPlanTier] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortBy>('recent');
  const [openFilter, setOpenFilter] = useState<FilterKind | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (q?: string) => {
    try {
      const data = await adminApi.listUsers(q);
      setUsers(data);
    } catch {}
  }, []);

  // Lista exibida: aplica os filtros de plataforma e plano sobre os usuários carregados
  const filtered = useMemo(() => {
    let list = users;
    if (platform) list = list.filter(u => u.premiumPlatform === platform);
    if (planTier === 'free') {
      // Usuários antigos podem não ter planTier salvo, mas ainda são gratuitos.
      list = list.filter(u => u.planTier === 'free' || (!u.planTier && !u.isPremium));
    } else if (planTier === 'premium') {
      // Compatibilidade com registros antigos que só possuem isPremium.
      list = list.filter(u => u.planTier === 'premium' || (!u.planTier && u.isPremium));
    } else if (planTier === 'master') {
      list = list.filter(u => u.planTier === 'master');
    }
    if (subscriptionStatus === 'active') {
      list = list.filter(u => u.isPremium && (!u.premiumUntil || new Date(u.premiumUntil).getTime() >= Date.now()));
    } else if (subscriptionStatus === 'expiring') {
      const now = Date.now();
      const week = now + 7 * 24 * 60 * 60 * 1000;
      list = list.filter(u => {
        if (!u.isPremium || !u.premiumUntil) return false;
        const expiration = new Date(u.premiumUntil).getTime();
        return expiration >= now && expiration <= week;
      });
    } else if (subscriptionStatus === 'expired') {
      list = list.filter(u => u.premiumUntil && new Date(u.premiumUntil).getTime() < Date.now());
    }
    return list;
  }, [users, platform, planTier, subscriptionStatus]);

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

  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);

  // Debounce search — envia para API após 400ms. Pula a 1ª execução: o carregamento
  // inicial já é feito acima (antes a lista inteira era baixada duas vezes ao abrir).
  const firstSearchRun = useRef(true);
  useEffect(() => {
    if (firstSearchRun.current) { firstSearchRun.current = false; return; }
    const t = setTimeout(() => load(search || undefined), 400);
    return () => clearTimeout(t);
  }, [search]);

  const renderUser = useCallback(({ item: u }: { item: AdminUser }) => (
    <UserRow user={u} onPress={() => navigation.navigate('AdminUserDetail', { userId: u.id })} />
  ), [navigation]);

  const onRefresh = async () => { setRefreshing(true); await load(search || undefined); setRefreshing(false); };

  const filterFields: { kind: FilterKind; label: string; selected: string; active: boolean }[] = [
    { kind: 'platform', label: 'Plataforma', selected: platform ? platformLabel(platform) : 'Todas', active: platform !== null },
    { kind: 'plan', label: 'Plano', selected: planTier ? planTierLabel(planTier) : 'Todos', active: planTier !== null },
    { kind: 'sort', label: 'Ordenar por', selected: SORT_OPTIONS.find(option => option.key === sortBy)?.label ?? 'Mais recentes', active: sortBy !== 'recent' },
  ];
  const selectedValue = openFilter === 'platform' ? platform : openFilter === 'plan' ? planTier : sortBy;

  const selectOption = (value: string | null) => {
    if (openFilter === 'platform') setPlatform(value);
    if (openFilter === 'plan') setPlanTier(value);
    if (openFilter === 'sort') setSortBy(SORT_OPTIONS.find(option => option.key === value)?.key ?? 'recent');
    setOpenFilter(null);
  };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>{subscriptionStatus === 'active' ? `Assinantes ativos (${sorted.length})` : subscriptionStatus === 'expiring' ? `Assinaturas expirando (${sorted.length})` : subscriptionStatus === 'expired' ? `Assinaturas expiradas (${sorted.length})` : 'Usuários'}</Text>
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

      <View style={styles.filters}>
        {filterFields.map(field => (
          <TouchableOpacity
            key={field.kind}
            accessibilityRole="button"
            accessibilityLabel={`${field.label}: ${field.selected}`}
            onPress={() => { Keyboard.dismiss(); setOpenFilter(field.kind); }}
            style={[styles.filterField, field.active && styles.filterFieldActive]}
            activeOpacity={0.8}
          >
            <View style={styles.filterFieldText}>
              <Text style={styles.filterFieldLabel}>{field.label}</Text>
              <Text style={styles.filterFieldValue} numberOfLines={1}>{field.selected}</Text>
            </View>
            <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        ))}
      </View>

      <Modal visible={openFilter !== null} transparent animationType="slide" onRequestClose={() => setOpenFilter(null)}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={() => setOpenFilter(null)} />
          <SafeAreaView style={styles.optionSheet} edges={['bottom']}>
            <View style={styles.optionHeader}>
              <Text style={styles.optionTitle}>
                {filterFields.find(field => field.kind === openFilter)?.label}
              </Text>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Fechar opções" onPress={() => setOpenFilter(null)} hitSlop={10}>
                <Ionicons name="close" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>
            {openFilter && FILTER_OPTIONS[openFilter].map(option => (
              <TouchableOpacity
                key={option.value ?? 'all'}
                accessibilityRole="button"
                accessibilityState={{ selected: selectedValue === option.value }}
                onPress={() => selectOption(option.value)}
                style={[styles.optionRow, selectedValue === option.value && styles.optionRowSelected]}
                activeOpacity={0.8}
              >
                <Text style={[styles.optionText, selectedValue === option.value && styles.optionTextSelected]}>{option.label}</Text>
                {selectedValue === option.value && <Ionicons name="checkmark" size={20} color={colors.primary} />}
              </TouchableOpacity>
            ))}
          </SafeAreaView>
        </View>
      </Modal>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={u => u.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          contentContainerStyle={{ paddingBottom: 40 }}
          ItemSeparatorComponent={Separator}
          renderItem={renderUser}
          initialNumToRender={15}
          maxToRenderPerBatch={20}
          windowSize={7}
          removeClippedSubviews
          keyboardShouldPersistTaps="handled"
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

const Separator = () => <View style={styles.divider} />;

// Linha memoizada: filtrar/ordenar não re-renderiza as linhas que não mudaram.
const UserRow = React.memo(({ user: u, onPress }: { user: AdminUser; onPress: () => void }) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.75} style={styles.row}>
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
), (a, b) => a.user === b.user);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingBottom: 12, gap: 12 },
  title: { flex: 1, fontSize: 22, fontWeight: '800', color: colors.text },
  countBadge: { backgroundColor: colors.border, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  countText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  searchWrap: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginBottom: 12, backgroundColor: colors.surface, borderRadius: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.border },
  searchInput: { flex: 1, height: 44, fontSize: 14, color: colors.text },
  filters: { marginHorizontal: 20, marginBottom: 12, gap: 8 },
  filterField: { minHeight: 52, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  filterFieldActive: { borderColor: colors.primary },
  filterFieldText: { flex: 1, paddingVertical: 7 },
  filterFieldLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  filterFieldValue: { fontSize: 15, fontWeight: '700', color: colors.text, marginTop: 2 },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  optionSheet: { backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 20, paddingTop: 18 },
  optionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  optionTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  optionRow: { minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, borderRadius: 10 },
  optionRowSelected: { backgroundColor: colors.background },
  optionText: { fontSize: 15, color: colors.text },
  optionTextSelected: { fontWeight: '700', color: colors.primary },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 20, gap: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 15, fontWeight: '700', color: colors.primary },
  name: { fontSize: 14, fontWeight: '600', color: colors.text },
  email: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  inactiveTag: { fontSize: 10, color: colors.error, fontWeight: '700', backgroundColor: '#FEE2E2', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 },
  divider: { height: 1, backgroundColor: colors.border, marginLeft: 72 },
});
