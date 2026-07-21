import { colors } from '../theme/colors';
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Dimensions,
  Image,
  ImageBackground,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Skeleton } from '../components/Skeleton';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Recipe } from '../../domain/entities/Recipe';
import { CalculationResult } from '../../domain/entities/Calculation';
import { recipeApi } from '../../data/api/recipeApi';
import { isDemoMode } from '../../data/demo/demoMode';
import { demoRecipeApi } from '../../data/demo/demoApi';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { shareRecipeQuote } from '../utils/pdfQuote';
import { pdfSettingsStorage, PdfSettings } from '../../data/storage/pdfSettingsStorage';
import { seasonApi, Season } from '../../data/api/seasonApi';
import { usePremium } from '../context/PremiumContext';
import { usePaywall } from '../premium/usePaywall';
import { useTranslation } from 'react-i18next';
import { useDemoGuard } from '../hooks/useDemoGuard';
import { parseLocaleNumber } from '../utils/number';
import { useCurrencyFormat } from '../hooks/useCurrencyFormat';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteType = RouteProp<RootStackParamList, 'RecipeDetail'>;

// ── Design tokens ──
const INK = colors.text;
const INK2 = colors.textSecondary;
const INK3 = colors.textMuted;
const CREAM = colors.pinkBg3;
const LINE = colors.border;
const PINK = colors.primary;
const GREEN = colors.green;

const SHADOW = {
  shadowColor: INK,
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.07,
  shadowRadius: 12,
  elevation: 4,
};

const ING_COLORS = ['#5E3A23', '#E8C98E', '#F2E6D2', '#F4C95D', '#FFD98A', '#90BE6D', '#7B68EE', '#FF9F43'];

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
  const [calculationError, setCalculationError] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [deleting, setDeleting] = useState(false);
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
  const { formatCurrency, formatCurrencyUnit } = useCurrencyFormat();

  useFocusEffect(
    useCallback(() => {
      loadRecipe();
      pdfSettingsStorage.get().then(setPdfSettings);
      if (isPremium && !isDemoMode()) seasonApi.getActive().then(setActiveSeason).catch(() => {});
    }, [recipeId, isPremium])
  );

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: true,
      aspect: [16, 9],
    });
    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      try {
        await api.update(recipeId, { photoUrl: uri });
        setRecipe(prev => prev ? { ...prev, photoUrl: uri } : prev);
      } catch {
        showToast('Erro ao salvar foto', 'error');
      }
    }
  };

  const removePhoto = async () => {
    try {
      await api.update(recipeId, { photoUrl: '' });
      setRecipe(prev => prev ? { ...prev, photoUrl: undefined } : prev);
    } catch {
      showToast('Erro ao remover foto', 'error');
    }
  };

  const handleDeleteRecipe = () => {
    if (!guardAction()) return;
    Alert.alert(
      t('recipes.deleteTitle') || 'Excluir receita',
      t('recipes.deleteConfirm') || 'Tem certeza que deseja excluir esta receita?',
      [
        { text: t('common.cancel') || 'Cancelar', style: 'cancel' },
        {
          text: t('common.delete') || 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(recipeId);
              navigation.goBack();
              showToast(t('recipes.deleted', { name: recipe?.name ?? '' }), 'success');
            } catch {
              showToast(t('recipes.deleteError') || 'Erro ao excluir receita', 'error');
            }
          },
        },
      ],
    );
  };

  const loadRecipe = async () => {
    try {
      setCalculation(null);
      setCalculationError(false);
      const data = await api.getById(recipeId);
      setRecipe(data);
      // Do not block the whole detail screen while the independent pricing
      // request is running.
      setLoading(false);
      void handleCalculate(recipeId);
    } catch {
      Alert.alert(t('common.error'), t('recipeDetail.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const handleCalculate = async (id?: string) => {
    setCalculating(true);
    setCalculationError(false);
    try {
      const result = await api.calculate(id || recipeId);
      setCalculation(result);
    } catch {
      setCalculationError(true);
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

  const handleDelete = () => {
    guardAction(() => {
      Alert.alert(
        t('recipeDetail.deleteTitle'),
        t('recipeDetail.deleteMessage', { name: recipe?.name }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.delete'),
            style: 'destructive',
            onPress: async () => {
              setDeleting(true);
              try {
                await api.delete(recipeId);
                showToast(t('recipes.deleted', { name: recipe?.name }), 'success');
                navigation.goBack();
              } catch {
                showToast(t('recipes.deleteError'), 'error');
                setDeleting(false);
              }
            },
          },
        ],
      );
    });
  };

  const scaleQty = parseLocaleNumber(scaleInput);
  const scaleValid = !isNaN(scaleQty) && scaleQty > 0;
  const scaleFactor = recipe && scaleValid ? scaleQty / recipe.yield : null;

  // ── Loading skeleton ──
  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.heroPlaceholder} />
        <View style={s.skeletonBody}>
          <Skeleton width={200} height={26} borderRadius={8} />
          <Skeleton width={160} height={14} borderRadius={4} style={{ marginTop: 8 }} />
          <View style={s.skeletonLedger}>
            <Skeleton width={100} height={14} borderRadius={4} />
            {[0, 1, 2, 3].map(i => (
              <View key={i} style={s.skeletonRow}>
                <Skeleton width={30} height={30} borderRadius={9} />
                <View style={{ flex: 1, marginLeft: 11 }}>
                  <Skeleton width={140} height={14} borderRadius={4} />
                  <Skeleton width={100} height={10} borderRadius={4} style={{ marginTop: 4 }} />
                </View>
                <Skeleton width={60} height={14} borderRadius={4} />
              </View>
            ))}
          </View>
          <Skeleton width="100%" height={160} borderRadius={24} />
        </View>
      </SafeAreaView>
    );
  }

  if (!recipe) return null;

  return (
    <SafeAreaView style={s.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ═══════ HERO (foto) ═══════ */}
        {recipe.photoUrl ? (
          <ImageBackground source={{ uri: recipe.photoUrl }} style={s.hero} imageStyle={s.heroImage}>
            <View style={s.heroOverlay} />
            <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} activeOpacity={0.7}>
              <Ionicons name="chevron-back" size={20} color={INK} />
            </TouchableOpacity>
            <View style={s.heroActions}>
              <TouchableOpacity onPress={removePhoto} style={s.heroActionBtn} activeOpacity={0.7}>
                <Ionicons name="close-circle-outline" size={17} color={INK} />
              </TouchableOpacity>
              <TouchableOpacity onPress={removePhoto} style={s.heroActionBtn} activeOpacity={0.7}>
                <Ionicons name="camera-outline" size={16} color={INK} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => guardAction(() => navigation.navigate('EditRecipe', { recipeId: recipe.id }))}
                style={s.heroActionBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="pencil" size={16} color={INK} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleDelete}
                style={s.heroActionBtn}
                activeOpacity={0.7}
                disabled={deleting}
              >
                {deleting ? (
                  <ActivityIndicator size="small" color={colors.error} />
                ) : (
                  <Ionicons name="trash-outline" size={16} color={colors.error} />
                )}
              </TouchableOpacity>
            </View>
          </ImageBackground>
        ) : (
          <LinearGradient
            colors={['#8B5E3C', '#4E2E1B']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.hero}
          >
            <TouchableOpacity onPress={pickPhoto} style={s.heroAddPhoto} activeOpacity={0.7}>
              <Ionicons name="camera-outline" size={22} color="rgba(255,255,255,0.8)" />
              <Text style={s.heroAddPhotoText}>Adicionar foto</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} activeOpacity={0.7}>
              <Ionicons name="chevron-back" size={20} color={INK} />
            </TouchableOpacity>
            <View style={s.heroActions}>
              <TouchableOpacity onPress={handleDeleteRecipe} style={s.heroActionBtn} activeOpacity={0.7}>
                <Ionicons name="trash-outline" size={16} color={colors.error} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => guardAction(() => navigation.navigate('EditRecipe', { recipeId: recipe.id }))}
                style={s.heroActionBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="pencil" size={16} color={INK} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleDelete}
                style={s.heroActionBtn}
                activeOpacity={0.7}
                disabled={deleting}
              >
                {deleting ? (
                  <ActivityIndicator size="small" color={colors.error} />
                ) : (
                  <Ionicons name="trash-outline" size={16} color={colors.error} />
                )}
              </TouchableOpacity>
            </View>
          </LinearGradient>
        )}

        {/* ═══════ TITLE ═══════ */}
        <View style={s.titleWrap}>
          <Text style={s.title}>{recipe.name}</Text>
          <Text style={s.subtitle}>
            Rendimento: {recipe.yield} {recipe.yield === 1 ? 'unidade' : 'unidades'}
          </Text>
        </View>

        <View style={s.body}>
          {/* ═══════ INGREDIENTS LEDGER ═══════ */}
          {recipe.ingredients.length > 0 && (
            <View style={s.ledger}>
              <View style={s.ledgerHead}>
                <Text style={s.ledgerTitle}>Ingredientes</Text>
                <Text style={s.ledgerCount}>{recipe.ingredients.length} itens</Text>
              </View>
              {recipe.ingredients.map((ing, idx) => (
                <View key={idx} style={s.ledgerRow}>
                  <View style={[s.ledgerDot, { backgroundColor: ING_COLORS[idx % ING_COLORS.length] }]} />
                  <View style={s.ledgerInfo}>
                    <Text style={s.ledgerName}>{ing.ingredientName || `Ingrediente ${idx + 1}`}</Text>
                    <Text style={s.ledgerQty}>{ing.quantityUsed} {ing.unit}</Text>
                  </View>
                  {calculation && (
                    <Text style={s.ledgerVal}>
                      {/* Show proportional cost if available */}
                    </Text>
                  )}
                </View>
              ))}
              {calculation && (
                <View style={s.ledgerSum}>
                  <Text style={s.ledgerSumLabel}>Subtotal ingredientes</Text>
                  <Text style={s.ledgerSumVal}>{formatCurrency(calculation.ingredientsCost)}</Text>
                </View>
              )}
            </View>
          )}

          {/* ═══════ SUB-RECIPES ═══════ */}
          {recipe.subRecipes && recipe.subRecipes.length > 0 && (
            <View style={s.ledger}>
              <View style={s.ledgerHead}>
                <Text style={s.ledgerTitle}>Sub-receitas</Text>
              </View>
              {recipe.subRecipes.map((sub, idx) => (
                <View key={idx} style={s.ledgerRow}>
                  <View style={[s.ledgerDot, { backgroundColor: '#7B68EE' }]}>
                    <Ionicons name="layers" size={14} color="#fff" />
                  </View>
                  <View style={s.ledgerInfo}>
                    <Text style={s.ledgerName}>{sub.subRecipeName || `Receita ${idx + 1}`}</Text>
                    <Text style={s.ledgerQty}>{sub.quantityUsed} {sub.unit || 'un'}</Text>
                  </View>
                </View>
              ))}
              {calculation && calculation.subRecipesCost > 0 && (
                <View style={s.ledgerSum}>
                  <Text style={s.ledgerSumLabel}>Subtotal sub-receitas</Text>
                  <Text style={s.ledgerSumVal}>{formatCurrency(calculation.subRecipesCost)}</Text>
                </View>
              )}
            </View>
          )}

          {/* ═══════ ADDITIONAL COSTS ═══════ */}
          {recipe.additionalCosts.length > 0 && (
            <View style={s.ledger}>
              <View style={s.ledgerHead}>
                <Text style={s.ledgerTitle}>Custos adicionais</Text>
              </View>
              {recipe.additionalCosts.map((cost, idx) => {
                const isLabor = cost.name.toLowerCase().includes('mão de obra') || cost.name.toLowerCase().includes('mao de obra');
                return (
                  <View key={idx} style={s.ledgerRow}>
                    <View style={[s.ledgerDot, { backgroundColor: isLabor ? colors.pinkBg2 : colors.blueBg }]}>
                      <Ionicons
                        name={isLabor ? 'construct' : 'cube'}
                        size={17}
                        color={isLabor ? PINK : colors.blue}
                      />
                    </View>
                    <View style={s.ledgerInfo}>
                      <Text style={s.ledgerName}>{cost.name}</Text>
                    </View>
                    <Text style={s.ledgerVal}>{formatCurrency(cost.value)}</Text>
                  </View>
                );
              })}
              {calculation && (
                <View style={s.ledgerSum}>
                  <Text style={s.ledgerSumLabel}>Custo total de produção</Text>
                  <Text style={s.ledgerSumVal}>{formatCurrency(calculation.totalCost)}</Text>
                </View>
              )}
            </View>
          )}

          {/* ═══════ MARGIN ═══════ */}
          <View style={s.marginCard}>
            <View style={s.marginTop}>
              <Text style={s.marginLabel}>Margem de lucro</Text>
              <Text style={s.marginValue}>{recipe.profitMargin}%</Text>
            </View>
          </View>

          {!calculation && calculating && (
            <View style={s.calculationStatusCard}>
              <ActivityIndicator size="small" color={PINK} />
              <Text style={s.calculationStatusText}>{t('recipeDetail.calculating')}</Text>
            </View>
          )}

          {!calculation && calculationError && (
            <View style={s.calculationStatusCard}>
              <Ionicons name="alert-circle-outline" size={22} color="#D64545" />
              <View style={{ flex: 1 }}>
                <Text style={s.calculationErrorTitle}>{t('recipeDetail.calculationError')}</Text>
                <Text style={s.calculationStatusText}>{t('recipeDetail.calculationErrorHint')}</Text>
              </View>
              <TouchableOpacity style={s.retryButton} onPress={() => handleCalculate()} activeOpacity={0.7}>
                <Text style={s.retryButtonText}>{t('common.retry')}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ═══════ RESULT CARD (green gradient) ═══════ */}
          {calculation && (
            <LinearGradient
              colors={['#34C97B', GREEN, '#2BA060']}
              locations={[0, 0.6, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.resultCard}
            >
              <Text style={s.resultLabel}>Preço de venda sugerido</Text>
              <Text style={s.resultPrice}>{formatCurrency(calculation.suggestedPrice)}</Text>

              {activeSeason && (
                <View style={s.seasonBadge}>
                  <Text style={s.seasonText}>
                    🎉 {activeSeason.name}: {formatCurrency(calculation.suggestedPrice * activeSeason.multiplier)}
                    {' '}({activeSeason.multiplier >= 1 ? '+' : ''}{Math.round((activeSeason.multiplier - 1) * 100)}%)
                  </Text>
                </View>
              )}

              <View style={s.resultGrid}>
                <View style={s.resultGridItem}>
                  <Text style={s.resultGridVal}>{formatCurrency(calculation.suggestedPrice)}</Text>
                  <Text style={s.resultGridLbl}>por unidade</Text>
                </View>
                <View style={s.resultGridItem}>
                  <Text style={s.resultGridVal}>{formatCurrencyUnit(calculation.costPerUnit)}</Text>
                  <Text style={s.resultGridLbl}>custo / un</Text>
                </View>
                <View style={s.resultGridItem}>
                  <Text style={s.resultGridVal}>{formatCurrency(calculation.estimatedProfit)}</Text>
                  <Text style={s.resultGridLbl}>lucro estimado</Text>
                </View>
              </View>
            </LinearGradient>
          )}

          {/* ═══════ ACTIONS ═══════ */}
          {calculation && (
            <View style={s.actions}>
              <TouchableOpacity
                style={s.btnGhost}
                onPress={() => guardAction(handleShareQuote)}
                disabled={sharing}
                activeOpacity={0.7}
              >
                {sharing ? (
                  <ActivityIndicator size="small" color={INK} />
                ) : (
                  <>
                    <Ionicons name="share-outline" size={18} color={INK} />
                    <Text style={s.btnGhostText}>Compartilhar</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity activeOpacity={0.85} onPress={() => guardAction(handleShareQuote)} disabled={sharing}>
                <LinearGradient
                  colors={[colors.pinkBright, PINK]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={s.btnPrimary}
                >
                  <Ionicons name="document-text-outline" size={18} color="#fff" />
                  <Text style={s.btnPrimaryText}>Gerar PDF</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          {/* ═══════ SCALE CALCULATOR ═══════ */}
          {recipe.ingredients.length > 0 && calculation && (
            <View style={s.scaleCard}>
              <TouchableOpacity
                style={s.scaleHeader}
                onPress={() => {
                  if (!scaleOpen && !requirePremium('scaleCalculator')) return;
                  setScaleOpen(!scaleOpen);
                }}
                activeOpacity={0.7}
              >
                <View style={s.scaleIconWrap}>
                  <Ionicons name="resize-outline" size={20} color={PINK} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.scaleTitle}>{t('recipeDetail.scaleCalculator')}</Text>
                  <Text style={s.scaleSubtitle}>{t('recipeDetail.scaleSubtitle')}</Text>
                </View>
                <Ionicons name={scaleOpen ? 'chevron-up' : 'chevron-down'} size={18} color={INK3} />
              </TouchableOpacity>

              {scaleOpen && (
                <View style={s.scaleBody}>
                  <Text style={s.scaleLabel}>
                    {t('recipeDetail.originalRecipe', { yield: recipe.yield })}
                  </Text>
                  <View style={s.scaleInputRow}>
                    <Text style={s.scaleInputLabel}>{t('recipeDetail.wantToMake')}</Text>
                    <TextInput
                      style={s.scaleInput}
                      value={scaleInput}
                      onChangeText={setScaleInput}
                      keyboardType="numeric"
                      placeholder={String(recipe.yield)}
                      placeholderTextColor={INK3}
                    />
                    <Text style={s.scaleInputLabel}>{t('common.units')}</Text>
                  </View>

                  {scaleFactor !== null && (
                    <>
                      <View style={s.scaleMultiplier}>
                        <Ionicons name="swap-vertical-outline" size={16} color={PINK} />
                        <Text style={s.scaleMultiplierText}>
                          Multiplicador: <Text style={{ fontWeight: '700', color: INK }}>{scaleFactor.toFixed(2)}x</Text>
                        </Text>
                      </View>

                      <View style={s.scaleIngredients}>
                        <Text style={s.scaleIngredientsTitle}>{t('recipeDetail.neededIngredients')}</Text>
                        {recipe.ingredients.map((ing, idx) => {
                          const scaled = ing.quantityUsed * scaleFactor;
                          return (
                            <View key={idx} style={s.scaleIngRow}>
                              <Text style={s.scaleIngName}>{ing.ingredientName || `Ingrediente ${idx + 1}`}</Text>
                              <Text style={s.scaleIngQty}>{formatQuantity(scaled)} {ing.unit}</Text>
                            </View>
                          );
                        })}
                      </View>

                      <View style={s.scaleSummary}>
                        <View style={s.scaleSummaryRow}>
                          <Text style={s.scaleSummaryLabel}>{t('recipeDetail.totalCost')}</Text>
                          <Text style={s.scaleSummaryValue}>{formatCurrency(calculation.totalCost * scaleFactor)}</Text>
                        </View>
                        <View style={s.scaleSummaryRow}>
                          <Text style={s.scaleSummaryLabel}>{t('recipeDetail.totalSalePrice')}</Text>
                          <Text style={[s.scaleSummaryValue, { color: PINK, fontWeight: '800' }]}>
                            {formatCurrency(calculation.suggestedPrice * scaleQty)}
                          </Text>
                        </View>
                        <View style={s.scaleSummaryRow}>
                          <Text style={s.scaleSummaryLabel}>{t('recipeDetail.estimatedProfit')}</Text>
                          <Text style={[s.scaleSummaryValue, { color: GREEN }]}>
                            {formatCurrency((calculation.suggestedPrice * scaleQty) - (calculation.totalCost * scaleFactor))}
                          </Text>
                        </View>
                      </View>
                    </>
                  )}

                  {scaleInput !== '' && !scaleValid && (
                    <Text style={s.scaleError}>{t('recipeDetail.invalidNumber')}</Text>
                  )}
                </View>
              )}
            </View>
          )}

          <View style={{ height: 40 }} />
        </View>
      </ScrollView>
      <DemoGuardModal />
    </SafeAreaView>
  );
};

const { width: SCREEN_W } = Dimensions.get('window');

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },

  /* ── Hero ── */
  hero: {
    height: 158,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
    paddingTop: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW,
  },
  heroImage: {
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
  },
  heroAddPhoto: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  heroAddPhotoText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
  },
  heroActions: { flexDirection: 'row', gap: 8 },
  heroActionBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW,
  },
  heroPlaceholder: {
    height: 158,
    backgroundColor: LINE,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
  },

  /* ── Title ── */
  titleWrap: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 2 },
  title: { fontSize: 25, fontWeight: '700', color: INK, lineHeight: 28 },
  subtitle: { fontSize: 13, color: INK2, fontWeight: '600', marginTop: 3 },

  /* ── Body ── */
  body: { paddingHorizontal: 18, paddingTop: 14, gap: 14 },

  /* ── Ledger ── */
  ledger: {
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    ...SHADOW,
  },
  ledgerHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 13,
    paddingBottom: 9,
  },
  ledgerTitle: {
    fontSize: 13,
    color: INK2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '700',
  },
  ledgerCount: { fontSize: 12, fontWeight: '700', color: INK2 },
  ledgerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderTopWidth: 1,
    borderTopColor: LINE,
  },
  ledgerDot: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ledgerInfo: { flex: 1 },
  ledgerName: { fontSize: 14, fontWeight: '600', color: INK },
  ledgerQty: { fontSize: 11.5, color: INK2, fontWeight: '500', marginTop: 1 },
  ledgerVal: { fontSize: 14, fontWeight: '700', color: INK },
  ledgerSum: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: CREAM,
  },
  ledgerSumLabel: { fontSize: 13.5, fontWeight: '600', color: INK2 },
  ledgerSumVal: { fontSize: 17, fontWeight: '700', color: INK },

  /* ── Margin card ── */
  marginCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 15,
    paddingHorizontal: 16,
    ...SHADOW,
  },
  marginTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 13,
  },
  marginLabel: { fontSize: 14, fontWeight: '600', color: INK },
  marginValue: { fontSize: 22, fontWeight: '800', color: PINK },
  calculationStatusCard: {
    minHeight: 74,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  calculationErrorTitle: { color: INK, fontSize: 14, fontWeight: '700', marginBottom: 2 },
  calculationStatusText: { color: INK2, fontSize: 13, lineHeight: 18, flexShrink: 1 },
  retryButton: { backgroundColor: colors.pinkBg2, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9 },
  retryButtonText: { color: PINK, fontSize: 13, fontWeight: '700' },
  slider: {
    height: 10,
    borderRadius: 99,
    backgroundColor: colors.pinkBg,
    position: 'relative',
  },
  sliderFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 99,
  },
  sliderKnob: {
    position: 'absolute',
    top: '50%',
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#fff',
    borderWidth: 3,
    borderColor: PINK,
    marginTop: -13,
    marginLeft: -13,
    ...SHADOW,
    shadowColor: PINK,
    shadowOpacity: 0.4,
  },
  sliderScale: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 9,
  },
  sliderScaleText: { fontSize: 10.5, color: INK3, fontWeight: '600' },

  /* ── Result card (green gradient) ── */
  resultCard: {
    borderRadius: 24,
    padding: 18,
    position: 'relative',
    overflow: 'hidden',
  },
  resultLabel: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.92)' },
  resultPrice: { fontSize: 42, fontWeight: '800', color: '#fff', marginTop: 5, letterSpacing: 0.4 },
  seasonBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  seasonText: { fontSize: 12, fontWeight: '600', color: '#fff' },
  resultGrid: { flexDirection: 'row', gap: 10, marginTop: 15 },
  resultGridItem: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.17)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  resultGridVal: { fontSize: 17, fontWeight: '700', color: '#fff' },
  resultGridLbl: { fontSize: 11, color: 'rgba(255,255,255,0.92)', marginTop: 4, fontWeight: '500' },

  /* ── Actions ── */
  actions: { flexDirection: 'row', gap: 10 },
  btnGhost: {
    flex: 1,
    height: 50,
    borderRadius: 16,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...SHADOW,
  },
  btnGhostText: { fontSize: 15, fontWeight: '700', color: INK },
  btnPrimary: {
    flex: 1,
    height: 50,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
  },
  btnPrimaryText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  /* ── Scale calculator ── */
  scaleCard: { backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden', ...SHADOW },
  scaleHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  scaleIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.pinkBg2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scaleTitle: { fontSize: 16, fontWeight: '700', color: INK },
  scaleSubtitle: { fontSize: 12, color: INK2, marginTop: 2 },
  scaleBody: { paddingHorizontal: 16, paddingBottom: 16, borderTopWidth: 1, borderTopColor: LINE, paddingTop: 16 },
  scaleLabel: { fontSize: 13, color: INK2, marginBottom: 12 },
  scaleInputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  scaleInputLabel: { fontSize: 15, color: INK2 },
  scaleInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: LINE,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 18,
    fontWeight: '600',
    color: PINK,
    textAlign: 'center',
    backgroundColor: CREAM,
  },
  scaleMultiplier: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.pinkBg2,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  scaleMultiplierText: { fontSize: 13, color: PINK },
  scaleIngredients: { backgroundColor: CREAM, borderRadius: 12, padding: 14, marginBottom: 16 },
  scaleIngredientsTitle: {
    fontSize: 13,
    color: INK2,
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
    borderBottomColor: LINE,
  },
  scaleIngName: { fontSize: 15, color: INK, flex: 1 },
  scaleIngQty: { fontSize: 15, color: PINK, fontWeight: '700' },
  scaleSummary: { backgroundColor: CREAM, borderRadius: 12, padding: 14, gap: 8, borderWidth: 1, borderColor: LINE },
  scaleSummaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  scaleSummaryLabel: { fontSize: 15, color: INK2 },
  scaleSummaryValue: { fontSize: 15, color: INK, fontWeight: '700' },
  scaleError: { fontSize: 13, color: colors.error, marginTop: 4 },

  /* ── Skeleton ── */
  skeletonBody: { padding: 18, gap: 12 },
  skeletonLedger: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    gap: 10,
    marginTop: 8,
    ...SHADOW,
  },
  skeletonRow: { flexDirection: 'row', alignItems: 'center' },
});
