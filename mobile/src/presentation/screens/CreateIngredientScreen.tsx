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
  FlatList,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { ingredientApi } from '../../data/api/ingredientApi';
import { isDemoMode } from '../../data/demo/demoMode';
import { demoIngredientApi } from '../../data/demo/demoApi';
import { Unit } from '../../domain/entities/Ingredient';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { useToast } from '../context/ToastContext';
import { priceHistoryApi } from '../../data/api/priceHistoryApi';
import { useTranslation } from 'react-i18next';
import { PRICING_TUTORIAL } from '../utils/pricingTutorial';

const PKG_TYPES = ['Lata', 'Pacote', 'Saco', 'Caixa', 'Garrafa', 'Pote'];
const UNIT_OPTIONS: { value: Unit; label: string }[] = [
  { value: 'unit', label: 'un' },
  { value: 'g', label: 'g' },
  { value: 'kg', label: 'kg' },
  { value: 'ml', label: 'ml' },
  { value: 'l', label: 'l' },
];

type RouteProps = RouteProp<RootStackParamList, 'EditIngredient'>;

const fmtBRL = (v: number): string => {
  if (!isFinite(v) || isNaN(v)) return 'R$ 0,00';
  if (v < 0.01 && v > 0) return `R$ ${v.toFixed(3).replace('.', ',')}`;
  const fixed = v.toFixed(2);
  const [int, dec] = fixed.split('.');
  return `R$ ${int.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${dec}`;
};

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

export const CreateIngredientScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProps>();
  const { t } = useTranslation();
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
  const [allNames, setAllNames] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const { showToast } = useToast();
  const api = isDemoMode() ? demoIngredientApi : ingredientApi;

  useEffect(() => {
    if (!isEditing) api.getAll().then(list => setAllNames(list.map(i => i.name))).catch(() => {});
  }, [isEditing]);

  useEffect(() => {
    if (!ingredientId) return;
    api.getById(ingredientId)
      .then(ing => {
        setName(ing.name);
        setPurchaseQuantity(String(ing.purchaseQuantity));
        setPurchasePrice(Number(ing.purchasePrice).toFixed(2).replace('.', ','));
        setUnit(ing.unit);
        setOriginalPrice(ing.purchasePrice);
        setOriginalQty(ing.purchaseQuantity);
        if (ing.purchaseUnitLabel) {
          setUseCustomUnit(true);
          setPurchaseUnitLabel(ing.purchaseUnitLabel);
          setPurchaseUnitWeight(String(ing.purchaseUnitWeight ?? ''));
        }
      })
      .catch(() => showToast(t('createIngredient.loadError'), 'error'))
      .finally(() => setLoadingData(false));
  }, [ingredientId]);

  const handleNameChange = (text: string) => {
    setName(text);
    setSuggestions(text.trim().length >= 2 ? allNames.filter(n => n.toLowerCase().includes(text.toLowerCase())) : []);
  };

  const handlePriceChange = (text: string) => {
    // Mantém a vírgula como separador decimal (padrão BR); aceita ponto também
    const cleaned = text.replace(/[^0-9.,]/g, '').replace(/\./g, ',');
    const parts = cleaned.split(',');
    const value = parts.length > 2 ? parts[0] + ',' + parts.slice(1).join('') : cleaned;
    const commaIdx = value.indexOf(',');
    setPurchasePrice(commaIdx >= 0 && value.length - commaIdx > 3 ? value.slice(0, commaIdx + 3) : value);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Obrigatório';
    if (!purchaseQuantity || parseFloat(purchaseQuantity.replace(',', '.')) <= 0) e.qty = 'Obrigatório';
    if (!purchasePrice || parseFloat(purchasePrice.replace(',', '.')) <= 0) e.price = 'Obrigatório';
    if (!unit) e.unit = 'Escolha uma unidade';
    if (useCustomUnit) {
      if (!purchaseUnitLabel.trim()) e.pkgLabel = 'Obrigatório';
      if (!purchaseUnitWeight || parseFloat(purchaseUnitWeight.replace(',', '.')) <= 0) e.pkgWeight = 'Obrigatório';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const payload = {
        name: name.trim(),
        purchaseQuantity: parseFloat(purchaseQuantity.replace(',', '.')),
        purchasePrice: parseFloat(purchasePrice.replace(',', '.')),
        unit,
        purchaseUnitLabel: useCustomUnit ? purchaseUnitLabel.trim() : undefined,
        purchaseUnitWeight: useCustomUnit ? parseFloat(purchaseUnitWeight.replace(',', '.')) : undefined,
      };
      if (isEditing) {
        await api.update(ingredientId!, payload);
        if (originalPrice !== null && (payload.purchasePrice !== originalPrice || payload.purchaseQuantity !== originalQty)) {
          await priceHistoryApi.add(ingredientId!, { price: payload.purchasePrice, purchaseQuantity: payload.purchaseQuantity, unit }).catch(() => {});
        }
        showToast(t('createIngredient.updated'), 'success');
      } else {
        await api.create(payload);
        showToast(t('createIngredient.created'), 'success');
      }
      navigation.goBack();
    } catch (error) {
      showToast((error as Error).message || String(error), 'error');
    } finally {
      setLoading(false);
    }
  };

  // Preview
  const qty = parseFloat((purchaseQuantity || '0').replace(',', '.'));
  const price = parseFloat((purchasePrice || '0').replace(',', '.'));
  const weight = parseFloat((purchaseUnitWeight || '0').replace(',', '.'));
  const effectiveQty = useCustomUnit && weight > 0 ? qty * weight : qty;
  const pricePerUnit = effectiveQty > 0 ? price / effectiveQty : 0;
  const pricePerPkg = qty > 0 ? price / qty : 0;
  const showPreview = qty > 0 && price > 0;

  /* ─── Loading state ─── */
  if (loadingData) {
    return (
      <SafeAreaView style={st.safe}>
        <View style={st.sh}><TouchableOpacity onPress={() => navigation.goBack()} style={st.bk}><Ionicons name="arrow-back" size={20} color={INK} /></TouchableOpacity>
          <View style={st.shT}><Text style={st.shH1}>Editar ingrediente</Text></View><View style={{ width: 60 }} /></View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator size="large" color={PINK} /></View>
      </SafeAreaView>
    );
  }

  /* ─── Main render ─── */
  return (
    <SafeAreaView style={st.safe}>
      {/* ── Header ── */}
      <View style={st.sh}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={st.bk}>
          <Ionicons name="arrow-back" size={20} color={INK} />
        </TouchableOpacity>
        <View style={st.shT}><Text style={st.shH1}>{isEditing ? 'Editar ingrediente' : 'Novo ingrediente'}</Text></View>
        <TouchableOpacity onPress={handleSave} disabled={loading} activeOpacity={0.8}
          style={[st.actPill, { backgroundColor: PINK, shadowColor: PINK, shadowOpacity: 0.3 }]}>
          {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13.5 }}>Salvar</Text>}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView style={st.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingTop: 14, paddingBottom: 40, gap: 14 }}>

          {/* ── Banner informativo ── */}
          <View style={st.infoBanner}>
            <View style={st.infoBannerIcon}>
              <Ionicons name="information-circle" size={18} color="#2BA7DD" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={st.infoBannerTitle}>
                {isEditing ? 'Atualize os dados' : 'Preencha os dados do ingrediente'}
              </Text>
              <Text style={st.infoBannerSub}>
                {isEditing
                  ? 'Ao alterar o preço, o histórico será atualizado automaticamente.'
                  : 'Informe a quantidade total comprada e o valor total pago. Não use aqui a quantidade da receita.'}
              </Text>
              <TouchableOpacity
                onPress={() => Alert.alert('Tutorial', PRICING_TUTORIAL)}
                activeOpacity={0.8}
                style={st.tutorialBtn}
              >
                <Text style={st.tutorialBtnText}>Ver tutorial</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Nome ── */}
          <View style={[st.field, { zIndex: 10 }]}>
            <Text style={st.label}>Nome do ingrediente</Text>
            <View style={[st.input, errors.name ? st.inputErr : null]}>
              <Ionicons name="leaf-outline" size={18} color={INK3} />
              <TextInput style={st.inputText} value={name} onChangeText={handleNameChange}
                placeholder="Ex: Leite condensado" placeholderTextColor={INK3} />
            </View>
            {errors.name && <Text style={st.err}>{errors.name}</Text>}
            {suggestions.length > 0 && (
              <View style={st.sugBox}>
                {suggestions.slice(0, 5).map(s => (
                  <TouchableOpacity key={s} style={st.sugItem} onPress={() => { setName(s); setSuggestions([]); }}>
                    <Text style={st.sugText}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* ── Tipo de embalagem ── */}
          <View style={st.field}>
            <Text style={st.label}>Tipo de embalagem</Text>
            <Text style={st.hint}>Selecione se o ingrediente vem em embalagem (lata, pacote, etc.)</Text>
            <View style={st.ugrid}>
              {PKG_TYPES.map(pkg => {
                const on = purchaseUnitLabel === pkg;
                return (
                  <TouchableOpacity key={pkg} activeOpacity={0.8}
                    style={[st.uchip, on && st.uchipOn]}
                    onPress={() => {
                      if (on) { setPurchaseUnitLabel(''); setPurchaseUnitWeight(''); setUseCustomUnit(false); }
                      else { setPurchaseUnitLabel(pkg); setUseCustomUnit(true); }
                    }}>
                    <Text style={[st.uchipText, on && st.uchipTextOn]}>{pkg}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ── Peso por embalagem ── */}
          {useCustomUnit && (
            <View style={st.field}>
              <Text style={st.label}>Peso por embalagem</Text>
              <View style={[st.input, errors.pkgWeight ? st.inputErr : null]}>
                <TextInput style={st.inputText} value={purchaseUnitWeight} onChangeText={setPurchaseUnitWeight}
                  placeholder="330" placeholderTextColor={INK3} keyboardType="decimal-pad" />
                <Text style={st.suffix}>{unit || 'g'} por {purchaseUnitLabel}</Text>
              </View>
              <Text style={st.hint}>Ex: uma lata de leite condensado tem 330g</Text>
              {errors.pkgWeight && <Text style={st.err}>{errors.pkgWeight}</Text>}
            </View>
          )}

          {/* ── Quantidade + Preço (dois campos) ── */}
          <View style={st.two}>
            <View style={[st.field, { flex: 1 }]}>
              <Text style={st.label}>Quantidade comprada</Text>
              <Text style={st.hint}>
                Total da compra/embalagem, não a quantidade usada na receita
              </Text>
              <View style={[st.input, errors.qty ? st.inputErr : null]}>
                <TextInput style={st.inputText} value={purchaseQuantity} onChangeText={setPurchaseQuantity}
                  placeholder={useCustomUnit ? '2' : '1000'} placeholderTextColor={INK3} keyboardType="decimal-pad" />
                {useCustomUnit && purchaseUnitLabel ? <Text style={st.suffix}>{purchaseUnitLabel}s</Text> : null}
              </View>
              {errors.qty && <Text style={st.err}>{errors.qty}</Text>}
            </View>
            <View style={[st.field, { flex: 1 }]}>
              <Text style={st.label}>Valor total pago</Text>
              <Text style={st.hint}>Valor da compra inteira, não preço por g/ml/un</Text>
              <View style={[st.input, errors.price ? st.inputErr : null]}>
                <Text style={{ color: INK3, fontWeight: '700', fontSize: 13 }}>R$</Text>
                <TextInput style={st.inputText} value={purchasePrice} onChangeText={handlePriceChange}
                  placeholder="14,00" placeholderTextColor={INK3} keyboardType="decimal-pad" />
              </View>
              {errors.price && <Text style={st.err}>{errors.price}</Text>}
            </View>
          </View>

          {/* ── Unidade de medida ── */}
          <View style={st.field}>
            <Text style={st.label}>Unidade de medida</Text>
            <Text style={st.hint}>Em qual unidade você usa esse ingrediente nas receitas?</Text>
            <View style={st.ugrid}>
              {UNIT_OPTIONS.map(u => {
                const on = unit === u.value;
                return (
                  <TouchableOpacity key={u.value} activeOpacity={0.8}
                    style={[st.uchip, on && st.uchipOn]}
                    onPress={() => setUnit(u.value)}>
                    <Text style={[st.uchipText, on && st.uchipTextOn]}>{u.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {errors.unit && <Text style={st.err}>{errors.unit}</Text>}
          </View>

          {/* ── Result card (green) ── */}
          {showPreview && (
            <LinearGradient colors={['#34C97B', GREEN, '#2BA060']} locations={[0, 0.6, 1]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.result}>
              <Text style={st.rl}>Preço por unidade</Text>
              <Text style={st.rprice}>{fmtBRL(pricePerUnit)}<Text style={st.runit}> /{unit || 'un'}</Text></Text>
              {useCustomUnit && weight > 0 && (
                <Text style={st.rsub}>Embalagem: {fmtBRL(pricePerPkg)} · {weight}{unit} cada</Text>
              )}
            </LinearGradient>
          )}

          {/* ── Save button ── */}
          <TouchableOpacity onPress={handleSave} disabled={loading} activeOpacity={0.85}>
            <LinearGradient colors={['#FF6AAE', PINK]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={st.btn}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={st.btnText}>{isEditing ? 'Atualizar ingrediente' : 'Salvar ingrediente'}</Text>}
            </LinearGradient>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

/* ──────────────────────── STYLES ──────────────────────── */
const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: CREAM },

  /* sub-screen header (.sh) */
  sh: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10 },
  bk: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...SHADOW },
  shT: { flex: 1 },
  shH1: { fontSize: 22, fontWeight: '700', color: INK, lineHeight: 26 },
  actPill: { height: 38, paddingHorizontal: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center', ...SHADOW },

  body: { flex: 1, paddingHorizontal: 18 },

  /* .field */
  field: { gap: 7 },
  label: { fontSize: 13, fontWeight: '700', color: INK, marginLeft: 2 },
  hint: { fontSize: 11.5, color: INK2, fontWeight: '500', marginLeft: 2 },
  err: { fontSize: 12, color: colors.error, marginLeft: 2 },

  /* .input */
  input: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14, paddingHorizontal: 15,
    flexDirection: 'row', alignItems: 'center', gap: 10, ...SHADOW,
  },
  inputErr: { borderWidth: 1.5, borderColor: colors.error },
  inputText: { flex: 1, fontSize: 15, color: INK, padding: 0 },
  suffix: { marginLeft: 'auto' as any, color: INK2, fontWeight: '700', fontSize: 13 },

  /* .two */
  two: { flexDirection: 'row', gap: 11 },

  /* .ugrid + .uchip */
  ugrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  uchip: {
    height: 40, minWidth: 46, paddingHorizontal: 14, borderRadius: 12,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...SHADOW,
  },
  uchipOn: { backgroundColor: PINK, shadowColor: PINK, shadowOpacity: 0.3, elevation: 5 },
  uchipText: { fontWeight: '700', fontSize: 13.5, color: INK2 },
  uchipTextOn: { color: '#fff' },

  /* .result */
  result: {
    borderRadius: 24, padding: 18, ...SHADOW,
    shadowColor: GREEN, shadowOpacity: 0.34, shadowRadius: 16, elevation: 6,
  },
  rl: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.92)', letterSpacing: 0.2 },
  rprice: { fontSize: 34, fontWeight: '800', color: '#fff', marginTop: 5, letterSpacing: 0.4 },
  runit: { fontSize: 16, fontWeight: '600' },
  rsub: { fontSize: 13, color: 'rgba(255,255,255,0.92)', fontWeight: '500', marginTop: 6 },

  /* .btn.btn-primary */
  btn: { height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center', ...SHADOW, shadowColor: PINK, shadowOpacity: 0.35 },
  btnText: { fontSize: 16, fontWeight: '700', color: '#fff' },

  /* info banner */
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 15,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#DCF1FB',
    ...SHADOW,
    shadowOpacity: 0.04,
  },
  infoBannerIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW,
    shadowOpacity: 0.05,
  },
  infoBannerTitle: { fontSize: 14.5, fontWeight: '700', color: INK },
  infoBannerSub: { fontSize: 12, color: INK2, fontWeight: '500', marginTop: 2, lineHeight: 17 },
  tutorialBtn: { alignSelf: 'flex-start', marginTop: 8, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 9, backgroundColor: '#E9F7FD' },
  tutorialBtnText: { color: '#1689B5', fontWeight: '700', fontSize: 12 },

  /* suggestions */
  sugBox: {
    position: 'absolute', top: 72, left: 0, right: 0, zIndex: 20,
    backgroundColor: '#fff', borderRadius: 12, borderWidth: 1.5, borderColor: PINK, ...SHADOW, shadowOpacity: 0.12,
  },
  sugItem: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: LINE },
  sugText: { fontSize: 14, color: INK },
});
