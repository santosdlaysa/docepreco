import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Linking,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Client } from '../../domain/entities/Client';
import { clientStorage } from '../../data/storage/clientStorage';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { Card } from '../components/Card';
import { Header } from '../components/Header';
import { usePaywall } from '../premium/usePaywall';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const MONTH_NAMES = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
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

const formatBirthday = (birthday: string): string => {
  const [mm, dd] = birthday.split('-').map(Number);
  return `${String(dd).padStart(2, '0')} de ${MONTH_NAMES[mm - 1]}`;
};

export const ClientsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { guardScreen } = usePaywall();
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (!guardScreen('clientsManagement')) {
        return;
      }
      loadClients();
    }, [])
  );

  const loadClients = async () => {
    try {
      const data = await clientStorage.getAll();
      setClients(data);
    } finally {
      setLoading(false);
    }
  };

  const filtered = search.trim()
    ? clients.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
    : clients;

  const handleWhatsApp = async (client: Client) => {
    if (!client.phone) {
      Alert.alert('Sem telefone', 'Este cliente não tem telefone cadastrado.');
      return;
    }
    const phone = client.phone.replace(/\D/g, '');
    const url = `https://wa.me/55${phone}`;
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Erro', 'Não foi possível abrir o WhatsApp.');
    }
  };

  const handleDelete = (client: Client) => {
    Alert.alert('Excluir cliente', `Excluir "${client.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          await clientStorage.delete(client.id);
          loadClients();
        },
      },
    ]);
  };

  const renderClient = ({ item }: { item: Client }) => {
    const birthdaySoon = isBirthdaySoon(item.birthday);
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => navigation.navigate('EditClient', { clientId: item.id })}
        onLongPress={() => handleDelete(item)}
      >
        <Card style={styles.clientCard}>
          <View style={styles.clientRow}>
            <View style={[styles.avatar, birthdaySoon && styles.avatarBirthday]}>
              {birthdaySoon ? (
                <Text style={styles.avatarEmoji}>🎂</Text>
              ) : (
                <Ionicons name="person" size={20} color={colors.primary} />
              )}
            </View>
            <View style={styles.clientInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.clientName}>{item.name}</Text>
                {birthdaySoon && (
                  <View style={styles.birthdayBadge}>
                    <Text style={styles.birthdayBadgeText}>Aniversário!</Text>
                  </View>
                )}
              </View>
              {item.phone && (
                <Text style={styles.clientPhone}>
                  <Ionicons name="call-outline" size={12} color={colors.textMuted} /> {item.phone}
                </Text>
              )}
              {item.birthday && (
                <Text style={styles.clientBirthday}>
                  <Ionicons name="gift-outline" size={12} color={colors.textMuted} />{' '}
                  {formatBirthday(item.birthday)}
                </Text>
              )}
            </View>
            {item.phone && (
              <TouchableOpacity
                onPress={() => handleWhatsApp(item)}
                style={styles.whatsappBtn}
              >
                <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
              </TouchableOpacity>
            )}
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Header title="Clientes" subtitle="Toque em + para cadastrar. Use WhatsApp para contato. Segure para excluir." showBack onBack={() => navigation.goBack()} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Clientes"
        subtitle="Toque em + para cadastrar. Use WhatsApp para contato. Segure para excluir."
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity
            onPress={() => navigation.navigate('CreateClient')}
            style={styles.addBtn}
          >
            <Ionicons name="add" size={22} color="#fff" />
          </TouchableOpacity>
        }
      />
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar cliente..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={renderClient}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>
              {search ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
            </Text>
            {!search && (
              <TouchableOpacity
                onPress={() => navigation.navigate('CreateClient')}
                style={styles.emptyCta}
              >
                <Text style={styles.emptyCtaText}>Cadastrar cliente</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    ...typography.body,
    color: colors.text,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.primaryLight,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  infoText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 18,
  },
  list: { paddingHorizontal: 20, paddingBottom: 32 },
  clientCard: { marginBottom: 10 },
  clientRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarBirthday: { backgroundColor: '#FFF3E0' },
  avatarEmoji: { fontSize: 20 },
  clientInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  clientName: { ...typography.h4, color: colors.text },
  clientPhone: { ...typography.bodySmall, color: colors.textSecondary, marginTop: 2 },
  clientBirthday: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  birthdayBadge: {
    backgroundColor: '#FFF3E0',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  birthdayBadgeText: { fontSize: 10, fontWeight: '700', color: '#FF9800' },
  whatsappBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#E7F9EF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { ...typography.body, color: colors.textMuted },
  emptyCta: {
    marginTop: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  emptyCtaText: { ...typography.button, color: '#fff' },
});
