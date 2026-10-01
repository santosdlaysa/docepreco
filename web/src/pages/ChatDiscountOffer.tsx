import { useEffect, useRef, useState } from 'react';
import { Tag } from 'lucide-react';
import { api, SupportMessage } from '../lib/api';

export function ChatDiscountOffer({ userId, disabled, onSent }: {
  userId: string;
  disabled?: boolean;
  onSent: (message: SupportMessage) => void;
}) {
  const [eligible, setEligible] = useState(false);
  const [open, setOpen] = useState(false);
  const [discount, setDiscount] = useState(50);
  const [days, setDays] = useState(7);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const mounted = useRef(true);

  useEffect(() => {
    let active = true;
    mounted.current = true;
    setEligible(false);
    setOpen(false);
    api.getUser(userId).then(user => {
      if (active) setEligible(!user.isPremium && !!user.premiumUntil && new Date(user.premiumUntil).getTime() <= Date.now());
    }).catch(() => {});
    return () => { active = false; mounted.current = false; };
  }, [userId]);

  if (!eligible) return null;
  const valid = Number.isInteger(discount) && discount >= 1 && discount <= 90
    && Number.isInteger(days) && days >= 1 && days <= 60;
  const send = async () => {
    if (!valid || sending || disabled) return;
    setSending(true);
    setError('');
    try {
      const message = await api.sendSupportDiscountOffer(userId, discount, days);
      if (!mounted.current) return;
      onSent(message);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar oferta.');
    } finally {
      setSending(false);
    }
  };

  return <div className="mb-2">
    <button type="button" disabled={sending || disabled} onClick={() => setOpen(!open)}
      className="inline-flex items-center gap-1.5 rounded-full border border-primary-200 px-3 py-1 text-xs font-semibold text-primary-600 dark:text-primary-300 disabled:opacity-50">
      <Tag size={13} /> Assinatura com desconto
    </button>
    {open && <div className="mt-2 space-y-2 rounded-xl bg-gray-50 dark:bg-gray-700 p-3 text-xs text-gray-700 dark:text-gray-200">
      <p>Oferta exclusiva para ex-assinante. O desconto será aplicado ao gerar o PIX.</p>
      <div className="flex flex-wrap gap-3">
        <label>Desconto (%)<input type="number" min={1} max={90} step={1} value={discount} disabled={sending}
          onChange={e => setDiscount(Number(e.target.value))} className="mt-1 block w-24 rounded border p-1.5 dark:bg-gray-800 dark:border-gray-600" /></label>
        <label>Validade (dias)<input type="number" min={1} max={60} step={1} value={days} disabled={sending}
          onChange={e => setDays(Number(e.target.value))} className="mt-1 block w-24 rounded border p-1.5 dark:bg-gray-800 dark:border-gray-600" /></label>
      </div>
      <p>A mensagem terá a oferta de {discount}% por {days} dias e o botão “Assinar agora”. Substitui eventual oferta anterior.</p>
      {error && <p role="alert" className="text-red-500">{error}</p>}
      <button type="button" disabled={!valid || sending || disabled} onClick={send}
        className="rounded-lg bg-primary-500 px-3 py-2 font-semibold text-white disabled:opacity-50">
        {sending ? 'Enviando…' : 'Enviar oferta no chat'}
      </button>
    </div>}
  </div>;
}
