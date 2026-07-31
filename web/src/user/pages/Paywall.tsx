import { useState } from 'react';
import { Lock, Sparkles, Check } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { ToastFn } from '../../components';
import { PlanTier } from '../userApi';
import { TIER_META } from '../plan';
import { SubscribeModal } from '../SubscribeModal';

export function Paywall({
  required,
  featureLabel,
  featureIcon: Icon,
  toast,
}: {
  required: Exclude<PlanTier, 'free'>;
  featureLabel: string;
  featureIcon?: LucideIcon;
  toast: ToastFn;
}) {
  const [open, setOpen] = useState(false);
  const meta = TIER_META[required];
  const gradient =
    required === 'master'
      ? 'from-purple-500 via-purple-600 to-purple-800'
      : 'from-amber-400 via-amber-500 to-amber-600';

  return (
    <div className="max-w-xl mx-auto">
      <div className={`rounded-2xl p-6 sm:p-8 text-center bg-gradient-to-br ${gradient} shadow-sm`}>
        <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-4">
          {Icon ? <Icon size={26} className="text-white" /> : <Lock size={26} className="text-white" />}
        </div>
        <p className="text-xs font-semibold uppercase tracking-wide text-white/80">Recurso {meta.label}</p>
        <h2 className="text-2xl font-extrabold text-white tracking-tight mt-1">{featureLabel}</h2>
        <p className="text-sm text-white/85 mt-2 max-w-sm mx-auto">
          Este recurso faz parte do plano {meta.label}. Assine para desbloquear e turbinar a gestão da sua confeitaria.
        </p>
        <button
          onClick={() => setOpen(true)}
          className="mt-5 inline-flex items-center gap-2 bg-white text-gray-900 font-semibold rounded-xl px-5 py-2.5 hover:bg-white/90 transition-colors"
        >
          <Sparkles size={16} className={meta.color} />
          Assinar {meta.label}
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 mt-4">
        <p className="font-semibold text-gray-900 dark:text-white mb-3">O que você desbloqueia</p>
        <ul className="space-y-2">
          {meta.features.map((f, i) => (
            <li key={i} className="flex gap-2.5 text-sm text-gray-700 dark:text-gray-200">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${meta.bg}`}>
                <Check size={13} className={meta.color} />
              </span>
              <span>{f}</span>
            </li>
          ))}
        </ul>
      </div>

      {open && <SubscribeModal initialTier={required} onClose={() => setOpen(false)} toast={toast} />}
    </div>
  );
}
