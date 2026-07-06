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
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { RootStackParamList } from '../navigation/types';
import { StoreProduct } from '../../domain/entities/StoreProduct';
import { storeApi } from '../../data/api/storeApi';
import { demoStoreApi } from '../../data/demo/demoApi';
import { isDemoMode } from '../../data/demo/demoMode';
import { recipeApi } from '../../data/api/recipeApi';
import { Recipe } from '../../domain/entities/Recipe';
import { useToast } from '../context/ToastContext';
import { usePaywall } from '../premium/usePaywall';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'StoreProductForm'>;

const INK = '#3D2233';
const INK2 = '#9A7E8C';
const INK3 = '#C4B0BB';
const CREAM = '#FFF6F0';
const PURPLE = '#7C3AED';
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
  const [available, setAvailable] = useState(true);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
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
          setAvailable(found.available);
          setPhotoUri(found.photoUrl ?? null);
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
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handleSelectRecipe = (recipe: Recipe) => {
    setRecipeId(recipe.id);
    if (!name) setName(recipe.name);
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

    setSaving(true);
    try {
      const data = {
        name: name.trim(),
        description: description.trim() || undefined,
        publicPrice: price,
        available,
        recipeId,
        // photoUrl é reservado para quando o backend tiver endpoint de upload
        photoUrl: undefined as string | undefined,
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
          <Text style={st.headerTitle}>{isEditing ? 'Editar produto' : 'Novo produto'}</Text>
          {isEditing ? (
            <TouchableOpacity onPress={handleDelete} style={st.backBtn}>
              <Ionicons name="trash-outline" size={20} color="#C0392B" />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 38 }} />
          )}
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={st.body}>

          {/* ── Photo ── */}
          <TouchableOpacity style={st.photoBox} onPress={handlePickPhoto} activeOpacity={0.8}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={st.photoPreview} />
            ) : (
              <View style={st.photoPlaceholder}>
                <Ionicons name="camera-outline" size={30} color={INK3} />
                <Text style={st.photoHint}>Adicionar foto</Text>
              </View>
            )}
          </TouchableOpacity>

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

          {/* ── Vincular receita ── */}
          <Text style={st.label}>Vincular a receita (opcional)</Text>
          <TouchableOpacity style={st.recipeSelect} onPress={() => setShowRecipePicker(true)} activeOpacity={0.7}>
            {linkedRecipe ? (
              <>
                <Ionicons name="book-outline" size={18} color={PURPLE} />
                <Text style={[st.recipeSelectText, { color: PURPLE }]} numberOfLines={1}>
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
                    <Ionicons name="book-outline" size={16} color={PURPLE} />
                    <Text style={st.recipePickerItemText}>{r.name}</Text>
                  </TouchableOpacity>
                ))
              )}
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

  photoBox: { alignSelf: 'center', marginBottom: 16, marginTop: 8 },
  photoPreview: { width: 120, height: 120, borderRadius: 20 },
  photoPlaceholder: {
    width: 120, height: 120, borderRadius: 20,
    backgroundColor: '#F0EAF8', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 2, borderColor: '#D8C8F0', borderStyle: 'dashed',
  },
  photoHint: { fontSize: 12, color: INK3, fontWeight: '600' },

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
  toggleTrackOn: { backgroundColor: PURPLE },
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
    paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#F1E2DA',
  },
  recipePickerItemText: { fontSize: 14, color: INK, fontWeight: '500' },

  footer: { paddingHorizontal: 18, paddingBottom: 20, paddingTop: 8, backgroundColor: CREAM },
  saveBtn: {
    height: 52, borderRadius: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    shadowColor: PURPLE, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
