import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Coins } from 'lucide-react';
import { CURRENCIES, Currency, getCurrency, setCurrency } from './format';
import { UnitSystem, getUnitSystem, setUnitSystem } from './units';
import { Lang, getLang, setLang } from '../i18n';

/**
 * Preferências regionais (iguais às telas Moeda e Unidades do app). Ficam no
 * navegador; ao mudar, recarrega para todas as telas reformatarem.
 */
export function CurrencySettings() {
  const { t } = useTranslation('account');
  const [value, setValue] = useState<Currency>(getCurrency());
  const [system, setSystem] = useState<UnitSystem>(getUnitSystem());

  const changeSystem = (s: UnitSystem) => {
    setSystem(s);
    setUnitSystem(s);
    window.location.reload();
  };

  const change = (c: Currency) => {
    setValue(c);
    setCurrency(c);
    window.location.reload();
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 mt-5 space-y-3">
      <p className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
        <Coins size={16} className="text-gray-400" /> {t('prefs.title')}
      </p>
      <select
        value={value}
        onChange={e => change(e.target.value as Currency)}
        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white"
      >
        {(Object.keys(CURRENCIES) as Currency[]).map(c => (
          <option key={c} value={c}>{c} · {t(`currencyNames.${c}`, { defaultValue: CURRENCIES[c].name })}</option>
        ))}
      </select>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        {t('prefs.currencyHint')}
      </p>
      <div className="grid grid-cols-2 gap-2">
        {([['pt', 'Português'], ['en', 'English']] as [Lang, string][]).map(([l, label]) => (
          <button
            key={l}
            type="button"
            onClick={() => l !== getLang() && (setLang(l), window.location.reload())}
            className={`rounded-xl border-2 p-2.5 text-sm font-semibold text-gray-900 dark:text-white ${getLang() === l ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30' : 'border-gray-200 dark:border-gray-600'}`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {([['metric', t('prefs.metric'), t('prefs.metricHint')], ['imperial', t('prefs.imperial'), t('prefs.imperialHint')]] as const).map(([s, title, sub]) => (
          <button
            key={s}
            type="button"
            onClick={() => s !== system && changeSystem(s)}
            className={`rounded-xl border-2 p-2.5 text-left ${system === s ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30' : 'border-gray-200 dark:border-gray-600'}`}
          >
            <span className="block text-sm font-semibold text-gray-900 dark:text-white">{title}</span>
            <span className="block text-[11px] text-gray-500 dark:text-gray-400">{sub}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
