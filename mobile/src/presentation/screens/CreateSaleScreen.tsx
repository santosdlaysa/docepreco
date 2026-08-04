import { colors } from '../theme/colors';
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { recipeApi } from '../../data/api/recipeApi';
import { saleApi } from '../../data/api/saleApi';
import { ingredientApi } from '../../data/api/ingredientApi';
import { isDemoMode } from '../../data/demo/demoMode';
import { demoRecipeApi, demoSaleApi, demoIngredientApi } from '../../data/demo/demoApi';
import { applySaleDeduction, reverseSaleDeduction } from '../../data/api/stockApi';
import { customProductStorage } from '../../data/storage/customProductStorage';
import { Recipe } from '../../domain/entities/Recipe';
import { Ingredient } from '../../domain/entities/Ingredient';
import { PaymentMethod } from '../../domain/entities/Sale';
import { RootStackParamList } from '../navigation/types';
import { useToast } from '../context/ToastContext';
import { useTranslation } from 'react-i18next';
import { parseLocaleNumber } from '../utils/number';
import { computeDiscountAmount, DiscountType } from '../utils/discount';
import { DiscountInput } from '../components/DiscountInput';

/* ─── Design tokens ─── */
const INK = colors.text;
const INK2 = colors.textSecondary;
const INK3 = colors.textMuted;
const PINK = colors.primary;
const GREEN = colors.green;
const CREAM = colors.pinkBg3;
const LINE = colors.border;
const SHADOW = {
  shadowColor: INK,
  shadowOffset: { width: 0, height: 2 } as const,
  shadowOpacity: 0.07,
  shadowRadius: 8,
  elevation: 3,
};

const THUMB_COLORS = ['#5E3A23', '#8B5E3C', colors.primary, '#F9C74F', '#90BE6D', '#7B68EE', '#FF6B6B', '#4ECDC4'];

const PAYMENT_METHODS: { key: PaymentMethod; icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
  { key: 'pix', icon: 'qr-code-outline', label: 'Pix' },
  { key: 'dinheiro', icon: 'cash-outline', label: 'Dinheiro' },
  { key: 'credito', icon: 'card-outline', label: 'Crédito' },
  { key: 'debito', icon: 'card-outline', label: 'Débito' },
];

const fmtCurrency = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

type SaleMode = 'recipe' | 'custom';

export const CreateSaleScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'CreateSale'>>();
  const editingSale = route.params?.sale ?? null;
  const editing = !!editingSale;
  const { t } = useTranslation();
  const { showToast } = useToast();
  const rApi = isDemoMode() ? demoRecipeApi : recipeApi;
  const sApi = isDemoMode() ? demoSaleApi : saleApi;
  const iApi = isDemoMode() ? demoIngredientApi : ingredientApi;

  // Só pix/dinheiro/credito/debito têm chip; 'cartao' (legado) cai no default.
  const validPayment = (p: PaymentMethod | null | undefined): p is PaymentMethod =>
    p === 'pix' || p === 'dinheiro' || p === 'credito' || p === 'debito';

  const [mode, setMode] = useState<SaleMode>(editingSale ? (editingSale.recipeId ? 'recipe' : 'custom') : 'recipe');

  /* recipe mode */
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [showPicker, setShowPicker] = useState(false);

  /* custom product mode */
  const [customName, setCustomName] = useState(editingSale && !editingSale.recipeId ? editingSale.recipeName : '');
  const [savedProducts, setSavedProducts] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  /* shared fields */
  const [quantity, setQuantity] = useState(editingSale ? String(editingSale.quantitySold) : '');
  const [salePrice, setSalePrice] = useState(editingSale ? String(editingSale.salePrice).replace('.', ',') : '');
  const [discountType, setDiscountType] = useState<DiscountType>('fixed');
  const [discountValue, setDiscountValue] = useState(editingSale && editingSale.discount > 0 ? String(editingSale.discount).replace('.', ',') : '');
  const [saleDate, setSaleDate] = useState(editingSale?.saleDate ?? new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(validPayment(editingSale?.paymentMethod) ? editingSale!.paymentMethod! : 'pix');
  const [clientName, setClientName] = useState(editingSale?.clientName ?? '');
  const [notes, setNotes] = useState(editingSale?.notes ?? '');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    rApi.getAll().then(list => {
      setRecipes(list);
      // Ao editar uma venda de receita, pré-seleciona a receita quando a lista chega.
      if (editingSale?.recipeId) {
        const found = list.find(r => r.id === editingSale.recipeId);
        if (found) setSelectedRecipe(found);
      }
    }).catch(() => {});
    iApi.getAll().then(setIngredients).catch(() => {});
    customProductStorage.getAll().then(setSavedProducts).catch(() => {});
  }, []);

  const filteredSuggestions = savedProducts.filter(p =>
    customName.trim().length === 0 || p.toLowerCase().includes(customName.toLowerCase())
  );

  const handlePriceChange = (text: string) => {
    const cleaned = text.replace(/[^0-9.,]/g, '').replace(/\./g, ',');
    const parts = cleaned.split(',');
    const value = parts.length > 2 ? parts[0] + ',' + parts.slice(1).join('') : cleaned;
    const commaIdx = value.indexOf(',');
    setSalePrice(commaIdx >= 0 && value.length - commaIdx > 3 ? value.slice(0, commaIdx + 3) : value);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (mode === 'recipe' && !selectedRecipe) e.recipe = 'Escolha uma receita';
    if (mode === 'custom' && !customName.trim()) e.customName = 'Informe o nome do produto';
    if (!quantity || parseInt(quantity) <= 0) e.qty = 'Obrigatório';
    if (!salePrice || parseLocaleNumber(salePrice) <= 0) e.price = 'Obrigatório';
    if (!saleDate) e.date = 'Obrigatório';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const soldQty = parseInt(quantity);
      const subtotal = soldQty * parseLocaleNumber(salePrice);
      const discount = computeDiscountAmount(subtotal, discountType, parseLocaleNumber(discountValue));
      const dto = mode === 'recipe'
        ? {
            recipeId: selectedRecipe!.id,
            quantitySold: soldQty,
            salePrice: parseLocaleNumber(salePrice),
            discount,
            saleDate,
            paymentMethod,
            clientName: clientName.trim() || undefined,
            notes: notes.trim() || undefined,
          }
        : {
            recipeId: null,
            productName: customName.trim(),
            quantitySold: soldQty,
            salePrice: parseLocaleNumber(salePrice),
            discount,
            saleDate,
            paymentMethod,
            clientName: clientName.trim() || undefined,
            notes: notes.trim() || undefined,
          };

      if (editing) {
        await sApi.update(editingSale!.id, dto);
        // Reconciliação de estoque: só mexe se o que afeta o consumo mudou
        // (receita ou quantidade). Estorna a baixa antiga e aplica a nova.
        const oldRecipeId = editingSale!.recipeId;
        const newRecipeId = mode === 'recipe' ? selectedRecipe!.id : null;
        if (oldRecipeId !== newRecipeId || editingSale!.quantitySold !== soldQty) {
          try {
            if (oldRecipeId) {
              const oldRecipe = recipes.find(r => r.id === oldRecipeId);
              if (oldRecipe) await reverseSaleDeduction(oldRecipe, recipes, ingredients, editingSale!.quantitySold);
            }
            if (mode === 'recipe') {
              await applySaleDeduction(selectedRecipe!, recipes, ingredients, soldQty);
            }
          } catch { /* best-effort */ }
        }
        if (mode === 'custom') { await customProductStorage.add(customName.trim()); }
        showToast('Venda atualizada!', 'success');
        navigation.goBack();
        return;
      }

      if (mode === 'recipe') {
        await sApi.create(dto);
        let lowStock: { name: string }[] = [];
        try {
          lowStock = await applySaleDeduction(selectedRecipe!, recipes, ingredients, soldQty);
        } catch { /* best-effort */ }
        showToast(
          lowStock.length > 0
            ? `Venda registrada! Estoque baixo: ${lowStock.map(l => l.name).join(', ')}`
            : 'Venda registrada!',
          lowStock.length > 0 ? 'warning' : 'success',
        );
      } else {
        await sApi.create(dto);
        await customProductStorage.add(customName.trim());
        setSavedProducts(await customProductStorage.getAll());
        showToast('Venda registrada!', 'success');
      }
      navigation.goBack();
    } catch (error) {
      showToast((error as Error).message || 'Erro ao salvar', 'error');
    } finally {
      setLoading(false);
    }
  };

  const subtotal = quantity && salePrice ? parseInt(quantity) * parseLocaleNumber(salePrice) : 0;
  const discountAmount = computeDiscountAmount(subtotal, discountType, parseLocaleNumber(discountValue));
  const totalRevenue = subtotal > 0 ? subtotal - discountAmount : null;
  const showTotal = totalRevenue !== null && !isNaN(totalRevenue) && subtotal > 0;

  const recipeInitials = selectedRecipe
    ? selectedRecipe.name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('')
    : '';

  return (
    <SafeAreaView style={st.safe}>
      {/* ── Header ── */}
      <View style={st.sh}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={st.bk}>
          <Ionicons name="arrow-back" size={20} color={INK} />
        </TouchableOpacity>
        <View style={st.shT}><Text style={st.shH1}>{editing ? 'Editar venda' : 'Registrar venda'}</Text></View>
        <TouchableOpacity onPress={handleSave} disabled={loading} activeOpacity={0.8}
          style={[st.actPill, { backgroundColor: PINK, shadowColor: PINK, shadowOpacity: 0.3 }]}>
          {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={st.actPillText}>Salvar</Text>}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView style={st.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingTop: 14, paddingBottom: 40, gap: 14 }}>

          {/* ── Modo: Receita vs Produto avulso ── */}
          <View style={st.modeRow}>
            <TouchableOpacity
              style={[st.modeTab, mode === 'recipe' && st.modeTabActive]}
              onPress={() => { setMode('recipe'); setErrors({}); }}
              activeOpacity={0.8}
            >
              <Ionicons name="book-outline" size={14} color={mode === 'recipe' ? '#fff' : INK2} style={{ marginRight: 5 }} />
              <Text style={[st.modeTabText, mode === 'recipe' && st.modeTabTextActive]}>Receita</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[st.modeTab, mode === 'custom' && st.modeTabActive]}
              onPress={() => { setMode('custom'); setErrors({}); }}
              activeOpacity={0.8}
            >
              <Ionicons name="pricetag-outline" size={14} color={mode === 'custom' ? '#fff' : INK2} style={{ marginRight: 5 }} />
              <Text style={[st.modeTabText, mode === 'custom' && st.modeTabTextActive]}>Produto avulso</Text>
            </TouchableOpacity>
          </View>

          {/* ── Receita ── */}
          {mode === 'recipe' && (
            <View style={st.field}>
              <Text style={st.label}>Receita</Text>
              <TouchableOpacity style={[st.input, errors.recipe ? st.inputErr : null]} onPress={() => setShowPicker(true)} activeOpacity={0.8}>
                {selectedRecipe ? (
                  <>
                    <LinearGradient colors={['#8B5E3C', '#5E3A23']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                      style={st.recipeThumb}>
                      <Text style={st.recipeThumbText}>{recipeInitials}</Text>
                    </LinearGradient>
                    <Text style={st.inputVal}>{selectedRecipe.name}</Text>
                  </>
                ) : (
                  <Text style={st.placeholder}>Selecionar receita</Text>
                )}
                <Ionicons name="chevron-forward" size={16} color={INK3} style={{ marginLeft: 'auto' }} />
              </TouchableOpacity>
              {errors.recipe && <Text style={st.err}>{errors.recipe}</Text>}
            </View>
          )}

          {/* ── Produto avulso ── */}
          {mode === 'custom' && (
            <View style={st.field}>
              <Text style={st.label}>Nome do produto</Text>
              <View style={[st.input, errors.customName ? st.inputErr : null]}>
                <Ionicons name="pricetag-outline" size={18} color={INK3} />
                <TextInput
                  style={st.inputText}
                  value={customName}
                  onChangeText={setCustomName}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                  placeholder="Ex: Brigadeiro gourmet"
                  placeholderTextColor={INK3}
                  returnKeyType="done"
                />
                {customName.length > 0 && (
                  <TouchableOpacity onPress={() => setCustomName('')}>
                    <Ionicons name="close-circle" size={18} color={INK3} />
                  </TouchableOpacity>
                )}
              </View>
              {errors.customName && <Text style={st.err}>{errors.customName}</Text>}

              {/* Sugestões */}
              {showSuggestions && filteredSuggestions.length > 0 && (
                <View style={st.suggestions}>
                  {filteredSuggestions.slice(0, 6).map(name => (
                    <TouchableOpacity
                      key={name}
                      style={st.suggestionRow}
                      onPress={() => { setCustomName(name); setShowSuggestions(false); }}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="time-outline" size={14} color={INK2} style={{ marginRight: 8 }} />
                      <Text style={st.suggestionText}>{name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* ── Quantidade + Preço ── */}
          <View style={st.two}>
            <View style={[st.field, { flex: 1 }]}>
              <Text style={st.label}>Quantidade</Text>
              <View style={[st.input, errors.qty ? st.inputErr : null]}>
                <TextInput style={st.inputText} value={quantity} onChangeText={setQuantity}
                  placeholder="2" placeholderTextColor={INK3} keyboardType="number-pad" />
                <Text style={st.suffix}>un</Text>
              </View>
              {errors.qty && <Text style={st.err}>{errors.qty}</Text>}
            </View>
            <View style={[st.field, { flex: 1 }]}>
              <Text style={st.label}>Preço unitário</Text>
              <View style={[st.input, errors.price ? st.inputErr : null]}>
                <Text style={st.phTxt}>R$</Text>
                <TextInput style={st.inputText} value={salePrice} onChangeText={handlePriceChange}
                  placeholder="65,00" placeholderTextColor={INK3} keyboardType="decimal-pad" />
              </View>
              {errors.price && <Text style={st.err}>{errors.price}</Text>}
            </View>
          </View>

          {/* ── Desconto ── */}
          <DiscountInput
            type={discountType}
            value={discountValue}
            onChangeType={setDiscountType}
            onChangeValue={setDiscountValue}
          />

          {/* ── Data da venda ── */}
          <View style={st.field}>
            <Text style={st.label}>Data da venda</Text>
            <View style={[st.input, errors.date ? st.inputErr : null]}>
              <Ionicons name="time-outline" size={18} color={INK3} />
              <TextInput style={st.inputText} value={saleDate} onChangeText={setSaleDate}
                placeholder="2026-05-29" placeholderTextColor={INK3} />
            </View>
            {errors.date && <Text style={st.err}>{errors.date}</Text>}
          </View>

          {/* ── Forma de pagamento ── */}
          <View style={st.field}>
            <Text style={st.label}>Forma de pagamento</Text>
            <View style={st.ugrid}>
              {PAYMENT_METHODS.map(m => {
                const on = paymentMethod === m.key;
                return (
                  <TouchableOpacity key={m.key} onPress={() => setPaymentMethod(m.key)}
                    style={[st.payChip, { backgroundColor: on ? PINK + '15' : '#fff', borderWidth: on ? 2 : 0, borderColor: PINK }]} activeOpacity={0.7}>
                    <Ionicons name={m.icon} size={14} color={on ? PINK : INK3} />
                    <Text style={[st.payChipText, { color: on ? PINK : INK2, marginLeft: 4 }]}>{m.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ── Vendido para ── */}
          <View style={st.field}>
            <Text style={st.label}>Vendido para (opcional)</Text>
            <View style={st.input}>
              <Ionicons name="person-outline" size={18} color={INK3} />
              <TextInput
                style={st.inputText}
                value={clientName}
                onChangeText={setClientName}
                placeholder="Ex: Dona Ana"
                placeholderTextColor={INK3}
                returnKeyType="done"
              />
              {clientName.length > 0 && (
                <TouchableOpacity onPress={() => setClientName('')}>
                  <Ionicons name="close-circle" size={18} color={INK3} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* ── Notas ── */}
          <View style={st.field}>
            <Text style={st.label}>Notas (opcional)</Text>
            <View style={[st.input, st.inputArea]}>
              <TextInput style={[st.inputText, { minHeight: 60, textAlignVertical: 'top' }]}
                value={notes} onChangeText={setNotes} multiline
                placeholder="Ex: encomenda da Dona Ana" placeholderTextColor={INK3} />
            </View>
          </View>

          {/* ── Total (green card) ── */}
          {showTotal && (
            <LinearGradient colors={['#34C97B', GREEN, '#2BA060']} locations={[0, 0.6, 1]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.result}>
              <Text style={st.rl}>Total da venda</Text>
              <Text style={st.rprice}>{fmtCurrency(totalRevenue!)}</Text>
              {discountAmount > 0 && (
                <Text style={st.rDiscount}>Desconto: -{fmtCurrency(discountAmount)}</Text>
              )}
            </LinearGradient>
          )}

          {/* ── Save button ── */}
          <TouchableOpacity onPress={handleSave} disabled={loading} activeOpacity={0.85}>
            <LinearGradient colors={[colors.pinkBright, PINK]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={st.btn}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={st.btnText}>{editing ? 'Salvar alterações' : 'Salvar venda'}</Text>}
            </LinearGradient>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Recipe picker modal ── */}
      <Modal visible={showPicker} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={st.modalSafe}>
          <View style={st.modalHead}>
            <Text style={st.modalTitle}>Escolher receita</Text>
            <TouchableOpacity onPress={() => setShowPicker(false)}>
              <Ionicons name="close" size={24} color={INK} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={recipes}
            keyExtractor={item => item.id}
            contentContainerStyle={{ padding: 18 }}
            renderItem={({ item, index }) => {
              const ini = item.name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');
              const bg = THUMB_COLORS[index % THUMB_COLORS.length];
              return (
                <TouchableOpacity
                  onPress={() => { setSelectedRecipe(item); setShowPicker(false); }}
                  activeOpacity={0.8}
                  style={st.pickerRow}
                >
                  <View style={[st.pickerThumb, { backgroundColor: bg }]}>
                    <Text style={st.pickerThumbText}>{ini}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={st.pickerName}>{item.name}</Text>
                    <Text style={st.pickerMeta}>{item.yield} un · {item.ingredients.length} ingredientes</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={INK3} />
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={{ alignItems: 'center', paddingTop: 40 }}>
                <Text style={{ color: INK2, fontSize: 14 }}>Nenhuma receita cadastrada</Text>
              </View>
            }
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

/* ──────────────────────── STYLES ──────────────────────── */
const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },

  /* header (.sh) */
  sh: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10 },
  bk: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...SHADOW },
  shT: { flex: 1 },
  shH1: { fontSize: 22, fontWeight: '700', color: INK, lineHeight: 26 },
  actPill: { height: 38, paddingHorizontal: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center', ...SHADOW },
  actPillText: { color: '#fff', fontWeight: '700', fontSize: 13.5 },

  body: { flex: 1, paddingHorizontal: 18 },

  /* mode toggle */
  modeRow: {
    flexDirection: 'row', gap: 8,
    backgroundColor: '#F5EBF0', borderRadius: 14, padding: 4,
  },
  modeTab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 9, borderRadius: 11,
  },
  modeTabActive: { backgroundColor: PINK, ...SHADOW, shadowColor: PINK, shadowOpacity: 0.3 },
  modeTabText: { fontSize: 13.5, fontWeight: '600', color: INK2 },
  modeTabTextActive: { color: '#fff' },

  /* field */
  field: { gap: 7 },
  label: { fontSize: 13, fontWeight: '700', color: INK, marginLeft: 2 },
  err: { fontSize: 12, color: colors.error, marginLeft: 2 },

  /* input */
  input: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14, paddingHorizontal: 15,
    flexDirection: 'row', alignItems: 'center', gap: 10, ...SHADOW,
  },
  inputErr: { borderWidth: 1.5, borderColor: colors.error },
  inputArea: { alignItems: 'flex-start' },
  inputText: { flex: 1, fontSize: 15, color: INK, padding: 0 },
  inputVal: { fontSize: 15, color: INK, flex: 1 },
  placeholder: { fontSize: 15, color: INK3, flex: 1 },
  phTxt: { color: INK3, fontWeight: '700', fontSize: 13 },
  suffix: { marginLeft: 'auto' as any, color: INK2, fontWeight: '700', fontSize: 13 },

  /* recipe thumbnail in input */
  recipeThumb: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  recipeThumbText: { color: '#fff', fontSize: 11, fontWeight: '800' },

  /* suggestions dropdown */
  suggestions: {
    backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden',
    ...SHADOW, marginTop: -4,
  },
  suggestionRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 11, paddingHorizontal: 15,
    borderBottomWidth: 1, borderBottomColor: LINE,
  },
  suggestionText: { fontSize: 14.5, color: INK, flex: 1 },

  /* two columns */
  two: { flexDirection: 'row', gap: 11 },

  /* payment method chips */
  ugrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  payChip: { height: 40, minWidth: 46, paddingHorizontal: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', ...SHADOW },
  payChipText: { fontWeight: '700', fontSize: 13.5 },

  /* result card (green) */
  result: {
    borderRadius: 24, padding: 18, ...SHADOW,
    shadowColor: GREEN, shadowOpacity: 0.34, shadowRadius: 16, elevation: 6,
  },
  rl: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.92)', letterSpacing: 0.2 },
  rprice: { fontSize: 38, fontWeight: '800', color: '#fff', marginTop: 5, letterSpacing: 0.4 },
  rDiscount: { fontSize: 12.5, fontWeight: '600', color: 'rgba(255,255,255,0.85)', marginTop: 4 },

  /* button */
  btn: { height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center', ...SHADOW, shadowColor: PINK, shadowOpacity: 0.35 },
  btnText: { fontSize: 16, fontWeight: '700', color: '#fff' },

  /* modal */
  modalSafe: { flex: 1, backgroundColor: '#FFFFFF' },
  modalHead: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 18, borderBottomWidth: 1, borderBottomColor: LINE, backgroundColor: '#fff',
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: INK },
  pickerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 18, padding: 13, paddingHorizontal: 15,
    marginBottom: 8, ...SHADOW,
  },
  pickerThumb: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  pickerThumbText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  pickerName: { fontSize: 14.5, fontWeight: '700', color: INK },
  pickerMeta: { fontSize: 12, color: INK2, fontWeight: '500', marginTop: 2 },
});
