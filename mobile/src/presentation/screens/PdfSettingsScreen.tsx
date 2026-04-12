import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { RootStackParamList } from '../navigation/types';
import { PdfSettings, pdfSettingsStorage } from '../../data/storage/pdfSettingsStorage';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Header } from '../components/Header';
import { useToast } from '../context/ToastContext';
import { usePaywall } from '../premium/usePaywall';
import { shareRecipeQuote } from '../utils/pdfQuote';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const COLOR_PRESETS = [
  { color: '#E91E63', label: 'Rosa' },
  { color: '#F44336', label: 'Vermelho' },
  { color: '#9C27B0', label: 'Roxo' },
  { color: '#2196F3', label: 'Azul' },
  { color: '#4CAF50', label: 'Verde' },
  { color: '#FF9800', label: 'Laranja' },
  { color: '#795548', label: 'Marrom' },
  { color: '#607D8B', label: 'Cinza' },
];

export const PdfSettingsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { guardScreen } = usePaywall();
  const { showToast } = useToast();

  const [settings, setSettings] = useState<PdfSettings>({
    brandColor: '#E91E63',
    hideWatermark: false,
  });
  const [customColor, setCustomColor] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!guardScreen('pdfCustomBranding')) {
      return;
    }
    pdfSettingsStorage.get().then(setSettings);
  }, []);

  const pickLogo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: false,
    });

    if (!result.canceled && result.assets[0]) {
      try {
        const base64 = await FileSystem.readAsStringAsync(result.assets[0].uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        setSettings(prev => ({ ...prev, logoBase64: `data:image/jpeg;base64,${base64}` }));
      } catch {
        showToast('Erro ao carregar imagem', 'error');
      }
    }
  };

  const removeLogo = () => {
    setSettings(prev => ({ ...prev, logoBase64: undefined }));
  };

  const selectColor = (color: string) => {
    setSettings(prev => ({ ...prev, brandColor: color }));
    setCustomColor('');
  };

  const applyCustomColor = () => {
    const hex = customColor.trim();
    if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
      setSettings(prev => ({ ...prev, brandColor: hex }));
    } else {
      showToast('Use o formato #RRGGBB', 'warning');
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await pdfSettingsStorage.save(settings);
      showToast('Configurações salvas!', 'success');
      navigation.goBack();
    } catch {
      showToast('Erro ao salvar', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async () => {
    try {
      // Generate a sample PDF with dummy data
      await shareRecipeQuote(
        {
          recipe: {
            id: 'preview',
            name: 'Brigadeiro Gourmet (Exemplo)',
            yield: 50,
            profitMargin: 70,
            ingredients: [
              { ingredientId: '1', ingredientName: 'Leite Condensado', quantityUsed: 395, unit: 'g' },
              { ingredientId: '2', ingredientName: 'Chocolate em pó', quantityUsed: 100, unit: 'g' },
              { ingredientId: '3', ingredientName: 'Manteiga', quantityUsed: 30, unit: 'g' },
            ],
            additionalCosts: [{ name: 'Embalagem', value: 5 }],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          calculation: {
            totalCost: 18.50,
            costPerUnit: 0.37,
            suggestedPrice: 0.63,
            estimatedProfit: 13.0,
            profitMargin: 70,
            ingredientsCost: 13.50,
            additionalCostTotal: 5.0,
          },
          companyName: 'Minha Confeitaria',
        },
        settings,
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erro ao gerar preview';
      showToast(msg, 'error');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="Personalizar PDF" subtitle="Personalize os orçamentos com a identidade da sua marca." showBack onBack={() => navigation.goBack()} />
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Logo */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Logo da empresa</Text>
          <Text style={styles.sectionSubtitle}>Aparece no cabeçalho do orçamento</Text>
          {settings.logoBase64 ? (
            <View style={styles.logoPreview}>
              <Image source={{ uri: settings.logoBase64 }} style={styles.logoImage} />
              <View style={styles.logoActions}>
                <TouchableOpacity onPress={pickLogo} style={styles.logoBtn}>
                  <Ionicons name="swap-horizontal-outline" size={18} color={colors.primary} />
                  <Text style={styles.logoBtnText}>Trocar</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={removeLogo} style={styles.logoBtn}>
                  <Ionicons name="trash-outline" size={18} color={colors.error} />
                  <Text style={[styles.logoBtnText, { color: colors.error }]}>Remover</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity onPress={pickLogo} style={styles.logoPlaceholder}>
              <Ionicons name="image-outline" size={32} color={colors.textMuted} />
              <Text style={styles.logoPlaceholderText}>Toque para selecionar sua logo</Text>
            </TouchableOpacity>
          )}
        </Card>

        {/* Brand Color */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Cor principal</Text>
          <Text style={styles.sectionSubtitle}>Usada nos títulos e destaques do PDF</Text>
          <View style={styles.colorGrid}>
            {COLOR_PRESETS.map(preset => (
              <TouchableOpacity
                key={preset.color}
                onPress={() => selectColor(preset.color)}
                style={[
                  styles.colorSwatch,
                  { backgroundColor: preset.color },
                  settings.brandColor === preset.color && styles.colorSwatchSelected,
                ]}
              >
                {settings.brandColor === preset.color && (
                  <Ionicons name="checkmark" size={18} color="#fff" />
                )}
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.customColorRow}>
            <Input
              label="Cor personalizada (hex)"
              placeholder="#FF5722"
              value={customColor}
              onChangeText={setCustomColor}
              containerStyle={{ flex: 1, marginRight: 8 }}
            />
            <TouchableOpacity onPress={applyCustomColor} style={styles.applyColorBtn}>
              <Text style={styles.applyColorText}>Aplicar</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.colorPreview}>
            <View style={[styles.colorPreviewBox, { backgroundColor: settings.brandColor }]} />
            <Text style={styles.colorPreviewText}>Cor atual: {settings.brandColor}</Text>
          </View>
        </Card>

        {/* Slogan */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Slogan</Text>
          <Text style={styles.sectionSubtitle}>Aparece abaixo do nome da empresa</Text>
          <Input
            placeholder="Ex: Doces artesanais feitos com amor"
            value={settings.companySlogan || ''}
            onChangeText={v => setSettings(prev => ({ ...prev, companySlogan: v }))}
          />
        </Card>

        {/* Watermark */}
        <Card style={styles.section}>
          <TouchableOpacity
            style={styles.toggleRow}
            onPress={() => setSettings(prev => ({ ...prev, hideWatermark: !prev.hideWatermark }))}
            activeOpacity={0.7}
          >
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleTitle}>Remover marca DocePreço</Text>
              <Text style={styles.toggleSubtitle}>Remove o rodapé "Gerado por DocePreço"</Text>
            </View>
            <View style={[styles.toggle, settings.hideWatermark && styles.toggleActive]}>
              {settings.hideWatermark && <Ionicons name="checkmark" size={16} color="#fff" />}
            </View>
          </TouchableOpacity>
        </Card>

        {/* Actions */}
        <TouchableOpacity onPress={handlePreview} style={styles.previewBtn}>
          <Ionicons name="eye-outline" size={18} color={colors.primary} />
          <Text style={styles.previewBtnText}>Visualizar PDF de exemplo</Text>
        </TouchableOpacity>

        <Button
          title="Salvar Configurações"
          onPress={handleSave}
          loading={loading}
          size="lg"
          style={styles.saveButton}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, padding: 20 },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.primaryLight,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  infoText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 18,
  },
  section: { marginBottom: 16 },
  sectionTitle: { ...typography.h4, color: colors.text, marginBottom: 4 },
  sectionSubtitle: { ...typography.caption, color: colors.textSecondary, marginBottom: 16 },
  logoPreview: { alignItems: 'center', gap: 12 },
  logoImage: { width: 100, height: 100, borderRadius: 16, backgroundColor: colors.border },
  logoActions: { flexDirection: 'row', gap: 16 },
  logoBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  logoBtnText: { ...typography.bodySmall, color: colors.primary, fontWeight: '600' },
  logoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    gap: 8,
  },
  logoPlaceholderText: { ...typography.bodySmall, color: colors.textMuted },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  colorSwatch: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorSwatchSelected: {
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  customColorRow: { flexDirection: 'row', alignItems: 'flex-end' },
  applyColorBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  applyColorText: { ...typography.button, color: '#fff', fontSize: 13 },
  colorPreview: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  colorPreviewBox: { width: 24, height: 24, borderRadius: 8 },
  colorPreviewText: { ...typography.bodySmall, color: colors.textSecondary },
  toggleRow: { flexDirection: 'row', alignItems: 'center' },
  toggleInfo: { flex: 1 },
  toggleTitle: { ...typography.body, color: colors.text, fontWeight: '600' },
  toggleSubtitle: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  toggle: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  previewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.primary,
    marginBottom: 12,
  },
  previewBtnText: { ...typography.button, color: colors.primary, fontSize: 14 },
  saveButton: { marginBottom: 32 },
});
