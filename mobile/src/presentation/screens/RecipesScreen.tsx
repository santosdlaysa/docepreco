import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
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
import { FREE_LIMITS } from '../premium/limits';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const RecipesScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { showToast } = useToast();
  const { isPremium } = usePremium();
  const api = isDemoMode() ? demoRecipeApi : recipeApi;
  const loadRecipes = async () => {
    try {
      const data = await api.getAll();
      setRecipes(data);
    } catch (error) {
      showToast('Não foi possível carregar as receitas', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadRecipes();
    }, [])
  );

  const handleDelete = (recipe: Recipe) => {
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

    showToast(`${recipe.name} excluída`, {
      type: 'success',
      action: { label: 'Desfazer', onPress: restore },
      onDismiss: async () => {
        try {
          await api.delete(recipe.id);
        } catch {
          restore();
          showToast('Não foi possível excluir a receita', 'error');
        }
      },
    });
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
            {item.yield} unidades • {item.profitMargin}% lucro
          </Text>
          <View style={styles.recipeTags}>
            <View style={styles.tag}>
              <Text style={styles.tagText}>{item.ingredients.length} ingredientes</Text>
            </View>
            {item.additionalCosts.length > 0 && (
              <View style={[styles.tag, styles.tagSecondary]}>
                <Text style={[styles.tagText, styles.tagTextSecondary]}>
                  +{item.additionalCosts.length} custos
                </Text>
              </View>
            )}
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      </TouchableOpacity>
      <View style={styles.recipeActions}>
        <TouchableOpacity
          onPress={() => navigation.navigate('EditRecipe', { recipeId: item.id })}
          style={styles.actionBtn}
        >
          <Ionicons name="pencil-outline" size={18} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handleDelete(item)}
          style={[styles.actionBtn, styles.deleteBtn]}
        >
          <Ionicons name="trash-outline" size={18} color={colors.error} />
        </TouchableOpacity>
      </View>
    </Card>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <Header title="Minhas Receitas" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Header
        title="Minhas Receitas"
        subtitle={`${recipes.length} receita${recipes.length !== 1 ? 's' : ''} · Toque no + para adicionar`}
        rightAction={
          <TouchableOpacity
            onPress={() => navigation.navigate('CreateRecipe')}
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
                      <Text style={styles.progressLabel}>Receitas cadastradas</Text>
                    </View>
                    <Text style={styles.progressCount}>
                      <Text style={styles.progressCurrent}>{Math.min(recipes.length, FREE_LIMITS.recipes)}</Text>
                      /{FREE_LIMITS.recipes}
                    </Text>
                  </View>
                  <View style={styles.progressBarBg}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${Math.min((recipes.length / FREE_LIMITS.recipes) * 100, 100)}%`,
                          backgroundColor: recipes.length >= FREE_LIMITS.recipes ? colors.warning : colors.primary,
                        },
                      ]}
                    />
                  </View>
                  {recipes.length >= FREE_LIMITS.recipes ? (
                    <Text style={styles.progressHint}>
                      Você atingiu o limite! Vire Premium para receitas ilimitadas.
                    </Text>
                  ) : (
                    <Text style={styles.progressHint}>
                      Restam {FREE_LIMITS.recipes - recipes.length} receita{FREE_LIMITS.recipes - recipes.length !== 1 ? 's' : ''} no plano gratuito
                    </Text>
                  )}
                </View>
              )}
              <View style={styles.infoCard}>
                <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
                <Text style={styles.infoText}>
                  Aqui ficam todas as suas receitas. Cada uma calcula automaticamente o preco de venda com base nos ingredientes, custos e margem de lucro.
                </Text>
              </View>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <EmptyState
            icon="book-outline"
            title="Nenhuma receita ainda"
            description="Crie sua primeira receita e calcule o preco ideal de venda!"
            actionLabel="Criar Receita"
            onAction={() => navigation.navigate('CreateRecipe')}
          />
        }
      />
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
  deleteBtn: {
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
});
