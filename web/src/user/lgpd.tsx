import { X, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';

type LgpdSection = { title: string; body: string; bullets?: string[] };

/** Seções do texto de consentimento no idioma atual (locales/<lang>/account.json → lgpd.sections). */
export function getLgpdSections(): LgpdSection[] {
  return i18n.t('account:lgpd.sections', { returnObjects: true }) as LgpdSection[];
}

/**
 * Texto de consentimento LGPD exibido no cadastro. Resume o tratamento de dados
 * e remete à Política de Privacidade. Reaproveitado entre o modal de aceite e a
 * página de política.
 */
export function LgpdModal({
  onClose,
  onAccept,
  required,
}: {
  onClose: () => void;
  onAccept?: () => void;
  /** Quando true, o modal não pode ser fechado sem aceitar (aceite obrigatório). */
  required?: boolean;
}) {
  const { t } = useTranslation('account');
  return (
    <div
      className="fixed inset-0 bg-black/50 z-[70] flex items-end sm:items-center justify-center p-4 animate-fade-in"
      onClick={required ? undefined : onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <div className="w-9 h-9 rounded-lg bg-primary-50 dark:bg-primary-900/40 flex items-center justify-center">
            <ShieldCheck size={18} className="text-primary-600 dark:text-primary-300" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-gray-900 dark:text-white text-base leading-tight">{t('lgpd.title')}</h3>
            <p className="text-xs text-gray-400">{t('lgpd.subtitle')}</p>
          </div>
          {!required && (
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <X size={20} />
            </button>
          )}
        </div>

        <div className="px-6 py-4 overflow-y-auto space-y-4">
          {getLgpdSections().map(s => (
            <div key={s.title}>
              <p className="font-semibold text-sm text-gray-900 dark:text-white mb-1">{s.title}</p>
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{s.body}</p>
              {s.bullets && (
                <ul className="mt-1.5 space-y-1">
                  {s.bullets.map((b, i) => (
                    <li key={i} className="flex gap-2 text-sm text-gray-600 dark:text-gray-300">
                      <span className="text-primary-500 mt-0.5">•</span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
          <p className="text-xs text-gray-400 leading-relaxed pt-1">
            {t('lgpd.agreement')}
          </p>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3">
          {!required && (
            <button
              onClick={onClose}
              className="text-sm px-4 py-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              {t('lgpd.close')}
            </button>
          )}
          {onAccept && (
            <button
              onClick={onAccept}
              className="text-sm px-4 py-2 rounded-lg font-semibold bg-primary-500 hover:bg-primary-600 text-white"
            >
              {t('lgpd.accept')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
