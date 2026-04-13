import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/types';
import { priceHistoryStorage, PriceEntry } from '../../data/storage/priceHistoryStorage';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { Card } from '../components/Card';
import { Header } from '../components/Header';

type RouteType = RouteProp<RootStackParamList, 'IngredientPriceHistory'>;

const formatCurrency = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });

export const IngredientPriceHistoryScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteType>();
  const { ingredientId, ingredientName } = route.params;
  const [entries, setEntries] = useState<PriceEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      priceHistoryStorage
        .getForIngredient(ingredientId)
        .then(setEntries)
        .finally(() => setLoading(false));
    }, [ingredientId])
  );

  const renderItem = ({ item, index }: { item: PriceEntry; index: number }) => {
    const pricePerUnit = item.price / item.purchaseQuantity;
    const prev = entries[index + 1];
    const prevPerUnit = prev ? prev.price / prev.purchaseQuantity : null;
    const diff = prevPerUnit !== null ? pricePerUnit - prevPerUnit : null;
    const pct = prevPerUnit !== null && prevPerUnit > 0
      ? ((diff! / prevPerUnit) * 100)
      : null;

    return (
      <Card style={styles.entryCard}>
        <View style={styles.entryRow}>
          <View style={styles.dateCol}>
            <Text style={styles.dateText}>{formatDate(item.date)}</Text>
            {index === 0 && (
              <View style={styles.latestBadge}>
                <Text style={styles.latestBadgeText}>Atual</Text>
              </View>
            )}
          </View>
          <View style={styles.priceCol}>
            <Text style={styles.packagePrice}>{formatCurrency(item.price)}</Text>
            <Text style={styles.packageQty}>
              {item.purchaseQuantity} {item.unit}
            </Text>
          </View>
          <View style={styles.unitCol}>
            <Text style={styles.unitPrice}>{formatCurrency(pricePerUnit)}/{item.unit}</Text>
            {pct !== null && (
              <View style={[styles.diffBadge, { backgroundColor: pct > 0 ? '#FFEBEE' : '#E8F5E9' }]}>
                <Ionicons
                  name={pct > 0 ? 'arrow-up' : 'arrow-down'}
                  size={10}
                  color={pct > 0 ? colors.error : colors.success}
                />
                <Text style={[styles.diffText, { color: pct > 0 ? colors.error : colors.success }]}>
                  {Math.abs(pct).toFixed(1)}%
                </Text>
              </View>
            )}
          </View>
        </View>
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Histórico de Preços"
        subtitle={ingredientName}
        showBack
        onBack={() => navigation.goBack()}
      />
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : entries.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="time-outline" size={48} color={colors.border} />
          <Text style={styles.emptyTitle}>Sem histórico ainda</Text>
          <Text style={styles.emptyText}>
            O histórico é salvo automaticamente cada vez que você editar o preço deste ingrediente.
          </Text>
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(_, i) => String(i)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyTitle: { ...typography.h3, color: colors.text, marginTop: 16, marginBottom: 8 },
  emptyText: { ...typography.body, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  list: { padding: 16, gap: 8 },
  entryCard: { padding: 14 },
  entryRow: { flexDirection: 'row', alignItems: 'center' },
  dateCol: { flex: 1.2 },
  dateText: { ...typography.bodySmall, color: colors.text, fontWeight: '600' },
  latestBadge: {
    marginTop: 4,
    backgroundColor: colors.primaryLight,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  latestBadgeText: { ...typography.caption, color: colors.primary, fontWeight: '700' },
  priceCol: { flex: 1, alignItems: 'center' },
  packagePrice: { ...typography.body, color: colors.text, fontWeight: '700' },
  packageQty: { ...typography.caption, color: colors.textSecondary },
  unitCol: { flex: 1, alignItems: 'flex-end' },
  unitPrice: { ...typography.bodySmall, color: colors.primary, fontWeight: '600' },
  diffBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
    marginTop: 4,
  },
  diffText: { ...typography.caption, fontWeight: '700' },
});
