import { useEffect, useState } from 'react';
import { req } from './userApi';

export function WhatsAppSalesLink() {
  const [status, setStatus] = useState<{ enabled: boolean; phone: string | null; businessPhone: string | null } | null>(null);
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const load = async () => {
    try {
      const data = await req<NonNullable<typeof status>>('/whatsapp-sales');
      setStatus(data); setError(''); if (data.phone) setCode('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível consultar o vínculo.'); }
  };
  useEffect(() => { void load(); }, []);
  const generate = async () => {
    setBusy(true); setError(''); setCode('');
    try {
      const data = await req<{ code: string; businessPhone: string | null }>('/whatsapp-sales/link-code', { method: 'POST', body: JSON.stringify({ phone }) });
      setCode(data.code); setStatus(prev => prev ? { ...prev, businessPhone: data.businessPhone } : prev);
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível gerar o código.'); }
    finally { setBusy(false); }
  };
  const unlink = async () => {
    if (!window.confirm('Desvincular este WhatsApp e cancelar o rascunho pendente? As vendas registradas serão mantidas.')) return;
    setBusy(true);
    try { await req('/whatsapp-sales', { method: 'DELETE' }); setCode(''); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível desvincular.'); }
    finally { setBusy(false); }
  };
  const link = status?.businessPhone ? `https://wa.me/${status.businessPhone}${code ? `?text=${encodeURIComponent(`vincular ${code}`)}` : ''}` : null;
  return <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 mt-5 space-y-3">
    <h2 className="font-semibold text-gray-900 dark:text-white">Vendas pelo WhatsApp</h2>
    <p className="text-sm text-gray-600 dark:text-gray-300">Envie uma venda por texto, revise o resumo e confirme para registrar no aplicativo. A mensagem será interpretada por IA. Não envie dados de cartão ou informações sensíveis.</p>
    {!status && !error && <p>Consultando vínculo…</p>}
    {status && !status.enabled && <p className="text-sm">Este recurso ainda não foi ativado pelo DocePreço.</p>}
    {status?.phone ? <>
      <p>Vinculado: +{status.phone}</p>
      <p className="text-sm">Exemplo: Vendi 10 brownies a R$ 8 cada, pago no Pix. Confirme usando o código enviado no resumo.</p>
      <button type="button" disabled={busy} onClick={unlink} className="text-sm underline disabled:opacity-50">Desvincular WhatsApp</button>
    </> : status?.enabled && <>
      <label className="block text-sm">Seu WhatsApp com DDI e DDD
        <input type="tel" value={phone} disabled={busy} onChange={e => { setPhone(e.target.value); setCode(''); }} placeholder="5592999999999" className="mt-1 block w-full border rounded-lg p-2 dark:bg-gray-900 dark:border-gray-700" />
      </label>
      <button type="button" disabled={busy} onClick={generate} className="text-sm rounded-lg px-4 py-2 bg-primary-500 text-white disabled:opacity-50">{busy ? 'Aguarde…' : 'Gerar código de vínculo'}</button>
      {code && <>
        <p className="text-sm break-all select-all">Envie do número informado: vincular {code}</p>
        <p className="text-xs">Válido por 10 minutos. Depois de enviar, clique em Atualizar vínculo.</p>
      </>}
    </>}
    {link && status?.enabled && (status.phone || code) && <a href={link} target="_blank" rel="noopener noreferrer" className="block text-sm text-primary-600 underline">{status.phone ? 'Enviar venda no WhatsApp' : 'Abrir WhatsApp para vincular'}</a>}
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    <button type="button" disabled={busy} onClick={() => { void load(); }} className="block text-sm text-primary-600 underline">Atualizar vínculo</button>
  </section>;
}
