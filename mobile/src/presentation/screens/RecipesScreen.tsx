import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Platform,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Recipe } from '../../domain/entities/Recipe';
import { CalculationResult } from '../../domain/entities/Calculation';
import { recipeApi } from '../../data/api/recipeApi';
import { isDemoMode } from '../../data/demo/demoMode';
import { demoRecipeApi } from '../../data/demo/demoApi';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { EmptyState } from '../components/EmptyState';
import { Skeleton } from '../components/Skeleton';
import { useToast } from '../context/ToastContext';
import { usePremium } from '../context/PremiumContext';
import { usePaywall } from '../premium/usePaywall';
import { FREE_LIMITS } from '../premium/limits';
import { planConfigApi } from '../../data/api/planConfigApi';
import { useTranslation } from 'react-i18next';
import { AdBanner, useAdInterstitial } from '../ads';
import { useDemoGuard } from '../hooks/useDemoGuard';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const CARD_COLORS = ['#5D3A1A', '#E91E8C', '#F9C74F', '#90BE6D', '#7B68EE', '#FF6B6B', '#4ECDC4', '#FF9F43'];
const CATEGORIES = ['Todas', 'Bolos', 'Docinhos', 'Tortas', 'Cupcakes', 'Chocolates'];

function getCardColor(index: number) {
  return CARD_COLORS[index % CARD_COLORS.length];
}

function formatCurrency(value: number) {
  return `R$ ${value.toFixed(2).replace('.', ',')}`;
}

export const RecipesScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { t } = useTranslation();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [calculations, setCalculations] = useState<Record<string, CalculationResult>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const { showToast } = useToast();
  const { isPremium } = usePremium();
  const { requirePremium, openPaywall } = usePaywall();
  const { guardAction, DemoGuardModal } = useDemoGuard();
  const { showInterstitial } = useAdInterstitial();
  const api = isDemoMode() ? demoRecipeApi : recipeApi;
  const [duplicateTarget, setDuplicateTarget] = useState<Recipe | null>(null);
  const [duplicateName, setDuplicateName] = useState('');
  const [freeRecipeLimit, setFreeRecipeLimit] = useState<number>(FREE_LIMITS.recipes);

  const loadRecipes = async () => {
    try {
      const [data, limit] = await Promise.all([
        api.getAll(),
        isDemoMode() ? FREE_LIMITS.recipes : planConfigApi.getFreeRecipeLimit(),
      ]);
      setRecipes(data);
      setFreeRecipeLimit(limit);

      // Load calculations for all recipes
      const calcs: Record<string, CalculationResult> = {};
      await Promise.all(
        data.map(async (recipe) => {
          try {
            calcs[recipe.id] = await api.calculate(recipe.id);
          } catch {}
        })
      );
      setCalculations(calcs);
    } catch (error) {
      showToast(t('recipes.loadError'), 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const hasShownAd = useRef(false);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadRecipes();
      if (!hasShownAd.current) {
        hasShownAd.current = true;
        showInterstitial();
      }
    }, [])
  );

  const filteredRecipes = useMemo(() => {
    let filtered = recipes;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(r => r.name.toLowerCase().includes(query));
    }
    if (selectedCategory !== 'Todas') {
      const cat = selectedCategory.toLowerCase();
      filtered = filtered.filter(r => r.name.toLowerCase().includes(cat.slice(0, -1).toLowerCase()));
    }
    return filtered;
  }, [recipes, searchQuery, selectedCategory]);

  const handleDelete = (recipe: Recipe) => {
    if (!guardAction()) return;
    const originalIndex = recipes.findIndex(r => r.id === recipe.id);
    setRecipes(prev => prev.filter(r => r.id !== recipe.id));

    const restore = () => {
      setRecipes(prev => {
        if (prev.some(r => r.id === recipe.id)) return prev;
        const next = [...prev];
        const idx = Math.max(0, Math.min(originalIndex, next.length));
        next.splice(idx, 0, recipe);
        return next;
      });
    };

    showToast(t('recipes.deleted', { name: recipe.name }), {
      type: 'success',
      action: { label: 'Desfazer', onPress: restore },
      onDismiss: async () => {
        try {
          await api.delete(recipe.id);
        } catch {
          restore();
          showToast(t('recipes.deleteError'), 'error');
        }
      },
    });
  };

  const handleDuplicate = (recipe: Recipe) => {
    if (!guardAction()) return;
    if (!requirePremium('duplicateRecipe')) return;

    const defaultName = t('recipes.copyName', { name: recipe.name });

    if (Platform.OS === 'ios') {
      Alert.prompt(
        t('recipes.duplicateTitle'),
        t('recipes.duplicatePrompt'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('recipes.duplicateButton'),
            onPress: (name?: string) => executeDuplicate(recipe, (name || '').trim() || defaultName),
          },
        ],
        'plain-text',
        defaultName,
      );
    } else {
      setDuplicateName(defaultName);
      setDuplicateTarget(recipe);
    }
  };

  const executeDuplicate = async (recipe: Recipe, name: string) => {
    try {
      await api.create({
        name,
        yield: recipe.yield,
        profitMargin: recipe.profitMargin,
        ingredients: recipe.ingredients.map(ing => ({
          ingredientId: ing.ingredientId,
          quantityUsed: ing.quantityUsed,
          unit: ing.unit,
        })),
        additionalCosts: recipe.additionalCosts.map(c => ({
          name: c.name,
          value: c.value,
        })),
        subRecipes: (recipe.subRecipes || []).map(s => ({
          subRecipeId: s.subRecipeId,
          quantityUsed: s.quantityUsed,
          unit: s.unit || 'un',
        })),
      });
      showToast(t('recipes.duplicated'), 'success');
      loadRecipes();
    } catch {
      showToast(t('recipes.duplicateError'), 'error');
    }
  };

  const renderItem = ({ item, index }: { item: Recipe; index: number }) => {
    const calc = calculations[item.id];
    const cardColor = getCardColor(index);

    return (
      <TouchableOpacity
        onPress={() => navigation.navigate('RecipeDetail', { recipeId: item.id })}
        onLongPress={() => handleDelete(item)}
        activeOpacity={0.7}
        style={styles.recipeCard}
      >
        {/* Thumbnail colorido */}
        <View style={[styles.thumbnail, { backgroundColor: cardColor }]}>
          <Text style={styles.thumbnailText}>
            {item.name.substring(0, 2).toUpperCase()}
          </Text>
        </View>

        {/* Conteúdo */}
        <View style={styles.recipeContent}>
          <Text style={styles.recipeName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.recipeSubtitle} numberOfLines={1}>
            {item.yield} {item.yield === 1 ? 'unidade' : 'unidades'}
          </Text>

          {calc ? (
            <View style={styles.priceRow}>
              <View style={styles.priceBlock}>
                <Text style={styles.priceLabel}>CUSTO/UN</Text>
                <Text style={styles.priceValue}>{formatCurrency(calc.costPerUnit)}</Text>
              </View>
              <View style={styles.priceBlock}>
                <Text style={styles.priceLabel}>PREÇO</Text>
                <Text style={[styles.priceValue, styles.priceHighlight]}>
                  {formatCurrency(calc.suggestedPrice)}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.priceRow}>
              <ActivityIndicator size="small" color={colors.primaryLight} />
            </View>
          )}
        </View>

        {/* Badge de margem */}
        {calc && (
          <View style={styles.marginBadge}>
            <Text style={styles.marginText}>↑ {Math.round(calc.profitMargin)}%</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const ListHeader = () => (
    <View>
      {/* Barra de busca */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={18} color={colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar receita..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearch}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Chips de categoria */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipsContainer}
        contentContainerStyle={styles.chipsContent}
      >
        {CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat}
            onPress={() => setSelectedCategory(cat)}
            style={[
              styles.chip,
              selectedCategory === cat && styles.chipActive,
            ]}
          >
            <Text
              style={[
                styles.chipText,
                selectedCategory === cat && styles.chipTextActive,
              ]}
            >
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Barra de progresso (free) */}
      {!isPremium && (
        <View style={styles.progressRow}>
          <Text style={styles.progressPlus}>+</Text>
          <Text style={styles.progressText}>
            {Math.min(recipes.length, freeRecipeLimit)} / {freeRecipeLimit} grátis
          </Text>
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${Math.min((recipes.length / freeRecipeLimit) * 100, 100)}%`,
                  backgroundColor:
                    recipes.length >= freeRecipeLimit ? colors.warning : colors.success,
                },
              ]}
            />
          </View>
          <TouchableOpacity onPress={() => openPaywall({ kind: 'limit', feature: 'recipes', current: recipes.length })}>
            <Text style={styles.goProText}>Virar PRO</Text>
          </TouchableOpacity>
        </View>
      )}

      <AdBanner />
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>{t('recipes.title')}</Text>
            <Text style={styles.headerSubtitle}>Suas fichas técnicas e preços</Text>
          </View>
          <View style={[styles.addButton, { opacity: 0.4 }]}>
            <Ionicons name="add" size={24} color="#fff" />
          </View>
        </View>
        <View style={styles.skeletonContainer}>
          {/* Search skeleton */}
          <Skeleton width="100%" height={46} borderRadius={12} />

          {/* Chips skeleton */}
          <View style={styles.skeletonChips}>
            <Skeleton width={60} height={34} borderRadius={20} />
            <Skeleton width={72} height={34} borderRadius={20} />
            <Skeleton width={80} height={34} borderRadius={20} />
            <Skeleton width={68} height={34} borderRadius={20} />
          </View>

          {/* Progress bar skeleton */}
          <Skeleton width="100%" height={46} borderRadius={12} />

          {/* Card skeletons */}
          {[0, 1, 2, 3].map(i => (
            <View key={i} style={styles.skeletonCard}>
              <Skeleton width={56} height={64} borderRadius={12} />
              <View style={styles.skeletonCardContent}>
                <Skeleton width={140} height={16} borderRadius={6} />
                <Skeleton width={90} height={12} borderRadius={4} style={{ marginTop: 6 }} />
                <View style={styles.skeletonPriceRow}>
                  <Skeleton width={70} height={14} borderRadius={4} />
                  <Skeleton width={70} height={14} borderRadius={4} />
                </View>
              </View>
              <Skeleton width={52} height={30} borderRadius={10} />
            </View>
          ))}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>{t('recipes.title')}</Text>
          <Text style={styles.headerSubtitle}>Suas fichas técnicas e preços</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => guardAction(() => navigation.navigate('CreateIngredient'))}
            style={styles.addIngredientButton}
          >
            <Ionicons name="basket-outline" size={16} color={colors.primary} />
            <Text style={styles.addIngredientText}>+ Ingrediente</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => guardAction(() => navigation.navigate('CreateRecipe'))}
            style={styles.addButton}
          >
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={filteredRecipes}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadRecipes(); }}
            colors={[colors.primary]}
          />
        }
        ListHeaderComponent={filteredRecipes.length > 0 || searchQuery || selectedCategory !== 'Todas' ? <ListHeader /> : null}
        ListEmptyComponent={
          searchQuery || selectedCategory !== 'Todas' ? (
            <View style={styles.noResults}>
              <Ionicons name="search-outline" size={48} color={colors.textMuted} />
              <Text style={styles.noResultsText}>Nenhuma receita encontrada</Text>
            </View>
          ) : (
            <EmptyState
              icon="book-outline"
              title={t('recipes.emptyTitle')}
              description={t('recipes.emptyDescription')}
              actionLabel={t('recipes.createButton')}
              onAction={() => guardAction(() => navigation.navigate('CreateRecipe'))}
            />
          )
        }
      />

      <DemoGuardModal />

      {/* Modal de nome para duplicar (Android) */}
      <Modal visible={!!duplicateTarget} transparent animationType="fade">
        <KeyboardAvoidingView behavior="padding" style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>{t('recipes.duplicateTitle')}</Text>
            <Text style={styles.modalSubtitle}>{t('recipes.duplicatePrompt')}</Text>
            <TextInput
              style={styles.modalInput}
              value={duplicateName}
              onChangeText={setDuplicateName}
              placeholder={t('recipes.recipeName')}
              autoFocus
              selectTextOnFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => setDuplicateTarget(null)}
                style={styles.modalCancel}
              >
                <Text style={styles.modalCancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  if (duplicateTarget) {
                    const name = duplicateName.trim() || t('recipes.copyName', { name: duplicateTarget.name });
                    executeDuplicate(duplicateTarget, name);
                  }
                  setDuplicateTarget(null);
                }}
                style={styles.modalSave}
              >
                <Text style={styles.modalSaveText}>{t('recipes.duplicateButton')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: 20, paddingBottom: 20, flexGrow: 1 },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerLeft: { flex: 1 },
  headerTitle: {
    ...typography.h1,
    color: colors.text,
  },
  headerSubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addIngredientButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.cream,
    borderWidth: 1.5,
    borderColor: colors.primaryLight,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  addIngredientText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    marginBottom: 12,
    marginTop: 8,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
  },
  clearSearch: { padding: 4 },

  // Category chips
  chipsContainer: { marginBottom: 12 },
  chipsContent: { gap: 8 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.text,
    borderColor: colors.text,
  },
  chipText: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: '#fff',
  },

  // Progress bar
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
    gap: 8,
  },
  progressPlus: {
    ...typography.body,
    fontWeight: '700',
    color: colors.primary,
  },
  progressText: {
    ...typography.bodySmall,
    color: colors.text,
    fontWeight: '600',
  },
  progressBarBg: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primaryLight,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  goProText: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: colors.primary,
  },

  // Recipe card
  recipeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  thumbnail: {
    width: 56,
    height: 64,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  thumbnailText: {
    fontSize: 16,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 1,
  },
  recipeContent: {
    flex: 1,
  },
  recipeName: {
    ...typography.h4,
    color: colors.text,
    marginBottom: 1,
  },
  recipeSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  priceBlock: {},
  priceLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 1,
  },
  priceValue: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: colors.text,
  },
  priceHighlight: {
    color: colors.primary,
  },

  // Margin badge
  marginBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    marginLeft: 8,
  },
  marginText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2E7D32',
  },

  // No results
  noResults: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    gap: 12,
  },
  noResultsText: {
    ...typography.body,
    color: colors.textMuted,
  },

  // Skeleton loading
  skeletonContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 12,
  },
  skeletonChips: {
    flexDirection: 'row',
    gap: 8,
  },
  skeletonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
  },
  skeletonCardContent: {
    flex: 1,
    marginLeft: 12,
  },
  skeletonPriceRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },

  // Modal (duplicate)
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 32 },
  modalBox: { backgroundColor: colors.surface, borderRadius: 16, padding: 24 },
  modalTitle: { ...typography.h3, color: colors.text, marginBottom: 6 },
  modalSubtitle: { ...typography.body, color: colors.textSecondary, marginBottom: 16 },
  modalInput: {
    borderWidth: 1.5, borderColor: colors.border, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    ...typography.body, color: colors.text, marginBottom: 20,
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  modalCancel: { padding: 10 },
  modalCancelText: { ...typography.body, color: colors.textSecondary, fontWeight: '600' },
  modalSave: { backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  modalSaveText: { ...typography.body, color: '#fff', fontWeight: '700' },
});
