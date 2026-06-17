import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { usePaywall } from '../premium/usePaywall';
import { useToast } from '../context/ToastContext';
import { ingredientApi } from '../../data/api/ingredientApi';
import { isDemoMode } from '../../data/demo/demoMode';
import { demoIngredientApi } from '../../data/demo/demoApi';
import { Ingredient } from '../../domain/entities/Ingredient';
import {
  getStockState, getEntry, setQty, addEntry, getMovements, unitCost,
  StockState, StockMovement,
} from '../../data/stock/stockStorage';
import { parseLocaleNumber } from '../utils/number';

/* ─── Design tokens ─── */
const INK = '#3D2233';
const INK2 = '#9A7E8C';
const INK3 = '#C4B0BB';
const CREAM = '#FFF6F0';
const LINE = '#F1E2DA';
const GREEN = '#43BE6E';
const AMBER = '#E0922B';
const RED = '#E8537A';
const PURPLE = '#7C3AED';
const SHADOW = { shadowColor: INK, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 12, elevation: 4 };

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const fmtMoney = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtQty = (v: number) => {
  const r = Math.round(v * 1000) / 1000;
  return Number.isInteger(r) ? String(r) : r.toFixed(2).replace(/\.?0+$/, '');
};
const parseNum = parseLocaleNumber;

export const StockScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { guardMaster } = usePaywall();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [stock, setStock] = useState<StockState>({});
  const [editing, setEditing] = useState<Ingredient | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!guardMaster('stock')) return;
      load();
    }, []),
  );

  const load = async () => {
    const iApi = isDemoMode() ? demoIngredientApi : ingredientApi;
    try {
      const [items, state] = await Promise.all([
        iApi.getAll() as Promise<Ingredient[]>,
        getStockState(),
      ]);
      setIngredients(items.sort((a, b) => a.name.localeCompare(b.name)));
      setStock(state);
    } catch {
      // empty state
    } finally {
      setLoading(false);
    }
  };

  const lowCount = ingredients.filter(i => {
    const e = stock[i.id];
    return e && e.min > 0 && e.qty <= e.min;
  }).length;
  const trackedCount = ingredients.filter(i => stock[i.id]).length;
  const totalValue = ingredients.reduce((sum, i) => {
    const e = stock[i.id];
    return e ? sum + Math.max(0, e.qty) * unitCost(i) : sum;
  }, 0);

  if (loading) {
    return (
      <SafeAreaView style={s.safe}>
        <Header navigation={navigation} />
        <View style={s.center}><ActivityIndicator size="large" color={PURPLE} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <Header navigation={navigation} />
      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

        {/* Resumo */}
        <LinearGradient colors={['#9B6BF0', PURPLE, '#5B23C0']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.hero}>
          <Text style={s.heroLabel}>Valor em estoque</Text>
          <Text style={s.heroValue}>{fmtMoney(totalValue)}</Text>
          <View style={s.heroRow}>
            <View style={s.heroPill}>
              <Ionicons name="cube-outline" size={13} color="#fff" />
              <Text style={s.heroPillText}>{trackedCount} controlados</Text>
            </View>
            <View style={s.heroPill}>
              <Ionicons name={lowCount > 0 ? 'alert-circle' : 'checkmark-circle'} size={13} color="#fff" />
              <Text style={s.heroPillText}>{lowCount} em falta</Text>
            </View>
          </View>
        </LinearGradient>

        <Text style={s.note}>
          Defina o saldo de cada ingrediente. Ao registrar uma venda, o estoque dá baixa automática conforme a ficha técnica da receita.
        </Text>

        {ingredients.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="cube-outline" size={40} color={INK3} />
            <Text style={s.emptyTitle}>Nenhum ingrediente</Text>
            <Text style={s.emptyDesc}>Cadastre ingredientes para controlar o estoque.</Text>
          </View>
        ) : (
          <View style={s.list}>
            {ingredients.map(ing => {
              const e = stock[ing.id];
              const tracked = !!e;
              const low = tracked && e.min > 0 && e.qty <= e.min;
              const neg = tracked && e.qty <= 0;
              return (
                <TouchableOpacity key={ing.id} style={s.row} activeOpacity={0.8} onPress={() => setEditing(ing)}>
                  <View style={[s.rowIco, { backgroundColor: !tracked ? '#F1ECF5' : neg ? '#FBE0E8' : low ? '#FCEFD9' : '#E4F6EA' }]}>
                    <Ionicons
                      name={!tracked ? 'help-outline' : neg ? 'close' : low ? 'alert' : 'checkmark'}
                      size={18}
                      color={!tracked ? INK3 : neg ? RED : low ? AMBER : GREEN}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.rowName} numberOfLines={1}>{ing.name}</Text>
                    <Text style={s.rowMeta}>
                      {tracked ? `Saldo: ${fmtQty(e.qty)} ${ing.unit}${e.min > 0 ? ` · mín ${fmtQty(e.min)} ${ing.unit}` : ''}` : 'Sem controle de estoque'}
                    </Text>
                  </View>
                  {low && !neg && <View style={[s.tag, { backgroundColor: '#FCEFD9' }]}><Text style={[s.tagTxt, { color: AMBER }]}>BAIXO</Text></View>}
                  {neg && <View style={[s.tag, { backgroundColor: '#FBE0E8' }]}><Text style={[s.tagTxt, { color: RED }]}>FALTA</Text></View>}
                  <Ionicons name="chevron-forward" size={18} color={INK3} />
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {editing && (
        <StockModal
          ingredient={editing}
          entry={getEntry(stock, editing)}
          onClose={() => setEditing(null)}
          onSaved={async (msg) => {
            setEditing(null);
            showToast(msg, 'success');
            const state = await getStockState();
            setStock(state);
          }}
        />
      )}
    </SafeAreaView>
  );
};

const Header: React.FC<{ navigation: NavigationProp }> = ({ navigation }) => (
  <View style={s.header}>
    <TouchableOpacity onPress={() => navigation.goBack()} style={s.bk}>
      <Ionicons name="arrow-back" size={20} color={INK} />
    </TouchableOpacity>
    <View style={{ flex: 1 }}>
      <Text style={s.headerTitle}>Estoque</Text>
      <Text style={s.headerSub}>Controle de ingredientes</Text>
    </View>
    <View style={s.masterBadge}><Text style={s.masterBadgeTxt}>MASTER</Text></View>
  </View>
);

const StockModal: React.FC<{
  ingredient: Ingredient;
  entry: ReturnType<typeof getEntry>;
  onClose: () => void;
  onSaved: (msg: string) => void;
}> = ({ ingredient, entry, onClose, onSaved }) => {
  const [qty, setQtyVal] = useState(entry.updatedAt ? fmtQty(entry.qty) : '');
  const [min, setMin] = useState(entry.min ? fmtQty(entry.min) : '');
  const [entryQty, setEntryQty] = useState('');
  const [moves, setMoves] = useState<StockMovement[]>([]);
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    getMovements().then(all => setMoves(all.filter(m => m.ingredientId === ingredient.id).slice(0, 8)));
  }, [ingredient.id]);

  const handleSave = async () => {
    const q = parseNum(qty);
    const m = parseNum(min);
    if (qty.trim() === '' || isNaN(q) || q < 0) return;
    setSaving(true);
    try {
      await setQty(ingredient, q, isNaN(m) || m < 0 ? 0 : m);
      onSaved('Estoque atualizado');
    } finally {
      setSaving(false);
    }
  };

  const handleEntry = async () => {
    const q = parseNum(entryQty);
    if (isNaN(q) || q <= 0) return;
    setSaving(true);
    try {
      await addEntry(ingredient, q);
      onSaved(`+${fmtQty(q)} ${ingredient.unit} em estoque`);
    } finally {
      setSaving(false);
    }
  };

  const moveIcon = (t: StockMovement['type']) =>
    t === 'sale' ? 'cart-outline' : t === 'in' ? 'add-circle-outline' : 'create-outline';

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={s.modalSafe}>
        <View style={s.modalHead}>
          <Text style={s.modalTitle} numberOfLines={1}>{ingredient.name}</Text>
          <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color={INK} /></TouchableOpacity>
        </View>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ padding: 18, gap: 16 }} keyboardShouldPersistTaps="handled">

            {/* Saldo + mínimo */}
            <View>
              <Text style={s.fieldLabel}>Saldo atual ({ingredient.unit})</Text>
              <View style={s.input}>
                <TextInput style={s.inputText} value={qty} onChangeText={setQtyVal} keyboardType="decimal-pad"
                  placeholder="0" placeholderTextColor={INK3} />
                <Text style={s.suffix}>{ingredient.unit}</Text>
              </View>
            </View>
            <View>
              <Text style={s.fieldLabel}>Estoque mínimo (alerta)</Text>
              <View style={s.input}>
                <TextInput style={s.inputText} value={min} onChangeText={setMin} keyboardType="decimal-pad"
                  placeholder="0" placeholderTextColor={INK3} />
                <Text style={s.suffix}>{ingredient.unit}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={handleSave} disabled={saving} activeOpacity={0.85}>
              <LinearGradient colors={['#9B6BF0', PURPLE]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.btn}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Salvar saldo</Text>}
              </LinearGradient>
            </TouchableOpacity>

            {/* Entrada rápida */}
            <View style={s.entryCard}>
              <Text style={s.fieldLabel}>Registrar entrada (reposição)</Text>
              <View style={s.entryRow}>
                <View style={[s.input, { flex: 1 }]}>
                  <TextInput style={s.inputText} value={entryQty} onChangeText={setEntryQty} keyboardType="decimal-pad"
                    placeholder="Quantidade comprada" placeholderTextColor={INK3} />
                  <Text style={s.suffix}>{ingredient.unit}</Text>
                </View>
                <TouchableOpacity onPress={handleEntry} disabled={saving} style={s.entryBtn} activeOpacity={0.8}>
                  <Ionicons name="add" size={22} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Movimentações */}
            {moves.length > 0 && (
              <View>
                <Text style={s.fieldLabel}>Movimentações recentes</Text>
                <View style={s.movesCard}>
                  {moves.map((m, i) => (
                    <View key={m.id} style={[s.moveRow, i > 0 && { borderTopWidth: 1, borderTopColor: LINE }]}>
                      <Ionicons name={moveIcon(m.type) as any} size={16} color={m.delta >= 0 ? GREEN : RED} />
                      <View style={{ flex: 1 }}>
                        <Text style={s.moveNote} numberOfLines={1}>{m.note}</Text>
                        <Text style={s.moveDate}>{new Date(m.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</Text>
                      </View>
                      <Text style={[s.moveDelta, { color: m.delta >= 0 ? GREEN : RED }]}>
                        {m.delta >= 0 ? '+' : ''}{fmtQty(m.delta)} {ingredient.unit}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: CREAM },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10 },
  bk: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...SHADOW },
  headerTitle: { fontSize: 22, fontWeight: '700', color: INK },
  headerSub: { fontSize: 12.5, color: INK2, marginTop: 1 },
  masterBadge: { backgroundColor: '#EDE4FB', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 5 },
  masterBadgeTxt: { fontSize: 10, fontWeight: '800', color: PURPLE, letterSpacing: 0.5 },

  hero: { borderRadius: 22, padding: 22, marginBottom: 12, ...SHADOW, shadowColor: PURPLE, shadowOpacity: 0.3 },
  heroLabel: { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginBottom: 4 },
  heroValue: { fontSize: 32, fontWeight: '800', color: '#fff' },
  heroRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  heroPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  heroPillText: { fontSize: 12, fontWeight: '700', color: '#fff' },

  note: { fontSize: 12, color: INK2, lineHeight: 17, marginBottom: 16, paddingHorizontal: 2 },

  list: { gap: 9 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: '#fff', borderRadius: 16, padding: 13, ...SHADOW },
  rowIco: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  rowName: { fontSize: 14.5, fontWeight: '700', color: INK },
  rowMeta: { fontSize: 12, color: INK2, marginTop: 2 },
  tag: { borderRadius: 7, paddingHorizontal: 7, paddingVertical: 3 },
  tagTxt: { fontSize: 9.5, fontWeight: '800', letterSpacing: 0.4 },

  empty: { alignItems: 'center', paddingVertical: 50, paddingHorizontal: 30, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: INK, marginTop: 6 },
  emptyDesc: { fontSize: 13, color: INK2, textAlign: 'center', lineHeight: 19 },

  /* modal */
  modalSafe: { flex: 1, backgroundColor: CREAM },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18, borderBottomWidth: 1, borderBottomColor: LINE, backgroundColor: '#fff' },
  modalTitle: { fontSize: 19, fontWeight: '700', color: INK, flex: 1, marginRight: 12 },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: INK, marginBottom: 7, marginLeft: 2 },
  input: { backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 15, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 10, ...SHADOW },
  inputText: { flex: 1, fontSize: 15, color: INK, padding: 0 },
  suffix: { color: INK2, fontWeight: '700', fontSize: 13 },
  btn: { height: 52, borderRadius: 15, alignItems: 'center', justifyContent: 'center', ...SHADOW, shadowColor: PURPLE, shadowOpacity: 0.3 },
  btnText: { fontSize: 15.5, fontWeight: '700', color: '#fff' },

  entryCard: { backgroundColor: '#F7F1FB', borderRadius: 16, padding: 14 },
  entryRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  entryBtn: { width: 50, height: 50, borderRadius: 14, backgroundColor: GREEN, alignItems: 'center', justifyContent: 'center', ...SHADOW, shadowColor: GREEN, shadowOpacity: 0.3 },

  movesCard: { backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 14, ...SHADOW },
  moveRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11 },
  moveNote: { fontSize: 13, fontWeight: '600', color: INK },
  moveDate: { fontSize: 11, color: INK3, marginTop: 1 },
  moveDelta: { fontSize: 13, fontWeight: '700' },
});
