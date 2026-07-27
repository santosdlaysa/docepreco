import { colors } from '../theme/colors';
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  TextInput,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Client } from '../../domain/entities/Client';
import { clientApi } from '../../data/api/clientApi';
import { Skeleton } from '../components/Skeleton';
import { usePaywall } from '../premium/usePaywall';
import { useTranslation } from 'react-i18next';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// ── Design tokens ──
const INK = colors.text;
const INK2 = colors.textSecondary;
const INK3 = colors.textMuted;
const CREAM = colors.pinkBg3;
const LINE = colors.border;
const PINK = colors.primary;
const GREEN = colors.green;

const SHADOW = {
  shadowColor: INK,
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.07,
  shadowRadius: 12,
  elevation: 4,
};

const AVATAR_GRADIENTS: [string, string][] = [
  [colors.pinkSoft, colors.primary],
  [colors.blue, colors.blueDark],
  [colors.amber, '#F2960B'],
  [colors.green, '#2BA060'],
  ['#7B68EE', '#5A4BD1'],
  ['#FF6B6B', '#E04848'],
];

const isBirthdaySoon = (birthday?: string): boolean => {
  if (!birthday) return false;
  const [mm, dd] = birthday.split('-').map(Number);
  const today = new Date();
  const thisYear = today.getFullYear();
  const bday = new Date(thisYear, mm - 1, dd);
  if (bday < today) bday.setFullYear(thisYear + 1);
  const diffDays = Math.ceil((bday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays >= 0 && diffDays <= 7;
};

export const ClientsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { guardScreen } = usePaywall();
  const { t } = useTranslation();
  const monthNames = t('months.short', { returnObjects: true }) as string[];

  const formatBirthday = (birthday: string): string => {
    const [mm, dd] = birthday.split('-').map(Number);
    return `${String(dd).padStart(2, '0')} de ${monthNames[mm - 1]}`;
  };

  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!guardScreen('clientsManagement')) return;
      loadClients();
    }, [])
  );

  const loadClients = async () => {
    try {
      setClients(await clientApi.getAll());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filtered = search.trim()
    ? clients.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
    : clients;

  const handleWhatsApp = async (client: Client) => {
    if (!client.phone) {
      Alert.alert(t('clients.noPhone'), t('clients.noPhoneMessage'));
      return;
    }
    const phone = client.phone.replace(/\D/g, '');
    await Linking.openURL(`https://wa.me/55${phone}`).catch(() =>
      Alert.alert(t('common.error'), t('clients.whatsappError'))
    );
  };

  const handleDelete = (client: Client) => {
    Alert.alert(t('clients.deleteTitle'), t('clients.deleteMessage', { name: client.name }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => { await clientApi.delete(client.id); loadClients(); },
      },
    ]);
  };

  // ── Loading skeleton ──
  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.header}>
          <View><Text style={s.headerTitle}>Clientes</Text><Text style={s.headerSub}>Carregando...</Text></View>
        </View>
        <View style={s.body}>
          <Skeleton width="100%" height={46} borderRadius={15} />
          <View style={s.card}>
            {[0, 1, 2, 3].map(i => (
              <View key={i} style={[s.row, i > 0 && s.rowBorder]}>
                <Skeleton width={42} height={42} borderRadius={13} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Skeleton width={130} height={14} borderRadius={4} />
                  <Skeleton width={170} height={10} borderRadius={4} style={{ marginTop: 6 }} />
                </View>
                <Skeleton width={32} height={32} borderRadius={10} />
              </View>
            ))}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      {/* ── Header ── */}
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>Clientes</Text>
          <Text style={s.headerSub}>{clients.length} cadastrados</Text>
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate('CreateClient')}
          style={s.newBtn}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={s.newBtnText}>Novo</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.body}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadClients(); }} colors={[PINK]} />
        }
      >
        {/* Search */}
        <View style={s.searchBar}>
          <Ionicons name="search" size={19} color={INK3} />
          <TextInput
            style={s.searchInput}
            placeholder="Buscar cliente…"
            placeholderTextColor={INK3}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={INK3} />
            </TouchableOpacity>
          )}
        </View>

        {filtered.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="people-outline" size={48} color={INK3} />
            <Text style={s.emptyText}>
              {search ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
            </Text>
            {!search && (
              <Text style={s.emptyHint}>Toque em "Novo" para cadastrar</Text>
            )}
          </View>
        ) : (
          <View style={s.card}>
            {filtered.map((client, idx) => {
              const birthdaySoon = isBirthdaySoon(client.birthday);
              const grad = AVATAR_GRADIENTS[idx % AVATAR_GRADIENTS.length];
              const initial = client.name.charAt(0).toUpperCase();

              return (
                <TouchableOpacity
                  key={client.id}
                  activeOpacity={0.8}
                  onPress={() => navigation.navigate('EditClient', { clientId: client.id })}
                  onLongPress={() => handleDelete(client)}
                >
                  <View style={[s.row, idx > 0 && s.rowBorder]}>
                    <LinearGradient colors={birthdaySoon ? [colors.pinkSoft, PINK] : grad} style={s.avatar}>
                      {birthdaySoon ? (
                        <Ionicons name="gift" size={20} color="#fff" />
                      ) : (
                        <Text style={s.avatarText}>{initial}</Text>
                      )}
                    </LinearGradient>
                    <View style={s.rowInfo}>
                      <View style={s.nameRow}>
                        <Text style={s.clientName}>{client.name}</Text>
                        {birthdaySoon && (
                          <View style={s.bdBadge}>
                            <Ionicons name="gift" size={10} color="#BC2A6C" />
                            <Text style={s.bdBadgeText}>Aniversário</Text>
                          </View>
                        )}
                      </View>
                      <Text style={s.clientMeta}>
                        {client.phone || ''}{client.phone && client.birthday ? ' · ' : ''}{client.birthday ? formatBirthday(client.birthday) : ''}
                      </Text>
                    </View>
                    {client.phone && (
                      <TouchableOpacity onPress={() => handleWhatsApp(client)} style={s.whatsBtn}>
                        <Ionicons name="logo-whatsapp" size={17} color={GREEN} />
                      </TouchableOpacity>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  body: { paddingHorizontal: 18, gap: 12, paddingBottom: 20 },

  /* ── Header ── */
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 12,
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: INK },
  headerSub: { fontSize: 12.5, color: INK2, fontWeight: '600', marginTop: 1 },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: PINK,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    ...SHADOW,
    shadowColor: PINK,
    shadowOpacity: 0.3,
  },
  newBtnText: { color: '#fff', fontSize: 13.5, fontWeight: '700' },

  /* ── Search ── */
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: '#fff',
    borderRadius: 15,
    paddingHorizontal: 14,
    paddingVertical: 11,
    ...SHADOW,
  },
  searchInput: { flex: 1, fontSize: 14.5, color: INK, fontWeight: '500', padding: 0 },

  /* ── Card (gcard) ── */
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    overflow: 'hidden',
    ...SHADOW,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 15,
  },
  rowBorder: { borderTopWidth: 1, borderTopColor: LINE },

  /* ── Avatar ── */
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '700', color: '#fff' },

  /* ── Client info ── */
  rowInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  clientName: { fontSize: 14.5, fontWeight: '700', color: INK },
  clientMeta: { fontSize: 12, color: INK2, fontWeight: '500', marginTop: 2 },
  bdBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.pinkBg,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  bdBadgeText: { fontSize: 10, fontWeight: '700', color: '#BC2A6C' },

  /* ── WhatsApp button ── */
  whatsBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.greenBg,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ── Empty ── */
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15, color: INK3 },
  emptyHint: { fontSize: 13, color: INK2, fontWeight: '500' },
});
