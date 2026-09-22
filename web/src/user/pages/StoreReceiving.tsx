import { useEffect, useState } from 'react';
import { userRequest } from '../userApi';

export interface ReceivingStatus {
  configured: boolean; platformEnabled: boolean; connected: boolean; enabled: boolean;
  accountId: string | null; feeCents: number; termsVersion: string;
}
interface Payment {
  order_id: string; order_number: number; status: string; amount_cents: number;
  fee_cents: number; processing_fee_cents: number; refunded_cents: number;
}
const money = (cents: number) => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const labels: Record<string, string> = { pending: 'Aguardando pagamento', approved: 'Aprovado', refunded: 'Estornado', charged_back: 'Contestado', cancelled: 'Cancelado' };
export function StoreReceiving() {
  const [status, setStatus] = useState<ReceivingStatus | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const load = async () => {
    try {
      const [s, p] = await Promise.all([userRequest<ReceivingStatus>('/store/receiving'), userRequest<Payment[]>('/store/receiving/payments')]);
      setStatus(s); setPayments(p); setError('');
    } catch (e) { setError((e as Error).message); }
  };
  useEffect(() => { void load(); }, []);
  const act = async (fn: () => Promise<void>) => {
    setBusy(true); setError('');
    try { await fn(); await load(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };
  return <section className="rounded-xl border border-blue-200 bg-blue-50 p-5 text-gray-800 space-y-3">
    <h3 className="font-bold text-lg">Recebimentos da loja</h3>
    <p className="text-sm">Para receber pagamentos pelo checkout online, conecte uma conta Mercado Pago da sua empresa e conclua a verificação de identidade solicitada pelo provedor. Confira os dados da conta antes de autorizar.</p>
    <ol className="list-decimal pl-5 text-sm space-y-1">
      <li>Leia as condições e conecte sua conta.</li>
      <li>Após autorizar no Mercado Pago, volte aqui e atualize o status.</li>
      <li>Confira o número da conta e ative o checkout online.</li>
    </ol>
    <div className="bg-white rounded-lg p-3 text-sm space-y-2">
      <p><strong>Seu dinheiro:</strong> produtos e entrega são recebidos na conta Mercado Pago conectada, descontadas as tarifas de processamento. Prazos de liberação e transferências seguem as condições dessa conta. Conectar a conta não garante aprovação de todos os pagamentos.</p>
      <p><strong>Taxa de serviço DocePreço:</strong> {status ? money(status.feeCents) : 'consulte após carregar'} por pedido online, adicionada ao total do cliente e destinada à plataforma. O valor vigente aparece no checkout antes da confirmação.</p>
      <p><strong>Cancelamentos:</strong> o estorno envolve a parte da loja e a da plataforma. Mantenha saldo disponível e acompanhe o resultado; solicitar o estorno não significa que ele já foi concluído.</p>
      <p>O Pix direto para sua chave e os pagamentos na entrega não fazem essa divisão automática.</p>
    </div>
    <p role="status" className="font-semibold text-sm">{!status ? 'Consultando configuração…' : !status.connected ? 'Configuração pendente: conecte sua conta para receber online.' : `Conta ${status.accountId} conectada · ${status.enabled ? 'Checkout ativado pela loja' : 'Checkout desativado pela loja'}`}</p>
    {status && (!status.configured || !status.platformEnabled) && <p className="text-sm text-amber-800">O checkout integrado ainda não foi liberado pela plataforma. As formas de pagamento atuais da loja continuam disponíveis.</p>}
    <label className="flex gap-2 text-sm items-start"><input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)} className="mt-1" />Estou ciente de onde receberei, das tarifas do Mercado Pago, da taxa destinada ao DocePreço e das condições de estorno.</label>
    <div className="flex gap-3 flex-wrap">
      <button className="rounded-lg bg-blue-700 text-white px-4 py-2 disabled:opacity-50" disabled={busy || !accepted || !status?.configured} onClick={() => void act(async () => {
        const data = await userRequest<{ url: string }>('/store/receiving/connect', { method: 'POST', body: JSON.stringify({ acceptedTerms: status!.termsVersion }) });
        window.location.assign(data.url);
      })}>{status?.connected ? 'Reconectar a mesma conta' : 'Conectar Mercado Pago'}</button>
      <button disabled={busy} onClick={() => void act(load)} className="underline">Atualizar status</button>
      {status?.connected && <button className="underline disabled:opacity-50" disabled={busy || (!status.enabled && (!accepted || !status.platformEnabled))} onClick={() => void act(async () => {
        await userRequest('/store/receiving', { method: 'PUT', body: JSON.stringify({ enabled: !status.enabled, acceptedTerms: status.termsVersion }) });
      })}>{status.enabled ? 'Desativar novos pagamentos online' : 'Ativar checkout online nesta conta'}</button>}
    </div>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {payments.length > 0 && <div className="overflow-auto"><table className="w-full text-sm text-left"><thead><tr><th>Pedido</th><th>Situação</th><th>Cliente pagou</th><th>DocePreço</th><th>Tarifa MP</th><th>Estornado</th><th></th></tr></thead><tbody>
      {payments.map(p => <tr key={p.order_id} className="border-t"><td className="py-2">#{p.order_number}</td><td>{labels[p.status] ?? p.status}</td><td>{money(p.amount_cents)}</td><td>{money(p.fee_cents)}</td><td>{money(p.processing_fee_cents)}</td><td>{money(p.refunded_cents)}</td><td>{p.status === 'approved' && <button disabled={busy} className="text-red-700 underline" onClick={() => {
        if (window.confirm(`Solicitar estorno do saldo restante do pedido #${p.order_number}? O pedido será cancelado após confirmação do provedor.`)) void act(async () => { await userRequest(`/store/receiving/payments/${p.order_id}/refund`, { method: 'POST' }); });
      }}>Estornar</button>}</td></tr>)}
    </tbody></table><p className="text-xs mt-2">Valores de até 50 pedidos recentes. Consulte o saldo disponível e os prazos no Mercado Pago; valores pendentes ainda não foram recebidos.</p></div>}
  </section>;
}
