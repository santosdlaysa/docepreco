import { useEffect, useRef, useState } from 'react';
import { userApi } from '../userApi';
import { todayISO } from '../format';
import { ProductionPlan, productionDate, productionQuantity as qty, productionShoppingText } from '../productionPlan';
import { inputClass } from './IngredientsPage';

export function ProductionPlanner({ revision }: { revision: unknown }) {
  const [start, setStart] = useState(todayISO);
  const [end, setEnd] = useState(() => { const date = new Date(); date.setDate(date.getDate() + 6); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; });
  const [plan, setPlan] = useState<ProductionPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [retry, setRetry] = useState(0);
  const request = useRef(0);
  useEffect(() => {
    const current = ++request.current;
    setPlan(null); setFeedback('');
    if (!start || !end || start > end) { setError('Informe um período válido.'); setLoading(false); return; }
    setLoading(true); setError('');
    userApi.productionPlan(start, end).then(data => { if (current === request.current) setPlan(data); })
      .catch(err => { if (current === request.current) setError(err.message || 'Não foi possível gerar o plano.'); })
      .finally(() => { if (current === request.current) setLoading(false); });
    return () => { request.current++; };
  }, [start, end, revision, retry]);
  const share = async () => {
    if (!plan) return;
    const text = productionShoppingText(plan);
    try {
      if (navigator.share) await navigator.share({ title: 'Lista de compras', text });
      else { await navigator.clipboard.writeText(text); setFeedback('Lista copiada. Cole no WhatsApp ou onde preferir.'); }
    } catch (err) { if ((err as Error).name !== 'AbortError') setFeedback('Não foi possível compartilhar. Use Baixar lista.'); }
  };
  const download = () => {
    if (!plan) return;
    const url = URL.createObjectURL(new Blob([productionShoppingText(plan)], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = `compras-${plan.start}.txt`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return <section className="mb-8 rounded-xl border border-primary-100 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 space-y-4">
    <div><h2 className="font-semibold text-lg">Planejar produção</h2><p className="text-sm text-gray-500">Selecione as datas de entrega. Inclui encomendas pendentes e em produção.</p></div>
    <div className="flex flex-wrap gap-3 items-end">
      <label className="text-sm">De<input aria-label="Início do período" type="date" value={start} onChange={e => setStart(e.target.value)} className={inputClass} /></label>
      <label className="text-sm">Até<input aria-label="Fim do período" type="date" value={end} onChange={e => setEnd(e.target.value)} className={inputClass} /></label>
      <button type="button" onClick={() => setRetry(n => n + 1)} className="text-primary-600 p-2">Atualizar</button>
    </div>
    {loading && <p role="status">Calculando produção…</p>}
    {error && <p role="alert" className="text-red-600">{error}</p>}
    {plan && <>
      <p className="text-sm text-gray-500">{productionDate(plan.start)} a {productionDate(plan.end)} · {plan.orderCount} encomendas</p>
      {!plan.orderCount ? <p>Nenhuma encomenda a produzir neste período.</p> : <>
        {plan.warnings.length > 0 && <div role="status" className="rounded-lg bg-amber-50 text-amber-900 p-3 text-sm"><b>Confira antes de comprar — lista com pendências</b><ul className="list-disc pl-5">{plan.warnings.map(w => <li key={w}>{w}</li>)}</ul></div>}
        <h3 className="font-semibold">Produtos e receitas</h3>
        <div className="grid sm:grid-cols-2 gap-2">{plan.products.map(p => <div key={p.key} className="rounded-lg bg-primary-50 dark:bg-gray-900 p-3"><b>{qty(p.quantity)}× {p.name}</b><p className="text-sm">{p.batches === null ? 'Receita a conferir' : `${qty(p.batches)} receita(s)`}</p></div>)}</div>
        <p className="text-xs text-gray-500">Receitas proporcionais ao rendimento cadastrado, sem arredondar para receitas inteiras.</p>
        <h3 className="font-semibold">Ingredientes e lista de compras</h3>
        {plan.ingredients.length ? <div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead><tr>{['Ingrediente', 'Necessário', 'Em estoque', 'Falta comprar'].map(h => <th key={h} className="p-2">{h}</th>)}</tr></thead><tbody>{plan.ingredients.map(i => <tr key={i.id} className="border-t border-gray-100 dark:border-gray-700"><td className="p-2">{i.name} ({i.unit === 'unit' ? 'un' : i.unit})</td><td className="p-2">{qty(i.required)}</td><td className="p-2">{i.available === null ? 'Não informado' : qty(i.available)}</td><td className="p-2 font-semibold">{i.missing > 0.0000001 ? qty(Math.ceil(i.missing * 1000) / 1000) : '—'}</td></tr>)}</tbody></table></div> : <p className="text-sm">Nenhum ingrediente calculado. Confira as receitas dos produtos.</p>}
        <p className="text-xs text-gray-500">O plano consulta o estoque atual e não reserva nem dá baixa. Em pedidos já iniciados, confira os ingredientes que você já separou. Quantidades de compra não arredondam embalagens.</p>
        <div className="flex flex-wrap gap-3"><button type="button" onClick={share} className="rounded-lg bg-primary-500 text-white px-4 py-2">Compartilhar lista de compras</button><button type="button" onClick={download} className="text-primary-600 px-3 py-2">Baixar lista</button></div>
        {feedback && <p role="status" className="text-sm">{feedback}</p>}
      </>}
    </>}
  </section>;
}
