import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export function WhatsAppDiscountOffer({ userId, disabled, onPrepared }: {
  userId: string;
  disabled: boolean;
  onPrepared: (message: string, phone: string) => void;
}) {
  const [eligible, setEligible] = useState(false);
  const [checking, setChecking] = useState(true);
  const [open, setOpen] = useState(false);
  const [discount, setDiscount] = useState(50);
  const [days, setDays] = useState(7);
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    api.getUser(userId).then(user => {
      if (active) setEligible(!user.isPremium && !!user.premiumUntil && new Date(user.premiumUntil).getTime() <= Date.now());
    }).catch(() => { if (active) setError('Não foi possível verificar a assinatura. Reabra esta janela para tentar novamente.'); })
      .finally(() => { if (active) setChecking(false); });
    return () => { active = false; };
  }, [userId]);
  const valid = Number.isInteger(discount) && discount >= 1 && discount <= 90 && Number.isInteger(days) && days >= 1 && days <= 60;
  const prepare = async () => {
    if (!valid || !eligible || preparing || disabled) return;
    setPreparing(true);
    setError('');
    try {
      const offer = await api.whatsappPrepareDiscountOffer(userId, discount, days);
      onPrepared(`${offer.message}\n\nAssinar: ${window.location.origin}/assinar`, offer.phone);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao preparar oferta.');
    } finally { setPreparing(false); }
  };
  return <div className="space-y-2 text-xs text-gray-600 dark:text-gray-300">
    <button type="button" disabled={checking || !eligible || preparing || disabled} onClick={() => setOpen(!open)}
      className="rounded-full border border-green-300 px-3 py-1 font-semibold text-green-600 disabled:opacity-50">Assinatura com desconto</button>
    {checking ? <p>Verificando assinatura…</p> : !eligible && !error ? <p>Disponível para ex-assinantes com plano expirado.</p> : null}
    {error && <p role="alert" className="text-red-500">{error}</p>}
    {open && <div className="space-y-2 rounded-lg bg-gray-50 dark:bg-gray-700 p-3">
      <div className="flex gap-3">
        <label>Desconto (%)<input type="number" min={1} max={90} value={discount} disabled={preparing}
          onChange={e => setDiscount(Number(e.target.value))} className="block w-24 rounded border p-1 dark:bg-gray-800" /></label>
        <label>Validade (dias)<input type="number" min={1} max={60} value={days} disabled={preparing}
          onChange={e => setDays(Number(e.target.value))} className="block w-24 rounded border p-1 dark:bg-gray-800" /></label>
      </div>
      <p>Ao preparar, a oferta fica ativa, substitui a anterior e preenche a mensagem abaixo. Depois, envie pelo painel ou pelo WhatsApp Web.</p>
      <button type="button" onClick={prepare} disabled={!valid || preparing || disabled}
        className="rounded-lg bg-green-600 px-3 py-2 font-semibold text-white disabled:opacity-50">{preparing ? 'Preparando…' : 'Preparar oferta e mensagem'}</button>
    </div>}
  </div>;
}
