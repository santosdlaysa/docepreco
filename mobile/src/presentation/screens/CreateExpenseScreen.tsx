import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { expenseApi, EXPENSE_CATEGORIES, CreateExpenseDTO } from '../../data/api/expenseApi';
import { isDemoMode } from '../../data/demo/demoMode';
import { demoExpenseApi } from '../../data/demo/demoApi';
import { useToast } from '../context/ToastContext';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteType = RouteProp<RootStackParamList, 'CreateExpense'>;

const INK = '#3D2233';
const INK2 = '#9A7E8C';
const INK3 = '#C4B0BB';
const CREAM = '#FFF6F0';
const LINE = '#F1E2DA';
const PURPLE = '#7C3AED';
const SHADOW = { shadowColor: INK, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 10, elevation: 3 };

const todayISO = () => new Date().toISOString().split('T')[0];

const fmtDateInput = (iso: string) => {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

const parseDateInput = (str: string): string | null => {
  const clean = str.replace(/\D/g, '');
  if (clean.length !== 8) return null;
  const d = clean.slice(0, 2), m = clean.slice(2, 4), y = clean.slice(4, 8);
  const n = parseInt(d), nm = parseInt(m);
  if (n < 1 || n > 31 || nm < 1 || nm > 12) return null;
  return `${y}-${m}-${d}`;
};

export const CreateExpenseScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteType>();
  const { showToast } = useToast();
  const api = isDemoMode() ? demoExpenseApi : expenseApi;

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('outros');
  const [costType, setCostType] = useState<'fixed' | 'variable'>('variable');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceDay, setRecurrenceDay] = useState('');
  const [dateInput, setDateInput] = useState(fmtDateInput(todayISO()));
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!description.trim()) { showToast('Informe a descrição', 'error'); return; }
    const amtNum = parseFloat(amount.replace(',', '.'));
    if (isNaN(amtNum) || amtNum <= 0) { showToast('Informe um valor válido', 'error'); return; }
    const expenseDate = parseDateInput(dateInput);
    if (!expenseDate) { showToast('Data inválida (use DD/MM/AAAA)', 'error'); return; }

    setSaving(true);
    try {
      const dto: CreateExpenseDTO = {
        description: description.trim(),
        amount: amtNum,
        category,
        costType,
        isRecurring,
        recurrenceDay: isRecurring && recurrenceDay ? parseInt(recurrenceDay) : null,
        expenseDate,
        notes: notes.trim() || null,
      };
      await api.create(dto);
      showToast('Despesa registrada!', 'success');
      navigation.goBack();
    } catch {
      showToast('Erro ao salvar despesa', 'error');
    } finally {
      setSaving(false);
    }
  };

  const formatAmountInput = (text: string) => {
    const clean = text.replace(/[^0-9,\.]/g, '');
    setAmount(clean);
  };

  const formatDateInput = (text: string) => {
    const clean = text.replace(/\D/g, '').slice(0, 8);
    let out = clean;
    if (clean.length > 4) out = `${clean.slice(0, 2)}/${clean.slice(2, 4)}/${clean.slice(4)}`;
    else if (clean.length > 2) out = `${clean.slice(0, 2)}/${clean.slice(2)}`;
    setDateInput(out);
  };

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.bk}>
          <Ionicons name="arrow-back" size={20} color={INK} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Nova despesa</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">

        {/* Descrição */}
        <Text style={s.label}>Descrição *</Text>
        <TextInput
          style={s.input}
          value={description}
          onChangeText={setDescription}
          placeholder="Ex: Aluguel do espaço"
          placeholderTextColor={INK3}
          maxLength={255}
        />

        {/* Valor */}
        <Text style={s.label}>Valor (R$) *</Text>
        <TextInput
          style={s.input}
          value={amount}
          onChangeText={formatAmountInput}
          placeholder="0,00"
          placeholderTextColor={INK3}
          keyboardType="decimal-pad"
        />

        {/* Data */}
        <Text style={s.label}>Data *</Text>
        <TextInput
          style={s.input}
          value={dateInput}
          onChangeText={formatDateInput}
          placeholder="DD/MM/AAAA"
          placeholderTextColor={INK3}
          keyboardType="numeric"
          maxLength={10}
        />

        {/* Tipo de custo */}
        <Text style={s.label}>Tipo de custo</Text>
        <View style={s.toggle}>
          {([['fixed', 'Fixo'], ['variable', 'Variável']] as [string, string][]).map(([key, lbl]) => (
            <TouchableOpacity
              key={key}
              style={[s.toggleItem, costType === key && s.toggleItemOn]}
              onPress={() => setCostType(key as 'fixed' | 'variable')}
              activeOpacity={0.8}
            >
              <Text style={[s.toggleText, costType === key && s.toggleTextOn]}>{lbl}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Categoria */}
        <Text style={s.label}>Categoria</Text>
        <View style={s.categories}>
          {EXPENSE_CATEGORIES.map(c => (
            <TouchableOpacity
              key={c.key}
              style={[s.catChip, category === c.key && s.catChipOn]}
              onPress={() => setCategory(c.key)}
              activeOpacity={0.8}
            >
              <Text style={[s.catText, category === c.key && s.catTextOn]}>{c.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Recorrente */}
        <TouchableOpacity style={s.recurRow} onPress={() => setIsRecurring(!isRecurring)} activeOpacity={0.8}>
          <View style={[s.checkbox, isRecurring && s.checkboxOn]}>
            {isRecurring && <Ionicons name="checkmark" size={13} color="#fff" />}
          </View>
          <Text style={s.recurLabel}>Despesa recorrente (mensal)</Text>
        </TouchableOpacity>

        {isRecurring && (
          <>
            <Text style={s.label}>Dia do vencimento</Text>
            <TextInput
              style={s.input}
              value={recurrenceDay}
              onChangeText={t => setRecurrenceDay(t.replace(/\D/g, '').slice(0, 2))}
              placeholder="Ex: 5"
              placeholderTextColor={INK3}
              keyboardType="numeric"
              maxLength={2}
            />
          </>
        )}

        {/* Observações */}
        <Text style={s.label}>Observações (opcional)</Text>
        <TextInput
          style={[s.input, s.textarea]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Algum detalhe sobre essa despesa..."
          placeholderTextColor={INK3}
          multiline
          numberOfLines={3}
        />

        {/* Salvar */}
        <TouchableOpacity style={s.saveBtn} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.saveBtnText}>Salvar despesa</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: CREAM },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10 },
  bk: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...SHADOW },
  headerTitle: { fontSize: 20, fontWeight: '700', color: INK },

  label: { fontSize: 13, fontWeight: '600', color: INK2, marginBottom: 6, marginTop: 14 },
  input: {
    backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 15, color: INK, borderWidth: 1.5, borderColor: LINE,
  },
  textarea: { height: 80, textAlignVertical: 'top', paddingTop: 12 },

  toggle: { flexDirection: 'row', backgroundColor: '#F3E9F0', borderRadius: 13, padding: 4 },
  toggleItem: { flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center' },
  toggleItemOn: { backgroundColor: '#fff', ...SHADOW },
  toggleText: { fontSize: 13.5, fontWeight: '600', color: INK2 },
  toggleTextOn: { color: PURPLE, fontWeight: '700' },

  categories: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: '#F3E9F0' },
  catChipOn: { backgroundColor: PURPLE },
  catText: { fontSize: 12.5, fontWeight: '600', color: INK2 },
  catTextOn: { color: '#fff' },

  recurRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16 },
  checkbox: { width: 22, height: 22, borderRadius: 7, borderWidth: 2, borderColor: INK3, alignItems: 'center', justifyContent: 'center' },
  checkboxOn: { backgroundColor: PURPLE, borderColor: PURPLE },
  recurLabel: { fontSize: 14, fontWeight: '600', color: INK },

  saveBtn: {
    backgroundColor: PURPLE, borderRadius: 16, paddingVertical: 15,
    alignItems: 'center', marginTop: 24, ...SHADOW, shadowColor: PURPLE, shadowOpacity: 0.3,
  },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
