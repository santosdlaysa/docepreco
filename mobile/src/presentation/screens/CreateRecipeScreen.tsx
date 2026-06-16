import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Skeleton } from '../components/Skeleton';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { recipeApi } from '../../data/api/recipeApi';
import { ingredientApi } from '../../data/api/ingredientApi';
import { isDemoMode } from '../../data/demo/demoMode';
import { demoRecipeApi, demoIngredientApi } from '../../data/demo/demoApi';
import { Ingredient } from '../../domain/entities/Ingredient';
import { RecipeIngredient, AdditionalCost, SubRecipe } from '../../domain/entities/Recipe';
import { Recipe } from '../../domain/entities/Recipe';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Card } from '../components/Card';
import { Header } from '../components/Header';
import { useToast } from '../context/ToastContext';
import { usePaywall } from '../premium/usePaywall';
import { usePremium } from '../context/PremiumContext';
import { SUGGESTED_RECIPES, SuggestedRecipe } from '../../data/recipes/suggestedRecipes';
import { useTranslation } from 'react-i18next';
import { useDraft } from '../hooks/useDraft';
import { PRICING_TUTORIAL } from '../utils/pricingTutorial';
import { getEffectivePurchaseQuantity } from '../../domain/services/ingredientPricing';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'EditRecipe'>;

const DEFAULT_ADDITIONAL_COSTS = [
  {
    name: 'Embalagem',
    icon: 'gift-outline' as const,
    hint: 'Some caixas, sacolas, fitas, papel. Ex: se a caixa custa R$1,50 e usa 10, coloque R$15.',
  },
  {
    name: 'Gas',
    icon: 'flame-outline' as const,
    hint: 'Divida sua conta de gas pelo numero de receitas que faz no mes. Ex: conta R$80 / 20 receitas = R$4.',
  },
  {
    name: 'Energia',
    icon: 'flash-outline' as const,
    hint: 'Mesmo calculo do gas. Ex: conta R$150 / 20 receitas = R$7,50 por receita.',
  },
  {
    name: 'Mao de obra',
    icon: 'time-outline' as const,
    hint: 'Quanto voce quer ganhar por hora? Multiplique pelo tempo. Ex: R$20/h x 2h = R$40.',
  },
];

const MARGIN_PRESETS = [
  { value: 30,  label: 'Básico',      emoji: '🟢', desc: 'Cobre custos, lucro baixo' },
  { value: 50,  label: 'Equilibrado', emoji: '🟡', desc: 'Padrão de mercado' },
  { value: 70,  label: 'Recomendado', emoji: '⭐', desc: 'Ideal para a maioria dos doces' },
  { value: 100, label: 'Lucrativo',   emoji: '🔥', desc: 'Mais lucro por unidade' },
  { value: 150, label: 'Premium',     emoji: '💎', desc: 'Gourmet / personalizado' },
];

export const CreateRecipeScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { t } = useTranslation();
  const route = useRoute<RouteProps>();
  const recipeId = (route.params as any)?.recipeId as string | undefined;
  const isEditing = !!recipeId;

  const localizedAdditionalCosts = DEFAULT_ADDITIONAL_COSTS.map(cost => ({
    ...cost,
    name: cost.name === 'Embalagem' ? t('createRecipe.packaging')
      : cost.name === 'Gas' ? t('createRecipe.gas')
      : cost.name === 'Energia' ? t('createRecipe.energy')
      : cost.name === 'Mao de obra' ? t('createRecipe.labor')
      : cost.name,
    hint: cost.name === 'Embalagem' ? t('createRecipe.packagingHint')
      : cost.name === 'Gas' ? t('createRecipe.gasHint')
      : cost.name === 'Energia' ? t('createRecipe.energyHint')
      : cost.name === 'Mao de obra' ? t('createRecipe.laborHint')
      : cost.hint,
  }));

  const localizedMarginPresets = MARGIN_PRESETS.map(preset => ({
    ...preset,
    label: preset.value === 30 ? t('createRecipe.marginBasic')
      : preset.value === 50 ? t('createRecipe.marginBalanced')
      : preset.value === 70 ? t('createRecipe.marginRecommended')
      : preset.value === 100 ? t('createRecipe.marginProfitable')
      : preset.value === 150 ? t('createRecipe.marginPremium')
      : preset.label,
    desc: preset.value === 30 ? t('createRecipe.marginBasicDesc')
      : preset.value === 50 ? t('createRecipe.marginBalancedDesc')
      : preset.value === 70 ? t('createRecipe.marginRecommendedDesc')
      : preset.value === 100 ? t('createRecipe.marginProfitableDesc')
      : preset.value === 150 ? t('createRecipe.marginPremiumDesc')
      : preset.desc,
  }));

  const [name, setName] = useState('');
  const [yieldAmount, setYieldAmount] = useState('');
  const [profitMargin, setProfitMargin] = useState('30');
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);
  const [additionalCosts, setAdditionalCosts] = useState<AdditionalCost[]>([]);
  const [additionalCostInputs, setAdditionalCostInputs] = useState<Record<string, string>>({});
  const [availableIngredients, setAvailableIngredients] = useState<Ingredient[]>([]);
  const [showIngredientModal, setShowIngredientModal] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null);
  const [ingredientQuantity, setIngredientQuantity] = useState('');
  const [ingredientUnit, setIngredientUnit] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(isEditing);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [recipeCount, setRecipeCount] = useState(0);
  const [laborExpanded, setLaborExpanded] = useState(false);
  const [hourlyRate, setHourlyRate] = useState('');
  const [prepTimeMinutes, setPrepTimeMinutes] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [applyingSuggestion, setApplyingSuggestion] = useState(false);
  const [subRecipes, setSubRecipes] = useState<SubRecipe[]>([]);
  const [availableRecipes, setAvailableRecipes] = useState<Recipe[]>([]);
  const [showSubRecipeModal, setShowSubRecipeModal] = useState(false);
  const [selectedSubRecipe, setSelectedSubRecipe] = useState<Recipe | null>(null);
  const [subRecipeQuantity, setSubRecipeQuantity] = useState('');
  const [subRecipeUnit, setSubRecipeUnit] = useState('un');
  const [ingredientConfirm, setIngredientConfirm] = useState<{
    type: 'confirm' | 'warning-high' | 'warning-low';
    name: string;
    qty: number;
    unit: string;
    cost: number;
    pkgInfo?: string;
    ratio?: string;
  } | null>(null);
  // ─── Draft auto-save (only for new recipes, not editing) ───
  interface RecipeDraft {
    name: string;
    yieldAmount: string;
    profitMargin: string;
    ingredients: RecipeIngredient[];
    additionalCosts: AdditionalCost[];
    additionalCostInputs: Record<string, string>;
    subRecipes: SubRecipe[];
    hourlyRate: string;
    prepTimeMinutes: string;
    laborExpanded: boolean;
  }

  const { draft: recipeDraft, isDraftLoading, saveDraft, clearDraft } = useDraft<RecipeDraft>(
    'draft_new_recipe',
    !isEditing && !isDemoMode()
  );

  const { showToast } = useToast();
  const { checkLimit, openPaywall, requirePremium } = usePaywall();
  const { isPremium } = usePremium();
  const rApi = isDemoMode() ? demoRecipeApi : recipeApi;
  const iApi = isDemoMode() ? demoIngredientApi : ingredientApi;

  useEffect(() => {
    iApi.getAll().then(setAvailableIngredients).catch(() => {});
    rApi.getAll().then(list => {
      if (!isEditing) setRecipeCount(list.length);
      setAvailableRecipes(list);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!recipeId) return;
    rApi.getById(recipeId)
      .then(recipe => {
        setName(recipe.name);
        setYieldAmount(String(recipe.yield));
        setProfitMargin(String(recipe.profitMargin));
        setIngredients(recipe.ingredients);
        setAdditionalCosts(recipe.additionalCosts);
        setAdditionalCostInputs(
          recipe.additionalCosts.reduce((acc, c) => {
            acc[c.name] = c.value ? String(c.value).replace('.', ',') : '';
            return acc;
          }, {} as Record<string, string>)
        );
        setSubRecipes(recipe.subRecipes || []);
        // Restore labor cost fields if present
        const laborCost = recipe.additionalCosts.find(c => c.name === 'Mão de obra (profissional)');
        if (laborCost && laborCost.value > 0) {
          setLaborExpanded(true);
        }
      })
      .catch(() => showToast(t('createRecipe.loadError'), 'error'))
      .finally(() => setLoadingData(false));
  }, [recipeId]);

  // Offer to restore draft on first load
  useEffect(() => {
    if (isEditing || isDraftLoading || !recipeDraft) return;
    Alert.alert(
      'Rascunho salvo',
      'Você tem uma receita começada. Deseja restaurar o preenchimento?',
      [
        { text: 'Descartar', style: 'destructive', onPress: clearDraft },
        {
          text: 'Restaurar',
          onPress: () => {
            setName(recipeDraft.name);
            setYieldAmount(recipeDraft.yieldAmount);
            setProfitMargin(recipeDraft.profitMargin);
            setIngredients(recipeDraft.ingredients);
            setAdditionalCosts(recipeDraft.additionalCosts);
            setAdditionalCostInputs(recipeDraft.additionalCostInputs);
            setSubRecipes(recipeDraft.subRecipes);
            setHourlyRate(recipeDraft.hourlyRate);
            setPrepTimeMinutes(recipeDraft.prepTimeMinutes);
            setLaborExpanded(recipeDraft.laborExpanded);
          },
        },
      ]
    );
  }, [isDraftLoading]);

  // Auto-save form state whenever it changes
  useEffect(() => {
    if (isEditing || isDraftLoading) return;
    saveDraft({ name, yieldAmount, profitMargin, ingredients, additionalCosts, additionalCostInputs, subRecipes, hourlyRate, prepTimeMinutes, laborExpanded });
  }, [name, yieldAmount, profitMargin, ingredients, additionalCosts, additionalCostInputs, subRecipes, hourlyRate, prepTimeMinutes, laborExpanded]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = t('createRecipe.nameRequired');
    if (!yieldAmount || parseInt(yieldAmount) <= 0)
      newErrors.yield = t('createRecipe.yieldRequired');
    if (ingredients.length === 0 && subRecipes.length === 0) newErrors.ingredients = t('createRecipe.ingredientsRequired');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const getCompatibleUnits = (ingredient: Pick<Ingredient, 'unit' | 'purchaseUnitWeight'>): string[] => {
    const baseUnits =
      ingredient.unit === 'g' || ingredient.unit === 'kg'
        ? ['g', 'kg']
        : ingredient.unit === 'ml' || ingredient.unit === 'l'
          ? ['ml', 'l']
          : [ingredient.unit];
    return ingredient.purchaseUnitWeight ? ['unit', ...baseUnits] : baseUnits;
  };

  const getDefaultUnit = (ingredient: Pick<Ingredient, 'unit' | 'purchaseUnitWeight'>): string => {
    return ingredient.purchaseUnitWeight ? 'unit' : ingredient.unit;
  };

  const convertToSameUnit = (qty: number, from: string, to: string): number => {
    if (from === to) return qty;
    if (from === 'g' && to === 'kg') return qty / 1000;
    if (from === 'kg' && to === 'g') return qty * 1000;
    if (from === 'ml' && to === 'l') return qty / 1000;
    if (from === 'l' && to === 'ml') return qty * 1000;
    return qty;
  };

  const confirmAndAddIngredient = () => {
    if (!selectedIngredient) return;
    const qty = parseFloat(ingredientQuantity.replace(',', '.'));
    const unit = ingredientUnit || selectedIngredient.unit;

    setIngredients(prev => [
      ...prev,
      {
        ingredientId: selectedIngredient.id,
        ingredientName: selectedIngredient.name,
        quantityUsed: qty,
        unit,
      },
    ]);
    setSelectedIngredient(null);
    setIngredientQuantity('');
    setIngredientUnit('');
    setShowIngredientModal(false);
  };

  const addIngredient = () => {
    const normalizedQty = ingredientQuantity.replace(',', '.');
    if (!selectedIngredient || !ingredientQuantity || parseFloat(normalizedQty) <= 0) return;
    const existing = ingredients.find(i => i.ingredientId === selectedIngredient.id);
    if (existing) {
      showToast(t('createRecipe.alreadyAdded'), 'warning');
      return;
    }

    const qty = parseFloat(normalizedQty);
    const unit = ingredientUnit || selectedIngredient.unit;
    if (!getCompatibleUnits(selectedIngredient).includes(unit)) {
      showToast('Unidade incompatível com o ingrediente selecionado.', 'error');
      return;
    }
    // Quantidade efetiva na unidade base (ex: 1 lata de 330g = 330g)
    const effectivePurchaseQty = getEffectivePurchaseQuantity(selectedIngredient);
    const qtyInPurchaseUnit =
      unit === 'unit' && selectedIngredient.purchaseUnitWeight
        ? qty * selectedIngredient.purchaseUnitWeight
        : convertToSameUnit(qty, unit, selectedIngredient.unit);
    const ratio = qtyInPurchaseUnit / effectivePurchaseQty;

    const costPerUnit = selectedIngredient.purchasePrice / effectivePurchaseQty;
    const ingredientCost = qtyInPurchaseUnit * costPerUnit;
    const pkgInfo = selectedIngredient.purchaseUnitLabel
      ? `${selectedIngredient.purchaseQuantity} ${selectedIngredient.purchaseUnitLabel} (${effectivePurchaseQty} ${selectedIngredient.unit})`
      : `${effectivePurchaseQty} ${selectedIngredient.unit}`;

    if (ratio > 3) {
      setShowIngredientModal(false);
      setIngredientConfirm({
        type: 'warning-high',
        name: selectedIngredient.name,
        qty, unit,
        cost: ingredientCost,
        pkgInfo,
        ratio: ratio.toFixed(1),
      });
      return;
    }

    if (ratio < 0.01) {
      setShowIngredientModal(false);
      setIngredientConfirm({
        type: 'warning-low',
        name: selectedIngredient.name,
        qty, unit,
        cost: ingredientCost,
        pkgInfo,
      });
      return;
    }

    setShowIngredientModal(false);
    setIngredientConfirm({
      type: 'confirm',
      name: selectedIngredient.name,
      qty, unit,
      cost: ingredientCost,
      pkgInfo,
    });
  };

  const removeIngredient = (id: string) => {
    setIngredients(prev => prev.filter(i => i.ingredientId !== id));
  };

  const addSubRecipe = () => {
    const normalizedQty = subRecipeQuantity.replace(',', '.');
    if (!selectedSubRecipe || !subRecipeQuantity || parseFloat(normalizedQty) <= 0) return;

    if (selectedSubRecipe.id === recipeId) {
      showToast(t('createRecipe.subRecipeIsSelf'), 'warning');
      return;
    }

    const existing = subRecipes.find(s => s.subRecipeId === selectedSubRecipe.id);
    if (existing) {
      showToast(t('createRecipe.subRecipeAlreadyAdded'), 'warning');
      return;
    }

    const qty = parseFloat(normalizedQty);
    const unit = subRecipeUnit;
    Alert.alert(
      t('createRecipe.confirmSubRecipe'),
      t('createRecipe.confirmSubRecipeMessage', { name: selectedSubRecipe.name, qty, unit }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.add'),
          onPress: () => {
            setSubRecipes(prev => [
              ...prev,
              {
                subRecipeId: selectedSubRecipe.id,
                subRecipeName: selectedSubRecipe.name,
                quantityUsed: qty,
                unit,
              },
            ]);
            setSelectedSubRecipe(null);
            setSubRecipeQuantity('');
            setSubRecipeUnit('un');
            setShowSubRecipeModal(false);
          },
        },
      ]
    );
  };

  const removeSubRecipe = (id: string) => {
    setSubRecipes(prev => prev.filter(s => s.subRecipeId !== id));
  };

  const updateAdditionalCost = (name: string, value: string) => {
    // Mantém apenas dígitos e um separador decimal (vírgula ou ponto)
    const sanitized = value.replace(/[^0-9.,]/g, '');
    setAdditionalCostInputs(prev => ({ ...prev, [name]: sanitized }));

    const normalized = sanitized.replace(',', '.');
    const numValue = parseFloat(normalized) || 0;
    if (numValue <= 0) {
      setAdditionalCosts(prev => prev.filter(c => c.name !== name));
    } else {
      setAdditionalCosts(prev => {
        const existing = prev.find(c => c.name === name);
        if (existing) {
          return prev.map(c => c.name === name ? { ...c, value: numValue } : c);
        }
        return [...prev, { name, value: numValue }];
      });
    }
  };

  const getAdditionalCostValue = (name: string) => {
    return additionalCostInputs[name] ?? '';
  };

  const laborCostValue = (() => {
    const rate = parseFloat(hourlyRate.replace(',', '.'));
    const mins = parseFloat(prepTimeMinutes);
    if (rate > 0 && mins > 0) return Math.round(((rate / 60) * mins) * 100) / 100;
    return 0;
  })();

  const handleSelectSuggestion = async (suggestion: SuggestedRecipe) => {
    if (!requirePremium('smartShoppingList')) return;
    setShowSuggestions(false);
    setApplyingSuggestion(true);
    try {
      setName(suggestion.name);
      setYieldAmount(String(suggestion.yield));
      setProfitMargin(String(suggestion.profitMargin));

      // Reload current ingredients from API to match by name
      const existing = await iApi.getAll();
      const recipeIngredients: RecipeIngredient[] = [];

      for (const si of suggestion.ingredients) {
        const normalizedName = si.name.toLowerCase().trim();
        let found = existing.find(e => e.name.toLowerCase().trim() === normalizedName);
        if (!found) {
          // Auto-create the ingredient
          found = await iApi.create({
            name: si.name,
            purchaseQuantity: si.purchaseQuantity,
            purchasePrice: si.purchasePrice,
            unit: si.unit,
          });
          existing.push(found);
        }
        recipeIngredients.push({
          ingredientId: found.id,
          ingredientName: found.name,
          quantityUsed: si.quantityUsed,
          unit: si.unit,
        });
      }

      setIngredients(recipeIngredients);
      setAvailableIngredients(existing);
      showToast(t('createRecipe.suggestionApplied'), 'success');
    } catch {
      showToast(t('createRecipe.suggestionError'), 'error');
    } finally {
      setApplyingSuggestion(false);
    }
  };

  const handleToggleLabor = () => {
    if (!laborExpanded) {
      if (!requirePremium('laborCostCalc')) return;
    }
    setLaborExpanded(!laborExpanded);
  };

  const handleShowConfirmation = () => {
    if (!validate()) return;
    if (!isEditing && !checkLimit('recipes', recipeCount)) return;
    setShowConfirmModal(true);
  };

  const getFinalCosts = () => {
    let finalCosts = additionalCosts.filter(c => c.name !== 'Mão de obra (profissional)');
    if (laborCostValue > 0) {
      finalCosts = [...finalCosts, { name: 'Mão de obra (profissional)', value: laborCostValue }];
    }
    return finalCosts;
  };

  const handleConfirmSave = async () => {
    setShowConfirmModal(false);
    setLoading(true);
    try {
      const payload = {
        name: name.trim(),
        yield: parseInt(yieldAmount),
        profitMargin: parseFloat(profitMargin) || 30,
        ingredients,
        additionalCosts: getFinalCosts(),
        subRecipes,
      };
      if (isEditing) {
        await rApi.update(recipeId!, payload);
        showToast(t('createRecipe.updated'), 'success');
        navigation.goBack();
      } else {
        const recipe = await rApi.create(payload);
        clearDraft();
        showToast(t('createRecipe.created'), 'success');
        navigation.replace('RecipeDetail', { recipeId: recipe.id });
      }
    } catch (error) {
      const err = error as Error & { code?: string; current?: number };
      if (err.code === 'RECIPE_LIMIT') {
        openPaywall({
          kind: 'limit',
          feature: 'recipes',
          current: err.current ?? recipeCount,
        });
        return;
      }
      const msg = err.message || t('createRecipe.saveError');
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  // ─── Design tokens ───
  const INK = '#3D2233';
  const INK2 = '#9A7E8C';
  const INK3 = '#C4B0BB';
  const PINK = '#EA4B92';
  const CREAM2 = '#FFF6F0';
  const LINE2 = '#F1E2DA';
  const SH = { shadowColor: INK, shadowOffset: { width: 0, height: 2 } as const, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 };

  if (loadingData) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: CREAM2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10 }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...SH }}>
            <Ionicons name="arrow-back" size={20} color={INK} />
          </TouchableOpacity>
          <Text style={{ flex: 1, fontSize: 22, fontWeight: '700', color: INK }}>Editar receita</Text>
        </View>
        <View style={styles.skeletonContainer}>
          {/* Form fields skeleton */}
          <View style={styles.skeletonFormCard}>
            <Skeleton width={100} height={14} borderRadius={4} />
            <Skeleton width="100%" height={44} borderRadius={10} style={{ marginTop: 8 }} />
            <View style={styles.skeletonFormRow}>
              <View style={{ flex: 1 }}>
                <Skeleton width={80} height={14} borderRadius={4} />
                <Skeleton width="100%" height={44} borderRadius={10} style={{ marginTop: 8 }} />
              </View>
              <View style={{ flex: 1 }}>
                <Skeleton width={100} height={14} borderRadius={4} />
                <Skeleton width="100%" height={44} borderRadius={10} style={{ marginTop: 8 }} />
              </View>
            </View>
          </View>
          {/* Ingredients section skeleton */}
          <View style={styles.skeletonFormCard}>
            <Skeleton width={120} height={16} borderRadius={6} />
            {[0, 1, 2].map(i => (
              <View key={i} style={styles.skeletonFormItem}>
                <Skeleton width={24} height={24} borderRadius={6} />
                <Skeleton width={120} height={14} borderRadius={4} style={{ marginLeft: 10 }} />
                <View style={{ flex: 1 }} />
                <Skeleton width={50} height={14} borderRadius={4} />
              </View>
            ))}
            <Skeleton width={100} height={36} borderRadius={10} style={{ marginTop: 8 }} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: CREAM2 }}>
      {/* ── Header ── */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...SH }}>
          <Ionicons name="arrow-back" size={20} color={INK} />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 22, fontWeight: '700', color: INK }}>{isEditing ? 'Editar receita' : 'Nova receita'}</Text>
        <TouchableOpacity onPress={handleShowConfirmation} disabled={loading} activeOpacity={0.8}
          style={{ height: 38, paddingHorizontal: 14, borderRadius: 12, backgroundColor: PINK, alignItems: 'center', justifyContent: 'center', ...SH, shadowColor: PINK, shadowOpacity: 0.3 }}>
          {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13.5 }}>Salvar</Text>}
        </TouchableOpacity>
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView style={{ flex: 1, paddingHorizontal: 18 }} showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingTop: 14, paddingBottom: 40, gap: 14 }}>

          {/* ── Info banner ── */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 13, backgroundColor: '#EEF8FD', borderWidth: 1, borderColor: '#DCF1FB', borderRadius: 20, padding: 15 }}>
            <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="information-circle" size={18} color="#2BA7DD" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: INK }}>Preencha os dados</Text>
              <Text style={{ fontSize: 12, color: INK2, fontWeight: '500', marginTop: 2 }}>O preço sugerido é calculado automaticamente.</Text>
              <TouchableOpacity
                onPress={() => Alert.alert('Tutorial', PRICING_TUTORIAL)}
                activeOpacity={0.8}
                style={styles.tutorialButton}
              >
                <Text style={styles.tutorialButtonText}>Ver tutorial</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Dados básicos ── */}
          <Text style={{ fontSize: 16, fontWeight: '700', color: INK, marginLeft: 2 }}>Dados básicos</Text>
          <View style={{ gap: 7 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: INK, marginLeft: 2 }}>Nome da receita</Text>
            <View style={{ backgroundColor: '#fff', borderRadius: 14, padding: 14, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', gap: 10, ...SH }}>
              <Ionicons name="cafe-outline" size={18} color={INK3} />
              <TextInput style={{ flex: 1, fontSize: 15, color: INK, padding: 0 }} value={name} onChangeText={(text) => { setName(text); setShowSuggestions(false); }}
                placeholder="Ex: Bolo de Chocolate" placeholderTextColor={INK3} />
            </View>
            {errors.name && <Text style={{ fontSize: 12, color: colors.error, marginLeft: 2 }}>{errors.name}</Text>}

            {/* ── Sugestões de receitas ── */}
            {!isEditing && (
              <TouchableOpacity
                onPress={() => setShowSuggestions(!showSuggestions)}
                style={styles.suggestionsToggle}
                activeOpacity={0.7}
              >
                <Ionicons name="sparkles" size={16} color={isPremium ? colors.primary : colors.textMuted} />
                <Text style={[styles.suggestionsToggleText, !isPremium && { color: colors.textMuted }]}>
                  {t('createRecipe.suggestions')}
                </Text>
                {!isPremium && (
                  <View style={styles.premiumBadge}>
                    <Ionicons name="lock-closed" size={10} color="#fff" />
                    <Text style={styles.premiumBadgeText}>Premium</Text>
                  </View>
                )}
                <Ionicons
                  name={showSuggestions ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={isPremium ? colors.primary : colors.textMuted}
                />
              </TouchableOpacity>
            )}
            {showSuggestions && (
              <View style={styles.suggestionsContainer}>
                {applyingSuggestion ? (
                  <View style={styles.suggestionsLoading}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={styles.suggestionsLoadingText}>{t('createRecipe.preparingRecipe')}</Text>
                  </View>
                ) : (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.suggestionsScroll}
                  >
                    {SUGGESTED_RECIPES.map((recipe) => (
                      <TouchableOpacity
                        key={recipe.name}
                        onPress={() => handleSelectSuggestion(recipe)}
                        style={styles.suggestionChip}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.suggestionChipName}>{recipe.name}</Text>
                        <Text style={styles.suggestionChipInfo}>
                          {recipe.ingredients.length} ingr. · {recipe.yield} un
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </View>
            )}
          </View>
          <View style={{ gap: 7 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: INK, marginLeft: 2 }}>Rendimento</Text>
            <View style={{ backgroundColor: '#fff', borderRadius: 14, padding: 14, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', gap: 10, ...SH }}>
              <TextInput style={{ flex: 1, fontSize: 15, color: INK, padding: 0 }} value={yieldAmount} onChangeText={setYieldAmount}
                placeholder="12" placeholderTextColor={INK3} keyboardType="number-pad" />
              <Text style={{ color: INK2, fontWeight: '700', fontSize: 13 }}>unidades</Text>
            </View>
            {errors.yield && <Text style={{ fontSize: 12, color: colors.error, marginLeft: 2 }}>{errors.yield}</Text>}
          </View>

          {/* ── Margem de lucro (3-col grid) ── */}
          <View style={{ gap: 7 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: INK, marginLeft: 2 }}>Margem de lucro</Text>
            <View style={{ flexDirection: 'row', gap: 9 }}>
              {MARGIN_PRESETS.slice(0, 3).map(preset => {
                const selected = String(preset.value) === profitMargin || Number(profitMargin) === preset.value;
                return (
                  <TouchableOpacity key={preset.value} onPress={() => setProfitMargin(String(preset.value))} activeOpacity={0.8}
                    style={{ flex: 1, backgroundColor: selected ? '#FFF0F6' : '#fff', borderRadius: 14, padding: 11, alignItems: 'center', borderWidth: 2, borderColor: selected ? PINK : 'transparent', ...SH }}>
                    <Text style={{ fontSize: 19, fontWeight: '800', color: PINK, lineHeight: 22 }}>{preset.value}%</Text>
                    <Text style={{ fontSize: 10.5, color: INK2, fontWeight: '600', marginTop: 3 }}>{preset.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={{ flexDirection: 'row', gap: 9 }}>
              {MARGIN_PRESETS.slice(3).map(preset => {
                const selected = String(preset.value) === profitMargin || Number(profitMargin) === preset.value;
                return (
                  <TouchableOpacity key={preset.value} onPress={() => setProfitMargin(String(preset.value))} activeOpacity={0.8}
                    style={{ flex: 1, backgroundColor: selected ? '#FFF0F6' : '#fff', borderRadius: 14, padding: 11, alignItems: 'center', borderWidth: 2, borderColor: selected ? PINK : 'transparent', ...SH }}>
                    <Text style={{ fontSize: 19, fontWeight: '800', color: PINK, lineHeight: 22 }}>{preset.value}%</Text>
                    <Text style={{ fontSize: 10.5, color: INK2, fontWeight: '600', marginTop: 3 }}>{preset.label}</Text>
                  </TouchableOpacity>
                );
              })}
              <View style={{ flex: 1 }} />
            </View>
          </View>

          {/* ── Ingredientes (.gcard) ── */}
          <Text style={{ fontSize: 16, fontWeight: '700', color: INK, marginLeft: 2 }}>Ingredientes</Text>
          {ingredients.length > 0 && (
            <View style={{ backgroundColor: '#fff', borderRadius: 18, overflow: 'hidden', ...SH }}>
              {ingredients.map((ing, i) => (
                <View key={ing.ingredientId} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13, paddingHorizontal: 15, ...(i > 0 ? { borderTopWidth: 1, borderTopColor: LINE2 } : {}) }}>
                  <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: ['#5E3A23','#E8C98E','#F4C95D','#90BE6D','#7B68EE','#FF6B6B'][i % 6], alignItems: 'center', justifyContent: 'center' }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14.5, fontWeight: '700', color: INK }}>{ing.ingredientName}</Text>
                    <Text style={{ fontSize: 12, color: INK2, fontWeight: '500' }}>{ing.quantityUsed} {ing.unit}</Text>
                  </View>
                  <TouchableOpacity onPress={() => removeIngredient(ing.ingredientId)}>
                    <Ionicons name="close-circle" size={20} color="#C0392B" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
          {errors.ingredients && <Text style={{ fontSize: 12, color: colors.error, marginLeft: 2 }}>{errors.ingredients}</Text>}
          <TouchableOpacity onPress={() => setShowIngredientModal(true)} activeOpacity={0.7}
            style={{ borderWidth: 2, borderStyle: 'dashed', borderColor: '#FFE3EF', borderRadius: 14, padding: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Ionicons name="add" size={18} color={PINK} />
            <Text style={{ color: PINK, fontWeight: '700', fontSize: 14 }}>Adicionar ingrediente</Text>
          </TouchableOpacity>

          {/* ── Sub-receitas ── */}
          <Text style={{ fontSize: 16, fontWeight: '700', color: INK, marginLeft: 2 }}>Receitas para juntar</Text>
          {subRecipes.length > 0 && (
            <View style={{ backgroundColor: '#fff', borderRadius: 18, overflow: 'hidden', ...SH }}>
              {subRecipes.map((sub, i) => (
                <View key={sub.subRecipeId} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13, paddingHorizontal: 15, ...(i > 0 ? { borderTopWidth: 1, borderTopColor: LINE2 } : {}) }}>
                  <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#EA4B9222', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="restaurant-outline" size={18} color={PINK} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14.5, fontWeight: '700', color: INK }}>{sub.subRecipeName}</Text>
                    <Text style={{ fontSize: 12, color: INK2, fontWeight: '500' }}>{sub.quantityUsed} {sub.unit}</Text>
                  </View>
                  <TouchableOpacity onPress={() => removeSubRecipe(sub.subRecipeId)}>
                    <Ionicons name="close-circle" size={20} color="#C0392B" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
          <TouchableOpacity onPress={() => setShowSubRecipeModal(true)} activeOpacity={0.7}
            style={{ borderWidth: 2, borderStyle: 'dashed', borderColor: '#FFE3EF', borderRadius: 14, padding: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Ionicons name="add" size={18} color={PINK} />
            <Text style={{ color: PINK, fontWeight: '700', fontSize: 14 }}>Adicionar receita para juntar</Text>
          </TouchableOpacity>

          {/* ── Custos adicionais (.gcard) ── */}
          <Text style={{ fontSize: 16, fontWeight: '700', color: INK, marginLeft: 2 }}>Custos adicionais</Text>
          <View style={{ backgroundColor: '#fff', borderRadius: 18, overflow: 'hidden', ...SH }}>
            {localizedAdditionalCosts.map((cost, i) => (
              <View key={cost.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13, paddingHorizontal: 15, ...(i > 0 ? { borderTopWidth: 1, borderTopColor: LINE2 } : {}) }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14.5, fontWeight: '600', color: INK }}>{cost.name}</Text>
                </View>
                <TextInput
                  style={{ fontSize: 15, fontWeight: '700', color: INK2, textAlign: 'right', minWidth: 70, padding: 0 }}
                  value={getAdditionalCostValue(cost.name)}
                  onChangeText={val => updateAdditionalCost(cost.name, val)}
                  placeholder="R$ 0,00"
                  placeholderTextColor={INK3}
                  keyboardType="decimal-pad"
                />
              </View>
            ))}
          </View>

          {/* ── Save button ── */}
          <TouchableOpacity onPress={handleShowConfirmation} disabled={loading} activeOpacity={0.85}>
            <View style={{ height: 54, borderRadius: 16, backgroundColor: PINK, alignItems: 'center', justifyContent: 'center', ...SH, shadowColor: PINK, shadowOpacity: 0.35 }}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>{isEditing ? 'Atualizar receita' : 'Salvar receita'}</Text>}
            </View>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={showIngredientModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('createRecipe.selectIngredient')}</Text>
            <TouchableOpacity onPress={() => setShowIngredientModal(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {selectedIngredient ? (
            <View style={styles.modalContent}>
              <Card style={styles.selectedIngCard}>
                <Text style={styles.selectedIngName}>{selectedIngredient.name}</Text>
                <Text style={styles.selectedIngInfo}>
                  {selectedIngredient.purchaseUnitLabel
                    ? t('createRecipe.purchased', { qty: selectedIngredient.purchaseQuantity, unit: selectedIngredient.purchaseUnitLabel, price: selectedIngredient.purchasePrice.toFixed(2) })
                      + ` (${selectedIngredient.purchaseQuantity * (selectedIngredient.purchaseUnitWeight ?? 0)} ${selectedIngredient.unit})`
                    : t('createRecipe.purchased', { qty: selectedIngredient.purchaseQuantity, unit: selectedIngredient.unit, price: selectedIngredient.purchasePrice.toFixed(2) })}
                </Text>
              </Card>
              <Input
                label={t('createRecipe.quantityUsed', { unit: ingredientUnit || selectedIngredient.unit })}
                placeholder="0"
                value={ingredientQuantity}
                onChangeText={setIngredientQuantity}
                keyboardType="decimal-pad"
                suffix={ingredientUnit || selectedIngredient.unit}
              />
              {getCompatibleUnits(selectedIngredient).length > 1 && (
                <View style={styles.unitSelector}>
                  {getCompatibleUnits(selectedIngredient).map(u => (
                    <TouchableOpacity
                      key={u}
                      onPress={() => setIngredientUnit(u)}
                      style={[
                        styles.unitBtn,
                        (ingredientUnit || selectedIngredient.unit) === u && styles.unitBtnSelected,
                      ]}
                    >
                      <Text style={[
                        styles.unitBtnText,
                        (ingredientUnit || selectedIngredient.unit) === u && styles.unitBtnTextSelected,
                      ]}>{u}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              <View style={styles.modalActions}>
                <Button
                  title={t('common.back')}
                  variant="outline"
                  onPress={() => { setSelectedIngredient(null); setIngredientUnit(''); }}
                  style={{ flex: 1, marginRight: 8 }}
                />
                <Button
                  title={t('common.add')}
                  onPress={addIngredient}
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          ) : (
            <FlatList
              data={availableIngredients}
              keyExtractor={item => item.id}
              contentContainerStyle={{ padding: 20 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => { setSelectedIngredient(item); setIngredientUnit(getDefaultUnit(item)); }}
                  activeOpacity={0.8}
                >
                  <Card style={styles.modalIngCard}>
                    <View>
                      <Text style={styles.modalIngName}>{item.name}</Text>
                      <Text style={styles.modalIngInfo}>
                        {item.purchaseUnitLabel
                          ? `${item.purchaseQuantity} ${item.purchaseUnitLabel} (${item.purchaseQuantity * (item.purchaseUnitWeight ?? 0)} ${item.unit})`
                          : `${item.purchaseQuantity} ${item.unit}`} — R$ {item.purchasePrice.toFixed(2)}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                  </Card>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={styles.emptyText}>{t('createRecipe.noIngredientRegistered')}</Text>
              }
            />
          )}
        </SafeAreaView>
      </Modal>

      {/* Sub-Recipe Selection Modal */}
      <Modal visible={showSubRecipeModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('createRecipe.selectSubRecipe')}</Text>
            <TouchableOpacity onPress={() => { setShowSubRecipeModal(false); setSelectedSubRecipe(null); setSubRecipeQuantity(''); setSubRecipeUnit('un'); }}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {selectedSubRecipe ? (
            <View style={styles.modalContent}>
              <Card style={styles.selectedIngCard}>
                <Text style={styles.selectedIngName}>{selectedSubRecipe.name}</Text>
                <Text style={styles.selectedIngInfo}>
                  {t('createRecipe.yield')}: {selectedSubRecipe.yield} un
                </Text>
              </Card>
              <Input
                label={t('createRecipe.subRecipeQuantity')}
                placeholder="0"
                value={subRecipeQuantity}
                onChangeText={setSubRecipeQuantity}
                keyboardType="decimal-pad"
                suffix={subRecipeUnit}
              />
              <View style={styles.unitSelector}>
                {['un', 'g', 'kg', 'ml', 'l'].map(u => (
                  <TouchableOpacity
                    key={u}
                    onPress={() => setSubRecipeUnit(u)}
                    style={[
                      styles.unitBtn,
                      subRecipeUnit === u && styles.unitBtnSelected,
                    ]}
                  >
                    <Text style={[
                      styles.unitBtnText,
                      subRecipeUnit === u && styles.unitBtnTextSelected,
                    ]}>{u}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.modalActions}>
                <Button
                  title={t('common.back')}
                  variant="outline"
                  onPress={() => { setSelectedSubRecipe(null); setSubRecipeQuantity(''); setSubRecipeUnit('un'); }}
                  style={{ flex: 1, marginRight: 8 }}
                />
                <Button
                  title={t('common.add')}
                  onPress={addSubRecipe}
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          ) : (
            <FlatList
              data={availableRecipes.filter(r => r.id !== recipeId && !subRecipes.some(s => s.subRecipeId === r.id))}
              keyExtractor={item => item.id}
              contentContainerStyle={{ padding: 20 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => setSelectedSubRecipe(item)}
                  activeOpacity={0.8}
                >
                  <Card style={styles.modalIngCard}>
                    <View>
                      <Text style={styles.modalIngName}>{item.name}</Text>
                      <Text style={styles.modalIngInfo}>
                        {t('createRecipe.yield')}: {item.yield} un · {item.ingredients.length} ingr.
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                  </Card>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={styles.emptyText}>{t('createRecipe.noRecipesAvailable')}</Text>
              }
            />
          )}
        </SafeAreaView>
      </Modal>

      {/* Confirmation Modal */}
      <Modal visible={showConfirmModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('common.confirmData')}</Text>
            <TouchableOpacity onPress={() => setShowConfirmModal(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.confirmContent} showsVerticalScrollIndicator={false}>
            <Card style={styles.confirmCard}>
              <Text style={styles.confirmSectionTitle}>{t('createRecipe.recipe')}</Text>
              <View style={styles.confirmRow}>
                <Text style={styles.confirmLabel}>{t('common.name')}</Text>
                <Text style={styles.confirmValue}>{name.trim()}</Text>
              </View>
              <View style={styles.confirmRow}>
                <Text style={styles.confirmLabel}>{t('createRecipe.yield')}</Text>
                <Text style={styles.confirmValue}>{yieldAmount} un</Text>
              </View>
              <View style={styles.confirmRow}>
                <Text style={styles.confirmLabel}>{t('createRecipe.profitMargin')}</Text>
                <Text style={styles.confirmValue}>{profitMargin}%</Text>
              </View>
            </Card>

            <Card style={styles.confirmCard}>
              <Text style={styles.confirmSectionTitle}>
                Ingredientes ({ingredients.length})
              </Text>
              {ingredients.map((ing, idx) => (
                <View key={idx} style={styles.confirmRow}>
                  <Text style={styles.confirmLabel}>{ing.ingredientName}</Text>
                  <Text style={styles.confirmValueHighlight}>
                    {ing.quantityUsed} {ing.unit}
                  </Text>
                </View>
              ))}
            </Card>

            {subRecipes.length > 0 && (
              <Card style={styles.confirmCard}>
                <Text style={styles.confirmSectionTitle}>
                  {t('createRecipe.subRecipesSection')} ({subRecipes.length})
                </Text>
                {subRecipes.map((sub, idx) => (
                  <View key={idx} style={styles.confirmRow}>
                    <Text style={styles.confirmLabel}>{sub.subRecipeName}</Text>
                    <Text style={styles.confirmValueHighlight}>
                      {sub.quantityUsed} {sub.unit || 'un'}
                    </Text>
                  </View>
                ))}
              </Card>
            )}

            {getFinalCosts().length > 0 && (
              <Card style={styles.confirmCard}>
                <Text style={styles.confirmSectionTitle}>{t('createRecipe.additionalCosts')}</Text>
                {getFinalCosts().map((c, idx) => (
                  <View key={idx} style={styles.confirmRow}>
                    <Text style={styles.confirmLabel}>{c.name}</Text>
                    <Text style={styles.confirmValueHighlight}>
                      R$ {c.value.toFixed(2)}
                    </Text>
                  </View>
                ))}
              </Card>
            )}

            <View style={styles.confirmActions}>
              <Button
                title={t('common.backAndFix')}
                variant="outline"
                onPress={() => setShowConfirmModal(false)}
                style={{ flex: 1, marginRight: 8 }}
              />
              <Button
                title={t('common.confirm')}
                onPress={handleConfirmSave}
                loading={loading}
                style={{ flex: 1 }}
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
      {/* Modal de confirmação de ingrediente */}
      <Modal visible={!!ingredientConfirm} transparent animationType="fade">
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmBox}>
            {ingredientConfirm?.type === 'warning-high' && (
              <View style={[styles.confirmIconCircle, { backgroundColor: '#FFF3E0' }]}>
                <Ionicons name="alert-circle" size={32} color="#FF9800" />
              </View>
            )}
            {ingredientConfirm?.type === 'warning-low' && (
              <View style={[styles.confirmIconCircle, { backgroundColor: '#FFF3E0' }]}>
                <Ionicons name="alert-circle" size={32} color="#FF9800" />
              </View>
            )}
            {ingredientConfirm?.type === 'confirm' && (
              <View style={[styles.confirmIconCircle, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="checkmark-circle" size={32} color={colors.primary} />
              </View>
            )}

            <Text style={styles.confirmTitle}>
              {ingredientConfirm?.type === 'confirm'
                ? t('createRecipe.confirmIngredient')
                : ingredientConfirm?.type === 'warning-high'
                  ? t('createRecipe.highQuantityTitle')
                  : t('createRecipe.lowQuantityTitle')}
            </Text>

            <View style={styles.confirmDetails}>
              <View style={styles.confirmDetailRow}>
                <Text style={styles.confirmDetailLabel}>{t('createRecipe.ingredientLabel')}</Text>
                <Text style={styles.confirmDetailValue}>{ingredientConfirm?.name}</Text>
              </View>
              <View style={styles.confirmDivider} />
              <View style={styles.confirmDetailRow}>
                <Text style={styles.confirmDetailLabel}>{t('createRecipe.quantityLabel')}</Text>
                <Text style={styles.confirmDetailValue}>{ingredientConfirm?.qty} {ingredientConfirm?.unit}</Text>
              </View>
              <View style={styles.confirmDivider} />
              <View style={styles.confirmDetailRow}>
                <Text style={styles.confirmDetailLabel}>{t('createRecipe.purchasedLabel')}</Text>
                <Text style={styles.confirmDetailValue}>{ingredientConfirm?.pkgInfo}</Text>
              </View>
              <View style={styles.confirmDivider} />
              <View style={styles.confirmDetailRow}>
                <Text style={styles.confirmDetailLabel}>{t('createRecipe.estimatedCost')}</Text>
                <Text style={[styles.confirmDetailValue, { color: colors.primary, fontWeight: '800' }]}>
                  R$ {ingredientConfirm?.cost?.toFixed(2).replace('.', ',')}
                </Text>
              </View>
            </View>

            {ingredientConfirm?.type === 'warning-high' && (
              <View style={styles.confirmWarningBox}>
                <Ionicons name="warning" size={16} color="#E65100" />
                <Text style={styles.confirmWarningText}>
                  {t('createRecipe.highQuantityWarning', { ratio: ingredientConfirm.ratio })}
                </Text>
              </View>
            )}

            {ingredientConfirm?.type === 'warning-low' && (
              <View style={styles.confirmWarningBox}>
                <Ionicons name="warning" size={16} color="#E65100" />
                <Text style={styles.confirmWarningText}>
                  {t('createRecipe.lowQuantityWarning')}
                </Text>
              </View>
            )}

            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={styles.confirmCancelBtn}
                onPress={() => { setIngredientConfirm(null); setShowIngredientModal(true); }}
                activeOpacity={0.8}
              >
                <Text style={styles.confirmCancelText}>
                  {ingredientConfirm?.type === 'confirm' ? t('common.cancel') : t('createRecipe.fix')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmAddBtn, ingredientConfirm?.type !== 'confirm' && { backgroundColor: '#FF9800' }]}
                onPress={() => {
                  setIngredientConfirm(null);
                  confirmAndAddIngredient();
                }}
                activeOpacity={0.8}
              >
                <Ionicons name={ingredientConfirm?.type === 'confirm' ? 'add-circle' : 'checkmark'} size={18} color="#fff" />
                <Text style={styles.confirmAddText}>
                  {ingredientConfirm?.type === 'confirm' ? t('common.add') : t('createRecipe.yesCorrect')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, padding: 20 },
  section: { marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { ...typography.h4, color: colors.text, marginBottom: 16 },
  sectionSubtitle: { ...typography.caption, color: colors.textSecondary, marginTop: -12, marginBottom: 12 },
  row: { flexDirection: 'row' },
  addIngBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 4,
  },
  addIngBtnText: { ...typography.bodySmall, color: '#fff', fontWeight: '600' },
  errorText: { ...typography.caption, color: colors.error, marginBottom: 8 },
  emptyIngredients: { alignItems: 'center', padding: 24, gap: 8 },
  emptyText: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  ingredientInfo: { flex: 1 },
  ingredientName: { ...typography.body, color: colors.text },
  ingredientQty: { ...typography.caption, color: colors.textSecondary },
  saveButton: { marginBottom: 32 },
  marginLabel: { ...typography.bodySmall, color: colors.textSecondary, fontWeight: '600', marginBottom: 10 },
  marginGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  marginCard: {
    flex: 1,
    minWidth: 56,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.cream,
    gap: 2,
  },
  marginCardSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  marginEmoji: { fontSize: 16 },
  marginValue: { ...typography.h4, color: colors.textSecondary },
  marginValueSelected: { color: colors.primary },
  marginCardLabel: { ...typography.caption, color: colors.textMuted, textAlign: 'center' },
  marginCardLabelSelected: { color: colors.primary, fontWeight: '600' },
  marginDesc: { ...typography.caption, color: colors.textSecondary, marginBottom: 4 },
  modalContainer: { flex: 1, backgroundColor: colors.background },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  modalTitle: { ...typography.h3, color: colors.text },
  modalContent: { padding: 20 },
  selectedIngCard: { marginBottom: 16, backgroundColor: colors.beige },
  selectedIngName: { ...typography.h4, color: colors.text },
  selectedIngInfo: { ...typography.bodySmall, color: colors.textSecondary, marginTop: 4 },
  unitSelector: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  unitBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.cream,
  },
  unitBtnSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  unitBtnText: { ...typography.body, color: colors.textSecondary, fontWeight: '600' },
  unitBtnTextSelected: { color: colors.primary },
  modalActions: { flexDirection: 'row', marginTop: 8 },
  modalIngCard: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  modalIngName: { ...typography.body, color: colors.text },
  modalIngInfo: { ...typography.bodySmall, color: colors.textSecondary, marginTop: 2 },
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
  tutorialButton: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 9,
    backgroundColor: '#E9F7FD',
  },
  tutorialButtonText: {
    color: '#1689B5',
    fontWeight: '700',
    fontSize: 12,
  },
  costInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  costIcon: {
    marginTop: 32,
    marginRight: 8,
  },
  costInputWrapper: {
    flex: 1,
  },
  costHint: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: -8,
    marginBottom: 12,
    marginLeft: 26,
    lineHeight: 16,
  },
  suggestionsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    marginBottom: 4,
  },
  suggestionsToggleText: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '600',
    flex: 1,
  },
  suggestionsContainer: {
    marginBottom: 8,
  },
  suggestionsScroll: {
    gap: 8,
    paddingVertical: 4,
  },
  suggestionChip: {
    backgroundColor: colors.cream,
    borderWidth: 1.5,
    borderColor: colors.primaryLight,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 130,
  },
  suggestionChipName: {
    ...typography.bodySmall,
    color: colors.text,
    fontWeight: '700',
  },
  suggestionChipInfo: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  suggestionsLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  suggestionsLoadingText: {
    ...typography.bodySmall,
    color: colors.primary,
  },
  laborHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 0,
  },
  laborHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  laborHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.primary,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  premiumBadgeText: { fontSize: 10, fontWeight: '800' as const, color: '#fff' },
  laborContent: { marginTop: 16 },
  laborDesc: { ...typography.caption, color: colors.textSecondary, marginBottom: 12, lineHeight: 18 },
  laborResult: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.cream,
    borderRadius: 12,
    padding: 12,
    marginTop: 4,
  },
  laborResultText: { ...typography.body, color: colors.primary, fontWeight: '700' as const },
  confirmContent: { padding: 20 },
  confirmCard: { marginBottom: 12 },
  confirmSectionTitle: { ...typography.h4, color: colors.text, marginBottom: 12 },
  confirmRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  confirmLabel: { ...typography.body, color: colors.textSecondary, flex: 1 },
  confirmValue: { ...typography.body, color: colors.text, fontWeight: '600' as const, textAlign: 'right' as const },
  confirmValueHighlight: { ...typography.body, color: colors.primary, fontWeight: '700' as const, textAlign: 'right' as const },
  confirmActions: { flexDirection: 'row', marginTop: 8, marginBottom: 32 },
  // Ingredient confirm modal
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  confirmBox: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  confirmIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  confirmTitle: {
    ...typography.h3,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  confirmDetails: {
    width: '100%',
    backgroundColor: colors.background,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  confirmDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  confirmDetailLabel: {
    ...typography.bodySmall,
    color: colors.textMuted,
  },
  confirmDetailValue: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
    marginLeft: 12,
  },
  confirmDivider: {
    height: 1,
    backgroundColor: colors.border,
  },
  confirmWarningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF3E0',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    width: '100%',
  },
  confirmWarningText: {
    ...typography.bodySmall,
    color: '#E65100',
    flex: 1,
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    marginTop: 4,
  },
  confirmCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmCancelText: {
    ...typography.button,
    color: colors.textSecondary,
    fontSize: 14,
  },
  confirmAddBtn: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  confirmAddText: {
    ...typography.button,
    color: '#fff',
    fontSize: 14,
  },
  skeletonContainer: {
    padding: 20,
    gap: 14,
  },
  skeletonFormCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 4,
  },
  skeletonFormRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  skeletonFormItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
});
