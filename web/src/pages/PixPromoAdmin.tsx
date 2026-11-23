import { useEffect, useState } from 'react';
import { adminRequest, api } from '../lib/api';
import { ToastFn } from '../components';
import { Zap, Send, Save } from 'lucide-react';

interface PixPromo {
  enabled: boolean;
  discountPercent: number;
  title: string;
  startsAt: string | null;
  endsAt: string | null;
  live?: boolean;
}

// ISO → valor de <input type="datetime-local"> no fuso do navegador
function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function fromLocalInput(v: string): string | null {
  return v ? new Date(v).toISOString() : null;
}

const TARGETS = [
  { value: 'free', label: 'Gratuitos (nunca assinaram ou sem plano)' },
  { value: 'expired', label: 'Ex-assinantes (plano vencido)' },
  { value: 'premium', label: 'Assinantes Premium (renovação)' },
  { value: 'all', label: 'Todos' },
];

export function PixPromoAdmin({ toast }: { toast: ToastFn }) {
  const [promo, setPromo] = useState<PixPromo | null>(null);
  const [saving, setSaving] = useState(false);
  const [push, setPush] = useState({ title: '', body: '', target: 'free' });
  const [sending, setSending] = useState(false);

  useEffect(() => {
    adminRequest<PixPromo>('/admin/settings/plans/pix-promo')
      .then(p => {
        setPromo({
          ...p,
          // Sugestão para a primeira configuração: Black Friday → Cyber Monday
          startsAt: p.startsAt ?? new Date('2026-11-27T00:00:00-03:00').toISOString(),
          endsAt: p.endsAt ?? new Date('2026-11-30T23:59:00-03:00').toISOString(),
        });
        const pct = p.discountPercent || 10;
        setPush(prev => ({
          ...prev,
          title: `🖤 ${p.title || 'Black Friday'} DocePreço: ${pct}% OFF`,
          body: `Assine com ${pct}% de desconto pagando no PIX! Precifique, venda e lucre mais com o DocePreço. Oferta por tempo limitado ⏳`,
        }));
      })
      .catch(e => toast.error((e as Error).message));
  }, []);

  if (!promo) return null;

  const save = async (next: PixPromo) => {
    setSaving(true);
    try {
      const saved = await adminRequest<PixPromo>('/admin/settings/plans/pix-promo', {
        method: 'PUT',
        body: JSON.stringify({
          enabled: next.enabled,
          discountPercent: next.discountPercent,
          title: next.title,
          startsAt: next.startsAt,
          endsAt: next.endsAt,
        }),
      });
      setPromo(saved);
      toast.success(saved.live ? 'Promoção no ar!' : saved.enabled ? 'Promoção salva (fora da janela de datas)' : 'Promoção desligada');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const sendPush = async () => {
    if (!push.title.trim() || !push.body.trim()) return;
    if (!promo.live && !window.confirm('A promoção ainda não está no ar. Enviar o push mesmo assim?')) return;
    setSending(true);
    try {
      const n = await api.createNotification({
        title: push.title.trim(),
        body: push.body.trim(),
        target: push.target,
        dataJson: JSON.stringify({ type: 'pix_promo', screen: 'Paywall' }),
      });
      toast.success(`Push enviado para ${n.recipientsCount ?? 0} usuário(s)`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSending(false);
    }
  };

  const input = 'w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100';

  return (
    <section className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="font-bold flex items-center gap-2"><Zap size={18} className="text-amber-500" /> Promoção no PIX (campanha)</h3>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded ${promo.live ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
          {promo.live ? 'NO AR' : promo.enabled ? 'Agendada / fora do período' : 'Desligada'}
        </span>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-300">
        Desconto automático no PIX à vista de qualquer assinatura (Premium e Master, mensal e anual), sem cupom.
        Não vale no cartão, nas lojas e no Pix Automático. Não acumula com cupom ou oferta win-back — vale o maior desconto.
      </p>
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="text-sm">Nome da campanha
          <input className={input} value={promo.title} maxLength={40} onChange={e => setPromo({ ...promo, title: e.target.value })} />
        </label>
        <label className="text-sm">Desconto (%)
          <input className={input} type="number" min={1} max={90} value={promo.discountPercent}
            onChange={e => setPromo({ ...promo, discountPercent: parseInt(e.target.value) || 0 })} />
        </label>
        <label className="text-sm">Início
          <input className={input} type="datetime-local" value={toLocalInput(promo.startsAt)}
            onChange={e => setPromo({ ...promo, startsAt: fromLocalInput(e.target.value) })} />
        </label>
        <label className="text-sm">Término
          <input className={input} type="datetime-local" value={toLocalInput(promo.endsAt)}
            onChange={e => setPromo({ ...promo, endsAt: fromLocalInput(e.target.value) })} />
        </label>
      </div>
      <div className="flex gap-2 flex-wrap">
        <button disabled={saving} onClick={() => save({ ...promo, enabled: true })}
          className="bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50 flex items-center gap-2">
          <Save size={16} /> Salvar e ativar
        </button>
        {promo.enabled && (
          <button disabled={saving} onClick={() => save({ ...promo, enabled: false })}
            className="border border-gray-300 dark:border-gray-600 text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50">
            Desligar promoção
          </button>
        )}
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-3">
        <h4 className="font-semibold text-sm flex items-center gap-2"><Send size={16} /> Notificação push da campanha</h4>
        <label className="text-sm block">Título
          <input className={input} value={push.title} maxLength={65} onChange={e => setPush({ ...push, title: e.target.value })} />
        </label>
        <label className="text-sm block">Mensagem
          <textarea className={input} rows={3} maxLength={180} value={push.body} onChange={e => setPush({ ...push, body: e.target.value })} />
        </label>
        <label className="text-sm block">Público
          <select className={input} value={push.target} onChange={e => setPush({ ...push, target: e.target.value })}>
            {TARGETS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </label>
        <p className="text-xs text-gray-500">Ao tocar, o app abre a tela de assinatura. O envio aparece no histórico da aba Notificações.</p>
        <button disabled={sending || !push.title.trim() || !push.body.trim()} onClick={sendPush}
          className="bg-gray-900 dark:bg-gray-100 dark:text-gray-900 text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50 flex items-center gap-2">
          <Send size={16} /> {sending ? 'Enviando…' : 'Enviar push agora'}
        </button>
      </div>
    </section>
  );
}
