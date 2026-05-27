import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Recipe } from '../../domain/entities/Recipe';
import { CalculationResult } from '../../domain/entities/Calculation';
import { recipeApi } from '../../data/api/recipeApi';
import { isDemoMode } from '../../data/demo/demoMode';
import { demoRecipeApi } from '../../data/demo/demoApi';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Header } from '../components/Header';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { shareRecipeQuote } from '../utils/pdfQuote';
import { pdfSettingsStorage, PdfSettings } from '../../data/storage/pdfSettingsStorage';
import { seasonApi, Season } from '../../data/api/seasonApi';
import { usePremium } from '../context/PremiumContext';
import { usePaywall } from '../premium/usePaywall';
import { useTranslation } from 'react-i18next';
import { useDemoGuard } from '../hooks/useDemoGuard';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteType = RouteProp<RootStackParamList, 'RecipeDetail'>;

const formatCurrency = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const formatQuantity = (value: number) => {
  if (value >= 1000) return value.toFixed(0);
  if (value >= 100) return value.toFixed(1);
  if (value >= 1) return value.toFixed(2);
  return value.toFixed(3);
};

export const RecipeDetailScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { t } = useTranslation();
  const route = useRoute<RouteType>();
  const { recipeId } = route.params;

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [calculation, setCalculation] = useState<CalculationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [pdfSettings, setPdfSettings] = useState<PdfSettings | undefined>();
  const [activeSeason, setActiveSeason] = useState<Season | null>(null);
  const [scaleInput, setScaleInput] = useState('');
  const [scaleOpen, setScaleOpen] = useState(false);
  const api = isDemoMode() ? demoRecipeApi : recipeApi;
  const { companyName } = useAuth();
  const { showToast } = useToast();
  const { isPremium } = usePremium();
  const { requirePremium } = usePaywall();
  const { guardAction, DemoGuardModal } = useDemoGuard();

  useEffect(() => {
    loadRecipe();
    pdfSettingsStorage.get().then(setPdfSettings);
    if (isPremium && !isDemoMode()) seasonApi.getActive().then(setActiveSeason).catch(() => {});
  }, [recipeId]);

  const loadRecipe = async () => {
    try {
      const data = await api.getById(recipeId);
      setRecipe(data);
      await handleCalculate(recipeId);
    } catch (error) {
      Alert.alert(t('common.error'), t('recipeDetail.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const handleCalculate = async (id?: string) => {
    setCalculating(true);
    try {
      const result = await api.calculate(id || recipeId);
      setCalculation(result);
    } catch (error) {
      // silently fail if no ingredients
    } finally {
      setCalculating(false);
    }
  };

  const handleShareQuote = async () => {
    if (!recipe || !calculation) return;
    setSharing(true);
    try {
      await shareRecipeQuote({ recipe, calculation, companyName }, pdfSettings);
    } catch (error) {
      const msg = error instanceof Error ? error.message : t('recipeDetail.shareError');
      showToast(msg, 'error');
    } finally {
      setSharing(false);
    }
  };

  // Scale calculator
  const scaleQty = parseFloat(scaleInput.replace(',', '.'));
  const scaleValid = !isNaN(scaleQty) && scaleQty > 0;
  const scaleFactor = recipe && scaleValid ? scaleQty / recipe.yield : null;

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Header title={t('recipeDetail.title')} showBack onBack={() => navigation.goBack()} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!recipe) return null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title={recipe.name}
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() => guardAction(handleShareQuote)}
              disabled={!calculation || sharing}
              style={[styles.editBtn, (!calculation || sharing) && styles.editBtnDisabled]}
            >
              {sharing ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Ionicons name="share-outline" size={20} color={colors.primary} />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => guardAction(() => navigation.navigate('EditRecipe', { recipeId: recipe.id }))}
              style={styles.editBtn}
            >
              <Ionicons name="pencil-outline" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>
        }
      />
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
          <Text style={styles.infoText}>
            {t('recipeDetail.infoText')}
          </Text>
        </View>

        <View style={styles.recipeMeta}>
          <View style={styles.metaItem}>
            <Ionicons name="layers-outline" size={20} color={colors.primary} />
            <Text style={styles.metaValue}>{recipe.yield}</Text>
            <Text style={styles.metaLabel}>{t('common.units')}</Text>
          </View>
          <View style={styles.metaDivider} />
          <View style={styles.metaItem}>
            <Ionicons name="trending-up-outline" size={20} color={colors.success} />
            <Text style={styles.metaValue}>{recipe.profitMargin}%</Text>
            <Text style={styles.metaLabel}>{t('recipeDetail.profit')}</Text>
          </View>
          <View style={styles.metaDivider} />
          <View style={styles.metaItem}>
            <Ionicons name="basket-outline" size={20} color={colors.secondary} />
            <Text style={styles.metaValue}>{recipe.ingredients.length + (recipe.subRecipes?.length || 0)}</Text>
            <Text style={styles.metaLabel}>{t('createRecipe.ingredientsSection')}</Text>
          </View>
        </View>

        {calculation && (
          <Card style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <Text style={styles.resultTitle}>{t('recipeDetail.calculationResult')}</Text>
              <TouchableOpacity onPress={() => handleCalculate()} disabled={calculating}>
                <Ionicons
                  name="refresh-outline"
                  size={20}
                  color={calculating ? colors.textMuted : colors.primary}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.mainResult}>
              <View style={styles.mainResultItem}>
                <Text style={styles.mainResultLabel}>{t('recipeDetail.suggestedPrice')}</Text>
                <Text style={styles.mainResultValue}>{formatCurrency(calculation.suggestedPrice)}</Text>
                <Text style={styles.mainResultSub}>{t('common.perUnit')}</Text>
              </View>
              <View style={styles.resultDivider} />
              <View style={styles.mainResultItem}>
                <Text style={styles.mainResultLabel}>{t('recipeDetail.estimatedProfit')}</Text>
                <Text style={[styles.mainResultValue, { color: colors.success }]}>
                  {formatCurrency(calculation.estimatedProfit)}
                </Text>
                <Text style={styles.mainResultSub}>{t('common.total')}</Text>
              </View>
            </View>

            {activeSeason && (
              <View style={styles.seasonBanner}>
                <Ionicons name="pricetag-outline" size={16} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.seasonLabel}>
                    🎉 {t('recipeDetail.seasonActive', { name: activeSeason.name })}
                  </Text>
                  <Text style={styles.seasonPrice}>
                    {t('recipeDetail.seasonPrice')}{' '}
                    <Text style={styles.seasonPriceValue}>
                      {formatCurrency(calculation.suggestedPrice * activeSeason.multiplier)}
                    </Text>
                    {' '}({activeSeason.multiplier >= 1 ? '+' : ''}{Math.round((activeSeason.multiplier - 1) * 100)}%)
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.breakdown}>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>{t('recipeDetail.totalCost')}</Text>
                <Text style={styles.breakdownValue}>{formatCurrency(calculation.totalCost)}</Text>
              </View>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>{t('recipeDetail.costPerUnit')}</Text>
                <Text style={styles.breakdownValue}>{formatCurrency(calculation.costPerUnit)}</Text>
              </View>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>{t('recipeDetail.ingredientsCost')}</Text>
                <Text style={styles.breakdownValue}>{formatCurrency(calculation.ingredientsCost)}</Text>
              </View>
              {calculation.subRecipesCost > 0 && (
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>{t('recipeDetail.subRecipesCost')}</Text>
                  <Text style={styles.breakdownValue}>{formatCurrency(calculation.subRecipesCost)}</Text>
                </View>
              )}
              {calculation.additionalCostTotal > 0 && (
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>{t('recipeDetail.additionalCosts')}</Text>
                  <Text style={styles.breakdownValue}>{formatCurrency(calculation.additionalCostTotal)}</Text>
                </View>
              )}
            </View>

            <TouchableOpacity
              onPress={handleShareQuote}
              disabled={sharing}
              activeOpacity={0.8}
              style={[styles.shareButton, sharing && styles.shareButtonDisabled]}
            >
              {sharing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="share-outline" size={18} color="#fff" />
                  <Text style={styles.shareButtonText}>{t('recipeDetail.shareQuote')}</Text>
                </>
              )}
            </TouchableOpacity>
          </Card>
        )}

        {recipe.ingredients.length > 0 && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>{t('createRecipe.ingredientsSection')}</Text>
            {recipe.ingredients.map((ing, idx) => (
              <View key={idx} style={styles.listRow}>
                <Ionicons name="ellipse" size={6} color={colors.primary} style={{ marginTop: 8 }} />
                <Text style={styles.listText}>
                  {ing.ingredientName || `Ingrediente ${idx + 1}`} — {ing.quantityUsed} {ing.unit}
                </Text>
              </View>
            ))}
          </Card>
        )}

        {recipe.subRecipes && recipe.subRecipes.length > 0 && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>{t('recipeDetail.subRecipesSection')}</Text>
            {recipe.subRecipes.map((sub, idx) => (
              <View key={idx} style={styles.listRow}>
                <Ionicons name="layers-outline" size={14} color={colors.primary} style={{ marginTop: 4 }} />
                <Text style={styles.listText}>
                  {sub.subRecipeName || `Receita ${idx + 1}`} — {sub.quantityUsed} {sub.unit || 'un'}
                </Text>
              </View>
            ))}
          </Card>
        )}

        {/* Calculadora de Escala */}
        {recipe.ingredients.length > 0 && calculation && (
          <Card style={styles.scaleCard}>
            <TouchableOpacity
              style={styles.scaleHeader}
              onPress={() => {
                if (!scaleOpen && !requirePremium('scaleCalculator')) return;
                setScaleOpen(!scaleOpen);
              }}
              activeOpacity={0.7}
            >
              <View style={styles.scaleIconWrap}>
                <Ionicons name="resize-outline" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.scaleTitle}>{t('recipeDetail.scaleCalculator')}</Text>
                <Text style={styles.scaleSubtitle}>{t('recipeDetail.scaleSubtitle')}</Text>
              </View>
              <Ionicons
                name={scaleOpen ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={colors.textMuted}
              />
            </TouchableOpacity>

            {scaleOpen && (
              <View style={styles.scaleBody}>
                <Text style={styles.scaleLabel}>
                  {t('recipeDetail.originalRecipe', { yield: recipe.yield })}
                </Text>
                <View style={styles.scaleInputRow}>
                  <Text style={styles.scaleInputLabel}>{t('recipeDetail.wantToMake')}</Text>
                  <TextInput
                    style={styles.scaleInput}
                    value={scaleInput}
                    onChangeText={setScaleInput}
                    keyboardType="numeric"
                    placeholder={String(recipe.yield)}
                    placeholderTextColor={colors.textMuted}
                  />
                  <Text style={styles.scaleInputLabel}>{t('common.units')}</Text>
                </View>

                {scaleFactor !== null && (
                  <>
                    <View style={styles.scaleMultiplier}>
                      <Ionicons name="swap-vertical-outline" size={16} color={colors.primary} />
                      <Text style={styles.scaleMultiplierText}>
                        Multiplicador: <Text style={styles.scaleBold}>{scaleFactor.toFixed(2)}x</Text>
                      </Text>
                    </View>

                    {/* Ingredientes escalados */}
                    <View style={styles.scaleIngredients}>
                      <Text style={styles.scaleIngredientsTitle}>{t('recipeDetail.neededIngredients')}</Text>
                      {recipe.ingredients.map((ing, idx) => {
                        const scaled = ing.quantityUsed * scaleFactor;
                        return (
                          <View key={idx} style={styles.scaleIngRow}>
                            <Text style={styles.scaleIngName}>
                              {ing.ingredientName || `Ingrediente ${idx + 1}`}
                            </Text>
                            <Text style={styles.scaleIngQty}>
                              {formatQuantity(scaled)} {ing.unit}
                            </Text>
                          </View>
                        );
                      })}
                    </View>

                    {/* Resumo financeiro escalado */}
                    <View style={styles.scaleSummary}>
                      <View style={styles.scaleSummaryRow}>
                        <Text style={styles.scaleSummaryLabel}>{t('recipeDetail.totalCost')}</Text>
                        <Text style={styles.scaleSummaryValue}>
                          {formatCurrency(calculation.totalCost * scaleFactor)}
                        </Text>
                      </View>
                      {calculation.additionalCostTotal > 0 && (
                        <View style={styles.scaleSummaryRow}>
                          <Text style={styles.scaleSummaryLabel}>{t('recipeDetail.additionalCosts')}</Text>
                          <Text style={styles.scaleSummaryValue}>
                            {formatCurrency(calculation.additionalCostTotal * scaleFactor)}
                          </Text>
                        </View>
                      )}
                      <View style={styles.scaleSummaryRow}>
                        <Text style={styles.scaleSummaryLabel}>{t('recipeDetail.totalSalePrice')}</Text>
                        <Text style={[styles.scaleSummaryValue, { color: colors.primary, fontWeight: '800' }]}>
                          {formatCurrency(calculation.suggestedPrice * scaleQty)}
                        </Text>
                      </View>
                      <View style={styles.scaleSummaryRow}>
                        <Text style={styles.scaleSummaryLabel}>{t('recipeDetail.estimatedProfit')}</Text>
                        <Text style={[styles.scaleSummaryValue, { color: colors.success }]}>
                          {formatCurrency((calculation.suggestedPrice * scaleQty) - (calculation.totalCost * scaleFactor))}
                        </Text>
                      </View>
                    </View>
                  </>
                )}

                {scaleInput !== '' && !scaleValid && (
                  <Text style={styles.scaleError}>{t('recipeDetail.invalidNumber')}</Text>
                )}
              </View>
            )}
          </Card>
        )}

        {calculation && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>{t('recipeDetail.marginComparison')}</Text>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCell, styles.tableHeaderText, { flex: 1.2 }]}>Margem</Text>
              <Text style={[styles.tableCell, styles.tableHeaderText]}>Preço</Text>
              <Text style={[styles.tableCell, styles.tableHeaderText]}>Lucro/un</Text>
              <Text style={[styles.tableCell, styles.tableHeaderText]}>Lucro total</Text>
            </View>
            {[
              { value: 50,  label: '🟡 50%' },
              { value: 70,  label: '⭐ 70%' },
              { value: 100, label: '🔥 100%' },
              { value: 150, label: '💎 150%' },
            ].map(opt => {
              const price = calculation.costPerUnit * (1 + opt.value / 100);
              const profitPerUnit = price - calculation.costPerUnit;
              const totalProfit = profitPerUnit * recipe.yield;
              const isCurrentMargin = Math.abs(recipe.profitMargin - opt.value) < 1;
              return (
                <View
                  key={opt.value}
                  style={[styles.tableRow, isCurrentMargin && styles.tableRowHighlight]}
                >
                  <Text style={[styles.tableCell, { flex: 1.2 }, isCurrentMargin && styles.tableCellHighlight]}>
                    {opt.label}{isCurrentMargin ? ' ✓' : ''}
                  </Text>
                  <Text style={[styles.tableCell, isCurrentMargin && styles.tableCellHighlight]}>
                    {formatCurrency(price)}
                  </Text>
                  <Text style={[styles.tableCell, isCurrentMargin && styles.tableCellHighlight]}>
                    {formatCurrency(profitPerUnit)}
                  </Text>
                  <Text style={[styles.tableCell, isCurrentMargin && styles.tableCellHighlight]}>
                    {formatCurrency(totalProfit)}
                  </Text>
                </View>
              );
            })}
          </Card>
        )}

        {recipe.additionalCosts.length > 0 && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>{t('createRecipe.additionalCosts')}</Text>
            {recipe.additionalCosts.map((cost, idx) => {
              const isLabor = cost.name.includes('Mão de obra');
              return (
                <View key={idx} style={styles.breakdownRow}>
                  <View style={styles.costLabelRow}>
                    {isLabor && <Ionicons name="construct-outline" size={14} color={colors.primary} />}
                    <Text style={[styles.breakdownLabel, isLabor && { color: colors.primary, fontWeight: '600' }]}>
                      {cost.name}
                    </Text>
                  </View>
                  <Text style={styles.breakdownValue}>{formatCurrency(cost.value)}</Text>
                </View>
              );
            })}
          </Card>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
      <DemoGuardModal />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { flex: 1, padding: 20 },
  headerActions: { flexDirection: 'row', gap: 8 },
  editBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBtnDisabled: { opacity: 0.4 },
  recipeMeta: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  metaItem: { flex: 1, alignItems: 'center', gap: 4 },
  metaDivider: { width: 1, backgroundColor: colors.border },
  metaValue: { ...typography.h3, color: colors.text },
  metaLabel: { ...typography.caption, color: colors.textSecondary },
  resultCard: { marginBottom: 16, backgroundColor: colors.cream },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  resultTitle: { ...typography.h4, color: colors.text },
  mainResult: { flexDirection: 'row', marginBottom: 16 },
  mainResultItem: { flex: 1, alignItems: 'center' },
  resultDivider: { width: 1, backgroundColor: colors.border },
  mainResultLabel: { ...typography.caption, color: colors.textSecondary, marginBottom: 4 },
  mainResultValue: { ...typography.h2, color: colors.primary },
  mainResultSub: { ...typography.caption, color: colors.textMuted },
  breakdown: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
    gap: 8,
  },
  shareButton: {
    marginTop: 16,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  shareButtonDisabled: { opacity: 0.6 },
  shareButtonText: {
    ...typography.button,
    color: '#fff',
    fontSize: 14,
  },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  costLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  breakdownLabel: { ...typography.body, color: colors.textSecondary },
  breakdownValue: { ...typography.body, color: colors.text, fontWeight: '600' },
  section: { marginBottom: 16 },
  sectionTitle: { ...typography.h4, color: colors.text, marginBottom: 12 },
  listRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 4 },
  listText: { ...typography.body, color: colors.text, flex: 1 },
  tableHeader: { flexDirection: 'row', borderBottomWidth: 1, borderColor: colors.border, paddingBottom: 8, marginBottom: 4 },
  tableHeaderText: { ...typography.caption, color: colors.textSecondary, fontWeight: '700' },
  tableRow: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderColor: colors.border },
  tableRowHighlight: { backgroundColor: colors.primaryLight, borderRadius: 8, borderColor: 'transparent', marginHorizontal: -4, paddingHorizontal: 4 },
  tableCell: { ...typography.bodySmall, color: colors.text, flex: 1, textAlign: 'center' },
  tableCellHighlight: { color: colors.primary, fontWeight: '700' },
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
  seasonBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: colors.cream,
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  seasonLabel: { ...typography.bodySmall, color: colors.text, fontWeight: '700', marginBottom: 2 },
  seasonPrice: { ...typography.bodySmall, color: colors.textSecondary },
  seasonPriceValue: { ...typography.bodySmall, color: colors.primary, fontWeight: '800' },

  // Calculadora de Escala
  scaleCard: { marginBottom: 16, padding: 0, overflow: 'hidden' },
  scaleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
  },
  scaleIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scaleTitle: { ...typography.h4, color: colors.text },
  scaleSubtitle: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  scaleBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 16,
  },
  scaleLabel: { ...typography.bodySmall, color: colors.textSecondary, marginBottom: 12 },
  scaleBold: { fontWeight: '700', color: colors.text },
  scaleInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  scaleInputLabel: { ...typography.body, color: colors.textSecondary },
  scaleInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    ...typography.h3,
    color: colors.primary,
    textAlign: 'center',
    backgroundColor: colors.cream,
  },
  scaleMultiplier: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primaryLight,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  scaleMultiplierText: { ...typography.bodySmall, color: colors.primary },
  scaleIngredients: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  scaleIngredientsTitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  scaleIngRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  scaleIngName: { ...typography.body, color: colors.text, flex: 1 },
  scaleIngQty: { ...typography.body, color: colors.primary, fontWeight: '700' },
  scaleSummary: {
    backgroundColor: colors.cream,
    borderRadius: 12,
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  scaleSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scaleSummaryLabel: { ...typography.body, color: colors.textSecondary },
  scaleSummaryValue: { ...typography.body, color: colors.text, fontWeight: '700' },
  scaleError: { ...typography.bodySmall, color: colors.error, marginTop: 4 },
});
