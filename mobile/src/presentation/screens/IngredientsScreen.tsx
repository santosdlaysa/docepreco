import React, { useState, useCallback, useContext } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Ingredient } from '../../domain/entities/Ingredient';
import { ingredientApi } from '../../data/api/ingredientApi';
import { isDemoMode } from '../../data/demo/demoMode';
import { demoIngredientApi } from '../../data/demo/demoApi';
import { EmptyState } from '../components/EmptyState';
import { Skeleton } from '../components/Skeleton';
import { useToast } from '../context/ToastContext';
import { usePaywall } from '../premium/usePaywall';
import { useTranslation } from 'react-i18next';
import { AdBanner } from '../ads';
import { useDemoGuard } from '../hooks/useDemoGuard';
import { getEffectivePurchaseQuantity, getIngredientUnitPrice } from '../../domain/services/ingredientPricing';
import { useCurrencyFormat } from '../hooks/useCurrencyFormat';
import { formatUnitLabel } from '../utils/units';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// ── Design tokens ──
const INK = '#3D2233';
const INK2 = '#9A7E8C';
const INK3 = '#C4B0BB';
const CREAM = '#FFF6F0';
const LINE = '#F1E2DA';
const PINK = '#EA4B92';
const GREEN = '#43BE6E';
const BLUE = '#2BA7DD';

const SHADOW = {
  shadowColor: INK,
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.07,
  shadowRadius: 12,
  elevation: 4,
};

export const IngredientsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  // Altura da tab bar flutuante (0 quando a tela é aberta fora das abas)
  const tabBarHeight = useContext(BottomTabBarHeightContext) ?? 0;
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { showToast } = useToast();
  const { requirePremium } = usePaywall();
  const { t } = useTranslation();
  const { guardAction, DemoGuardModal } = useDemoGuard();
  const { formatCurrency, formatCurrencyUnit } = useCurrencyFormat();
  const api = isDemoMode() ? demoIngredientApi : ingredientApi;

  const loadIngredients = async () => {
    try {
      const data = await api.getAll();
      setIngredients(data);
    } catch {
      showToast(t('ingredients.loadError'), 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadIngredients();
    }, [])
  );

  const handleDelete = async (ingredient: Ingredient) => {
    if (!guardAction()) return;

    try {
      await api.delete(ingredient.id);
      const originalIndex = ingredients.findIndex(i => i.id === ingredient.id);
      setIngredients(prev => prev.filter(i => i.id !== ingredient.id));

      const restore = () => {
        setIngredients(prev => {
          if (prev.some(i => i.id === ingredient.id)) return prev;
          const next = [...prev];
          const idx = Math.max(0, Math.min(originalIndex, next.length));
          next.splice(idx, 0, ingredient);
          return next;
        });
      };

      showToast(t('ingredients.deleteUndo', { name: ingredient.name }), {
        type: 'success',
        action: { label: t('ingredients.undo'), onPress: restore },
      });
    } catch (error: any) {
      const serverMsg = error?.message || '';
      const isInUseError =
        serverMsg.includes('em uso') ||
        serverMsg.includes('in use') ||
        serverMsg.includes('violates foreign key') ||
        serverMsg.includes('violates RESTRICT') ||
        serverMsg.includes('restrict') ||
        error?.status === 409;

      if (isInUseError) {
        showToast(t('ingredients.inUseError'), 'warning');
      } else {
        showToast(`${t('ingredients.deleteError')}: ${serverMsg}`, 'error');
      }
    }
  };

  // ── Loading skeleton ──
  if (loading) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <View style={s.header}>
          <View>
            <Text style={s.headerTitle}>{t('ingredients.title')}</Text>
            <Text style={s.headerSub}>carregando...</Text>
          </View>
        </View>
        <View style={s.body}>
          <Skeleton width="100%" height={56} borderRadius={20} />
          <View style={s.skeletonCard}>
            {[0, 1, 2, 3, 4].map(i => (
              <View key={i} style={s.skeletonRow}>
                <Skeleton width={40} height={40} borderRadius={12} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Skeleton width={140} height={14} borderRadius={4} />
                  <Skeleton width={180} height={10} borderRadius={4} style={{ marginTop: 6 }} />
                </View>
                <Skeleton width={70} height={14} borderRadius={4} />
              </View>
            ))}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const renderIngredientRow = (item: Ingredient, index: number) => (
    <View key={item.id} style={[s.row, index > 0 && s.rowBorder]}>
      <View style={s.rowIcon}>
        <Ionicons name="leaf" size={18} color={GREEN} />
      </View>
      <View style={s.rowInfo}>
        <Text style={s.rowName}>{item.name}</Text>
        <Text style={s.rowQty}>
          {item.purchaseUnitLabel
            ? `${item.purchaseQuantity} ${item.purchaseUnitLabel}(s) (${getEffectivePurchaseQuantity(item)} ${formatUnitLabel(item.unit)}) · ${formatCurrency(item.purchasePrice)}`
            : `${getEffectivePurchaseQuantity(item)} ${formatUnitLabel(item.unit)} · ${formatCurrency(item.purchasePrice)}`}
        </Text>
      </View>
      <View style={s.rowRight}>
        <Text style={s.rowPrice}>{formatCurrencyUnit(getIngredientUnitPrice(item))}/{formatUnitLabel(item.unit)}</Text>
        <View style={s.rowActions}>
          <TouchableOpacity
            onPress={() => guardAction(() => navigation.navigate('EditIngredient', { ingredientId: item.id }))}
            style={s.iconBtn}
          >
            <Ionicons name="pencil-outline" size={15} color={INK2} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              if (!requirePremium('ingredientPriceHistory')) return;
              navigation.navigate('IngredientPriceHistory', { ingredientId: item.id, ingredientName: item.name });
            }}
            style={s.iconBtn}
          >
            <Ionicons name="bar-chart-outline" size={15} color={INK2} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleDelete(item)}
            style={s.iconBtn}
          >
            <Ionicons name="trash-outline" size={15} color={INK2} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* ── Header ── */}
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>{t('ingredients.title')}</Text>
          <Text style={s.headerSub}>{ingredients.length} cadastrados</Text>
        </View>
        <TouchableOpacity
          onPress={() => guardAction(() => navigation.navigate('CreateIngredient'))}
          style={s.newBtn}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={s.newBtnText}>Novo</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.body, { paddingBottom: 24 + tabBarHeight }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadIngredients(); }}
            colors={[PINK]}
          />
        }
      >
        {ingredients.length === 0 ? (
          <EmptyState
            icon="basket-outline"
            title={t('ingredients.emptyTitle')}
            description={t('ingredients.emptyDescription')}
            actionLabel={t('ingredients.addButton')}
            onAction={() => guardAction(() => navigation.navigate('CreateIngredient'))}
          />
        ) : (
          <>
            {/* Banner info */}
            <View style={s.banner}>
              <View style={s.bannerIcon}>
                <Ionicons name="information-circle" size={18} color={BLUE} />
              </View>
              <View style={s.bannerText}>
                <Text style={s.bannerTitle}>Preço por unidade automático</Text>
                <Text style={s.bannerSub}>Calculado a partir do que você pagou.</Text>
              </View>
            </View>

            <AdBanner />

            {/* Card único com todos os ingredientes */}
            <View style={s.card}>
              {ingredients.map((item, index) => renderIngredientRow(item, index))}
            </View>
          </>
        )}
        <View style={{ height: 70 }} />
      </ScrollView>

      <DemoGuardModal />
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: CREAM },
  body: { paddingHorizontal: 18, paddingBottom: 80, gap: 11 },

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

  /* ── Banner ── */
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 15,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#DCF1FB',
    ...SHADOW,
    shadowOpacity: 0.04,
  },
  bannerIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW,
    shadowOpacity: 0.05,
  },
  bannerText: { flex: 1 },
  bannerTitle: { fontSize: 15, fontWeight: '700', color: INK },
  bannerSub: { fontSize: 12, color: INK2, fontWeight: '500', marginTop: 2 },

  /* ── Ingredient rows (single card) ── */
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
  rowBorder: {
    borderTopWidth: 1,
    borderTopColor: LINE,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#DCF6E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 14.5, fontWeight: '700', color: INK },
  rowQty: { fontSize: 12, color: INK2, fontWeight: '500', marginTop: 2 },
  rowRight: { alignItems: 'flex-end' },
  rowPrice: { fontSize: 15, fontWeight: '700', color: PINK },
  rowActions: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 5,
    justifyContent: 'flex-end',
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: CREAM,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ── Skeleton ── */
  skeletonCard: {
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 4,
    ...SHADOW,
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 13,
    paddingHorizontal: 15,
  },
});
