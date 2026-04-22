import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
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
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { recipeApi } from '../../data/api/recipeApi';
import { ingredientApi } from '../../data/api/ingredientApi';
import { isDemoMode } from '../../data/demo/demoMode';
import { demoRecipeApi, demoIngredientApi } from '../../data/demo/demoApi';
import { Ingredient } from '../../domain/entities/Ingredient';
import { RecipeIngredient, AdditionalCost } from '../../domain/entities/Recipe';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Card } from '../components/Card';
import { Header } from '../components/Header';
import { useToast } from '../context/ToastContext';
import { usePaywall } from '../premium/usePaywall';
import { usePremium } from '../context/PremiumContext';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'EditRecipe'>;

const DEFAULT_ADDITIONAL_COSTS = ['Embalagem', 'Gas', 'Energia', 'Mao de obra'];

const MARGIN_PRESETS = [
  { value: 30,  label: 'Básico',      emoji: '🟢', desc: 'Cobre custos, lucro baixo' },
  { value: 50,  label: 'Equilibrado', emoji: '🟡', desc: 'Padrão de mercado' },
  { value: 70,  label: 'Recomendado', emoji: '⭐', desc: 'Ideal para a maioria dos doces' },
  { value: 100, label: 'Lucrativo',   emoji: '🔥', desc: 'Mais lucro por unidade' },
  { value: 150, label: 'Premium',     emoji: '💎', desc: 'Gourmet / personalizado' },
];

export const CreateRecipeScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const recipeId = (route.params as any)?.recipeId as string | undefined;
  const isEditing = !!recipeId;

  const [name, setName] = useState('');
  const [yieldAmount, setYieldAmount] = useState('');
  const [profitMargin, setProfitMargin] = useState('30');
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);
  const [additionalCosts, setAdditionalCosts] = useState<AdditionalCost[]>([]);
  const [availableIngredients, setAvailableIngredients] = useState<Ingredient[]>([]);
  const [showIngredientModal, setShowIngredientModal] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null);
  const [ingredientQuantity, setIngredientQuantity] = useState('');
  const [ingredientUnit, setIngredientUnit] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(isEditing);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [recipeCount, setRecipeCount] = useState(0);
  const [laborExpanded, setLaborExpanded] = useState(false);
  const [hourlyRate, setHourlyRate] = useState('');
  const [prepTimeMinutes, setPrepTimeMinutes] = useState('');
  const { showToast } = useToast();
  const { checkLimit, openPaywall, requirePremium } = usePaywall();
  const { isPremium } = usePremium();
  const rApi = isDemoMode() ? demoRecipeApi : recipeApi;
  const iApi = isDemoMode() ? demoIngredientApi : ingredientApi;

  useEffect(() => {
    iApi.getAll().then(setAvailableIngredients).catch(() => {});
    if (!isEditing) {
      rApi.getAll().then(list => setRecipeCount(list.length)).catch(() => {});
    }
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
        // Restore labor cost fields if present
        const laborCost = recipe.additionalCosts.find(c => c.name === 'Mão de obra (profissional)');
        if (laborCost && laborCost.value > 0) {
          setLaborExpanded(true);
        }
      })
      .catch(() => showToast('Não foi possível carregar a receita', 'error'))
      .finally(() => setLoadingData(false));
  }, [recipeId]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Nome e obrigatorio';
    if (!yieldAmount || parseInt(yieldAmount) <= 0)
      newErrors.yield = 'Quantidade deve ser maior que 0';
    if (ingredients.length === 0) newErrors.ingredients = 'Adicione pelo menos um ingrediente';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const getCompatibleUnits = (unit: string): string[] => {
    if (unit === 'g' || unit === 'kg') return ['g', 'kg'];
    if (unit === 'ml' || unit === 'l') return ['ml', 'l'];
    return [unit];
  };

  const getDefaultUnit = (unit: string): string => {
    if (unit === 'kg') return 'g';
    if (unit === 'l') return 'ml';
    return unit;
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
    const qty = parseFloat(ingredientQuantity);
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
    if (!selectedIngredient || !ingredientQuantity || parseFloat(ingredientQuantity) <= 0) return;
    const existing = ingredients.find(i => i.ingredientId === selectedIngredient.id);
    if (existing) {
      showToast('Este ingrediente já foi adicionado', 'warning');
      return;
    }

    const qty = parseFloat(ingredientQuantity);
    const unit = ingredientUnit || selectedIngredient.unit;
    const qtyInPurchaseUnit = convertToSameUnit(qty, unit, selectedIngredient.unit);
    const ratio = qtyInPurchaseUnit / selectedIngredient.purchaseQuantity;

    if (ratio > 3) {
      const pkgCount = ratio.toFixed(1);
      Alert.alert(
        'Quantidade alta',
        `Você está usando ${qty} ${unit} de ${selectedIngredient.name}.\n\nIsso equivale a ${pkgCount}x a embalagem (${selectedIngredient.purchaseQuantity} ${selectedIngredient.unit}).\n\nEstá correto?`,
        [
          { text: 'Corrigir', style: 'cancel' },
          { text: 'Sim, está certo', onPress: confirmAndAddIngredient },
        ]
      );
      return;
    }

    if (ratio < 0.01) {
      Alert.alert(
        'Quantidade muito baixa',
        `Você está usando ${qty} ${unit} de ${selectedIngredient.name}.\n\nIsso é menos de 1% da embalagem (${selectedIngredient.purchaseQuantity} ${selectedIngredient.unit}).\n\nEstá correto?`,
        [
          { text: 'Corrigir', style: 'cancel' },
          { text: 'Sim, está certo', onPress: confirmAndAddIngredient },
        ]
      );
      return;
    }

    confirmAndAddIngredient();
  };

  const removeIngredient = (id: string) => {
    setIngredients(prev => prev.filter(i => i.ingredientId !== id));
  };

  const updateAdditionalCost = (name: string, value: string) => {
    const numValue = parseFloat(value) || 0;
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
    return additionalCosts.find(c => c.name === name)?.value.toString() || '';
  };

  const laborCostValue = (() => {
    const rate = parseFloat(hourlyRate);
    const mins = parseFloat(prepTimeMinutes);
    if (rate > 0 && mins > 0) return Math.round(((rate / 60) * mins) * 100) / 100;
    return 0;
  })();

  const handleToggleLabor = () => {
    if (!laborExpanded) {
      if (!requirePremium('laborCostCalc')) return;
    }
    setLaborExpanded(!laborExpanded);
  };

  const handleSave = async () => {
    if (!validate()) return;
    // Client-side limit check (only when creating new)
    if (!isEditing && !checkLimit('recipes', recipeCount)) {
      return;
    }
    setLoading(true);
    try {
      // Merge labor cost into additionalCosts
      let finalCosts = additionalCosts.filter(c => c.name !== 'Mão de obra (profissional)');
      if (laborCostValue > 0) {
        finalCosts = [...finalCosts, { name: 'Mão de obra (profissional)', value: laborCostValue }];
      }
      const payload = {
        name: name.trim(),
        yield: parseInt(yieldAmount),
        profitMargin: parseFloat(profitMargin) || 30,
        ingredients,
        additionalCosts: finalCosts,
      };
      if (isEditing) {
        await rApi.update(recipeId!, payload);
        showToast('Receita atualizada!', 'success');
        navigation.goBack();
      } else {
        const recipe = await rApi.create(payload);
        showToast('Receita salva! Abrindo precificação...', 'success');
        navigation.replace('RecipeDetail', { recipeId: recipe.id });
      }
    } catch (error) {
      const err = error as Error & { code?: string; current?: number };
      // Server-side fallback: backend enforced the limit
      if (err.code === 'RECIPE_LIMIT') {
        openPaywall({
          kind: 'limit',
          feature: 'recipes',
          current: err.current ?? recipeCount,
        });
        return;
      }
      const msg = err.message || 'Não foi possível salvar a receita';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Header title="Editar Receita" showBack onBack={() => navigation.goBack()} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title={isEditing ? 'Editar Receita' : 'Nova Receita'} showBack onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

          <View style={styles.infoCard}>
            <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
            <Text style={styles.infoText}>
              Preencha os dados da receita, adicione os ingredientes e escolha a margem de lucro. O preco de venda sera calculado automaticamente.
            </Text>
          </View>

          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Informacoes Basicas</Text>
            <Input
              label="Nome da receita *"
              placeholder="Ex: Brigadeiro, Bolo de Pote..."
              value={name}
              onChangeText={setName}
              error={errors.name}
            />
            <Input
              label="Quantidade produzida *"
              placeholder="20"
              value={yieldAmount}
              onChangeText={setYieldAmount}
              keyboardType="number-pad"
              suffix="un"
              error={errors.yield}
            />

            <Text style={styles.marginLabel}>Margem de lucro</Text>
            <View style={styles.marginGrid}>
              {MARGIN_PRESETS.map(preset => {
                const selected = String(preset.value) === profitMargin || Number(profitMargin) === preset.value;
                return (
                  <TouchableOpacity
                    key={preset.value}
                    onPress={() => setProfitMargin(String(preset.value))}
                    style={[styles.marginCard, selected && styles.marginCardSelected]}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.marginEmoji}>{preset.emoji}</Text>
                    <Text style={[styles.marginValue, selected && styles.marginValueSelected]}>
                      {preset.value}%
                    </Text>
                    <Text style={[styles.marginCardLabel, selected && styles.marginCardLabelSelected]}>
                      {preset.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {(() => {
              const preset = MARGIN_PRESETS.find(p => p.value === Number(profitMargin));
              return preset ? (
                <Text style={styles.marginDesc}>{preset.emoji} {preset.desc}</Text>
              ) : null;
            })()}
          </Card>

          <Card style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Ingredientes</Text>
              <TouchableOpacity
                onPress={() => setShowIngredientModal(true)}
                style={styles.addIngBtn}
              >
                <Ionicons name="add" size={20} color="#fff" />
                <Text style={styles.addIngBtnText}>Adicionar</Text>
              </TouchableOpacity>
            </View>
            {errors.ingredients && <Text style={styles.errorText}>{errors.ingredients}</Text>}
            {ingredients.length === 0 ? (
              <View style={styles.emptyIngredients}>
                <Ionicons name="basket-outline" size={32} color={colors.textMuted} />
                <Text style={styles.emptyText}>Nenhum ingrediente adicionado</Text>
              </View>
            ) : (
              ingredients.map(ing => (
                <View key={ing.ingredientId} style={styles.ingredientRow}>
                  <View style={styles.ingredientInfo}>
                    <Text style={styles.ingredientName}>{ing.ingredientName}</Text>
                    <Text style={styles.ingredientQty}>{ing.quantityUsed} {ing.unit}</Text>
                  </View>
                  <TouchableOpacity onPress={() => removeIngredient(ing.ingredientId)}>
                    <Ionicons name="close-circle" size={22} color={colors.error} />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </Card>

          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Custos Adicionais</Text>
            <Text style={styles.sectionSubtitle}>Opcional — adicione valores se aplicavel</Text>
            {DEFAULT_ADDITIONAL_COSTS.map(costName => (
              <Input
                key={costName}
                label={costName}
                placeholder="0,00"
                value={getAdditionalCostValue(costName)}
                onChangeText={val => updateAdditionalCost(costName, val)}
                keyboardType="decimal-pad"
                suffix="R$"
              />
            ))}
          </Card>

          {Platform.OS === 'ios' && (<Card style={styles.section}>
            <TouchableOpacity onPress={handleToggleLabor} style={styles.laborHeader} activeOpacity={0.7}>
              <View style={styles.laborHeaderLeft}>
                <Ionicons name="construct-outline" size={20} color={laborExpanded ? colors.primary : colors.textSecondary} />
                <Text style={styles.sectionTitle}>Custos Profissionais</Text>
              </View>
              <View style={styles.laborHeaderRight}>
                {!isPremium && (
                  <View style={styles.premiumBadge}>
                    <Ionicons name="sparkles" size={10} color="#fff" />
                    <Text style={styles.premiumBadgeText}>Premium</Text>
                  </View>
                )}
                <Ionicons
                  name={laborExpanded ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={colors.textMuted}
                />
              </View>
            </TouchableOpacity>
            {laborExpanded && (
              <View style={styles.laborContent}>
                <Text style={styles.laborDesc}>
                  Calcule o custo da sua mão de obra e inclua no preço da receita automaticamente.
                </Text>
                <View style={styles.row}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Input
                      label="Custo por hora"
                      placeholder="25,00"
                      value={hourlyRate}
                      onChangeText={setHourlyRate}
                      keyboardType="decimal-pad"
                      suffix="R$/h"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Input
                      label="Tempo de preparo"
                      placeholder="120"
                      value={prepTimeMinutes}
                      onChangeText={setPrepTimeMinutes}
                      keyboardType="number-pad"
                      suffix="min"
                    />
                  </View>
                </View>
                {laborCostValue > 0 && (
                  <View style={styles.laborResult}>
                    <Ionicons name="calculator-outline" size={16} color={colors.primary} />
                    <Text style={styles.laborResultText}>
                      Mão de obra: R$ {laborCostValue.toFixed(2)}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </Card>)}

          <Button
            title={isEditing ? 'Atualizar Receita' : 'Salvar Receita'}
            onPress={handleSave}
            loading={loading}
            size="lg"
            style={styles.saveButton}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={showIngredientModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Selecionar Ingrediente</Text>
            <TouchableOpacity onPress={() => setShowIngredientModal(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {selectedIngredient ? (
            <View style={styles.modalContent}>
              <Card style={styles.selectedIngCard}>
                <Text style={styles.selectedIngName}>{selectedIngredient.name}</Text>
                <Text style={styles.selectedIngInfo}>
                  Comprado: {selectedIngredient.purchaseQuantity} {selectedIngredient.unit} por R$ {selectedIngredient.purchasePrice.toFixed(2)}
                </Text>
              </Card>
              <Input
                label={`Quantidade usada na receita (${ingredientUnit || selectedIngredient.unit})`}
                placeholder="0"
                value={ingredientQuantity}
                onChangeText={setIngredientQuantity}
                keyboardType="decimal-pad"
                suffix={ingredientUnit || selectedIngredient.unit}
              />
              {getCompatibleUnits(selectedIngredient.unit).length > 1 && (
                <View style={styles.unitSelector}>
                  {getCompatibleUnits(selectedIngredient.unit).map(u => (
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
                  title="Voltar"
                  variant="outline"
                  onPress={() => { setSelectedIngredient(null); setIngredientUnit(''); }}
                  style={{ flex: 1, marginRight: 8 }}
                />
                <Button
                  title="Adicionar"
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
                  onPress={() => { setSelectedIngredient(item); setIngredientUnit(getDefaultUnit(item.unit)); }}
                  activeOpacity={0.8}
                >
                  <Card style={styles.modalIngCard}>
                    <View>
                      <Text style={styles.modalIngName}>{item.name}</Text>
                      <Text style={styles.modalIngInfo}>
                        {item.purchaseQuantity} {item.unit} — R$ {item.purchasePrice.toFixed(2)}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                  </Card>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={styles.emptyText}>Nenhum ingrediente cadastrado</Text>
              }
            />
          )}
        </SafeAreaView>
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
});
