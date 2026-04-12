import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { ingredientApi } from '../../data/api/ingredientApi';
import { isDemoMode } from '../../data/demo/demoMode';
import { demoIngredientApi } from '../../data/demo/demoApi';
import { Unit } from '../../domain/entities/Ingredient';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Card } from '../components/Card';
import { Header } from '../components/Header';
import { useToast } from '../context/ToastContext';
import { usePaywall } from '../premium/usePaywall';

const UNITS: { value: Unit; label: string }[] = [
  { value: 'g', label: 'Gramas (g)' },
  { value: 'kg', label: 'Quilos (kg)' },
  { value: 'ml', label: 'Mililitros (ml)' },
  { value: 'l', label: 'Litros (l)' },
  { value: 'unit', label: 'Unidade' },
];

type RouteProps = RouteProp<RootStackParamList, 'EditIngredient'>;

export const CreateIngredientScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProps>();
  const ingredientId = (route.params as any)?.ingredientId as string | undefined;
  const isEditing = !!ingredientId;

  const [name, setName] = useState('');
  const [purchaseQuantity, setPurchaseQuantity] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [unit, setUnit] = useState<Unit>('g');
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(isEditing);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [allNames, setAllNames] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const { showToast } = useToast();
  const { openPaywall } = usePaywall();
  const api = isDemoMode() ? demoIngredientApi : ingredientApi;

  useEffect(() => {
    if (!isEditing) {
      api.getAll()
        .then(list => setAllNames(list.map(i => i.name)))
        .catch(() => {});
    }
  }, [isEditing]);

  const handleNameChange = (text: string) => {
    setName(text);
    if (text.trim().length >= 2) {
      const lower = text.toLowerCase();
      setSuggestions(allNames.filter(n => n.toLowerCase().includes(lower)));
    } else {
      setSuggestions([]);
    }
  };

  const pickSuggestion = (suggestion: string) => {
    setName(suggestion);
    setSuggestions([]);
  };

  useEffect(() => {
    if (!ingredientId) return;
    api.getById(ingredientId)
      .then(ingredient => {
        setName(ingredient.name);
        setPurchaseQuantity(String(ingredient.purchaseQuantity));
        setPurchasePrice(String(ingredient.purchasePrice));
        setUnit(ingredient.unit);
      })
      .catch(() => showToast('Não foi possível carregar o ingrediente', 'error'))
      .finally(() => setLoadingData(false));
  }, [ingredientId]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Nome e obrigatorio';
    if (!purchaseQuantity || parseFloat(purchaseQuantity) <= 0)
      newErrors.purchaseQuantity = 'Quantidade deve ser maior que 0';
    if (!purchasePrice || parseFloat(purchasePrice) <= 0)
      newErrors.purchasePrice = 'Preco deve ser maior que 0';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      if (isEditing) {
        await api.update(ingredientId!, {
          name: name.trim(),
          purchaseQuantity: parseFloat(purchaseQuantity),
          purchasePrice: parseFloat(purchasePrice),
          unit,
        });
        showToast('Ingrediente atualizado!', 'success');
        navigation.goBack();
      } else {
        await api.create({
          name: name.trim(),
          purchaseQuantity: parseFloat(purchaseQuantity),
          purchasePrice: parseFloat(purchasePrice),
          unit,
        });
        showToast('Ingrediente cadastrado!', 'success');
        navigation.goBack();
      }
    } catch (error) {
      const err = error as Error & { code?: string; current?: number };

      const msg = err.message || String(error);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Header title="Editar Ingrediente" showBack onBack={() => navigation.goBack()} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title={isEditing ? 'Editar Ingrediente' : 'Novo Ingrediente'}
        showBack
        onBack={() => navigation.goBack()}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
          <View style={styles.infoCard}>
            <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
            <Text style={styles.infoText}>
              Informe o nome, a quantidade comprada e o preco pago. O custo por unidade sera calculado automaticamente.
            </Text>
          </View>
          <Card style={styles.card}>
            <View style={styles.nameWrapper}>
              <Input
                label="Nome do ingrediente *"
                placeholder="Ex: Farinha de trigo, Chocolate..."
                value={name}
                onChangeText={handleNameChange}
                error={errors.name}
                autoComplete="off"
              />
              {suggestions.length > 0 && (
                <View style={styles.suggestionsBox}>
                  <FlatList
                    data={suggestions}
                    keyExtractor={item => item}
                    keyboardShouldPersistTaps="handled"
                    scrollEnabled={suggestions.length > 4}
                    style={{ maxHeight: 160 }}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={styles.suggestionItem}
                        onPress={() => pickSuggestion(item)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.suggestionText}>{item}</Text>
                      </TouchableOpacity>
                    )}
                  />
                </View>
              )}
            </View>
            <View style={styles.row}>
              <Input
                label="Quantidade comprada *"
                placeholder="0"
                value={purchaseQuantity}
                onChangeText={setPurchaseQuantity}
                keyboardType="decimal-pad"
                error={errors.purchaseQuantity}
                containerStyle={{ flex: 1, marginRight: 8 }}
              />
              <Input
                label="Preco pago (R$) *"
                placeholder="0,00"
                value={purchasePrice}
                onChangeText={setPurchasePrice}
                keyboardType="decimal-pad"
                error={errors.purchasePrice}
                containerStyle={{ flex: 1 }}
              />
            </View>

            <Text style={styles.unitLabel}>Unidade de medida *</Text>
            <View style={styles.unitGrid}>
              {UNITS.map(u => (
                <TouchableOpacity
                  key={u.value}
                  onPress={() => setUnit(u.value)}
                  style={[styles.unitButton, unit === u.value && styles.unitButtonSelected]}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.unitButtonText, unit === u.value && styles.unitButtonTextSelected]}>
                    {u.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Card>

          {purchaseQuantity && purchasePrice && parseFloat(purchaseQuantity) > 0 && (
            <Card style={styles.previewCard}>
              <Text style={styles.previewTitle}>Preco por unidade:</Text>
              <Text style={styles.previewValue}>
                {(parseFloat(purchasePrice) / parseFloat(purchaseQuantity)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} por {unit}
              </Text>
            </Card>
          )}

          <Button
            title={isEditing ? 'Atualizar Ingrediente' : 'Salvar Ingrediente'}
            onPress={handleSave}
            loading={loading}
            style={styles.saveButton}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, padding: 20 },
  card: { marginBottom: 16 },
  row: { flexDirection: 'row' },
  unitLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: 8,
    fontWeight: '600',
  },
  unitGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  unitButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.cream,
  },
  unitButtonSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  unitButtonText: { ...typography.bodySmall, color: colors.textSecondary },
  unitButtonTextSelected: { color: colors.primary, fontWeight: '600' },
  previewCard: {
    backgroundColor: colors.beige,
    borderColor: colors.secondaryLight,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  previewTitle: { ...typography.body, color: colors.text },
  previewValue: { ...typography.h4, color: colors.secondary },
  saveButton: { marginBottom: 32 },
  nameWrapper: { zIndex: 10 },
  suggestionsBox: {
    position: 'absolute',
    top: 74,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.primary,
    zIndex: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 8,
  },
  suggestionItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  suggestionText: { ...typography.body, color: colors.text },
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
