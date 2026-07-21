import { colors } from '../theme/colors';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { StoreProduct } from '../../domain/entities/StoreProduct';
import { storeApi } from '../../data/api/storeApi';
import { demoStoreApi } from '../../data/demo/demoApi';
import { isDemoMode } from '../../data/demo/demoMode';
import { recipeApi } from '../../data/api/recipeApi';
import { Recipe } from '../../domain/entities/Recipe';
import { useToast } from '../context/ToastContext';
import { usePaywall } from '../premium/usePaywall';
import { DiscountType } from '../utils/discount';
import { DiscountInput } from '../components/DiscountInput';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'StoreProductForm'>;

const INK = colors.text;
const INK2 = colors.textSecondary;
const INK3 = colors.textMuted;
const CREAM = colors.pinkBg3;
const PINK = colors.primary;
const PINK_LIGHT = colors.pinkBright;
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
  n === 0 ? '' : n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const StoreProductFormScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const productId = route.params?.productId;
  const isEditing = !!productId;
  const { showToast } = useToast();
  const { guardMaster } = usePaywall();

  useEffect(() => { guardMaster(); }, []);

  const sApi = isDemoMode() ? demoStoreApi : storeApi;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [priceText, setPriceText] = useState('');
  const [discountType, setDiscountType] = useState<DiscountType>('fixed');
  const [discountValue, setDiscountValue] = useState('');
  const [available, setAvailable] = useState(true);
  const [stockText, setStockText] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string>('');
  const [recipeId, setRecipeId] = useState<string | undefined>(undefined);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [showRecipePicker, setShowRecipePicker] = useState(false);
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    recipeApi.getAll().then(setRecipes).catch(() => {});
    if (isEditing) {
      sApi.getProducts()
        .then(all => {
          const found = all.find(p => p.id === productId);
          if (!found) return;
          setName(found.name);
          setDescription(found.description ?? '');
          setPriceText(formatMoney(found.publicPrice));
          if (found.discountType && found.discountValue) {
            setDiscountType(found.discountType);
            setDiscountValue(found.discountType === 'percent' ? String(found.discountValue) : formatMoney(found.discountValue));
          }
          setAvailable(found.available);
          setStockText(found.stock != null ? String(found.stock) : '');
          setPhotoUrl(found.photoUrl ?? '');
          setRecipeId(found.recipeId);
        })
        .catch(() => showToast('Erro ao carregar produto', 'error'))
        .finally(() => setLoading(false));
    }
  }, []);

  const handlePickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showToast('Permissão de galeria necessária', 'warning');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
      base64: true,
    });
    if (!result.canceled && result.assets[0]?.base64) {
      setPhotoUrl(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const handleSelectRecipe = (recipe: Recipe) => {
    setRecipeId(recipe.id);
    if (!name) setName(recipe.name);
    if (!photoUrl && recipe.photoUrl) setPhotoUrl(recipe.photoUrl);
    setShowRecipePicker(false);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      showToast('Informe o nome do produto', 'warning');
      return;
    }
    const price = parseMoney(priceText);
    if (price <= 0) {
      showToast('Informe um preço válido', 'warning');
      return;
    }

    const discountValueNum = discountType === 'percent' ? parseInt(discountValue, 10) || 0 : parseMoney(discountValue);

    setSaving(true);
    try {
      const data = {
        name: name.trim(),
        description: description.trim() || undefined,
        publicPrice: price,
        available,
        recipeId,
        photoUrl: photoUrl.trim() || undefined,
        discountType: discountValueNum > 0 ? discountType : null,
        discountValue: discountValueNum > 0 ? discountValueNum : null,
        stock: stockText.trim() === '' ? null : Math.max(0, parseInt(stockText, 10) || 0),
      };

      if (isEditing && productId) {
        await sApi.updateProduct(productId, data);
        showToast('Produto atualizado!', 'success');
      } else {
        await sApi.createProduct(data);
        showToast('Produto adicionado!', 'success');
      }
      navigation.goBack();
    } catch {
      showToast('Erro ao salvar produto', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!productId) return;
    Alert.alert('Excluir produto?', 'Essa ação não pode ser desfeita.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir', style: 'destructive', onPress: async () => {
          try {
            await sApi.deleteProduct(productId);
            showToast('Produto removido', 'success');
            navigation.goBack();
          } catch {
            showToast('Erro ao excluir', 'error');
          }
        },
      },
    ]);
  };

  const linkedRecipe = recipeId ? recipes.find(r => r.id === recipeId) : undefined;

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
          <Text style={st.headerTitle}>{isEditing ? 'Editar produto' : 'Novo produto'}</Text>
          {isEditing ? (
            <TouchableOpacity onPress={handleDelete} style={st.backBtn}>
              <Ionicons name="trash-outline" size={20} color={colors.redDark} />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 38 }} />
          )}
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={st.body}>

          {/* ── Foto ── */}
          <Text style={st.label}>Foto do produto</Text>
          <TouchableOpacity style={st.photoBox} onPress={handlePickPhoto} activeOpacity={0.8}>
            {photoUrl ? (
              <Image source={{ uri: photoUrl }} style={st.photoBoxImage} resizeMode="cover" />
            ) : (
              <View style={st.photoBoxEmpty}>
                <Ionicons name="camera-outline" size={32} color={INK3} />
                <Text style={st.photoBoxHint}>Toque para escolher da galeria</Text>
              </View>
            )}
          </TouchableOpacity>
          {photoUrl ? (
            <TouchableOpacity style={st.photoRemoveBtn} onPress={() => setPhotoUrl('')} activeOpacity={0.7}>
              <Ionicons name="trash-outline" size={14} color={colors.redDark} />
              <Text style={st.photoRemoveText}>Remover foto</Text>
            </TouchableOpacity>
          ) : null}

          {/* ── Vincular receita ── */}
          <Text style={st.label}>Vincular a receita (opcional)</Text>
          <TouchableOpacity style={st.recipeSelect} onPress={() => setShowRecipePicker(true)} activeOpacity={0.7}>
            {linkedRecipe ? (
              <>
                <Ionicons name="book-outline" size={18} color={PINK} />
                <Text style={[st.recipeSelectText, { color: PINK }]} numberOfLines={1}>
                  {linkedRecipe.name}
                </Text>
                <TouchableOpacity onPress={() => setRecipeId(undefined)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close-circle" size={18} color={INK3} />
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Ionicons name="book-outline" size={18} color={INK3} />
                <Text style={st.recipeSelectText}>Selecionar receita</Text>
                <Ionicons name="chevron-down" size={16} color={INK3} />
              </>
            )}
          </TouchableOpacity>

          {/* ── Recipe picker inline ── */}
          {showRecipePicker && (
            <View style={st.recipePicker}>
              <View style={st.recipePickerHead}>
                <Text style={st.recipePickerTitle}>Selecionar receita</Text>
                <TouchableOpacity onPress={() => setShowRecipePicker(false)}>
                  <Ionicons name="close" size={22} color={INK} />
                </TouchableOpacity>
              </View>
              {recipes.length === 0 ? (
                <Text style={{ color: INK2, textAlign: 'center', paddingVertical: 16 }}>
                  Nenhuma receita cadastrada
                </Text>
              ) : (
                recipes.map(r => (
                  <TouchableOpacity
                    key={r.id}
                    style={st.recipePickerItem}
                    onPress={() => handleSelectRecipe(r)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="book-outline" size={16} color={PINK} />
                    <Text style={st.recipePickerItemText}>{r.name}</Text>
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}

          {/* ── Name ── */}
          <Text style={st.label}>Nome do produto *</Text>
          <TextInput
            style={st.input}
            value={name}
            onChangeText={setName}
            placeholder="Ex: Brigadeiro gourmet"
            placeholderTextColor={INK3}
            returnKeyType="next"
          />

          {/* ── Description ── */}
          <Text style={st.label}>Descrição (opcional)</Text>
          <TextInput
            style={[st.input, { height: 80, textAlignVertical: 'top' }]}
            value={description}
            onChangeText={setDescription}
            placeholder="Ex: Caixinha com 12 unidades, sabores variados"
            placeholderTextColor={INK3}
            multiline
          />

          {/* ── Price ── */}
          <Text style={st.label}>Preço público (R$) *</Text>
          <View style={st.priceInput}>
            <Text style={st.pricePre}>R$</Text>
            <TextInput
              style={st.priceField}
              value={priceText}
              onChangeText={setPriceText}
              placeholder="0,00"
              placeholderTextColor={INK3}
              keyboardType="decimal-pad"
            />
          </View>

          {/* ── Desconto ── */}
          <View style={{ marginTop: 12 }}>
            <DiscountInput
              label="Desconto (opcional)"
              type={discountType}
              value={discountValue}
              onChangeType={setDiscountType}
              onChangeValue={setDiscountValue}
            />
          </View>

          {/* ── Available toggle ── */}
          <TouchableOpacity style={st.toggleRow} onPress={() => setAvailable(v => !v)} activeOpacity={0.7}>
            <View>
              <Text style={st.toggleLabel}>Produto disponível</Text>
              <Text style={st.toggleSub}>Aparece no catálogo online</Text>
            </View>
            <View style={[st.toggleTrack, available && st.toggleTrackOn]}>
              <View style={[st.toggleThumb, available && st.toggleThumbOn]} />
            </View>
          </TouchableOpacity>

          {/* ── Estoque (opcional) ── */}
          <Text style={st.label}>Estoque para pedidos online (opcional)</Text>
          <TextInput
            style={st.input}
            value={stockText}
            onChangeText={t => setStockText(t.replace(/[^0-9]/g, ''))}
            placeholder="Deixe vazio para ilimitado"
            placeholderTextColor={INK3}
            keyboardType="number-pad"
          />
          <Text style={st.stockHint}>
            Com um número, o produto aceita pedidos até acabar e aparece como "Esgotado" ao zerar.
            A cada pedido online o saldo diminui — reponha editando este campo.
          </Text>

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
                  <Text style={st.saveBtnText}>{isEditing ? 'Salvar alterações' : 'Adicionar produto'}</Text>
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

  photoBox: {
    width: '100%', height: 160, borderRadius: 16,
    backgroundColor: '#fff', overflow: 'hidden', ...SHADOW,
  },
  photoBoxImage: { width: '100%', height: '100%' },
  photoBoxEmpty: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 2, borderColor: '#FFD9EC', borderStyle: 'dashed', borderRadius: 16,
  },
  photoBoxHint: { fontSize: 13, color: INK3, fontWeight: '500' },
  photoRemoveBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-end', marginTop: 6, paddingVertical: 4, paddingHorizontal: 8,
  },
  photoRemoveText: { fontSize: 12, color: colors.redDark, fontWeight: '600' },

  label: { fontSize: 13, fontWeight: '700', color: INK, marginTop: 12, marginBottom: 6, marginLeft: 2 },
  stockHint: { fontSize: 11.5, color: INK2, marginTop: 6, marginLeft: 2, lineHeight: 16 },
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

  recipeSelect: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 10, ...SHADOW,
  },
  recipeSelectText: { flex: 1, fontSize: 14, color: INK3, fontWeight: '500' },

  toggleRow: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 12, ...SHADOW,
  },
  toggleLabel: { fontSize: 14.5, fontWeight: '700', color: INK },
  toggleSub: { fontSize: 12, color: INK2, marginTop: 2 },
  toggleTrack: {
    width: 46, height: 26, borderRadius: 13,
    backgroundColor: '#D0C8D8', justifyContent: 'center', paddingHorizontal: 3,
  },
  toggleTrackOn: { backgroundColor: PINK },
  toggleThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff' },
  toggleThumbOn: { alignSelf: 'flex-end' },

  recipePicker: {
    backgroundColor: '#fff', borderRadius: 16, padding: 14,
    marginTop: 8, ...SHADOW,
  },
  recipePickerHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  recipePickerTitle: { fontSize: 15, fontWeight: '700', color: INK },
  recipePickerItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border,
  },
  recipePickerItemText: { fontSize: 14, color: INK, fontWeight: '500' },

  footer: { paddingHorizontal: 18, paddingBottom: 20, paddingTop: 8, backgroundColor: CREAM },
  saveBtn: {
    height: 52, borderRadius: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    shadowColor: PINK, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
