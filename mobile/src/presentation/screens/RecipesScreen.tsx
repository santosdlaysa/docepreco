import React, { useState, useCallback, useRef } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Recipe } from '../../domain/entities/Recipe';
import { recipeApi } from '../../data/api/recipeApi';
import { isDemoMode } from '../../data/demo/demoMode';
import { demoRecipeApi } from '../../data/demo/demoApi';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { Header } from '../components/Header';
import { useToast } from '../context/ToastContext';
import { usePremium } from '../context/PremiumContext';
import { usePaywall } from '../premium/usePaywall';
import { FREE_LIMITS } from '../premium/limits';
import { planConfigApi } from '../../data/api/planConfigApi';
import { useTranslation } from 'react-i18next';
import { AdBanner, useAdInterstitial } from '../ads';
import { useDemoGuard } from '../hooks/useDemoGuard';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const RecipesScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { t } = useTranslation();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { showToast } = useToast();
  const { isPremium } = usePremium();
  const { requirePremium } = usePaywall();
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
            onPress: (name) => executeDuplicate(recipe, (name || '').trim() || defaultName),
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
        })),
      });
      showToast(t('recipes.duplicated'), 'success');
      loadRecipes();
    } catch {
      showToast(t('recipes.duplicateError'), 'error');
    }
  };

  const renderItem = ({ item }: { item: Recipe }) => (
    <Card style={styles.recipeCard}>
      <TouchableOpacity
        onPress={() => navigation.navigate('RecipeDetail', { recipeId: item.id })}
        activeOpacity={0.8}
        style={styles.recipeContent}
      >
        <View style={styles.recipeIcon}>
          <Text style={styles.recipeEmoji}>🍬</Text>
        </View>
        <View style={styles.recipeInfo}>
          <Text style={styles.recipeName}>{item.name}</Text>
          <Text style={styles.recipeDetails}>
            {t('recipes.unitsAndProfit', { yield: item.yield, margin: item.profitMargin })}
          </Text>
          <View style={styles.recipeTags}>
            <View style={styles.tag}>
              <Text style={styles.tagText}>{t('recipes.ingredientsCount', { count: item.ingredients.length })}</Text>
            </View>
            {item.additionalCosts.length > 0 && (
              <View style={[styles.tag, styles.tagSecondary]}>
                <Text style={[styles.tagText, styles.tagTextSecondary]}>
                  {t('recipes.costsCount', { count: item.additionalCosts.length })}
                </Text>
              </View>
            )}
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      </TouchableOpacity>
      <View style={styles.recipeActions}>
        <TouchableOpacity
          onPress={() => handleDuplicate(item)}
          style={styles.actionBtn}
        >
          <Ionicons name="copy-outline" size={18} color={colors.secondary} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => guardAction(() => navigation.navigate('EditRecipe', { recipeId: item.id }))}
          style={[styles.actionBtn, styles.actionBtnBorder]}
        >
          <Ionicons name="pencil-outline" size={18} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handleDelete(item)}
          style={[styles.actionBtn, styles.actionBtnBorder]}
        >
          <Ionicons name="trash-outline" size={18} color={colors.error} />
        </TouchableOpacity>
      </View>
    </Card>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <Header title={t('recipes.title')} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Header
        title={t('recipes.title')}
        subtitle={t('recipes.subtitle', { count: recipes.length, plural: recipes.length !== 1 ? 's' : '' })}
        rightAction={
          <TouchableOpacity
            onPress={() => guardAction(() => navigation.navigate('CreateRecipe'))}
            style={styles.addButton}
          >
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        }
      />
      <FlatList
        data={recipes}
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
        ListHeaderComponent={
          recipes.length > 0 ? (
            <View>
              {!isPremium && (
                <View style={styles.progressCard}>
                  <View style={styles.progressHeader}>
                    <View style={styles.progressLabelRow}>
                      <Ionicons name="book-outline" size={16} color={colors.primary} />
                      <Text style={styles.progressLabel}>{t('recipes.registered')}</Text>
                    </View>
                    <Text style={styles.progressCount}>
                      <Text style={styles.progressCurrent}>{Math.min(recipes.length, freeRecipeLimit)}</Text>
                      /{freeRecipeLimit}
                    </Text>
                  </View>
                  <View style={styles.progressBarBg}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${Math.min((recipes.length / freeRecipeLimit) * 100, 100)}%`,
                          backgroundColor: recipes.length >= freeRecipeLimit ? colors.warning : colors.primary,
                        },
                      ]}
                    />
                  </View>
                  {recipes.length >= freeRecipeLimit ? (
                    <Text style={styles.progressHint}>
                      {t('recipes.limitReached')}
                    </Text>
                  ) : (
                    <Text style={styles.progressHint}>
                      {t('recipes.remaining', { count: freeRecipeLimit - recipes.length, plural: freeRecipeLimit - recipes.length !== 1 ? 's' : '' })}
                    </Text>
                  )}
                </View>
              )}
              <View style={styles.infoCard}>
                <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
                <Text style={styles.infoText}>
                  {t('recipes.infoText')}
                </Text>
              </View>
              <AdBanner />
            </View>
          ) : null
        }
        ListEmptyComponent={
          <EmptyState
            icon="book-outline"
            title={t('recipes.emptyTitle')}
            description={t('recipes.emptyDescription')}
            actionLabel={t('recipes.createButton')}
            onAction={() => guardAction(() => navigation.navigate('CreateRecipe'))}
          />
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
  list: { padding: 20, flexGrow: 1 },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recipeCard: { marginBottom: 12, padding: 0, overflow: 'hidden' },
  recipeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  recipeIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  recipeEmoji: { fontSize: 24 },
  recipeInfo: { flex: 1 },
  recipeName: { ...typography.h4, color: colors.text },
  recipeDetails: { ...typography.bodySmall, color: colors.textSecondary, marginTop: 2 },
  recipeTags: { flexDirection: 'row', marginTop: 6, gap: 8 },
  tag: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagSecondary: { backgroundColor: colors.beige },
  tagText: { ...typography.caption, color: colors.primary, fontWeight: '600' },
  tagTextSecondary: { color: colors.secondary },
  recipeActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  actionBtnBorder: {
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
  },
  progressCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  progressLabel: {
    ...typography.bodySmall,
    color: colors.text,
    fontWeight: '600',
  },
  progressCount: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  progressCurrent: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '700',
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primaryLight,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressHint: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 6,
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
