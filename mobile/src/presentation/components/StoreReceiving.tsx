import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Switch, Linking, Alert, AppState } from 'react-native';
import { apiClient } from '../../data/api/client';
import { isDemoMode } from '../../data/demo/demoMode';

interface Status { configured: boolean; platformEnabled: boolean; connected: boolean; enabled: boolean; accountId: string | null; feeCents: number; termsVersion: string }
interface Payment { order_id: string; order_number: number; status: string; amount_cents: number; fee_cents: number; processing_fee_cents: number; refunded_cents: number }
const money = (n: number) => `R$ ${(n / 100).toFixed(2).replace('.', ',')}`;
export function StoreReceiving() {
  const [status, setStatus] = useState<Status | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const load = async () => {
    if (isDemoMode()) return;
    try {
      const [s, p] = await Promise.all([apiClient.get('/store/receiving'), apiClient.get('/store/receiving/payments')]);
      setStatus(s.data.data); setPayments(p.data.data); setError('');
    } catch { setError('Não foi possível consultar os recebimentos. Tente atualizar o status.'); }
  };
  useEffect(() => { void load(); const sub = AppState.addEventListener('change', state => { if (state === 'active') void load(); }); return () => sub.remove(); }, []);
  const run = async (fn: () => Promise<void>) => {
    setBusy(true); setError('');
    try { await fn(); await load(); } catch (e: any) { setError(e.response?.data?.error ?? 'Não foi possível concluir. Tente novamente.'); } finally { setBusy(false); }
  };
  if (isDemoMode()) return null;
  const button = (label: string, action: () => void, disabled = false) => <TouchableOpacity accessibilityRole="button" disabled={busy || disabled} onPress={action} style={{ padding: 12, borderRadius: 10, backgroundColor: '#1D4ED8', opacity: busy || disabled ? 0.45 : 1 }}><Text style={{ color: '#fff', fontWeight: '600', textAlign: 'center' }}>{label}</Text></TouchableOpacity>;
  return <View style={{ padding: 16, borderRadius: 16, backgroundColor: '#EFF6FF', gap: 12, marginVertical: 12 }}>
    <Text style={{ fontSize: 18, fontWeight: '700', color: '#1E3A8A' }}>Recebimentos da loja</Text>
    <Text>Para receber pelo checkout online, conecte a conta Mercado Pago da sua empresa, conclua a verificação de identidade no provedor e depois ative o checkout aqui.</Text>
    <Text style={{ fontWeight: '700' }}>{status?.connected ? `Conta ${status.accountId} conectada · ${status.enabled ? 'Ativada pela loja' : 'Ainda não ativada'}` : 'Configuração pendente: conecte sua conta.'}</Text>
    <Text>Produtos e entrega serão recebidos nessa conta, descontadas as tarifas do Mercado Pago. Prazos de liberação e transferência dependem das condições da sua conta. Confira os dados antes de autorizar.</Text>
    <Text>A taxa de serviço {status ? `de ${money(status.feeCents)} ` : ''}é adicionada ao total do cliente e destinada ao DocePreço. O valor vigente aparece antes da confirmação. Pagamentos por fora não fazem a divisão automática.</Text>
    <Text>Estornos envolvem a parte da loja e a da plataforma. Mantenha saldo disponível e acompanhe a confirmação. A conexão não garante aprovação de todos os pagamentos.</Text>
    {status && (!status.configured || !status.platformEnabled) && <Text style={{ color: '#92400E' }}>A plataforma ainda não liberou o checkout integrado. As formas atuais de pagamento continuam disponíveis.</Text>}
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Switch accessibilityLabel="Aceitar condições de recebimento" value={accepted} onValueChange={setAccepted} /><Text style={{ flex: 1 }}>Estou ciente da conta de recebimento, das tarifas, da taxa DocePreço e das condições de estorno.</Text></View>
    {button(status?.connected ? 'Reconectar a mesma conta' : 'Conectar Mercado Pago', () => void run(async () => {
      const r = await apiClient.post('/store/receiving/connect', { acceptedTerms: status!.termsVersion }); await Linking.openURL(r.data.data.url);
    }), !accepted || !status?.configured)}
    {button('Atualizar status', () => void run(load))}
    {status?.connected && button(status.enabled ? 'Desativar novos pagamentos online' : 'Ativar checkout nesta conta', () => void run(async () => {
      await apiClient.put('/store/receiving', { enabled: !status.enabled, acceptedTerms: status.termsVersion });
    }), !status.enabled && (!accepted || !status.platformEnabled))}
    {!!error && <Text accessibilityRole="alert" style={{ color: '#B91C1C' }}>{error}</Text>}
    {payments.slice(0, 10).map(p => <View key={p.order_id} style={{ borderTopWidth: 1, borderTopColor: '#BFDBFE', paddingTop: 10, gap: 6 }}>
      <Text style={{ fontWeight: '600' }}>Pedido #{p.order_number} · {({ approved: 'Aprovado', pending: 'Aguardando pagamento', refunded: 'Estornado', charged_back: 'Contestado', cancelled: 'Cancelado' } as Record<string, string>)[p.status] ?? p.status}</Text>
      <Text>Total: {money(p.amount_cents)} · DocePreço: {money(p.fee_cents)} · Tarifa MP: {money(p.processing_fee_cents)} · Estornado: {money(p.refunded_cents)}</Text>
      {p.status === 'approved' && button('Solicitar estorno', () => Alert.alert('Estornar pedido?', 'O saldo restante será solicitado ao Mercado Pago. O pedido será cancelado após confirmação.', [
        { text: 'Voltar', style: 'cancel' }, { text: 'Estornar', style: 'destructive', onPress: () => void run(async () => { await apiClient.post(`/store/receiving/payments/${p.order_id}/refund`); }) },
      ]))}
    </View>)}
  </View>;
}
