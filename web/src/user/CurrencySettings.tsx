import { useState } from 'react';
import { Coins } from 'lucide-react';
import { CURRENCIES, Currency, getCurrency, setCurrency } from './format';
import { UnitSystem, getUnitSystem, setUnitSystem } from './units';

/**
 * Preferências regionais (iguais às telas Moeda e Unidades do app). Ficam no
 * navegador; ao mudar, recarrega para todas as telas reformatarem.
 */
export function CurrencySettings() {
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
        <Coins size={16} className="text-gray-400" /> Moeda e unidades
      </p>
      <select
        value={value}
        onChange={e => change(e.target.value as Currency)}
        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white"
      >
        {(Object.keys(CURRENCIES) as Currency[]).map(c => (
          <option key={c} value={c}>{c} · {CURRENCIES[c].name}</option>
        ))}
      </select>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Muda só a exibição dos valores neste navegador. Planos e pagamentos do Doce Preço continuam em reais.
      </p>
      <div className="grid grid-cols-2 gap-2">
        {([['metric', 'Métrico', 'g, kg, ml, l'], ['imperial', 'Imperial', 'oz, lb, xícara, colheres']] as const).map(([s, title, sub]) => (
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
