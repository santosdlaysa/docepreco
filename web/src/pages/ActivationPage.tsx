import { FormEvent, useEffect, useState } from 'react';
import { api, type ActivationReport, type ActivationUser } from '../lib/api';

export function activationPercentage(count: number, total: number): string {
  return total > 0 ? `${(count / total * 100).toFixed(1).replace('.', ',')}%` : '—';
}

function formatDate(value: string | null): string {
  if (!value) return 'Sem registro';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Data indisponível' : date.toLocaleString('pt-BR');
}

export function ActivationPage({ onOpenUser, onNotifyUser }: {
  onOpenUser: (id: string) => void;
  onNotifyUser?: (user: ActivationUser) => void;
}) {
  const [days, setDays] = useState(30);
  const [page, setPage] = useState(1);
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const [report, setReport] = useState<ActivationReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let current = true;
    setLoading(true);
    setError('');
    setReport(null);
    api.getActivationReport({ days, page, limit: 20, search }).then(data => {
      if (current) setReport(data);
    }).catch(() => {
      if (current) setError('Não foi possível carregar a ativação. Tente novamente.');
    }).finally(() => {
      if (current) setLoading(false);
    });
    return () => { current = false; };
  }, [days, page, search, reload]);

  function applySearch(event: FormEvent) {
    event.preventDefault();
    setPage(1);
    setSearch(input.trim());
  }

  const pages = report ? Math.max(1, Math.ceil(report.total / report.limit)) : 1;
  const metrics = report ? [
    ['Cadastros na coorte', report.totalAccounts],
    ['Com ingredientes', report.withIngredients],
    ['Com receitas', report.withRecipes],
    ['Com vendas', report.withSales],
    ['Sem receitas', report.withoutRecipes],
  ] as const : [];

  return <section className="space-y-6 dark:text-gray-200">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div><h1 className="text-2xl font-bold text-gray-900 dark:text-white">Ativação de usuários</h1>
        <p className="text-sm text-gray-600 dark:text-gray-300">Contas criadas nos últimos {days} dias, incluindo contas inativas.</p></div>
      <label className="text-sm font-medium">Período de cadastro
        <select aria-label="Período de cadastro" value={days} onChange={event => { setDays(Number(event.target.value)); setPage(1); }} className="ml-2 rounded-lg border px-3 py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400">
          <option value={7}>7 dias</option><option value={30}>30 dias</option><option value={90}>90 dias</option>
        </select>
      </label>
    </div>
    <p className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-100">Os indicadores mostram o estado atual dos cadastros da coorte. São etapas independentes, não um funil cumulativo nem histórico de primeira criação. Uma conta pode ter vendas sem manter receitas cadastradas. A pesquisa filtra apenas a lista sem receitas; os indicadores consideram toda a coorte.</p>

    {error && <div role="alert" className="rounded-xl bg-red-50 p-4 text-red-800 dark:bg-red-950 dark:text-red-200">{error}
      <button className="ml-3 underline" onClick={() => setReload(value => value + 1)}>Tentar novamente</button></div>}
    {loading && <p role="status" className="text-gray-500 dark:text-gray-400">Carregando ativação…</p>}
    {!loading && report && <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{metrics.map(([label, count]) => <div key={label} className="rounded-xl border bg-white p-4 dark:bg-gray-800 dark:border-gray-700">
        <p className="text-sm text-gray-600 dark:text-gray-300">{label}</p><p className="mt-2 text-2xl font-bold">{count.toLocaleString('pt-BR')}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{activationPercentage(count, report.totalAccounts)} da coorte</p>
      </div>)}</div>
    </>}

    <div className="rounded-xl border bg-white p-4 space-y-4 dark:bg-gray-800 dark:border-gray-700">
      <h2 className="text-lg font-semibold">Contas sem receita cadastrada</h2>
      <p className="text-sm text-gray-600 dark:text-gray-300">Lista para análise e abertura do cadastro. Ausência de receita não autoriza contato nem demonstra consentimento. Plano exibido é o registrado na conta, sem validação de pagamento nesta tela.</p>
      <form onSubmit={applySearch} className="flex flex-wrap gap-2">
        <input aria-label="Buscar contas sem receita" placeholder="Nome, e-mail ou ID" maxLength={200} value={input} onChange={event => setInput(event.target.value)} className="min-w-0 flex-1 rounded-lg border px-3 py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400" />
        <button type="submit" className="rounded-lg bg-primary-600 px-4 py-2 text-white">Buscar</button>
        {search && <button type="button" className="rounded-lg border px-3 py-2 dark:border-gray-700" onClick={() => { setInput(''); setSearch(''); setPage(1); }}>Limpar busca</button>}
      </form>
      {!loading && report && <>
        <p className="text-sm text-gray-500 dark:text-gray-400">{report.total} conta(s) correspondente(s)</p>
        {report.users.length === 0 ? <p className="py-6 text-gray-500 dark:text-gray-400">Nenhuma conta sem receita encontrada para estes filtros.</p> : <div className="overflow-x-auto">
          <table className="w-full text-left text-sm"><thead><tr className="border-b text-gray-500 dark:text-gray-400 dark:border-gray-700">
            {['Conta', 'Cadastro', 'Último acesso', 'Ingredientes', 'Plano registrado', 'Estado', 'Ação'].map(label => <th key={label} className="p-3 whitespace-nowrap">{label}</th>)}
          </tr></thead><tbody>{report.users.map(user => <tr key={user.id} className="border-b last:border-0 dark:border-gray-700">
            <td className="p-3"><p className="font-medium">{user.companyName || 'Sem nome'}</p><p>{user.email}</p><p className="text-xs text-gray-400 dark:text-gray-500">{user.id}</p></td>
            <td className="p-3 whitespace-nowrap">{formatDate(user.createdAt)}</td><td className="p-3 whitespace-nowrap">{formatDate(user.lastSeenAt)}</td>
            <td className="p-3">{user.ingredientCount}</td><td className="p-3">{user.planTier || 'free'}</td><td className="p-3">{user.isActive ? 'Ativa' : 'Inativa'}</td>
            <td className="p-3 space-y-2"><button className="block whitespace-nowrap text-primary-700 underline dark:text-primary-300" onClick={() => onOpenUser(user.id)}>Abrir usuário</button>
              <button className="block whitespace-nowrap text-primary-700 underline disabled:opacity-40 dark:text-primary-300" disabled={!user.isActive || !onNotifyUser}
                onClick={() => { if (user.isActive) onNotifyUser?.(user); }}>Preparar ajuda</button></td>
          </tr>)}</tbody></table>
        </div>}
        <div className="flex items-center justify-between gap-3"><button className="rounded-lg border px-3 py-2 disabled:opacity-40 dark:border-gray-700" disabled={page <= 1} onClick={() => setPage(value => value - 1)}>Anterior</button>
          <span className="text-sm">Página {page} de {pages}</span>
          <button className="rounded-lg border px-3 py-2 disabled:opacity-40 dark:border-gray-700" disabled={page >= pages} onClick={() => setPage(value => value + 1)}>Próxima</button></div>
      </>}
    </div>
  </section>;
}


