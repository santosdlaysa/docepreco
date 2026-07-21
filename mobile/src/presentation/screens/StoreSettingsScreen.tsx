import { colors } from '../theme/colors';
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
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { StoreSettings, StoreBusinessHours } from '../../domain/entities/StoreProduct';
import { PaymentMethodType } from '../../domain/entities/Order';
import { storeApi } from '../../data/api/storeApi';
import { demoStoreApi } from '../../data/demo/demoApi';
import { isDemoMode } from '../../data/demo/demoMode';
import { useToast } from '../context/ToastContext';
import { usePaywall } from '../premium/usePaywall';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const INK = colors.text;
const INK2 = colors.textSecondary;
const INK3 = colors.textMuted;
const CREAM = colors.pinkBg3;
const PINK = colors.primary;
const PINK_LIGHT = colors.pinkBright;
const GREEN = colors.green;
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

const ALL_PAYMENT_METHODS: { key: PaymentMethodType; icon: keyof typeof Ionicons.glyphMap; label: string; sub: string }[] = [
  { key: 'pix', icon: 'qr-code-outline', label: 'Pix', sub: 'Transferência instantânea' },
  { key: 'cash', icon: 'cash-outline', label: 'Dinheiro', sub: 'Pagamento na entrega/retirada' },
  { key: 'credit', icon: 'card-outline', label: 'Cartão de crédito', sub: 'Na maquininha' },
  { key: 'debit', icon: 'card-outline', label: 'Cartão de débito', sub: 'Na maquininha' },
];

const WEEKDAY_LABELS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

const defaultBusinessHours = (): StoreBusinessHours[] =>
  Array.from({ length: 7 }, (_, dayOfWeek) => ({
    dayOfWeek,
    closed: dayOfWeek === 0,
    openTime: '08:00',
    closeTime: '18:00',
  }));

const FOOD_CATEGORIES = [
  { key: 'hamburguer', label: 'Hambúrguer', emoji: '🍔' },
  { key: 'bolos',      label: 'Bolos',       emoji: '🎂' },
  { key: 'doces',      label: 'Doces',       emoji: '🍬' },
  { key: 'sorvetes',   label: 'Sorvetes',    emoji: '🍦' },
  { key: 'pudins',     label: 'Pudins',      emoji: '🍮' },
  { key: 'salgados',   label: 'Salgados',    emoji: '🥟' },
  { key: 'bebidas',    label: 'Bebidas',     emoji: '🥤' },
  { key: 'pizzas',     label: 'Pizzas',      emoji: '🍕' },
  { key: 'marmitas',   label: 'Marmitas',    emoji: '🍱' },
  { key: 'outros',     label: 'Outros',      emoji: '🍽️' },
];

export const StoreSettingsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { showToast } = useToast();
  const { guardMaster } = usePaywall();

  useEffect(() => { guardMaster(); }, []);

  const sApi = isDemoMode() ? demoStoreApi : storeApi;

  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [storeName, setStoreName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [category, setCategory] = useState('');
  const [acceptsDelivery, setAcceptsDelivery] = useState(true);
  const [acceptsPickup, setAcceptsPickup] = useState(true);
  const [minOrderText, setMinOrderText] = useState('');
  const [deliveryFeeText, setDeliveryFeeText] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodType[]>(['pix', 'cash', 'credit', 'debit']);
  const [useBusinessHours, setUseBusinessHours] = useState(false);
  const [businessHours, setBusinessHours] = useState<StoreBusinessHours[]>(defaultBusinessHours());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    sApi.getSettings()
      .then(s => {
        setSettings(s);
        setStoreName(s.storeName);
        setDescription(s.description ?? '');
        setAddress(s.address ?? '');
        setCity(s.city ?? '');
        setCategory(s.category ?? '');
        setAcceptsDelivery(s.acceptsDelivery);
        setAcceptsPickup(s.acceptsPickup);
        setMinOrderText(formatMoney(s.minOrderValue ?? 0));
        setDeliveryFeeText(formatMoney(s.deliveryFee ?? 0));
        setCoverImageUrl(s.coverImageUrl ?? '');
        setPaymentMethods(s.paymentMethods?.length ? s.paymentMethods : ['pix', 'cash', 'credit', 'debit']);
        setUseBusinessHours(s.useBusinessHours ?? false);
        setBusinessHours(s.businessHours?.length === 7 ? s.businessHours : defaultBusinessHours());
      })
      .catch(() => showToast('Erro ao carregar configurações', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const handlePickCover = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showToast('Permissão de galeria necessária', 'warning');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.6,
      base64: true,
    });
    if (!result.canceled && result.assets[0]?.base64) {
      setCoverImageUrl(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };


  const togglePaymentMethod = (key: PaymentMethodType) => {
    setPaymentMethods(prev =>
      prev.includes(key) ? prev.filter(m => m !== key) : [...prev, key]
    );
  };

  const updateDayHours = (dayOfWeek: number, patch: Partial<StoreBusinessHours>) => {
    setBusinessHours(prev => prev.map(d => d.dayOfWeek === dayOfWeek ? { ...d, ...patch } : d));
  };

  const handleSave = async () => {
    if (!storeName.trim()) {
      showToast('Informe o nome da loja', 'warning');
      return;
    }
    if (!city.trim()) {
      showToast('Informe a cidade da loja', 'warning');
      return;
    }
    if (!category) {
      showToast('Selecione a categoria da loja', 'warning');
      return;
    }
    if (paymentMethods.length === 0) {
      showToast('Selecione ao menos uma forma de pagamento', 'warning');
      return;
    }

    setSaving(true);
    try {
      await sApi.updateSettings({
        storeName: storeName.trim(),
        description: description.trim() || undefined,
        address: address.trim() || undefined,
        city: city.trim() || undefined,
        category: category || undefined,
        acceptsDelivery,
        acceptsPickup,
        minOrderValue: parseMoney(minOrderText) || undefined,
        deliveryFee: parseMoney(deliveryFeeText) || undefined,
        coverImageUrl: coverImageUrl || undefined,
        paymentMethods,
        useBusinessHours,
        businessHours,
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
          <ActivityIndicator size="large" color={PINK} />
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

          {/* ── Imagem de capa ── */}
          <Text style={st.label}>Imagem de capa</Text>
          <TouchableOpacity style={st.coverBox} onPress={handlePickCover} activeOpacity={0.85}>
            {coverImageUrl ? (
              <Image source={{ uri: coverImageUrl }} style={st.coverImage} resizeMode="cover" />
            ) : (
              <View style={st.coverEmpty}>
                <Ionicons name="image-outline" size={30} color={INK3} />
                <Text style={st.coverHint}>Toque para escolher a imagem do topo da loja</Text>
              </View>
            )}
          </TouchableOpacity>
          {coverImageUrl ? (
            <TouchableOpacity style={st.coverRemoveBtn} onPress={() => setCoverImageUrl('')} activeOpacity={0.7}>
              <Ionicons name="trash-outline" size={14} color={colors.redDark} />
              <Text style={st.coverRemoveText}>Remover imagem</Text>
            </TouchableOpacity>
          ) : null}

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

          {/* ── Address ── */}
          <Text style={st.label}>Endereço da loja (opcional)</Text>
          <TextInput
            style={st.input}
            value={address}
            onChangeText={setAddress}
            placeholder="Ex: Rua das Flores, 123 — Centro"
            placeholderTextColor={INK3}
            returnKeyType="next"
          />

          {/* ── City ── */}
          <Text style={st.label}>Cidade *</Text>
          <TextInput
            style={st.input}
            value={city}
            onChangeText={setCity}
            placeholder="Ex: São Paulo"
            placeholderTextColor={INK3}
            returnKeyType="next"
          />
          <View style={st.slugCard}>
            <Ionicons name="storefront-outline" size={18} color={colors.blue} />
            <Text style={st.slugText}>
              Toda loja ativa aparece automaticamente na vitrine de lojas do DocePreço. A cidade ajuda o cliente a te encontrar.
            </Text>
          </View>

          {/* ── Category ── */}
          <Text style={[st.label, { marginTop: 16 }]}>Categoria da loja *</Text>
          <View style={st.categoryWrap}>
            {FOOD_CATEGORIES.map(cat => {
              const on = category === cat.key;
              return (
                <TouchableOpacity
                  key={cat.key}
                  style={[st.categoryChip, on && st.categoryChipOn]}
                  onPress={() => setCategory(c => c === cat.key ? '' : cat.key)}
                  activeOpacity={0.7}
                >
                  <Text style={[st.categoryChipText, on && st.categoryChipTextOn]}>
                    {cat.emoji} {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

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
              <View style={[st.toggleIcon, { backgroundColor: acceptsDelivery ? colors.pinkBg : colors.gray }]}>
                <Ionicons name="bicycle-outline" size={20} color={acceptsDelivery ? PINK : INK3} />
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

          {acceptsDelivery && (
            <>
              <Text style={st.label}>Taxa de entrega (opcional)</Text>
              <View style={st.priceInput}>
                <Text style={st.pricePre}>R$</Text>
                <TextInput
                  style={st.priceField}
                  value={deliveryFeeText}
                  onChangeText={setDeliveryFeeText}
                  placeholder="0,00 — grátis se vazio"
                  placeholderTextColor={INK3}
                  keyboardType="decimal-pad"
                />
              </View>
            </>
          )}

          <TouchableOpacity style={st.toggleRow} onPress={() => setAcceptsPickup(v => !v)} activeOpacity={0.7}>
            <View style={st.toggleLeft}>
              <View style={[st.toggleIcon, { backgroundColor: acceptsPickup ? colors.pinkBg : colors.gray }]}>
                <Ionicons name="bag-outline" size={20} color={acceptsPickup ? PINK : INK3} />
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

          {/* ── Payment methods ── */}
          <Text style={[st.label, { marginTop: 20 }]}>Formas de pagamento</Text>
          {ALL_PAYMENT_METHODS.map(m => {
            const on = paymentMethods.includes(m.key);
            return (
              <TouchableOpacity key={m.key} style={st.toggleRow} onPress={() => togglePaymentMethod(m.key)} activeOpacity={0.7}>
                <View style={st.toggleLeft}>
                  <View style={[st.toggleIcon, { backgroundColor: on ? colors.pinkBg : colors.gray }]}>
                    <Ionicons name={m.icon} size={20} color={on ? PINK : INK3} />
                  </View>
                  <View>
                    <Text style={st.toggleLabel}>{m.label}</Text>
                    <Text style={st.toggleSub}>{m.sub}</Text>
                  </View>
                </View>
                <View style={[st.track, on && st.trackOn]}>
                  <View style={[st.thumb, on && st.thumbOn]} />
                </View>
              </TouchableOpacity>
            );
          })}

          {/* ── Horário de funcionamento ── */}
          <TouchableOpacity style={[st.toggleRow, { marginTop: 20 }]} onPress={() => setUseBusinessHours(v => !v)} activeOpacity={0.7}>
            <View style={st.toggleLeft}>
              <View style={[st.toggleIcon, { backgroundColor: useBusinessHours ? colors.pinkBg : colors.gray }]}>
                <Ionicons name="time-outline" size={20} color={useBusinessHours ? PINK : INK3} />
              </View>
              <View>
                <Text style={st.toggleLabel}>Horário de funcionamento</Text>
                <Text style={st.toggleSub}>Ativa e desativa a loja sozinha, conforme o horário</Text>
              </View>
            </View>
            <View style={[st.track, useBusinessHours && st.trackOn]}>
              <View style={[st.thumb, useBusinessHours && st.thumbOn]} />
            </View>
          </TouchableOpacity>

          {useBusinessHours && (
            <View style={{ gap: 8, marginTop: 4 }}>
              {businessHours.map(day => (
                <View key={day.dayOfWeek} style={st.dayRow}>
                  <View style={st.dayHeadRow}>
                    <Text style={st.dayLabel}>{WEEKDAY_LABELS[day.dayOfWeek]}</Text>
                    <TouchableOpacity
                      style={[st.dayClosedChip, day.closed && st.dayClosedChipOn]}
                      onPress={() => updateDayHours(day.dayOfWeek, { closed: !day.closed })}
                      activeOpacity={0.7}
                    >
                      <Text style={[st.dayClosedChipText, day.closed && st.dayClosedChipTextOn]}>
                        {day.closed ? 'Fechado' : 'Aberto'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  {!day.closed && (
                    <View style={st.dayTimeRow}>
                      <TextInput
                        style={st.dayTimeInput}
                        value={day.openTime}
                        onChangeText={t => updateDayHours(day.dayOfWeek, { openTime: t })}
                        placeholder="08:00"
                        placeholderTextColor={INK3}
                        keyboardType="numbers-and-punctuation"
                        maxLength={5}
                      />
                      <Text style={st.dayTimeSep}>às</Text>
                      <TextInput
                        style={st.dayTimeInput}
                        value={day.closeTime}
                        onChangeText={t => updateDayHours(day.dayOfWeek, { closeTime: t })}
                        placeholder="18:00"
                        placeholderTextColor={INK3}
                        keyboardType="numbers-and-punctuation"
                        maxLength={5}
                      />
                    </View>
                  )}
                </View>
              ))}
              <View style={st.slugCard}>
                <Ionicons name="information-circle-outline" size={18} color={colors.blue} />
                <Text style={st.slugText}>
                  Use o formato 24h (ex: 08:00, 18:30). Fora do horário cadastrado, sua loja some da vitrine e não recebe pedidos automaticamente.
                </Text>
              </View>
            </View>
          )}

          {/* ── Slug info ── */}
          {settings?.slug && (
            <View style={st.slugCard}>
              <Ionicons name="information-circle-outline" size={18} color={colors.blue} />
              <Text style={st.slugText}>
                URL da loja: <Text style={{ fontWeight: '700' }}>…/loja/{settings.slug}</Text>
              </Text>
            </View>
          )}

        </ScrollView>

        {/* ── Save button ── */}
        <View style={st.footer}>
          <TouchableOpacity onPress={handleSave} disabled={saving} activeOpacity={0.85}>
            <LinearGradient colors={[PINK_LIGHT, PINK]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.saveBtn}>
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

  coverBox: {
    width: '100%', height: 150, borderRadius: 16,
    backgroundColor: '#fff', overflow: 'hidden', ...SHADOW,
  },
  coverImage: { width: '100%', height: '100%' },
  coverEmpty: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 2, borderColor: '#FFD9EC', borderStyle: 'dashed', borderRadius: 16,
    paddingHorizontal: 24,
  },
  coverHint: { fontSize: 13, color: INK3, fontWeight: '500', textAlign: 'center' },
  coverRemoveBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-end', marginTop: 6, paddingVertical: 4, paddingHorizontal: 8,
  },
  coverRemoveText: { fontSize: 12, color: colors.redDark, fontWeight: '600' },

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
  trackOn: { backgroundColor: PINK },
  thumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff' },
  thumbOn: { alignSelf: 'flex-end' },

  categoryWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryChip: {
    paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20,
    backgroundColor: colors.gray, borderWidth: 1, borderColor: colors.gray,
  },
  categoryChipOn: { backgroundColor: colors.pinkBg, borderColor: PINK },
  categoryChipText: { fontSize: 13, fontWeight: '600', color: INK2 },
  categoryChipTextOn: { color: PINK },

  dayRow: {
    backgroundColor: '#fff', borderRadius: 14, padding: 12, paddingHorizontal: 14, ...SHADOW,
  },
  dayHeadRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dayLabel: { fontSize: 14, fontWeight: '700', color: INK },
  dayClosedChip: { paddingVertical: 5, paddingHorizontal: 12, borderRadius: 20, backgroundColor: colors.greenBg },
  dayClosedChipOn: { backgroundColor: colors.gray },
  dayClosedChipText: { fontSize: 12, fontWeight: '700', color: colors.greenDark },
  dayClosedChipTextOn: { color: INK2 },
  dayTimeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  dayTimeInput: {
    flex: 1, backgroundColor: CREAM, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10,
    fontSize: 14, color: INK, textAlign: 'center',
  },
  dayTimeSep: { fontSize: 12, color: INK2, fontWeight: '600' },

  slugCard: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.blueBg, borderRadius: 12, padding: 12,
    marginTop: 16, borderWidth: 1, borderColor: '#B8DDEF',
  },
  slugText: { flex: 1, fontSize: 12.5, color: colors.blueDark, lineHeight: 18 },

  footer: { paddingHorizontal: 18, paddingBottom: 20, paddingTop: 8, backgroundColor: CREAM },
  saveBtn: {
    height: 52, borderRadius: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    shadowColor: PINK, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
