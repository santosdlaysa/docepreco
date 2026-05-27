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
  Modal,
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
import { priceHistoryApi } from '../../data/api/priceHistoryApi';
import { useTranslation } from 'react-i18next';

const PURCHASE_UNIT_SUGGESTIONS = ['Lata', 'Pacote', 'Saco', 'Caixa', 'Garrafa', 'Pote', 'Bisnaga', 'Tablete'];

type RouteProps = RouteProp<RootStackParamList, 'EditIngredient'>;

const fmtBRL = (v: number): string => {
  if (!isFinite(v)) return 'R$ 0,00';
  const fixed = v.toFixed(2);
  const [int, dec] = fixed.split('.');
  const intFormatted = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `R$ ${intFormatted},${dec}`;
};

export const CreateIngredientScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProps>();
  const ingredientId = (route.params as any)?.ingredientId as string | undefined;
  const isEditing = !!ingredientId;

  const [name, setName] = useState('');
  const [purchaseQuantity, setPurchaseQuantity] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [unit, setUnit] = useState<Unit>('' as Unit);
  const [useCustomUnit, setUseCustomUnit] = useState(false);
  const [purchaseUnitLabel, setPurchaseUnitLabel] = useState('');
  const [purchaseUnitWeight, setPurchaseUnitWeight] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(isEditing);
  const [originalPrice, setOriginalPrice] = useState<number | null>(null);
  const [originalQty, setOriginalQty] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [allNames, setAllNames] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const { showToast } = useToast();
  const { openPaywall } = usePaywall();
  const { t } = useTranslation();
  const api = isDemoMode() ? demoIngredientApi : ingredientApi;

  const UNITS: { value: Unit; label: string }[] = [
    { value: 'unit', label: t('createIngredient.units.unit') },
    { value: 'g', label: t('createIngredient.units.g') },
    { value: 'kg', label: t('createIngredient.units.kg') },
    { value: 'ml', label: t('createIngredient.units.ml') },
    { value: 'l', label: t('createIngredient.units.l') },
  ];

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

  const handlePriceChange = (text: string) => {
    // Aceita dígitos, ponto e vírgula
    const cleaned = text.replace(/[^0-9.,]/g, '');
    // Troca vírgula por ponto para normalizar
    const normalized = cleaned.replace(',', '.');
    // Impede múltiplos pontos
    const parts = normalized.split('.');
    const value = parts.length > 2
      ? parts[0] + '.' + parts.slice(1).join('')
      : normalized;
    // Limita a 2 casas decimais
    const dotIdx = value.indexOf('.');
    const limited = dotIdx >= 0 && value.length - dotIdx > 3
      ? value.slice(0, dotIdx + 3)
      : value;
    setPurchasePrice(limited);
  };

  useEffect(() => {
    if (!ingredientId) return;
    api.getById(ingredientId)
      .then(ingredient => {
        setName(ingredient.name);
        setPurchaseQuantity(String(ingredient.purchaseQuantity));
        setPurchasePrice(Number(ingredient.purchasePrice).toFixed(2));
        setUnit(ingredient.unit);
        setOriginalPrice(ingredient.purchasePrice);
        setOriginalQty(ingredient.purchaseQuantity);
        if (ingredient.purchaseUnitLabel) {
          setUseCustomUnit(true);
          setPurchaseUnitLabel(ingredient.purchaseUnitLabel);
          setPurchaseUnitWeight(String(ingredient.purchaseUnitWeight ?? ''));
        }
      })
      .catch(() => showToast(t('createIngredient.loadError'), 'error'))
      .finally(() => setLoadingData(false));
  }, [ingredientId]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = t('createIngredient.nameRequired');
    if (!purchaseQuantity || parseFloat(purchaseQuantity) <= 0)
      newErrors.purchaseQuantity = t('createIngredient.quantityRequired');
    if (!purchasePrice || parseFloat(purchasePrice.replace(',', '.')) <= 0)
      newErrors.purchasePrice = t('createIngredient.priceRequired');
    if (!unit) newErrors.unit = t('createIngredient.unitRequired');
    if (useCustomUnit) {
      if (!purchaseUnitLabel.trim()) newErrors.purchaseUnitLabel = t('createIngredient.packageLabelRequired');
      if (!purchaseUnitWeight || parseFloat(purchaseUnitWeight) <= 0)
        newErrors.purchaseUnitWeight = t('createIngredient.weightRequired');
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleShowConfirmation = () => {
    if (!validate()) return;
    setShowConfirmModal(true);
  };

  const handleSave = async () => {
    setShowConfirmModal(false);
    setLoading(true);
    try {
      if (isEditing) {
        const newPrice = parseFloat(purchasePrice.replace(',', '.'));
        const newQty = parseFloat(purchaseQuantity);
        await api.update(ingredientId!, {
          name: name.trim(),
          purchaseQuantity: newQty,
          purchasePrice: newPrice,
          unit,
          purchaseUnitLabel: useCustomUnit ? purchaseUnitLabel.trim() : undefined,
          purchaseUnitWeight: useCustomUnit ? parseFloat(purchaseUnitWeight) : undefined,
        });
        // Save price history if price or quantity changed
        if (originalPrice !== null && (newPrice !== originalPrice || newQty !== originalQty)) {
          await priceHistoryApi.add(ingredientId!, {
            price: newPrice,
            purchaseQuantity: newQty,
            unit,
          }).catch(() => {});
        }
        showToast(t('createIngredient.updated'), 'success');
        navigation.goBack();
      } else {
        await api.create({
          name: name.trim(),
          purchaseQuantity: parseFloat(purchaseQuantity),
          purchasePrice: parseFloat(purchasePrice.replace(',', '.')),
          unit,
          purchaseUnitLabel: useCustomUnit ? purchaseUnitLabel.trim() : undefined,
          purchaseUnitWeight: useCustomUnit ? parseFloat(purchaseUnitWeight) : undefined,
        });
        showToast(t('createIngredient.created'), 'success');
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
        <Header title={t('createIngredient.titleEdit')} showBack onBack={() => navigation.goBack()} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title={isEditing ? t('createIngredient.titleEdit') : t('createIngredient.titleNew')}
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
              {t('createIngredient.infoText')}
            </Text>
          </View>
          <Card style={styles.card}>
            {/* 1. Nome do ingrediente */}
            <View style={styles.nameWrapper}>
              <Input
                label={t('createIngredient.nameLabel')}
                placeholder={t('createIngredient.namePlaceholder')}
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

            {/* 2. Tipo de embalagem */}
            <Text style={styles.unitLabel}>{t('createIngredient.packageType')}</Text>
            <View style={styles.unitGrid}>
              {PURCHASE_UNIT_SUGGESTIONS.map(label => (
                <TouchableOpacity
                  key={label}
                  onPress={() => {
                    if (purchaseUnitLabel === label) {
                      setPurchaseUnitLabel('');
                      setPurchaseUnitWeight('');
                      setUseCustomUnit(false);
                    } else {
                      setPurchaseUnitLabel(label);
                      setUseCustomUnit(true);
                    }
                  }}
                  style={[styles.unitButton, purchaseUnitLabel === label && styles.unitButtonSelected]}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.unitButtonText, purchaseUnitLabel === label && styles.unitButtonTextSelected]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Input
              label=""
              placeholder={t('createIngredient.packagePlaceholder')}
              value={purchaseUnitLabel}
              onChangeText={(text) => {
                setPurchaseUnitLabel(text);
                setUseCustomUnit(!!text);
              }}
              error={errors.purchaseUnitLabel}
              containerStyle={{ marginTop: 8 }}
            />

            {/* 3. Peso por embalagem (aparece quando tipo selecionado) */}
            {useCustomUnit && (
              <Input
                label={t('createIngredient.weightPerPackage', { label: purchaseUnitLabel || 'embalagem', unit: unit || 'g' })}
                placeholder={t('createIngredient.weightPlaceholder', { unit: unit || 'g' })}
                value={purchaseUnitWeight}
                onChangeText={setPurchaseUnitWeight}
                keyboardType="decimal-pad"
                error={errors.purchaseUnitWeight}
              />
            )}

            {/* 4. Quantidade comprada */}
            <Input
              label={useCustomUnit && purchaseUnitLabel ? t('createIngredient.quantityLabelCustom', { label: purchaseUnitLabel.toLowerCase() }) : t('createIngredient.quantityLabel')}
              placeholder={useCustomUnit ? 'Ex: 1' : 'Ex: 1000'}
              value={purchaseQuantity}
              onChangeText={setPurchaseQuantity}
              keyboardType="decimal-pad"
              error={errors.purchaseQuantity}
            />
            <Text style={styles.fieldHint}>
              {t('createIngredient.quantityHint')}
            </Text>

            {/* 5. Preço pago */}
            <Input
              label={t('createIngredient.priceLabel')}
              placeholder="Ex: 4.80"
              value={purchasePrice}
              onChangeText={handlePriceChange}
              keyboardType="decimal-pad"
              error={errors.purchasePrice}
            />
            <Text style={styles.fieldHint}>
              {t('createIngredient.priceHint')}
            </Text>

            {/* 6. Unidade de medida */}
            <Text style={styles.unitLabel}>{t('createIngredient.unitLabel')}</Text>
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
            {errors.unit && <Text style={{ color: colors.error, fontSize: 12, marginTop: 4 }}>{errors.unit}</Text>}
          </Card>

          {purchaseQuantity && purchasePrice && parseFloat(purchaseQuantity) > 0 && (
            <Card style={styles.previewCard}>
              <View>
                {useCustomUnit && purchaseUnitWeight && parseFloat(purchaseUnitWeight) > 0 ? (
                  <>
                    <View style={styles.previewRow}>
                      <Text style={styles.previewTitle}>{t('createIngredient.pricePerPackage', { label: purchaseUnitLabel || 'embalagem' })}</Text>
                      <Text style={styles.previewValue}>
                        {fmtBRL(parseFloat(purchasePrice.replace(',', '.')) / parseFloat(purchaseQuantity))}
                      </Text>
                    </View>
                    <View style={styles.previewRow}>
                      <Text style={styles.previewTitle}>{t('createIngredient.pricePerUnit', { unit })}</Text>
                      <Text style={styles.previewValue}>
                        {fmtBRL(parseFloat(purchasePrice.replace(',', '.')) / (parseFloat(purchaseQuantity) * parseFloat(purchaseUnitWeight)))}
                      </Text>
                    </View>
                    <View style={styles.previewRow}>
                      <Text style={styles.previewTitle}>{t('createIngredient.totalLabel')}</Text>
                      <Text style={[styles.previewTitle, { fontWeight: '600' as const }]}>
                        {parseFloat(purchaseQuantity)} {purchaseUnitLabel || 'embalagem'}(s) = {(parseFloat(purchaseQuantity) * parseFloat(purchaseUnitWeight)).toLocaleString('pt-BR')} {unit}
                      </Text>
                    </View>
                  </>
                ) : (
                  <View style={styles.previewRow}>
                    <Text style={styles.previewTitle}>{t('createIngredient.pricePerUnit', { unit })}</Text>
                    <Text style={styles.previewValue}>
                      {fmtBRL(parseFloat(purchasePrice.replace(',', '.')) / parseFloat(purchaseQuantity))}
                    </Text>
                  </View>
                )}
              </View>
            </Card>
          )}

          <Button
            title={isEditing ? t('createIngredient.updateButton') : t('createIngredient.saveButton')}
            onPress={handleShowConfirmation}
            loading={loading}
            style={styles.saveButton}
          />
        </ScrollView>
      </KeyboardAvoidingView>

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
              <Text style={styles.confirmSectionTitle}>{t('createIngredient.ingredient')}</Text>
              <View style={styles.confirmRow}>
                <Text style={styles.confirmLabel}>{t('common.name')}</Text>
                <Text style={styles.confirmValue}>{name.trim()}</Text>
              </View>
              <View style={styles.confirmRow}>
                <Text style={styles.confirmLabel}>{t('createIngredient.quantityBought')}</Text>
                <Text style={styles.confirmValue}>
                  {useCustomUnit && purchaseUnitLabel
                    ? `${purchaseQuantity} ${purchaseUnitLabel}(s) (${(parseFloat(purchaseQuantity || '0') * parseFloat(purchaseUnitWeight || '0')).toLocaleString('pt-BR')} ${unit})`
                    : `${purchaseQuantity} ${unit}`}
                </Text>
              </View>
              <View style={styles.confirmRow}>
                <Text style={styles.confirmLabel}>{t('createIngredient.pricePaid')}</Text>
                <Text style={styles.confirmValueHighlight}>{fmtBRL(parseFloat((purchasePrice || '0').replace(',', '.')))}</Text>
              </View>
              {purchaseQuantity && purchasePrice && parseFloat(purchaseQuantity) > 0 && (
                <View style={styles.confirmRow}>
                  <Text style={styles.confirmLabel}>{t('createIngredient.pricePerUnit', { unit })}</Text>
                  <Text style={styles.confirmValueHighlight}>
                    {(() => {
                      const qty = parseFloat(purchaseQuantity);
                      const price = parseFloat(purchasePrice.replace(',', '.'));
                      const effectiveQty = useCustomUnit && purchaseUnitWeight ? qty * parseFloat(purchaseUnitWeight) : qty;
                      return fmtBRL(price / effectiveQty);
                    })()}
                  </Text>
                </View>
              )}
            </Card>

            <View style={styles.confirmActions}>
              <Button
                title={t('common.backAndFix')}
                variant="outline"
                onPress={() => setShowConfirmModal(false)}
                style={{ flex: 1, marginRight: 8 }}
              />
              <Button
                title={t('common.confirm')}
                onPress={handleSave}
                loading={loading}
                style={{ flex: 1 }}
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, padding: 20 },
  card: { marginBottom: 16 },
  row: { flexDirection: 'row' },
  fieldHint: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
    marginBottom: 8,
    fontStyle: 'italic',
  },
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
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  previewTitle: { ...typography.body, color: colors.text },
  previewValue: { ...typography.h4, color: colors.secondary },
  customUnitToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    gap: 8,
  },
  customUnitToggleText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  customUnitSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  saveButton: { marginBottom: 32 },
  nameWrapper: { zIndex: 10 },
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
