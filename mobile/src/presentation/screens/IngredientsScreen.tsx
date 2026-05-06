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
import { Ingredient } from '../../domain/entities/Ingredient';
import { ingredientApi } from '../../data/api/ingredientApi';
import { isDemoMode } from '../../data/demo/demoMode';
import { demoIngredientApi } from '../../data/demo/demoApi';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { Header } from '../components/Header';
import { useToast } from '../context/ToastContext';
import { usePaywall } from '../premium/usePaywall';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const unitLabels: Record<string, string> = {
  g: 'gramas',
  kg: 'quilogramas',
  ml: 'mililitros',
  l: 'litros',
  unit: 'unidade',
};

export const IngredientsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { showToast } = useToast();
  const { requirePremium } = usePaywall();
  const api = isDemoMode() ? demoIngredientApi : ingredientApi;

  const loadIngredients = async () => {
    try {
      const data = await api.getAll();
      setIngredients(data);
    } catch (error) {
      showToast('Não foi possível carregar os ingredientes', 'error');
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

  const handleDelete = (ingredient: Ingredient) => {
    const originalIndex = ingredients.findIndex(i => i.id === ingredient.id);
    // remove imediatamente da UI
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

    showToast(`${ingredient.name} excluído`, {
      type: 'success',
      action: {
        label: 'Desfazer',
        onPress: restore,
      },
      onDismiss: async () => {
        try {
          await api.delete(ingredient.id);
        } catch (error: any) {
          restore();
          const serverMsg = error?.response?.data?.error || error?.message || '';
          if (
            serverMsg.includes('em uso') ||
            serverMsg.includes('in use') ||
            serverMsg.includes('violates foreign key') ||
            serverMsg.includes('restrict') ||
            error?.response?.status === 409
          ) {
            showToast('Ingrediente em uso em uma ou mais receitas. Remova da receita primeiro.', 'warning');
          } else {
            showToast('Não foi possível excluir este ingrediente', 'error');
          }
        }
      },
    });
  };

  const formatPrice = (price: number) =>
    price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const effectiveQuantity = (ingredient: Ingredient) =>
    ingredient.purchaseUnitWeight
      ? ingredient.purchaseQuantity * ingredient.purchaseUnitWeight
      : ingredient.purchaseQuantity;

  const pricePerUnit = (ingredient: Ingredient) =>
    ingredient.purchasePrice / effectiveQuantity(ingredient);

  const renderItem = ({ item }: { item: Ingredient }) => (
    <Card style={styles.ingredientCard}>
      <View style={styles.ingredientMain}>
        <View style={styles.ingredientIcon}>
          <Ionicons name="leaf-outline" size={22} color={colors.secondary} />
        </View>
        <View style={styles.ingredientInfo}>
          <Text style={styles.ingredientName}>{item.name}</Text>
          <Text style={styles.ingredientQuantity}>
            {item.purchaseUnitLabel
              ? `${item.purchaseQuantity} ${item.purchaseUnitLabel}(s) (${effectiveQuantity(item)} ${item.unit}) por ${formatPrice(item.purchasePrice)}`
              : `${item.purchaseQuantity} ${item.unit} por ${formatPrice(item.purchasePrice)}`}
          </Text>
          <Text style={styles.pricePerUnit}>
            {formatPrice(pricePerUnit(item))} por {item.unit}
          </Text>
        </View>
        <View style={styles.ingredientActions}>
          <TouchableOpacity
            onPress={() => navigation.navigate('EditIngredient', { ingredientId: item.id })}
            style={styles.actionBtn}
          >
            <Ionicons name="pencil-outline" size={18} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              if (!requirePremium('ingredientPriceHistory')) return;
              navigation.navigate('IngredientPriceHistory', { ingredientId: item.id, ingredientName: item.name });
            }}
            style={[styles.actionBtn, { marginTop: 4 }]}
          >
            <Ionicons name="time-outline" size={18} color={colors.textSecondary} />
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

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <Header title="Ingredientes" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Header
        title="Ingredientes"
        subtitle={`${ingredients.length} cadastrado${ingredients.length !== 1 ? 's' : ''} · Toque no + para adicionar`}
        rightAction={
          <TouchableOpacity
            onPress={() => navigation.navigate('CreateIngredient')}
            style={styles.addButton}
          >
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        }
      />
      <FlatList
        data={ingredients}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadIngredients(); }}
            colors={[colors.primary]}
          />
        }
        ListHeaderComponent={
          ingredients.length > 0 ? (
            <View style={styles.infoCard}>
              <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
              <Text style={styles.infoText}>
                Cadastre aqui os ingredientes que voce usa. O preco por unidade e calculado automaticamente e usado nas suas receitas.
              </Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <EmptyState
            icon="basket-outline"
            title="Nenhum ingrediente ainda"
            description="Cadastre os ingredientes que voce usa nas suas receitas!"
            actionLabel="Adicionar Ingrediente"
            onAction={() => navigation.navigate('CreateIngredient')}
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
  ingredientCard: {
    marginBottom: 10,
  },
  ingredientMain: { flexDirection: 'row', alignItems: 'center' },
  ingredientIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.beige,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  ingredientInfo: { flex: 1 },
  ingredientName: { ...typography.h4, color: colors.text },
  ingredientQuantity: { ...typography.bodySmall, color: colors.textSecondary, marginTop: 2 },
  pricePerUnit: { ...typography.caption, color: colors.primary, marginTop: 3, fontWeight: '600' },
  ingredientActions: { alignItems: 'center' },
  actionBtn: { padding: 6 },
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
