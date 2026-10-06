import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { userRequest } from '../userApi';
import { getLang } from '../../i18n';

export interface ReceivingStatus {
  configured: boolean; platformEnabled: boolean; connected: boolean; enabled: boolean;
  accountId: string | null; feeCents: number; termsVersion: string;
}
interface Payment {
  order_id: string; order_number: number; status: string; amount_cents: number;
  fee_cents: number; processing_fee_cents: number; refunded_cents: number;
}
const money = (cents: number) => (cents / 100).toLocaleString(getLang() === 'en' ? 'en-US' : 'pt-BR', { style: 'currency', currency: 'BRL' });
const PAYMENT_STATUSES = ['pending', 'approved', 'refunded', 'charged_back', 'cancelled'];
export function StoreReceiving() {
  const { t } = useTranslation('store');
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
    <h3 className="font-bold text-lg">{t('receiving.title')}</h3>
    <p className="text-sm">{t('receiving.intro')}</p>
    <ol className="list-decimal pl-5 text-sm space-y-1">
      <li>{t('receiving.step1')}</li>
      <li>{t('receiving.step2')}</li>
      <li>{t('receiving.step3')}</li>
    </ol>
    <div className="bg-white rounded-lg p-3 text-sm space-y-2">
      <p><strong>{t('receiving.moneyLabel')}</strong> {t('receiving.moneyText')}</p>
      <p><strong>{t('receiving.feeLabel')}</strong> {t('receiving.feeText', { fee: status ? money(status.feeCents) : t('receiving.feeLoading') })}</p>
      <p><strong>{t('receiving.cancelLabel')}</strong> {t('receiving.cancelText')}</p>
      <p>{t('receiving.pixNote')}</p>
    </div>
    <p role="status" className="font-semibold text-sm">{!status ? t('receiving.checking') : !status.connected ? t('receiving.pending') : t('receiving.connected', { account: status.accountId, state: status.enabled ? t('receiving.checkoutOn') : t('receiving.checkoutOff') })}</p>
    {status && (!status.configured || !status.platformEnabled) && <p className="text-sm text-amber-800">{t('receiving.notReleased')}</p>}
    <label className="flex gap-2 text-sm items-start"><input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)} className="mt-1" />{t('receiving.terms')}</label>
    <div className="flex gap-3 flex-wrap">
      <button className="rounded-lg bg-blue-700 text-white px-4 py-2 disabled:opacity-50" disabled={busy || !accepted || !status?.configured} onClick={() => void act(async () => {
        const data = await userRequest<{ url: string }>('/store/receiving/connect', { method: 'POST', body: JSON.stringify({ acceptedTerms: status!.termsVersion }) });
        window.location.assign(data.url);
      })}>{status?.connected ? t('receiving.reconnect') : t('receiving.connect')}</button>
      <button disabled={busy} onClick={() => void act(load)} className="underline">{t('receiving.refreshStatus')}</button>
      {status?.connected && <button className="underline disabled:opacity-50" disabled={busy || (!status.enabled && (!accepted || !status.platformEnabled))} onClick={() => void act(async () => {
        await userRequest('/store/receiving', { method: 'PUT', body: JSON.stringify({ enabled: !status.enabled, acceptedTerms: status.termsVersion }) });
      })}>{status.enabled ? t('receiving.disable') : t('receiving.enable')}</button>}
    </div>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {payments.length > 0 && <div className="overflow-auto"><table className="w-full text-sm text-left"><thead><tr><th>{t('receiving.colOrder')}</th><th>{t('receiving.colStatus')}</th><th>{t('receiving.colPaid')}</th><th>{t('receiving.colPlatform')}</th><th>{t('receiving.colMpFee')}</th><th>{t('receiving.colRefunded')}</th><th></th></tr></thead><tbody>
      {payments.map(p => <tr key={p.order_id} className="border-t"><td className="py-2">#{p.order_number}</td><td>{PAYMENT_STATUSES.includes(p.status) ? t(`receiving.paymentStatus.${p.status}`) : p.status}</td><td>{money(p.amount_cents)}</td><td>{money(p.fee_cents)}</td><td>{money(p.processing_fee_cents)}</td><td>{money(p.refunded_cents)}</td><td>{p.status === 'approved' && <button disabled={busy} className="text-red-700 underline" onClick={() => {
        if (window.confirm(t('receiving.refundConfirm', { number: p.order_number }))) void act(async () => { await userRequest(`/store/receiving/payments/${p.order_id}/refund`, { method: 'POST' }); });
      }}>{t('receiving.refund')}</button>}</td></tr>)}
    </tbody></table><p className="text-xs mt-2">{t('receiving.paymentsHint')}</p></div>}
  </section>;
}
