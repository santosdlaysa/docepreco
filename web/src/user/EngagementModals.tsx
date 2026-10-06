import { useEffect, useState } from 'react';
import { AlarmClock, CheckCircle2, MessageCircleHeart, ExternalLink } from 'lucide-react';
import { ModalOverlay } from '../components';
import { localPref } from './engagementApi';

const EXPIRING_KEY = 'docepreco_expiring_alert_day';
// Mesma pesquisa e mesma versão do app (SatisfactionSurveyModal). Troque a chave ao publicar outra pesquisa.
const SURVEY_URL = 'https://forms.gle/uQ4JdcuFfG5mMMTw6';
const SURVEY_KEY = 'docepreco_satisfaction_survey_2026_09';
const SURVEY_SNOOZE_MS = 3 * 24 * 60 * 60 * 1000;

/** Dias inteiros até a expiração (0 = hoje); null se não houver data. */
export function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const end = new Date(iso);
  if (isNaN(end.getTime())) return null;
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return Math.round((startOfDay(end) - startOfDay(new Date())) / 86_400_000);
}

const expiryLabel = (daysLeft: number) =>
  daysLeft <= 0 ? 'Sua assinatura expira hoje.' : daysLeft === 1 ? 'Sua assinatura expira amanhã.' : `Sua assinatura expira em ${daysLeft} dias.`;

/**
 * Assinatura perto de vencer (≤ 3 dias): avisa uma vez por dia com CTA de
 * renovação — mesma regra da Home do app. Retorna se está visível, para a
 * pesquisa não abrir por cima.
 */
export function SubscriptionExpiringModal({ enabled, premiumUntil, onRenew, onVisibleChange }: {
  enabled: boolean;
  premiumUntil: string | null | undefined;
  onRenew: () => void;
  onVisibleChange?: (v: boolean) => void;
}) {
  const [visible, setVisible] = useState(false);
  const daysLeft = daysUntil(premiumUntil);

  useEffect(() => {
    if (!enabled || daysLeft === null || daysLeft < 0 || daysLeft > 3) return;
    const today = new Date().toDateString();
    if (localPref.get<string>(EXPIRING_KEY, '') === today) return;
    localPref.set(EXPIRING_KEY, today);
    setVisible(true);
  }, [enabled, daysLeft]);

  useEffect(() => { onVisibleChange?.(visible); }, [visible, onVisibleChange]);

  if (!visible || daysLeft === null) return null;
  const close = () => setVisible(false);

  return (
    <ModalOverlay onClose={close}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 text-center space-y-3 w-full sm:max-w-sm mx-auto">
        <div className="w-14 h-14 rounded-full bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center mx-auto">
          <AlarmClock size={28} className="text-primary-500" />
        </div>
        <h3 className="font-bold text-lg text-gray-900 dark:text-white">Sua assinatura está expirando</h3>
        <p className="text-sm text-gray-600 dark:text-gray-300">{expiryLabel(daysLeft)} Renove agora para não perder o acesso aos recursos pagos.</p>
        <ul className="text-left text-sm text-gray-600 dark:text-gray-300 space-y-1.5">
          <li className="flex gap-2"><CheckCircle2 size={16} className="text-green-500 shrink-0 mt-0.5" /> Continue precificando sem limites</li>
          <li className="flex gap-2"><CheckCircle2 size={16} className="text-green-500 shrink-0 mt-0.5" /> Mantenha seus relatórios e recursos exclusivos</li>
        </ul>
        <button onClick={() => { close(); onRenew(); }} className="w-full bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold rounded-lg py-2.5">
          Renovar agora
        </button>
        <button onClick={close} className="w-full text-sm text-gray-500 hover:underline">Agora não</button>
      </div>
    </ModalOverlay>
  );
}

/** Convite para a pesquisa de satisfação (mesma do app): some ao abrir; "depois" volta em 3 dias. */
export function SatisfactionSurveyModal({ enabled }: { enabled: boolean }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!enabled) { setVisible(false); return; }
    const state = localPref.get<{ action: 'opened' | 'later'; at: number } | null>(SURVEY_KEY, null);
    // Pequeno atraso para não competir com a carga inicial da página.
    const id = setTimeout(() => {
      setVisible(!state || (state.action === 'later' && Date.now() - state.at >= SURVEY_SNOOZE_MS));
    }, 4000);
    return () => clearTimeout(id);
  }, [enabled]);

  if (!visible) return null;
  const remember = (action: 'opened' | 'later') => { localPref.set(SURVEY_KEY, { action, at: Date.now() }); setVisible(false); };

  return (
    <ModalOverlay onClose={() => remember('later')}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 text-center space-y-3 w-full sm:max-w-sm mx-auto">
        <div className="w-14 h-14 rounded-full bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center mx-auto">
          <MessageCircleHeart size={28} className="text-primary-500" />
        </div>
        <h3 className="font-bold text-lg text-gray-900 dark:text-white">Sua opinião importa 💖</h3>
        <p className="text-sm text-gray-600 dark:text-gray-300">Responda algumas perguntas rápidas e ajude a deixar o DocePreço ainda melhor para você. Leva cerca de 2 minutos.</p>
        <a href={SURVEY_URL} target="_blank" rel="noopener noreferrer" onClick={() => remember('opened')}
          className="w-full inline-flex items-center justify-center gap-2 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold rounded-lg py-2.5">
          <ExternalLink size={16} /> Responder pesquisa
        </a>
        <button onClick={() => remember('later')} className="w-full text-sm text-gray-500 hover:underline">Agora não</button>
      </div>
    </ModalOverlay>
  );
}
