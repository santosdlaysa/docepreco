import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { clientStorage } from '../../data/storage/clientStorage';
import { useToast } from '../context/ToastContext';
import { useTranslation } from 'react-i18next';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'EditClient'>;

// ── Design tokens ──
const INK = '#3D2233';
const INK2 = '#9A7E8C';
const INK3 = '#C4B0BB';
const CREAM = '#FFF6F0';
const LINE = '#F1E2DA';
const PINK = '#EA4B92';

const SHADOW = {
  shadowColor: INK,
  shadowOffset: { width: 0, height: 2 } as const,
  shadowOpacity: 0.07,
  shadowRadius: 8,
  elevation: 3,
};

export const CreateClientScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const clientId = (route.params as any)?.clientId as string | undefined;
  const isEditing = !!clientId;
  const { showToast } = useToast();
  const { t } = useTranslation();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [birthdayDay, setBirthdayDay] = useState('');
  const [birthdayMonth, setBirthdayMonth] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (clientId) {
      clientStorage.getById(clientId).then(client => {
        if (!client) return;
        setName(client.name);
        setPhone(client.phone || '');
        setEmail(client.email || '');
        if (client.birthday) {
          const [mm, dd] = client.birthday.split('-');
          setBirthdayMonth(mm);
          setBirthdayDay(dd);
        }
        setAddress(client.address || '');
        setNotes(client.notes || '');
      });
    }
  }, []);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Obrigatório';
    if (birthdayDay || birthdayMonth) {
      const d = parseInt(birthdayDay);
      const m = parseInt(birthdayMonth);
      if (!d || d < 1 || d > 31) e.birthdayDay = 'Dia inválido';
      if (!m || m < 1 || m > 12) e.birthdayMonth = 'Mês inválido';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const birthday =
        birthdayMonth && birthdayDay
          ? `${String(parseInt(birthdayMonth)).padStart(2, '0')}-${String(parseInt(birthdayDay)).padStart(2, '0')}`
          : undefined;
      const data = {
        name: name.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        birthday,
        address: address.trim() || undefined,
        notes: notes.trim() || undefined,
      };
      if (isEditing) {
        await clientStorage.update(clientId!, data);
        showToast(t('createClient.updated'), 'success');
      } else {
        await clientStorage.create(data);
        showToast(t('createClient.created'), 'success');
      }
      navigation.goBack();
    } catch {
      showToast(t('createClient.saveError'), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      {/* ── Header ── */}
      <View style={s.sh}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.bk} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={20} color={INK} />
        </TouchableOpacity>
        <View style={s.shT}>
          <Text style={s.shH1}>{isEditing ? 'Editar cliente' : 'Novo cliente'}</Text>
        </View>
        <TouchableOpacity onPress={handleSave} disabled={loading} activeOpacity={0.8}
          style={[s.actPill, { backgroundColor: PINK, shadowColor: PINK, shadowOpacity: 0.3 }]}>
          {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13.5 }}>Salvar</Text>}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"
          contentContainerStyle={s.body}>

          {/* ── Dados pessoais ── */}
          <Text style={s.sec}>Dados pessoais</Text>

          <View style={s.field}>
            <Text style={s.label}>Nome</Text>
            <View style={[s.input, errors.name && s.inputErr]}>
              <Ionicons name="person-outline" size={18} color={INK3} />
              <TextInput style={s.inputText} value={name} onChangeText={setName}
                placeholder="Ex: Dona Ana" placeholderTextColor={INK3} />
            </View>
            {errors.name && <Text style={s.err}>{errors.name}</Text>}
          </View>

          <View style={s.field}>
            <Text style={s.label}>Telefone</Text>
            <View style={s.input}>
              <Ionicons name="call-outline" size={18} color={INK3} />
              <TextInput style={s.inputText} value={phone} onChangeText={setPhone}
                placeholder="(11) 98888-7777" placeholderTextColor={INK3} keyboardType="phone-pad" maxLength={15} />
            </View>
          </View>

          <View style={s.field}>
            <Text style={s.label}>E-mail</Text>
            <View style={s.input}>
              <Ionicons name="mail-outline" size={18} color={INK3} />
              <TextInput style={s.inputText} value={email} onChangeText={setEmail}
                placeholder="ana@email.com" placeholderTextColor={INK3} keyboardType="email-address" autoCapitalize="none" />
            </View>
          </View>

          {/* ── Aniversário ── */}
          <Text style={s.sec}>Aniversário</Text>

          <View style={s.two}>
            <View style={[s.field, { flex: 1 }]}>
              <Text style={s.label}>Dia</Text>
              <View style={[s.input, errors.birthdayDay && s.inputErr]}>
                <TextInput style={s.inputText} value={birthdayDay} onChangeText={setBirthdayDay}
                  placeholder="12" placeholderTextColor={INK3} keyboardType="number-pad" maxLength={2} />
              </View>
              {errors.birthdayDay && <Text style={s.err}>{errors.birthdayDay}</Text>}
            </View>
            <View style={[s.field, { flex: 1 }]}>
              <Text style={s.label}>Mês</Text>
              <View style={[s.input, errors.birthdayMonth && s.inputErr]}>
                <TextInput style={s.inputText} value={birthdayMonth} onChangeText={setBirthdayMonth}
                  placeholder="06" placeholderTextColor={INK3} keyboardType="number-pad" maxLength={2} />
              </View>
              {errors.birthdayMonth && <Text style={s.err}>{errors.birthdayMonth}</Text>}
            </View>
          </View>

          {/* ── Endereço ── */}
          <Text style={s.sec}>Endereço</Text>

          <View style={s.field}>
            <View style={[s.input, s.inputArea]}>
              <TextInput style={[s.inputText, { textAlignVertical: 'top' }]} value={address} onChangeText={setAddress}
                placeholder="Rua, número, bairro…" placeholderTextColor={INK3} multiline numberOfLines={2} />
            </View>
          </View>

          {/* ── Observações ── */}
          <Text style={s.sec}>Observações</Text>

          <View style={s.field}>
            <View style={[s.input, s.inputArea]}>
              <TextInput style={[s.inputText, { textAlignVertical: 'top' }]} value={notes} onChangeText={setNotes}
                placeholder="Ex: prefere chocolate meio amargo" placeholderTextColor={INK3} multiline numberOfLines={3} />
            </View>
          </View>

          {/* ── Save button ── */}
          <TouchableOpacity onPress={handleSave} disabled={loading} activeOpacity={0.85}>
            <LinearGradient colors={['#FF6AAE', PINK]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={s.btn}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Salvar cliente</Text>}
            </LinearGradient>
          </TouchableOpacity>

          <View style={{ height: 24 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: CREAM },
  body: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 40, gap: 13 },

  /* ── Header ── */
  sh: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10 },
  bk: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...SHADOW },
  shT: { flex: 1 },
  shH1: { fontSize: 22, fontWeight: '700', color: INK },
  actPill: { height: 38, paddingHorizontal: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center', ...SHADOW },

  /* ── Section title ── */
  sec: { fontSize: 16, fontWeight: '700', color: INK, marginTop: 4, marginBottom: -4, marginLeft: 2 },

  /* ── Field ── */
  field: { gap: 7 },
  label: { fontSize: 13, fontWeight: '700', color: INK, marginLeft: 2 },
  err: { fontSize: 12, color: '#F44336', marginLeft: 2 },

  /* ── Input ── */
  input: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    ...SHADOW,
  },
  inputArea: { alignItems: 'flex-start', minHeight: 74 },
  inputErr: { borderWidth: 1.5, borderColor: '#F44336' },
  inputText: { flex: 1, fontSize: 15, color: INK, padding: 0 },

  /* ── Two cols ── */
  two: { flexDirection: 'row', gap: 11 },

  /* ── Button ── */
  btn: {
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW,
    shadowColor: PINK,
    shadowOpacity: 0.35,
  },
  btnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
