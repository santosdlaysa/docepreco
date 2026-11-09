import React, { useCallback, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Linking, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import { apiClient } from '../../data/api/client';
import { colors } from '../theme/colors';

export function WhatsAppSalesLink() {
  const [status, setStatus] = useState<{ enabled: boolean; phone: string | null; businessPhone: string | null } | null>(null);
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    try {
      const response = await apiClient.get('/whatsapp-sales');
      setStatus(response.data.data); setError('');
      if (response.data.data.phone) setCode('');
    } catch { setError('Não foi possível consultar o vínculo. Toque em Atualizar.'); }
  }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  const generate = async () => {
    setBusy(true); setError(''); setCode('');
    try {
      const response = await apiClient.post('/whatsapp-sales/link-code', { phone });
      setCode(response.data.data.code);
      setStatus(prev => prev ? { ...prev, businessPhone: response.data.data.businessPhone } : prev);
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível gerar o código.'); }
    finally { setBusy(false); }
  };
  const unlink = () => Alert.alert('Desvincular WhatsApp?', 'O rascunho pendente será cancelado. Suas vendas registradas serão mantidas.', [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Desvincular', style: 'destructive', onPress: async () => {
      setBusy(true);
      try { await apiClient.delete('/whatsapp-sales'); setCode(''); await load(); }
      catch { setError('Não foi possível desvincular.'); }
      finally { setBusy(false); }
    } },
  ]);
  const buttonStyle = { paddingVertical: 12, opacity: busy ? 0.5 : 1 };
  return <View style={{ padding: 18, borderRadius: 16, borderWidth: 1, borderColor: colors.border, marginVertical: 12, gap: 10 }}>
    <Text style={{ color: colors.text, fontSize: 19, fontWeight: '700' }}>Vendas pelo WhatsApp</Text>
    <Text style={{ color: colors.textSecondary }}>Envie uma venda por texto, revise o resumo e confirme para registrar no aplicativo. A mensagem é interpretada pela IA. Não envie dados de cartão ou informações sensíveis.</Text>
    {!status && !error && <ActivityIndicator color={colors.primary} />}
    {status && !status.enabled && <Text style={{ color: colors.textSecondary }}>Este recurso ainda não foi ativado pelo DocePreço.</Text>}
    {status?.phone ? <>
      <Text style={{ color: colors.text }}>Vinculado: +{status.phone}</Text>
      <Text style={{ color: colors.textSecondary }}>Exemplo: Vendi 10 brownies a R$ 8 cada, pago no Pix. Confirme usando o código enviado no resumo.</Text>
      {status.enabled && status.businessPhone && <TouchableOpacity accessibilityRole="button" onPress={() => { void Linking.openURL(`https://wa.me/${status.businessPhone}`).catch(() => setError('Não foi possível abrir o WhatsApp.')); }}><Text style={{ color: colors.primary, fontWeight: '700' }}>Enviar uma venda no WhatsApp</Text></TouchableOpacity>}
      <TouchableOpacity accessibilityRole="button" disabled={busy} onPress={unlink} style={buttonStyle}><Text style={{ color: colors.text }}>Desvincular WhatsApp</Text></TouchableOpacity>
    </> : status?.enabled && <>
      <Text style={{ color: colors.text }}>Seu número com DDI e DDD</Text>
      <TextInput accessibilityLabel="Seu WhatsApp com DDI e DDD" placeholder="5592999999999" placeholderTextColor={colors.textMuted} value={phone} onChangeText={value => { setPhone(value); setCode(''); }} keyboardType="phone-pad" editable={!busy} style={{ padding: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 8, color: colors.text }} />
      <TouchableOpacity accessibilityRole="button" disabled={busy} onPress={generate} style={buttonStyle}>{busy ? <ActivityIndicator /> : <Text style={{ color: colors.primary, fontWeight: '700' }}>Gerar código de vínculo</Text>}</TouchableOpacity>
      {!!code && <>
        <Text selectable style={{ color: colors.text }}>Envie do número informado: vincular {code}</Text>
        <Text style={{ color: colors.textSecondary }}>Válido por 10 minutos. Depois de enviar, toque em Atualizar.</Text>
        <TouchableOpacity accessibilityRole="button" onPress={async () => { try { await Clipboard.setStringAsync(`vincular ${code}`); } catch { setError('Não foi possível copiar.'); } }}><Text style={{ color: colors.primary }}>Copiar mensagem de vínculo</Text></TouchableOpacity>
        {status.businessPhone && <TouchableOpacity accessibilityRole="button" onPress={() => { void Linking.openURL(`https://wa.me/${status.businessPhone}?text=${encodeURIComponent(`vincular ${code}`)}`).catch(() => setError('Não foi possível abrir o WhatsApp.')); }} style={buttonStyle}><Text style={{ color: colors.primary, fontWeight: '700' }}>Abrir WhatsApp para vincular</Text></TouchableOpacity>}
      </>}
    </>}
    {!!error && <Text accessibilityRole="alert" style={{ color: colors.text }}>{error}</Text>}
    <TouchableOpacity accessibilityRole="button" disabled={busy} onPress={() => { void load(); }} style={buttonStyle}><Text style={{ color: colors.primary }}>Atualizar vínculo</Text></TouchableOpacity>
  </View>;
}
