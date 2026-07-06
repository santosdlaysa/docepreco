import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { StoreSettings } from '../../domain/entities/StoreProduct';
import { storeApi } from '../../data/api/storeApi';
import { demoStoreApi } from '../../data/demo/demoApi';
import { isDemoMode } from '../../data/demo/demoMode';
import { useToast } from '../context/ToastContext';
import { usePaywall } from '../premium/usePaywall';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const INK = '#3D2233';
const INK2 = '#9A7E8C';
const INK3 = '#C4B0BB';
const CREAM = '#FFF6F0';
const PURPLE = '#7C3AED';
const GREEN = '#43BE6E';
const SHADOW = {
  shadowColor: INK,
  shadowOffset: { width: 0, height: 2 } as const,
  shadowOpacity: 0.07,
  shadowRadius: 8,
  elevation: 3,
};

const parseMoney = (raw: string): number => {
  const s = raw.replace(/[^0-9,]/g, '').replace(',', '.');
  return parseFloat(s) || 0;
};

const formatMoney = (n: number): string =>
  n > 0 ? n.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '';

export const StoreSettingsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { showToast } = useToast();
  const { guardMaster } = usePaywall();

  useEffect(() => { guardMaster(); }, []);

  const sApi = isDemoMode() ? demoStoreApi : storeApi;

  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [storeName, setStoreName] = useState('');
  const [description, setDescription] = useState('');
  const [acceptsDelivery, setAcceptsDelivery] = useState(true);
  const [acceptsPickup, setAcceptsPickup] = useState(true);
  const [minOrderText, setMinOrderText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    sApi.getSettings()
      .then(s => {
        setSettings(s);
        setStoreName(s.storeName);
        setDescription(s.description ?? '');
        setAcceptsDelivery(s.acceptsDelivery);
        setAcceptsPickup(s.acceptsPickup);
        setMinOrderText(formatMoney(s.minOrderValue ?? 0));
      })
      .catch(() => showToast('Erro ao carregar configurações', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!storeName.trim()) {
      showToast('Informe o nome da loja', 'warning');
      return;
    }

    setSaving(true);
    try {
      await sApi.updateSettings({
        storeName: storeName.trim(),
        description: description.trim() || undefined,
        acceptsDelivery,
        acceptsPickup,
        minOrderValue: parseMoney(minOrderText) || undefined,
      });
      showToast('Configurações salvas!', 'success');
      navigation.goBack();
    } catch {
      showToast('Erro ao salvar configurações', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={st.safe}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={PURPLE} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={st.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* ── Header ── */}
        <View style={st.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={st.backBtn}>
            <Ionicons name="arrow-back" size={20} color={INK} />
          </TouchableOpacity>
          <Text style={st.headerTitle}>Configurações da loja</Text>
          <View style={{ width: 38 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={st.body}>

          {/* ── Store name ── */}
          <Text style={st.label}>Nome da loja *</Text>
          <TextInput
            style={st.input}
            value={storeName}
            onChangeText={setStoreName}
            placeholder="Ex: Doceria da Ana"
            placeholderTextColor={INK3}
            returnKeyType="next"
          />

          {/* ── Description ── */}
          <Text style={st.label}>Descrição (opcional)</Text>
          <TextInput
            style={[st.input, { height: 80, textAlignVertical: 'top' }]}
            value={description}
            onChangeText={setDescription}
            placeholder="Uma frase sobre sua confeitaria"
            placeholderTextColor={INK3}
            multiline
          />

          {/* ── Min order ── */}
          <Text style={st.label}>Valor mínimo de pedido (opcional)</Text>
          <View style={st.priceInput}>
            <Text style={st.pricePre}>R$</Text>
            <TextInput
              style={st.priceField}
              value={minOrderText}
              onChangeText={setMinOrderText}
              placeholder="0,00"
              placeholderTextColor={INK3}
              keyboardType="decimal-pad"
            />
          </View>

          {/* ── Delivery options ── */}
          <Text style={[st.label, { marginTop: 20 }]}>Opções de entrega</Text>

          <TouchableOpacity style={st.toggleRow} onPress={() => setAcceptsDelivery(v => !v)} activeOpacity={0.7}>
            <View style={st.toggleLeft}>
              <View style={[st.toggleIcon, { backgroundColor: acceptsDelivery ? '#EDE4FB' : '#F5F5F5' }]}>
                <Ionicons name="bicycle-outline" size={20} color={acceptsDelivery ? PURPLE : INK3} />
              </View>
              <View>
                <Text style={st.toggleLabel}>Entrega</Text>
                <Text style={st.toggleSub}>Você entrega no endereço do cliente</Text>
              </View>
            </View>
            <View style={[st.track, acceptsDelivery && st.trackOn]}>
              <View style={[st.thumb, acceptsDelivery && st.thumbOn]} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={st.toggleRow} onPress={() => setAcceptsPickup(v => !v)} activeOpacity={0.7}>
            <View style={st.toggleLeft}>
              <View style={[st.toggleIcon, { backgroundColor: acceptsPickup ? '#EDE4FB' : '#F5F5F5' }]}>
                <Ionicons name="bag-outline" size={20} color={acceptsPickup ? PURPLE : INK3} />
              </View>
              <View>
                <Text style={st.toggleLabel}>Retirada</Text>
                <Text style={st.toggleSub}>Cliente retira no seu local</Text>
              </View>
            </View>
            <View style={[st.track, acceptsPickup && st.trackOn]}>
              <View style={[st.thumb, acceptsPickup && st.thumbOn]} />
            </View>
          </TouchableOpacity>

          {/* ── Slug info ── */}
          {settings?.slug && (
            <View style={st.slugCard}>
              <Ionicons name="information-circle-outline" size={18} color="#2BA7DD" />
              <Text style={st.slugText}>
                URL da loja: <Text style={{ fontWeight: '700' }}>…/loja/{settings.slug}</Text>
              </Text>
            </View>
          )}

        </ScrollView>

        {/* ── Save button ── */}
        <View style={st.footer}>
          <TouchableOpacity onPress={handleSave} disabled={saving} activeOpacity={0.85}>
            <LinearGradient colors={['#9B5DE5', PURPLE]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.saveBtn}>
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark" size={20} color="#fff" />
                  <Text style={st.saveBtnText}>Salvar configurações</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10, gap: 12,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    ...SHADOW,
  },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: '700', color: INK, textAlign: 'center' },

  body: { paddingHorizontal: 18, paddingBottom: 24, gap: 4 },

  label: { fontSize: 13, fontWeight: '700', color: INK, marginTop: 12, marginBottom: 6, marginLeft: 2 },
  input: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    fontSize: 15, color: INK, ...SHADOW,
  },
  priceInput: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 8, ...SHADOW,
  },
  pricePre: { fontSize: 15, fontWeight: '700', color: INK3 },
  priceField: { flex: 1, fontSize: 15, color: INK, padding: 0 },

  toggleRow: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 8, ...SHADOW,
  },
  toggleLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  toggleIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  toggleLabel: { fontSize: 14.5, fontWeight: '700', color: INK },
  toggleSub: { fontSize: 12, color: INK2, marginTop: 2 },
  track: { width: 46, height: 26, borderRadius: 13, backgroundColor: '#D0C8D8', justifyContent: 'center', paddingHorizontal: 3 },
  trackOn: { backgroundColor: PURPLE },
  thumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff' },
  thumbOn: { alignSelf: 'flex-end' },

  slugCard: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#EEF8FD', borderRadius: 12, padding: 12,
    marginTop: 16, borderWidth: 1, borderColor: '#B8DDEF',
  },
  slugText: { flex: 1, fontSize: 12.5, color: '#1A6F96', lineHeight: 18 },

  footer: { paddingHorizontal: 18, paddingBottom: 20, paddingTop: 8, backgroundColor: CREAM },
  saveBtn: {
    height: 52, borderRadius: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    shadowColor: PURPLE, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
