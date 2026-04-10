import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { recipeApi } from '../../data/api/recipeApi';
import { saleApi } from '../../data/api/saleApi';
import { isDemoMode } from '../../data/demo/demoMode';
import { demoRecipeApi, demoSaleApi } from '../../data/demo/demoApi';
import { Recipe } from '../../domain/entities/Recipe';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Card } from '../components/Card';
import { Header } from '../components/Header';
import { useToast } from '../context/ToastContext';

export const CreateSaleScreen: React.FC = () => {
  const navigation = useNavigation();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [showRecipePicker, setShowRecipePicker] = useState(false);
  const [quantity, setQuantity] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { showToast } = useToast();
  const rApi = isDemoMode() ? demoRecipeApi : recipeApi;
  const sApi = isDemoMode() ? demoSaleApi : saleApi;

  useEffect(() => {
    rApi.getAll().then(setRecipes).catch(() => {});
  }, []);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!selectedRecipe) newErrors.recipe = 'Selecione uma receita';
    if (!quantity || parseInt(quantity) <= 0) newErrors.quantity = 'Quantidade deve ser maior que 0';
    if (!salePrice || parseFloat(salePrice) <= 0) newErrors.salePrice = 'Preco deve ser maior que 0';
    if (!saleDate) newErrors.saleDate = 'Data é obrigatória';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await sApi.create({
        recipeId: selectedRecipe!.id,
        quantitySold: parseInt(quantity),
        salePrice: parseFloat(salePrice),
        saleDate,
        notes: notes.trim() || undefined,
      });
      showToast('Venda registrada!', 'success');
      navigation.goBack();
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erro ao registrar venda';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const totalRevenue = selectedRecipe && quantity && salePrice
    ? parseInt(quantity) * parseFloat(salePrice)
    : null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="Registrar Venda" showBack onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

          <View style={styles.infoCard}>
            <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
            <Text style={styles.infoText}>
              Selecione a receita vendida, informe a quantidade e o preco por unidade. O total sera calculado automaticamente.
            </Text>
          </View>

          <Card style={styles.section}>
            <Text style={styles.label}>Receita vendida *</Text>
            <TouchableOpacity
              style={[styles.picker, errors.recipe && styles.pickerError]}
              onPress={() => setShowRecipePicker(!showRecipePicker)}
              activeOpacity={0.8}
            >
              <Text style={selectedRecipe ? styles.pickerText : styles.pickerPlaceholder}>
                {selectedRecipe ? selectedRecipe.name : 'Selecione uma receita...'}
              </Text>
              <Ionicons name={showRecipePicker ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textMuted} />
            </TouchableOpacity>
            {errors.recipe && <Text style={styles.errorText}>{errors.recipe}</Text>}

            {showRecipePicker && (
              <View style={styles.dropdownList}>
                {recipes.length === 0 ? (
                  <Text style={styles.dropdownEmpty}>Nenhuma receita cadastrada</Text>
                ) : (
                  recipes.map(r => (
                    <TouchableOpacity
                      key={r.id}
                      style={[styles.dropdownItem, selectedRecipe?.id === r.id && styles.dropdownItemSelected]}
                      onPress={() => { setSelectedRecipe(r); setShowRecipePicker(false); }}
                    >
                      <Text style={[styles.dropdownItemText, selectedRecipe?.id === r.id && styles.dropdownItemTextSelected]}>
                        {r.name}
                      </Text>
                      {selectedRecipe?.id === r.id && (
                        <Ionicons name="checkmark" size={18} color={colors.primary} />
                      )}
                    </TouchableOpacity>
                  ))
                )}
              </View>
            )}
          </Card>

          <Card style={styles.section}>
            <View style={styles.row}>
              <Input
                label="Quantidade vendida *"
                placeholder="0"
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="number-pad"
                suffix="un"
                error={errors.quantity}
                containerStyle={{ flex: 1, marginRight: 8 }}
              />
              <Input
                label="Preco por unidade *"
                placeholder="0,00"
                value={salePrice}
                onChangeText={setSalePrice}
                keyboardType="decimal-pad"
                suffix="R$"
                error={errors.salePrice}
                containerStyle={{ flex: 1 }}
              />
            </View>
            <Input
              label="Data da venda *"
              placeholder="AAAA-MM-DD"
              value={saleDate}
              onChangeText={setSaleDate}
              error={errors.saleDate}
            />
            <Input
              label="Observações"
              placeholder="Ex: Festa de aniversário, encomenda..."
              value={notes}
              onChangeText={setNotes}
            />
          </Card>

          {totalRevenue !== null && !isNaN(totalRevenue) && (
            <Card style={styles.totalCard}>
              <Text style={styles.totalLabel}>Total da venda</Text>
              <Text style={styles.totalValue}>
                {totalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </Text>
              <Text style={styles.totalSub}>
                {quantity} un × {parseFloat(salePrice || '0').toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </Text>
            </Card>
          )}

          <Button
            title="Registrar Venda"
            onPress={handleSave}
            loading={loading}
            size="lg"
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
  section: { marginBottom: 16 },
  row: { flexDirection: 'row' },
  label: { ...typography.bodySmall, color: colors.textSecondary, fontWeight: '600', marginBottom: 8 },
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: colors.cream,
  },
  pickerError: { borderColor: colors.error },
  pickerText: { ...typography.body, color: colors.text },
  pickerPlaceholder: { ...typography.body, color: colors.textMuted },
  dropdownList: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    overflow: 'hidden',
  },
  dropdownEmpty: { ...typography.body, color: colors.textMuted, padding: 14, textAlign: 'center' },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  dropdownItemSelected: { backgroundColor: colors.primaryLight },
  dropdownItemText: { ...typography.body, color: colors.text },
  dropdownItemTextSelected: { color: colors.primary, fontWeight: '600' },
  errorText: { ...typography.caption, color: colors.error, marginTop: 4 },
  totalCard: {
    backgroundColor: colors.beige,
    alignItems: 'center',
    marginBottom: 16,
  },
  totalLabel: { ...typography.bodySmall, color: colors.textSecondary, marginBottom: 4 },
  totalValue: { ...typography.h2, color: colors.success },
  totalSub: { ...typography.caption, color: colors.textSecondary, marginTop: 4 },
  saveButton: { marginBottom: 32 },
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
