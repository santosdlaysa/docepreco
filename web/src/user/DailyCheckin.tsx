import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { CalendarCheck, CalendarDays, Check, CheckCircle2, Gift, Loader2 } from 'lucide-react';
import { ModalOverlay } from '../components';
import { engagementApi, localPref, CheckinResult, CheckinStatus } from './engagementApi';
import { useAuth } from './UserAuthContext';

const SHOWN_KEY = 'docepreco_checkin_modal_day';
const TIER_LABEL: Record<string, string> = { premium: 'Premium', master: 'Master' };
/** Acima disso as bolinhas não cabem numa linha — mostramos uma barra. */
const MAX_DOTS = 10;

const rewardLabel = (s: Pick<CheckinStatus, 'rewardDays' | 'rewardTier'>, t: TFunction) => {
  const tier = TIER_LABEL[s.rewardTier];
  return s.rewardDays === 7 ? t('checkin.rewardWeek', { tier }) : t('checkin.rewardDays', { count: s.rewardDays, tier });
};

/**
 * Check-in diário — mesmo fluxo da Home do app (CheckinWidget): card na Home +
 * modal que abre sozinho 1x/dia. Ao fechar o ciclo, o servidor libera o plano.
 */
export function DailyCheckin({ onVisibleChange }: { onVisibleChange?: (v: boolean) => void }) {
  const { t } = useTranslation('app');
  const { refresh, isDemo } = useAuth();
  const [status, setStatus] = useState<CheckinStatus | null>(null);
  const [visible, setVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reward, setReward] = useState<CheckinResult['reward']>(null);

  const load = useCallback(async () => {
    if (isDemo) return;
    try {
      const s = await engagementApi.getCheckin();
      setStatus(s);
      const today = new Date().toDateString();
      if (s.enabled && s.eligible && s.canEarnMore && !s.checkedInToday && localPref.get<string>(SHOWN_KEY, '') !== today) {
        localPref.set(SHOWN_KEY, today);
        setVisible(true);
      }
    } catch {
      // sem check-in se a API falhar — não atrapalha a Home
    }
  }, [isDemo]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { onVisibleChange?.(visible); }, [visible, onVisibleChange]);

  const close = () => {
    setVisible(false);
    setError(null);
    setReward(null);
  };

  const doCheckIn = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const result = await engagementApi.checkIn();
      setStatus(result.status);
      if (result.reward) {
        setReward(result.reward);
        void refresh();
      }
    } catch (e: any) {
      setError(e?.message || t('checkin.error'));
    } finally {
      setSubmitting(false);
    }
  };

  // Quem acabou de ganhar continua vendo a comemoração mesmo sem poder ganhar de novo.
  if (!status || !status.enabled || (!reward && (!status.eligible || !status.canEarnMore))) return null;

  const { daysRequired, progress, checkedInToday, consecutive } = status;

  return (
    <>
      {!reward && (
        <button
          onClick={() => setVisible(true)}
          className="w-full flex items-center gap-3 p-3.5 mb-4 rounded-2xl bg-white dark:bg-gray-800 border border-primary-100 dark:border-primary-900/40 text-left hover:border-primary-300 transition-colors"
        >
          <span className="w-10 h-10 rounded-full bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center shrink-0">
            {checkedInToday ? <CalendarCheck size={20} className="text-primary-500" /> : <CalendarDays size={20} className="text-primary-500" />}
          </span>
          <span className="flex-1 min-w-0">
            <span className="block font-bold text-sm text-gray-900 dark:text-white">{status.title}</span>
            <span className="block text-xs text-gray-500 dark:text-gray-400 truncate">
              {t('checkin.progress', { progress, total: daysRequired })} · {rewardLabel(status, t)}
            </span>
          </span>
          <span className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 ${
            checkedInToday ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600' : 'bg-primary-500 text-white'
          }`}>
            {checkedInToday ? t('checkin.doneToday') : t('checkin.action')}
          </span>
        </button>
      )}

      {visible && (
        <ModalOverlay onClose={close}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 text-center space-y-3 w-full sm:max-w-sm mx-auto">
            {reward ? (
              <>
                <div className="w-16 h-16 rounded-full bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center mx-auto">
                  <Gift size={32} className="text-amber-500" />
                </div>
                <h3 className="font-bold text-lg text-gray-900 dark:text-white">{t('checkin.congrats')}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {t('checkin.congratsText', {
                    total: daysRequired,
                    days: reward.days,
                    tier: TIER_LABEL[reward.tier],
                    until: new Date(reward.premiumUntil).toLocaleDateString(),
                  })}
                </p>
                <button onClick={close} className="w-full bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold rounded-lg py-2.5">
                  {t('checkin.enjoy')}
                </button>
              </>
            ) : (
              <>
                <div className="w-14 h-14 rounded-full bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center mx-auto">
                  <CalendarDays size={28} className="text-primary-500" />
                </div>
                <h3 className="font-bold text-lg text-gray-900 dark:text-white">{status.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">{status.message}</p>

                {daysRequired <= MAX_DOTS ? (
                  <div className="flex flex-wrap justify-center gap-2 py-2">
                    {Array.from({ length: daysRequired }, (_, i) => {
                      const done = i < progress;
                      const isNext = !checkedInToday && i === progress;
                      return (
                        <span
                          key={i}
                          className={`w-9 h-9 rounded-full border-2 flex items-center justify-center text-xs font-bold ${
                            done
                              ? 'bg-primary-500 border-primary-500 text-white'
                              : isNext
                                ? 'border-dashed border-primary-500 text-primary-500'
                                : 'border-primary-100 dark:border-gray-600 text-gray-400'
                          }`}
                        >
                          {done ? <Check size={16} /> : i === daysRequired - 1 ? <Gift size={15} /> : i + 1}
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-2">
                    <div className="h-2.5 rounded-full bg-primary-100 dark:bg-gray-700 overflow-hidden">
                      <div className="h-full bg-primary-500 rounded-full" style={{ width: `${Math.min(100, (progress / daysRequired) * 100)}%` }} />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">{t('checkin.daysOf', { progress, total: daysRequired })}</p>
                  </div>
                )}

                <div className="flex items-center gap-2 rounded-xl bg-amber-50 dark:bg-amber-900/20 p-3 text-left text-sm text-gray-700 dark:text-gray-200">
                  <Gift size={18} className="text-amber-500 shrink-0" />
                  <span>{t('checkin.reward')} <strong>{rewardLabel(status, t)}</strong></span>
                </div>
                {consecutive && <p className="text-xs text-gray-500 dark:text-gray-400">{t('checkin.consecutiveHint')}</p>}

                {error && <p className="text-sm text-red-600">{error}</p>}

                {checkedInToday ? (
                  <div className="w-full flex items-center justify-center gap-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-sm font-semibold rounded-lg py-2.5">
                    <CheckCircle2 size={16} /> {t('checkin.doneComeBack')}
                  </div>
                ) : (
                  <button
                    onClick={doCheckIn}
                    disabled={submitting}
                    className="w-full flex items-center justify-center gap-2 bg-primary-500 hover:bg-primary-600 disabled:opacity-60 text-white text-sm font-semibold rounded-lg py-2.5"
                  >
                    {submitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                    {t('checkin.checkInToday')}
                  </button>
                )}
                <button onClick={close} className="w-full text-sm text-gray-500 hover:underline">
                  {checkedInToday ? t('checkin.close') : t('notNow')}
                </button>
              </>
            )}
          </div>
        </ModalOverlay>
      )}
    </>
  );
}
