import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { seasonStorage, Season } from '../../data/storage/seasonStorage';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { Card } from '../components/Card';
import { Header } from '../components/Header';
import { usePaywall } from '../premium/usePaywall';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const formatDate = (d: string) =>
  new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

const isActive = (s: Season) => {
  const today = new Date().toISOString().slice(0, 10);
  return s.startDate <= today && s.endDate >= today;
};

export const SeasonsScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { guardScreen } = usePaywall();
  const [seasons, setSeasons] = useState<Season[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (!guardScreen('seasonalPricing')) return;
      seasonStorage.getAll().then(setSeasons);
    }, [])
  );

  const handleDelete = (season: Season) => {
    Alert.alert('Excluir temporada', `Excluir "${season.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          await seasonStorage.delete(season.id);
          setSeasons(prev => prev.filter(s => s.id !== season.id));
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: Season }) => {
    const active = isActive(item);
    const pct = ((item.multiplier - 1) * 100).toFixed(0);
    const sign = item.multiplier >= 1 ? '+' : '';

    return (
      <Card style={[styles.card, active && styles.cardActive]}>
        <View style={styles.cardContent}>
          <View style={styles.iconWrap}>
            <Ionicons name="pricetag-outline" size={20} color={active ? '#fff' : colors.primary} />
          </View>
          <View style={styles.info}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{item.name}</Text>
              {active && (
                <View style={styles.activeBadge}>
                  <Text style={styles.activeBadgeText}>Ativa</Text>
                </View>
              )}
            </View>
            <Text style={styles.dates}>
              {formatDate(item.startDate)} → {formatDate(item.endDate)}
            </Text>
            <Text style={[styles.multiplier, { color: item.multiplier >= 1 ? colors.success : colors.error }]}>
              {sign}{pct}% nos preços
            </Text>
          </View>
          <View style={styles.actions}>
            <TouchableOpacity
              onPress={() => navigation.navigate('EditSeason', { seasonId: item.id })}
              style={styles.actionBtn}
            >
              <Ionicons name="pencil-outline" size={18} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleDelete(item)}
              style={[styles.actionBtn, { marginTop: 4 }]}
            >
              <Ionicons name="trash-outline" size={18} color={colors.error} />
            </TouchableOpacity>
          </View>
        </View>
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Temporadas"
        subtitle="Ajuste os preços automaticamente em datas especiais."
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity
            onPress={() => navigation.navigate('CreateSeason')}
            style={styles.addBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={22} color={colors.primary} />
          </TouchableOpacity>
        }
      />
      <FlatList
        data={seasons}
        keyExtractor={s => s.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="pricetag-outline" size={48} color={colors.border} />
            <Text style={styles.emptyTitle}>Nenhuma temporada</Text>
            <Text style={styles.emptyText}>
              Crie temporadas para ajustar os preços automaticamente em Natal, Páscoa, Dia das Mães e outras datas especiais.
            </Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => navigation.navigate('CreateSeason')}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={styles.emptyBtnText}>Criar primeira temporada</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  list: { padding: 16, gap: 10, flexGrow: 1 },
  card: { padding: 14 },
  cardActive: { borderWidth: 2, borderColor: colors.primary, backgroundColor: colors.cream },
  cardContent: { flexDirection: 'row', alignItems: 'center' },
  iconWrap: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  info: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { ...typography.h4, color: colors.text },
  activeBadge: {
    backgroundColor: colors.primary, borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  activeBadgeText: { ...typography.caption, color: '#fff', fontWeight: '700' },
  dates: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  multiplier: { ...typography.bodySmall, fontWeight: '700', marginTop: 2 },
  actions: { alignItems: 'center' },
  actionBtn: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: colors.background,
    alignItems: 'center', justifyContent: 'center',
  },
  addBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, marginTop: 60 },
  emptyTitle: { ...typography.h3, color: colors.text, marginTop: 16, marginBottom: 8 },
  emptyText: { ...typography.body, color: colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.primary, borderRadius: 12,
    paddingHorizontal: 20, paddingVertical: 12,
  },
  emptyBtnText: { ...typography.button, color: '#fff' },
});
