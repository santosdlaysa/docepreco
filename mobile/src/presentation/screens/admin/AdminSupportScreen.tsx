import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { adminApi, AdminConversation } from '../../../data/api/adminApi';
import { colors } from '../../theme/colors';
import { AdminStackParamList } from './types';

type Nav = NativeStackNavigationProp<AdminStackParamList>;

export const AdminSupportScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const [convs, setConvs] = useState<AdminConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try { setConvs(await adminApi.getConversations()); } catch {}
  }, []);

  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Suporte</Text>
        <TouchableOpacity onPress={onRefresh} hitSlop={8}>
          <Ionicons name="refresh" size={22} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={convs}
          keyExtractor={c => c.userId}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          contentContainerStyle={{ paddingBottom: 40 }}
          ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: colors.border, marginLeft: 72 }} />}
          renderItem={({ item: c }) => (
            <TouchableOpacity
              onPress={() => navigation.navigate('AdminSupportChat', { userId: c.userId, companyName: c.companyName })}
              activeOpacity={0.75}
              style={styles.row}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{(c.companyName?.[0] ?? '?').toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={styles.name} numberOfLines={1}>{c.companyName}</Text>
                  <Text style={styles.time}>{new Date(c.lastMessageAt).toLocaleDateString('pt-BR')}</Text>
                </View>
                <Text style={styles.preview} numberOfLines={1}>{c.lastMessage}</Text>
              </View>
              {c.unreadCount > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadText}>{c.unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={{ padding: 48, alignItems: 'center' }}>
              <Ionicons name="chatbubbles-outline" size={40} color={colors.textMuted} />
              <Text style={{ color: colors.textMuted, marginTop: 12 }}>Nenhuma conversa</Text>
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
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 20, gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16, fontWeight: '700', color: colors.primary },
  name: { fontSize: 14, fontWeight: '700', color: colors.text, flex: 1 },
  preview: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  time: { fontSize: 11, color: colors.textMuted },
  unreadBadge: { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  unreadText: { color: '#fff', fontSize: 11, fontWeight: '700' },
});
