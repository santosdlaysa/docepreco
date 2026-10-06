import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { userApi } from '../userApi';
import { todayISO } from '../format';
import { ProductionPlan, productionDate, productionQuantity as qty, productionShoppingText } from '../productionPlan';
import { inputClass } from './IngredientsPage';

export function ProductionPlanner({ revision }: { revision: unknown }) {
  const { t } = useTranslation('orders');
  const [start, setStart] = useState(todayISO);
  const [end, setEnd] = useState(() => { const date = new Date(); date.setDate(date.getDate() + 30); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; });
  const [plan, setPlan] = useState<ProductionPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [retry, setRetry] = useState(0);
  const request = useRef(0);
  useEffect(() => {
    const current = ++request.current;
    setPlan(null); setFeedback('');
    if (!start || !end || start > end) { setError(t('production.invalidPeriod')); setLoading(false); return; }
    setLoading(true); setError('');
    userApi.productionPlan(start, end).then(data => { if (current === request.current) setPlan(data); })
      .catch(err => { if (current === request.current) setError(err.message || t('production.planError')); })
      .finally(() => { if (current === request.current) setLoading(false); });
    return () => { request.current++; };
  }, [start, end, revision, retry]); // eslint-disable-line react-hooks/exhaustive-deps
  const share = async () => {
    if (!plan) return;
    const text = productionShoppingText(plan);
    try {
      if (navigator.share) await navigator.share({ title: t('production.shoppingListTitle'), text });
      else { await navigator.clipboard.writeText(text); setFeedback(t('production.listCopied')); }
    } catch (err) { if ((err as Error).name !== 'AbortError') setFeedback(t('production.shareError')); }
  };
  const download = () => {
    if (!plan) return;
    const url = URL.createObjectURL(new Blob([productionShoppingText(plan)], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = `${t('production.fileName')}-${plan.start}.txt`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const headers = [t('production.colIngredient'), t('production.colRequired'), t('production.colInStock'), t('production.colToBuy')];
  return <section className="mb-8 rounded-xl border border-primary-100 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 space-y-4">
    <div><h2 className="font-semibold text-lg">{t('production.planTitle')}</h2><p className="text-sm text-gray-500">{t('production.planSubtitle')}</p></div>
    <div className="flex flex-wrap gap-3 items-end">
      <label className="text-sm">{t('production.from')}<input aria-label={t('production.periodStart')} type="date" value={start} onChange={e => setStart(e.target.value)} className={inputClass} /></label>
      <label className="text-sm">{t('production.to')}<input aria-label={t('production.periodEnd')} type="date" value={end} onChange={e => setEnd(e.target.value)} className={inputClass} /></label>
      <button type="button" onClick={() => setRetry(n => n + 1)} className="text-primary-600 p-2">{t('production.refresh')}</button>
    </div>
    {loading && <p role="status">{t('production.calculating')}</p>}
    {error && <p role="alert" className="text-red-600">{error}</p>}
    {plan && <>
      <p className="text-sm text-gray-500">{t('production.periodSummary', { start: productionDate(plan.start), end: productionDate(plan.end), count: plan.orderCount })}</p>
      {!plan.orderCount ? <p>{t('production.noOrders')}</p> : <>
        {plan.warnings.length > 0 && <div role="status" className="rounded-lg bg-amber-50 text-amber-900 p-3 text-sm"><b>{t('production.warningsTitle')}</b><ul className="list-disc pl-5">{plan.warnings.map(w => <li key={w}>{w}</li>)}</ul></div>}
        <h3 className="font-semibold">{t('production.productsTitle')}</h3>
        <div className="grid sm:grid-cols-2 gap-2">{plan.products.map(p => <div key={p.key} className="rounded-lg bg-primary-50 dark:bg-gray-900 p-3"><b>{qty(p.quantity)}× {p.name}</b><p className="text-sm">{p.batches === null ? t('production.recipeToCheck') : t('production.batches', { value: qty(p.batches) })}</p></div>)}</div>
        <p className="text-xs text-gray-500">{t('production.batchesHint')}</p>
        <h3 className="font-semibold">{t('production.ingredientsTitle')}</h3>
        {plan.ingredients.length ? <div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead><tr>{headers.map(h => <th key={h} className="p-2">{h}</th>)}</tr></thead><tbody>{plan.ingredients.map(i => <tr key={i.id} className="border-t border-gray-100 dark:border-gray-700"><td className="p-2">{i.name} ({i.unit === 'unit' ? t('production.unitShort') : i.unit})</td><td className="p-2">{qty(i.required)}</td><td className="p-2">{i.available === null ? t('production.notInformed') : qty(i.available)}</td><td className="p-2 font-semibold">{i.missing > 0.0000001 ? qty(Math.ceil(i.missing * 1000) / 1000) : '—'}</td></tr>)}</tbody></table></div> : <p className="text-sm">{t('production.noIngredients')}</p>}
        <p className="text-xs text-gray-500">{t('production.stockHint')}</p>
        <div className="flex flex-wrap gap-3"><button type="button" onClick={share} className="rounded-lg bg-primary-500 text-white px-4 py-2">{t('production.shareList')}</button><button type="button" onClick={download} className="text-primary-600 px-3 py-2">{t('production.downloadList')}</button></div>
        {feedback && <p role="status" className="text-sm">{feedback}</p>}
      </>}
    </>}
  </section>;
}
