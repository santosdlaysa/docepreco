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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { recipeApi } from '../../data/api/recipeApi';
import { ingredientApi } from '../../data/api/ingredientApi';
import { Ingredient } from '../../domain/entities/Ingredient';
import { RecipeIngredient, AdditionalCost } from '../../domain/entities/Recipe';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Card } from '../components/Card';
import { Header } from '../components/Header';
import { useToast } from '../context/ToastContext';

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
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(isEditing);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { showToast } = useToast();

  useEffect(() => {
    ingredientApi.getAll().then(setAvailableIngredients).catch(() => {});
  }, []);

  useEffect(() => {
    if (!recipeId) return;
    recipeApi.getById(recipeId)
      .then(recipe => {
        setName(recipe.name);
        setYieldAmount(String(recipe.yield));
        setProfitMargin(String(recipe.profitMargin));
        setIngredients(recipe.ingredients);
        setAdditionalCosts(recipe.additionalCosts);
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

  const addIngredient = () => {
    if (!selectedIngredient || !ingredientQuantity || parseFloat(ingredientQuantity) <= 0) return;
    const existing = ingredients.find(i => i.ingredientId === selectedIngredient.id);
    if (existing) {
      showToast('Este ingrediente já foi adicionado', 'warning');
      return;
    }
    setIngredients(prev => [
      ...prev,
      {
        ingredientId: selectedIngredient.id,
        ingredientName: selectedIngredient.name,
        quantityUsed: parseFloat(ingredientQuantity),
        unit: selectedIngredient.unit,
      },
    ]);
    setSelectedIngredient(null);
    setIngredientQuantity('');
    setShowIngredientModal(false);
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

  const handleSave = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const payload = {
        name: name.trim(),
        yield: parseInt(yieldAmount),
        profitMargin: parseFloat(profitMargin) || 30,
        ingredients,
        additionalCosts,
      };
      if (isEditing) {
        await recipeApi.update(recipeId!, payload);
        showToast('Receita atualizada!', 'success');
        navigation.goBack();
      } else {
        const recipe = await recipeApi.create(payload);
        showToast('Receita salva! Abrindo precificação...', 'success');
        navigation.replace('RecipeDetail', { recipeId: recipe.id });
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Não foi possível salvar a receita';
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
                label={`Quantidade usada na receita (${selectedIngredient.unit})`}
                placeholder="0"
                value={ingredientQuantity}
                onChangeText={setIngredientQuantity}
                keyboardType="decimal-pad"
                suffix={selectedIngredient.unit}
              />
              <View style={styles.modalActions}>
                <Button
                  title="Voltar"
                  variant="outline"
                  onPress={() => setSelectedIngredient(null)}
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
                  onPress={() => setSelectedIngredient(item)}
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
  modalActions: { flexDirection: 'row', marginTop: 8 },
  modalIngCard: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  modalIngName: { ...typography.body, color: colors.text },
  modalIngInfo: { ...typography.bodySmall, color: colors.textSecondary, marginTop: 2 },
});
