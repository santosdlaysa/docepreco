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
  ActivityIndicator,
  Modal,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { recipeApi } from '../../data/api/recipeApi';
import { saleApi } from '../../data/api/saleApi';
import { ingredientApi } from '../../data/api/ingredientApi';
import { isDemoMode } from '../../data/demo/demoMode';
import { demoRecipeApi, demoSaleApi, demoIngredientApi } from '../../data/demo/demoApi';
import { applySaleDeduction } from '../../data/stock/stockStorage';
import { Recipe } from '../../domain/entities/Recipe';
import { Ingredient } from '../../domain/entities/Ingredient';
import { colors } from '../theme/colors';
import { useToast } from '../context/ToastContext';
import { useTranslation } from 'react-i18next';
import { parseLocaleNumber } from '../utils/number';

/* ─── Design tokens ─── */
const INK = '#3D2233';
const INK2 = '#9A7E8C';
const INK3 = '#C4B0BB';
const PINK = '#EA4B92';
const GREEN = '#43BE6E';
const CREAM = '#FFF6F0';
const LINE = '#F1E2DA';
const SHADOW = {
  shadowColor: INK,
  shadowOffset: { width: 0, height: 2 } as const,
  shadowOpacity: 0.07,
  shadowRadius: 8,
  elevation: 3,
};

const THUMB_COLORS = ['#5E3A23', '#8B5E3C', '#EA4B92', '#F9C74F', '#90BE6D', '#7B68EE', '#FF6B6B', '#4ECDC4'];

const fmtCurrency = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const CreateSaleScreen: React.FC = () => {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const rApi = isDemoMode() ? demoRecipeApi : recipeApi;
  const sApi = isDemoMode() ? demoSaleApi : saleApi;
  const iApi = isDemoMode() ? demoIngredientApi : ingredientApi;

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [quantity, setQuantity] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    rApi.getAll().then(setRecipes).catch(() => {});
    iApi.getAll().then(setIngredients).catch(() => {});
  }, []);

  const handlePriceChange = (text: string) => {
    // Mantém a vírgula como separador decimal (padrão BR); aceita ponto também
    const cleaned = text.replace(/[^0-9.,]/g, '').replace(/\./g, ',');
    const parts = cleaned.split(',');
    const value = parts.length > 2 ? parts[0] + ',' + parts.slice(1).join('') : cleaned;
    const commaIdx = value.indexOf(',');
    setSalePrice(commaIdx >= 0 && value.length - commaIdx > 3 ? value.slice(0, commaIdx + 3) : value);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!selectedRecipe) e.recipe = 'Escolha uma receita';
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
      await sApi.create({
        recipeId: selectedRecipe!.id,
        quantitySold: soldQty,
        salePrice: parseLocaleNumber(salePrice),
        saleDate,
        notes: notes.trim() || undefined,
      });
      // Baixa automática de estoque (Master) — só afeta ingredientes controlados.
      let lowStock: { name: string }[] = [];
      try {
        lowStock = await applySaleDeduction(selectedRecipe!, recipes, ingredients, soldQty);
      } catch { /* baixa de estoque é best-effort, não bloqueia a venda */ }
      showToast(
        lowStock.length > 0
          ? `Venda registrada! Estoque baixo: ${lowStock.map(l => l.name).join(', ')}`
          : 'Venda registrada!',
        lowStock.length > 0 ? 'warning' : 'success',
      );
      navigation.goBack();
    } catch (error) {
      showToast((error as Error).message || 'Erro ao salvar', 'error');
    } finally {
      setLoading(false);
    }
  };

  const totalRevenue = quantity && salePrice
    ? parseInt(quantity) * parseLocaleNumber(salePrice)
    : null;
  const showTotal = totalRevenue !== null && !isNaN(totalRevenue) && totalRevenue > 0;

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
        <View style={st.shT}><Text style={st.shH1}>Registrar venda</Text></View>
        <TouchableOpacity onPress={handleSave} disabled={loading} activeOpacity={0.8}
          style={[st.actPill, { backgroundColor: PINK, shadowColor: PINK, shadowOpacity: 0.3 }]}>
          {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={st.actPillText}>Salvar</Text>}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView style={st.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingTop: 14, paddingBottom: 40, gap: 14 }}>

          {/* ── Receita ── */}
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
            </LinearGradient>
          )}

          {/* ── Save button ── */}
          <TouchableOpacity onPress={handleSave} disabled={loading} activeOpacity={0.85}>
            <LinearGradient colors={['#FF6AAE', PINK]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={st.btn}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={st.btnText}>Salvar venda</Text>}
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

  /* two columns */
  two: { flexDirection: 'row', gap: 11 },

  /* result card (green) */
  result: {
    borderRadius: 24, padding: 18, ...SHADOW,
    shadowColor: GREEN, shadowOpacity: 0.34, shadowRadius: 16, elevation: 6,
  },
  rl: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.92)', letterSpacing: 0.2 },
  rprice: { fontSize: 38, fontWeight: '800', color: '#fff', marginTop: 5, letterSpacing: 0.4 },

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
