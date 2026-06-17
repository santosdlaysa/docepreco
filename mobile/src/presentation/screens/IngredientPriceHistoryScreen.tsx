import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/types';
import { priceHistoryApi, PriceEntry } from '../../data/api/priceHistoryApi';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { Card } from '../components/Card';
import { Skeleton } from '../components/Skeleton';
import { Header } from '../components/Header';
import { useTranslation } from 'react-i18next';
import { useCurrencyFormat } from '../hooks/useCurrencyFormat';

type RouteType = RouteProp<RootStackParamList, 'IngredientPriceHistory'>;

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });

export const IngredientPriceHistoryScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const route = useRoute<RouteType>();
  const { ingredientId, ingredientName } = route.params;
  const [entries, setEntries] = useState<PriceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { formatCurrency, formatCurrencyUnit } = useCurrencyFormat();

  useFocusEffect(
    useCallback(() => {
      priceHistoryApi
        .getForIngredient(ingredientId)
        .then(setEntries)
        .catch(() => {})
        .finally(() => setLoading(false));
    }, [ingredientId])
  );

  const renderItem = ({ item, index }: { item: PriceEntry; index: number }) => {
    const effectiveQty = item.purchaseUnitWeight ? item.purchaseQuantity * item.purchaseUnitWeight : item.purchaseQuantity;
    const pricePerUnit = effectiveQty > 0 ? item.price / effectiveQty : 0;
    const prev = entries[index + 1];
    const prevEffectiveQty = prev && prev.purchaseUnitWeight ? prev.purchaseQuantity * prev.purchaseUnitWeight : prev?.purchaseQuantity ?? 0;
    const prevPerUnit = prev && prevEffectiveQty > 0 ? prev.price / prevEffectiveQty : null;
    const diff = prevPerUnit !== null ? pricePerUnit - prevPerUnit : null;
    const pct = prevPerUnit !== null && prevPerUnit > 0
      ? ((diff! / prevPerUnit) * 100)
      : null;

    return (
      <Card style={styles.entryCard}>
        <View style={styles.entryRow}>
          <View style={styles.dateCol}>
            <Text style={styles.dateText}>{formatDate(item.recordedAt)}</Text>
            {index === 0 && (
              <View style={styles.latestBadge}>
                <Text style={styles.latestBadgeText}>{t('priceHistory.current')}</Text>
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
            <Text style={styles.unitPrice}>{formatCurrencyUnit(pricePerUnit)}/{item.unit}</Text>
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
        title={t('priceHistory.title')}
        subtitle={ingredientName}
        showBack
        onBack={() => navigation.goBack()}
      />
      {loading ? (
        <View style={styles.skeletonContainer}>
          {[0, 1, 2, 3, 4].map(i => (
            <View key={i} style={styles.skeletonCard}>
              <View style={{ flex: 1 }}>
                <Skeleton width={100} height={14} borderRadius={4} />
                <Skeleton width={80} height={18} borderRadius={6} style={{ marginTop: 6 }} />
              </View>
              <Skeleton width={60} height={24} borderRadius={8} />
            </View>
          ))}
        </View>
      ) : entries.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="time-outline" size={48} color={colors.border} />
          <Text style={styles.emptyTitle}>{t('priceHistory.emptyTitle')}</Text>
          <Text style={styles.emptyText}>
            {t('priceHistory.emptyText')}
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
  skeletonContainer: {
    padding: 20,
    gap: 10,
  },
  skeletonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
});
