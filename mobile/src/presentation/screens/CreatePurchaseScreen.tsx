import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/types';
import { Ingredient, Unit } from '../../domain/entities/Ingredient';
import { ingredientApi } from '../../data/api/ingredientApi';
import { purchaseApi, PurchasePaymentStatus } from '../../data/api/purchaseApi';
import { isDemoMode } from '../../data/demo/demoMode';
import { demoIngredientApi } from '../../data/demo/demoApi';
import { useToast } from '../context/ToastContext';
import { parseLocaleNumber } from '../utils/number';
import { colors } from '../theme/colors';
import { useCurrency } from '../../context/CurrencyContext';
import { CURRENCY_INFO } from '../utils/currency';

type Navigation = NativeStackNavigationProp<RootStackParamList>;
type DraftItem = { ingredientId: string; quantity: string; unit: Unit; total: string; updateIngredientPrice: boolean };
const today = () => new Date().toISOString().slice(0, 10);
const showDate = (iso: string) => iso.split('-').reverse().join('/');
const parseDate = (text: string) => { const clean = text.replace(/\D/g, ''); if (clean.length !== 8) return null; const date = `${clean.slice(4)}-${clean.slice(2, 4)}-${clean.slice(0, 2)}`; return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null; };
const blank = (ingredient?: Ingredient): DraftItem => ({ ingredientId: ingredient?.id ?? '', quantity: '', unit: ingredient?.unit ?? 'g', total: '', updateIngredientPrice: true });
const paymentMethods = [{ key: 'pix', label: 'Pix' }, { key: 'cash', label: 'Dinheiro' }, { key: 'credit', label: 'Crédito' }, { key: 'debit', label: 'Débito' }, { key: 'other', label: 'Outro' }];

export const CreatePurchaseScreen: React.FC = () => {
  const navigation = useNavigation<Navigation>(); const { showToast } = useToast(); const { currency } = useCurrency(); const symbol = CURRENCY_INFO[currency].symbol;
  const [ingredients, setIngredients] = useState<Ingredient[]>([]); const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false);
  const [supplier, setSupplier] = useState(''); const [documentNumber, setDocumentNumber] = useState(''); const [date, setDate] = useState(showDate(today()));
  const [paymentMethod, setPaymentMethod] = useState('pix'); const [paymentStatus, setPaymentStatus] = useState<PurchasePaymentStatus>('paid');
  const [discount, setDiscount] = useState(''); const [freight, setFreight] = useState(''); const [notes, setNotes] = useState(''); const [items, setItems] = useState<DraftItem[]>([]);
  const [choosing, setChoosing] = useState<number | null>(null);

  useEffect(() => { (async () => { try { const data = isDemoMode() ? await demoIngredientApi.getAll() : await ingredientApi.getAll(); setIngredients(data); setItems([blank(data[0])]); } catch { showToast('Erro ao carregar ingredientes', 'error'); } finally { setLoading(false); } })(); }, []);
  const subtotal = useMemo(() => items.reduce((sum, item) => sum + parseLocaleNumber(item.total), 0), [items]);
  const total = Math.max(0, subtotal - parseLocaleNumber(discount) + parseLocaleNumber(freight));
  const changeItem = (index: number, patch: Partial<DraftItem>) => setItems(current => current.map((item, i) => i === index ? { ...item, ...patch } : item));
  const ingredientName = (id: string) => ingredients.find(item => item.id === id)?.name ?? 'Selecionar ingrediente';

  const save = async () => {
    const purchaseDate = parseDate(date);
    if (!supplier.trim()) return showToast('Informe o fornecedor', 'error');
    if (!purchaseDate) return showToast('Data inválida', 'error');
    if (!items.length || items.some(item => !item.ingredientId || parseLocaleNumber(item.quantity) <= 0 || parseLocaleNumber(item.total) <= 0)) return showToast('Preencha todos os itens', 'error');
    setSaving(true);
    try {
      if (!isDemoMode()) await purchaseApi.create({ supplier: supplier.trim(), documentNumber: documentNumber.trim() || null, purchaseDate, paymentMethod, paymentStatus, discount: parseLocaleNumber(discount), freight: parseLocaleNumber(freight), notes: notes.trim() || null, items: items.map(item => ({ ingredientId: item.ingredientId, quantity: parseLocaleNumber(item.quantity), unit: item.unit, total: parseLocaleNumber(item.total), updateIngredientPrice: item.updateIngredientPrice })) });
      showToast('Compra registrada e estoque atualizado!', 'success'); navigation.goBack();
    } catch { showToast('Erro ao registrar compra', 'error'); } finally { setSaving(false); }
  };

  if (loading) return <SafeAreaView style={s.safe}><View style={s.center}><ActivityIndicator size="large" color={colors.purple} /></View></SafeAreaView>;
  return <SafeAreaView style={s.safe}>
    <View style={s.header}><TouchableOpacity onPress={() => navigation.goBack()} style={s.back}><Ionicons name="arrow-back" size={20} color={colors.text} /></TouchableOpacity><View><Text style={s.title}>Nova compra</Text><Text style={s.subtitle}>Nota e entrada de estoque</Text></View></View>
    <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      <Label text="Fornecedor *" /><TextInput style={s.input} value={supplier} onChangeText={setSupplier} placeholder="Ex.: Atacadão" placeholderTextColor={colors.textMuted} />
      <View style={s.row}><View style={s.flex}><Label text="Número da nota" /><TextInput style={s.input} value={documentNumber} onChangeText={setDocumentNumber} placeholder="Opcional" placeholderTextColor={colors.textMuted} /></View><View style={s.flex}><Label text="Data *" /><TextInput style={s.input} value={date} onChangeText={text => { const clean = text.replace(/\D/g, '').slice(0, 8); setDate(clean.length > 4 ? `${clean.slice(0, 2)}/${clean.slice(2, 4)}/${clean.slice(4)}` : clean.length > 2 ? `${clean.slice(0, 2)}/${clean.slice(2)}` : clean); }} keyboardType="numeric" maxLength={10} /></View></View>
      <Label text="Forma de pagamento" /><View style={s.chips}>{paymentMethods.map(method => <TouchableOpacity key={method.key} onPress={() => setPaymentMethod(method.key)} style={[s.chip, paymentMethod === method.key && s.chipOn]}><Text style={[s.chipText, paymentMethod === method.key && s.chipTextOn]}>{method.label}</Text></TouchableOpacity>)}</View>
      <Label text="Situação" /><View style={s.segment}>{(['paid', 'pending'] as PurchasePaymentStatus[]).map(status => <TouchableOpacity key={status} onPress={() => setPaymentStatus(status)} style={[s.segmentItem, paymentStatus === status && s.segmentOn]}><Text style={[s.segmentText, paymentStatus === status && s.segmentTextOn]}>{status === 'paid' ? 'Pago' : 'Pendente'}</Text></TouchableOpacity>)}</View>
      <View style={s.sectionHead}><Text style={s.sectionTitle}>Itens da compra</Text><TouchableOpacity onPress={() => setItems(current => [...current, blank(ingredients[0])])} style={s.addItem}><Ionicons name="add" size={17} color={colors.purple} /><Text style={s.addItemText}>Adicionar</Text></TouchableOpacity></View>
      {ingredients.length === 0 && <Text style={s.warning}>Cadastre um ingrediente antes de lançar a compra.</Text>}
      {items.map((item, index) => <View key={index} style={s.itemCard}>
        <View style={s.itemTop}><Text style={s.itemNumber}>Item {index + 1}</Text>{items.length > 1 && <TouchableOpacity onPress={() => setItems(current => current.filter((_, i) => i !== index))}><Ionicons name="trash-outline" size={18} color="#E8537A" /></TouchableOpacity>}</View>
        <Label text="Ingrediente" /><TouchableOpacity style={s.select} onPress={() => setChoosing(index)}><Text style={[s.selectText, !item.ingredientId && { color: colors.textMuted }]}>{ingredientName(item.ingredientId)}</Text><Ionicons name="chevron-down" size={17} color={colors.textSecondary} /></TouchableOpacity>
        <View style={s.row}><View style={s.flex}><Label text={`Quantidade (${item.unit === 'unit' ? 'un' : item.unit})`} /><TextInput style={s.input} value={item.quantity} onChangeText={text => changeItem(index, { quantity: text.replace(/[^0-9,.]/g, '') })} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={colors.textMuted} /></View><View style={s.flex}><Label text={`Valor total (${symbol})`} /><TextInput style={s.input} value={item.total} onChangeText={text => changeItem(index, { total: text.replace(/[^0-9,.]/g, '') })} keyboardType="decimal-pad" placeholder="0,00" placeholderTextColor={colors.textMuted} /></View></View>
        <TouchableOpacity style={s.checkRow} onPress={() => changeItem(index, { updateIngredientPrice: !item.updateIngredientPrice })}><View style={[s.check, item.updateIngredientPrice && s.checkOn]}>{item.updateIngredientPrice && <Ionicons name="checkmark" size={13} color="#fff" />}</View><Text style={s.checkText}>Atualizar este preço na precificação</Text></TouchableOpacity>
      </View>)}
      <View style={s.row}><View style={s.flex}><Label text="Desconto" /><TextInput style={s.input} value={discount} onChangeText={setDiscount} keyboardType="decimal-pad" placeholder="0,00" placeholderTextColor={colors.textMuted} /></View><View style={s.flex}><Label text="Frete" /><TextInput style={s.input} value={freight} onChangeText={setFreight} keyboardType="decimal-pad" placeholder="0,00" placeholderTextColor={colors.textMuted} /></View></View>
      <Label text="Observações" />
      <TextInput style={[s.input, s.textarea]} value={notes} onChangeText={setNotes} multiline placeholder="Opcional" placeholderTextColor={colors.textMuted} />
      <View style={s.totalBox}><Text style={s.totalLabel}>Total da compra</Text><Text style={s.totalValue}>{symbol} {total.toFixed(2).replace('.', ',')}</Text></View>
      <TouchableOpacity onPress={save} disabled={saving || ingredients.length === 0} style={[s.save, (saving || ingredients.length === 0) && { opacity: .5 }]}>{saving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveText}>Salvar compra</Text>}</TouchableOpacity>
    </ScrollView>
    <Modal visible={choosing !== null} transparent animationType="slide" onRequestClose={() => setChoosing(null)}><View style={s.modalShade}><View style={s.modal}><View style={s.modalHead}><Text style={s.modalTitle}>Escolha o ingrediente</Text><TouchableOpacity onPress={() => setChoosing(null)}><Ionicons name="close" size={23} color={colors.text} /></TouchableOpacity></View><FlatList data={ingredients} keyExtractor={item => item.id} renderItem={({ item }) => <TouchableOpacity style={s.ingredientRow} onPress={() => { if (choosing !== null) changeItem(choosing, { ingredientId: item.id, unit: item.unit }); setChoosing(null); }}><Text style={s.ingredientName}>{item.name}</Text><Text style={s.ingredientUnit}>{item.unit === 'unit' ? 'un' : item.unit}</Text></TouchableOpacity>} /></View></View></Modal>
  </SafeAreaView>;
};

const Label = ({ text }: { text: string }) => <Text style={s.label}>{text}</Text>;
const shadow = { shadowColor: '#3D2233', shadowOffset: { width: 0, height: 3 }, shadowOpacity: .07, shadowRadius: 10, elevation: 3 };
const s = StyleSheet.create({ safe: { flex: 1, backgroundColor: '#fff' }, center: { flex: 1, alignItems: 'center', justifyContent: 'center' }, header: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 }, back: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', ...shadow }, title: { fontSize: 21, fontWeight: '800', color: colors.text }, subtitle: { fontSize: 12, color: colors.textSecondary }, content: { padding: 18, paddingBottom: 42 }, label: { fontSize: 12.5, fontWeight: '600', color: colors.textSecondary, marginTop: 13, marginBottom: 6 }, input: { borderWidth: 1.5, borderColor: colors.border, borderRadius: 13, paddingHorizontal: 13, paddingVertical: 12, color: colors.text, backgroundColor: '#fff', fontSize: 14 }, row: { flexDirection: 'row', gap: 10 }, flex: { flex: 1 }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, chip: { backgroundColor: colors.pinkBg3, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18 }, chipOn: { backgroundColor: colors.purple }, chipText: { color: colors.textSecondary, fontWeight: '600', fontSize: 12 }, chipTextOn: { color: '#fff' }, segment: { flexDirection: 'row', backgroundColor: colors.pinkBg3, borderRadius: 13, padding: 4 }, segmentItem: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 10 }, segmentOn: { backgroundColor: '#fff', ...shadow }, segmentText: { color: colors.textSecondary, fontWeight: '600' }, segmentTextOn: { color: colors.purple, fontWeight: '700' }, sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 22, marginBottom: 2 }, sectionTitle: { fontSize: 16, fontWeight: '800', color: colors.text }, addItem: { flexDirection: 'row', alignItems: 'center', gap: 3 }, addItemText: { color: colors.purple, fontWeight: '700', fontSize: 13 }, warning: { padding: 12, color: '#B76E00', backgroundColor: '#FFF6DC', borderRadius: 12, marginTop: 10 }, itemCard: { borderWidth: 1, borderColor: colors.border, borderRadius: 17, padding: 14, marginTop: 10, backgroundColor: '#fff' }, itemTop: { flexDirection: 'row', justifyContent: 'space-between' }, itemNumber: { fontSize: 12, color: colors.purple, fontWeight: '800' }, select: { borderWidth: 1.5, borderColor: colors.border, borderRadius: 13, padding: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, selectText: { color: colors.text, fontSize: 14, fontWeight: '600' }, checkRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 13 }, check: { width: 21, height: 21, borderRadius: 6, borderWidth: 2, borderColor: colors.textMuted, alignItems: 'center', justifyContent: 'center' }, checkOn: { backgroundColor: colors.purple, borderColor: colors.purple }, checkText: { color: colors.text, fontSize: 12.5, fontWeight: '600' }, textarea: { minHeight: 74, textAlignVertical: 'top' }, totalBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.purpleBg, borderRadius: 16, padding: 16, marginTop: 18 }, totalLabel: { color: colors.textSecondary, fontWeight: '600' }, totalValue: { color: colors.purple, fontSize: 21, fontWeight: '800' }, save: { backgroundColor: colors.purple, borderRadius: 16, padding: 15, alignItems: 'center', marginTop: 16 }, saveText: { color: '#fff', fontWeight: '800', fontSize: 15 }, modalShade: { flex: 1, backgroundColor: 'rgba(0,0,0,.4)', justifyContent: 'flex-end' }, modal: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18, maxHeight: '70%' }, modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10 }, modalTitle: { fontSize: 17, fontWeight: '800', color: colors.text }, ingredientRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border }, ingredientName: { color: colors.text, fontWeight: '600' }, ingredientUnit: { color: colors.textSecondary }, });
