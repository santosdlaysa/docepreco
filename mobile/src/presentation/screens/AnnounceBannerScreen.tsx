import { colors } from '../theme/colors';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  TextInput,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ClipboardModule from 'expo-clipboard';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { typography } from '../theme/typography';
import { useToast } from '../context/ToastContext';
import { bannerApi } from '../../data/api/bannerApi';
import { planConfigApi, AdBannerPeriod } from '../../data/api/planConfigApi';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'AnnounceBanner'>;

const FALLBACK_PERIODS: AdBannerPeriod[] = [
  { days: 7, amountCents: 990, priceLabel: 'R$ 9,90' },
  { days: 15, amountCents: 1790, priceLabel: 'R$ 17,90' },
  { days: 30, amountCents: 2990, priceLabel: 'R$ 29,90' },
];

export const AnnounceBannerScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const { showToast } = useToast();

  const [periods, setPeriods] = useState<AdBannerPeriod[]>(FALLBACK_PERIODS);
  const [enabled, setEnabled] = useState(true);
  const [selectedDays, setSelectedDays] = useState(7);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [actionUrl, setActionUrl] = useState('');
  const [title, setTitle] = useState('');

  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pixRequestId, setPixRequestId] = useState<string | null>(null);
  const [dynamicQr, setDynamicQr] = useState<{ copyPaste: string; base64: string } | null>(null);

  const selectedPeriod = periods.find(p => p.days === selectedDays) ?? periods[0];

  useEffect(() => {
    planConfigApi.getAdBannerConfig().then(cfg => {
      if (!cfg) return;
      setEnabled(cfg.enabled);
      if (cfg.periods.length > 0) {
        setPeriods(cfg.periods);
        setSelectedDays(cfg.periods[0].days);
      }
    }).catch(() => {});
  }, []);

  const handlePickImage = async () => {
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
      setImageBase64(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const handlePurchase = async () => {
    if (!imageBase64) {
      showToast('Escolha a arte do seu anúncio', 'warning');
      return;
    }
    if (!selectedPeriod) return;
    setSending(true);
    try {
      const result = await bannerApi.purchase({
        imageBase64,
        periodDays: selectedPeriod.days,
        actionUrl: actionUrl.trim() || undefined,
        title: title.trim() || undefined,
      });
      setPixRequestId(result.pixRequestId);
      if (result.mp_qr_code && result.mp_qr_code_base64) {
        setDynamicQr({ copyPaste: result.mp_qr_code, base64: result.mp_qr_code_base64 });
      }
      setSent(true);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erro ao criar anúncio';
      showToast(msg, 'error');
    } finally {
      setSending(false);
    }
  };

  const handleCopyPix = async () => {
    if (!dynamicQr) return;
    await ClipboardModule.setStringAsync(dynamicQr.copyPaste);
    setCopied(true);
    showToast('Código PIX copiado', 'success');
    setTimeout(() => setCopied(false), 3000);
  };

  // Poll status a cada 5s enquanto aguarda pagamento
  useEffect(() => {
    if (!sent || !pixRequestId) return;
    const interval = setInterval(async () => {
      try {
        const status = await bannerApi.getPurchaseStatus(pixRequestId);
        if (status === 'approved') {
          clearInterval(interval);
          showToast('Anúncio no ar! Seu banner já aparece na Home 🎉', 'success');
          navigation.goBack();
        } else if (status === 'rejected') {
          clearInterval(interval);
          showToast('Pagamento não confirmado', 'error');
          setSent(false);
        }
      } catch {}
    }, 5000);
    return () => clearInterval(interval);
  }, [sent, pixRequestId, navigation, showToast]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Anunciar na Home</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {!enabled ? (
          <View style={styles.disabledBox}>
            <Ionicons name="megaphone-outline" size={32} color={colors.textMuted} />
            <Text style={styles.disabledText}>Os anúncios estão indisponíveis no momento.</Text>
          </View>
        ) : !sent ? (
          <>
            <Text style={styles.lead}>
              Divulgue sua confeitaria no carrossel da Home para todas as usuárias do DocePreço.
            </Text>

            {/* Upload da arte */}
            <Text style={styles.sectionLabel}>Arte do anúncio</Text>
            <TouchableOpacity style={styles.imagePicker} onPress={handlePickImage} activeOpacity={0.8}>
              {imageBase64 ? (
                <Image source={{ uri: imageBase64 }} style={styles.imagePreview} resizeMode="cover" />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Ionicons name="image-outline" size={30} color={colors.primary} />
                  <Text style={styles.imagePlaceholderText}>Toque para escolher a imagem</Text>
                  <Text style={styles.imageHint}>Proporção recomendada 16:9</Text>
                </View>
              )}
            </TouchableOpacity>
            {imageBase64 && (
              <TouchableOpacity onPress={handlePickImage} style={styles.changeImage}>
                <Text style={styles.changeImageText}>Trocar imagem</Text>
              </TouchableOpacity>
            )}

            {/* Título opcional (fallback caso a imagem não carregue) */}
            <Text style={styles.sectionLabel}>Nome exibido (opcional)</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Ex.: Confeitaria da Ana"
              placeholderTextColor={colors.textMuted}
              maxLength={60}
            />

            {/* Link de destino opcional */}
            <Text style={styles.sectionLabel}>Link ao tocar (opcional)</Text>
            <TextInput
              style={styles.input}
              value={actionUrl}
              onChangeText={setActionUrl}
              placeholder="https://instagram.com/sua_confeitaria"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              keyboardType="url"
            />

            {/* Período */}
            <Text style={styles.sectionLabel}>Período do anúncio</Text>
            <View style={styles.periodRow}>
              {periods.map(p => {
                const active = p.days === selectedDays;
                return (
                  <TouchableOpacity
                    key={p.days}
                    style={[styles.periodTab, active && styles.periodTabActive]}
                    onPress={() => setSelectedDays(p.days)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.periodDays, active && styles.periodDaysActive]}>{p.days} dias</Text>
                    <Text style={[styles.periodPrice, active && styles.periodPriceActive]}>{p.priceLabel}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={[styles.cta, (!imageBase64 || sending) && styles.ctaDisabled]}
              onPress={handlePurchase}
              disabled={!imageBase64 || sending}
              activeOpacity={0.85}
            >
              {sending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="qr-code-outline" size={20} color="#fff" />
                  <Text style={styles.ctaText}>
                    Pagar {selectedPeriod?.priceLabel ?? ''} via PIX
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </>
        ) : (
          /* QR gerado — aguardando pagamento */
          <View style={styles.waitingContainer}>
            <Text style={styles.waitingTitle}>Pague com PIX</Text>
            <Text style={styles.waitingSubtitle}>
              Escaneie o QR ou copie o código. Seu anúncio vai ao ar automaticamente após o pagamento.
            </Text>

            {dynamicQr ? (
              <>
                <View style={styles.qrContainer}>
                  <View style={styles.qrBorder}>
                    <Image
                      source={{ uri: `data:image/png;base64,${dynamicQr.base64}` }}
                      style={styles.qrImage}
                      resizeMode="contain"
                    />
                  </View>
                </View>

                <TouchableOpacity style={styles.copyCard} onPress={handleCopyPix} activeOpacity={0.7}>
                  <Ionicons name={copied ? 'checkmark-circle' : 'copy-outline'} size={22} color={copied ? colors.success : colors.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.copyLabel}>PIX copia-e-cola</Text>
                    <Text style={styles.copyValue} numberOfLines={1} ellipsizeMode="middle">{dynamicQr.copyPaste}</Text>
                  </View>
                  <View style={[styles.copyBtnSmall, copied && { backgroundColor: colors.greenBgSoft }]}>
                    <Text style={[styles.copyBtnText, copied && { color: colors.success }]}>{copied ? 'Copiado' : 'Copiar'}</Text>
                  </View>
                </TouchableOpacity>

                <View style={styles.waitingSteps}>
                  <View style={styles.waitingStep}>
                    <Ionicons name="checkmark-circle" size={24} color={colors.success} />
                    <Text style={styles.waitingStepText}>QR de pagamento gerado</Text>
                  </View>
                  <View style={styles.waitingStep}>
                    <ActivityIndicator size="small" color={colors.primary} style={{ width: 24 }} />
                    <Text style={styles.waitingStepText}>Aguardando confirmação do pagamento...</Text>
                  </View>
                </View>
              </>
            ) : (
              <Text style={styles.waitingSubtitle}>
                Não foi possível gerar o QR do PIX agora. Tente novamente em instantes.
              </Text>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { ...typography.h3, color: colors.text },
  scroll: { padding: 20, paddingBottom: 40 },

  lead: { ...typography.body, color: colors.textSecondary, marginBottom: 20 },
  sectionLabel: { ...typography.bodySmall, color: colors.text, fontWeight: '700', marginBottom: 8, marginTop: 4 },

  imagePicker: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  imagePreview: { width: '100%', height: '100%' },
  imagePlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
  imagePlaceholderText: { ...typography.body, color: colors.primary, fontWeight: '600' },
  imageHint: { ...typography.caption, color: colors.textMuted },
  changeImage: { alignSelf: 'center', marginTop: 8 },
  changeImageText: { ...typography.bodySmall, color: colors.primary, fontWeight: '700' },

  input: {
    ...typography.body,
    color: colors.text,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
  },

  periodRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  periodTab: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
  },
  periodTabActive: { borderColor: colors.primary, backgroundColor: colors.cream },
  periodDays: { ...typography.body, color: colors.textSecondary, fontWeight: '600' },
  periodDaysActive: { color: colors.text },
  periodPrice: { ...typography.h3, color: colors.textMuted, fontWeight: '800', marginTop: 4 },
  periodPriceActive: { color: colors.primary },

  cta: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  ctaDisabled: { opacity: 0.5 },
  ctaText: { ...typography.button, color: '#fff', fontSize: 17 },

  disabledBox: { alignItems: 'center', paddingTop: 60, gap: 12 },
  disabledText: { ...typography.body, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: 30 },

  waitingContainer: { alignItems: 'center', paddingTop: 20 },
  waitingTitle: { ...typography.h2, color: colors.text, textAlign: 'center', marginBottom: 8 },
  waitingSubtitle: { ...typography.body, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: 10, marginBottom: 24 },
  qrContainer: { alignItems: 'center', marginBottom: 16 },
  qrBorder: {
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  qrImage: { width: 220, height: 220 },
  copyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  copyLabel: { ...typography.caption, color: colors.textMuted },
  copyValue: { ...typography.bodySmall, color: colors.text, fontWeight: '500', marginTop: 2 },
  copyBtnSmall: { backgroundColor: colors.primaryLight, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  copyBtnText: { ...typography.caption, color: colors.primary, fontWeight: '700' },
  waitingSteps: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 16,
  },
  waitingStep: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  waitingStepText: { ...typography.body, color: colors.text, flex: 1 },
});
