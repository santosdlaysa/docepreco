import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, TextInput, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { adminApi, AdminUser } from '../../../data/api/adminApi';
import { colors } from '../../theme/colors';
import { AdminStackParamList } from './types';

type Nav = NativeStackNavigationProp<AdminStackParamList>;

export const AdminUsersScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [filtered, setFiltered] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (q?: string) => {
    try {
      const data = await adminApi.listUsers(q);
      setUsers(data);
      setFiltered(data);
    } catch {}
  }, []);

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
          <Text style={styles.countText}>{filtered.length}</Text>
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

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
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
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 20, gap: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 15, fontWeight: '700', color: colors.primary },
  name: { fontSize: 14, fontWeight: '600', color: colors.text },
  email: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  inactiveTag: { fontSize: 10, color: colors.error, fontWeight: '700', backgroundColor: '#FEE2E2', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 },
  divider: { height: 1, backgroundColor: colors.border, marginLeft: 72 },
});
