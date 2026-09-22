import { useEffect, useState } from 'react';
import { adminRequest } from '../lib/api';

interface Config { enabled: boolean; ready: boolean; feeCents: number; payments: Array<{ order_id: string; store_name: string; status: string; fee_cents: number; refunded_cents: number }> }
export function StorePaymentAdmin() {
  const [config, setConfig] = useState<Config | null>(null);
  const [fee, setFee] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { adminRequest<Config>('/admin/store-payments').then(c => { setConfig(c); setFee((c.feeCents / 100).toFixed(2)); }).catch(e => setMessage(e.message)); }, []);
  return <section className="bg-white dark:bg-gray-800 p-5 rounded-xl border space-y-3">
    <h3 className="font-bold">Taxa de serviço dos pedidos Master</h3>
    <p className="text-sm">Taxa fixa adicionada ao checkout e recebida pelo DocePreço. Só se aplica ao pagamento online das lojas que conectaram e ativaram a própria conta.</p>
    {config && <><p className="text-sm">{config.ready ? 'Servidor configurado para integração.' : 'Configuração do servidor pendente. Consulte docs/RECEBIMENTOS-MERCADO-PAGO.md.'}</p>
      <label className="block">Taxa por pedido (R$) <input className="border rounded px-2 py-1 text-gray-900" inputMode="decimal" value={fee} onChange={e => setFee(e.target.value)} /></label>
      <label className="flex gap-2"><input type="checkbox" checked={config.enabled} disabled={!config.ready} onChange={e => setConfig({ ...config, enabled: e.target.checked })} />Liberar checkout integrado para lojas conectadas</label>
      <button disabled={busy} className="bg-primary-600 text-white px-4 py-2 rounded-lg disabled:opacity-50" onClick={async () => {
        const amount = Number(fee.replace(',', '.'));
        if (!fee.trim() || !Number.isFinite(amount) || amount < 0 || Math.abs(amount * 100 - Math.round(amount * 100)) > 0.00001) { setMessage('Informe um valor válido com até duas casas decimais.'); return; }
        setBusy(true);
        try { await adminRequest('/admin/store-payments', { method: 'PUT', body: JSON.stringify({ enabled: config.enabled, feeCents: Math.round(amount * 100) }) }); setMessage('Configuração salva. Pedidos existentes mantêm a taxa original.'); } catch (e) { setMessage((e as Error).message); } finally { setBusy(false); }
      }}>Salvar taxa de serviço</button>
      {config.payments.length > 0 && <div className="overflow-auto"><table className="w-full text-sm text-left"><thead><tr><th>Loja</th><th>Pagamento</th><th>Taxa original DocePreço</th><th>Estorno no pedido</th></tr></thead><tbody>{config.payments.map(p => <tr key={p.order_id}><td>{p.store_name}</td><td>{p.status}</td><td>R$ {(p.fee_cents / 100).toFixed(2)}</td><td>R$ {(p.refunded_cents / 100).toFixed(2)}</td></tr>)}</tbody></table><p className="text-xs">Últimos 100 pedidos. Taxa original não representa receita líquida em pedidos estornados ou contestados.</p></div>}
    </>}
    {message && <p role="status" className="text-sm">{message}</p>}
  </section>;
}
