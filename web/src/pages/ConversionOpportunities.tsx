import { useEffect, useState } from 'react';
import { api, ConversionOpportunitiesData } from '../lib/api';

const sourceLabels: Record<string, string> = {
  recipe_limit: 'Tentou criar outra receita', recipe_near_limit: 'Interesse em mais receitas',
  recipes: 'Receitas', clientsManagement: 'Clientes', ordersManagement: 'Encomendas',
  store: 'Loja online', stock: 'Estoque', finance: 'Financeiro', salesTips: 'Dicas de vendas',
  manual: 'Assinatura direta', other: 'Outros recursos',
};

export function ConversionOpportunities({ refreshKey }: { refreshKey: number }) {
  const [data, setData] = useState<ConversionOpportunitiesData | null>(null);
  const [error, setError] = useState('');
  const [segment, setSegment] = useState('all');
  useEffect(() => {
    let active = true;
    setError('');
    api.getConversionOpportunities().then(result => { if (active) setData(result); })
      .catch(() => { if (active) setError('Não foi possível carregar as oportunidades. Tente atualizar.'); });
    return () => { active = false; };
  }, [refreshKey]);
  const users = data?.users.filter(u => segment === 'all' || (segment === 'blocked' && u.blocked)
    || (segment === 'atLimit' && u.recipes >= data.limit) || (segment === 'master' && u.master)
    || (segment === 'interested' && u.interested) || (segment === 'former' && u.formerPayer)) ?? [];
  return <section className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 space-y-4">
    <h2 className="font-bold text-gray-900 dark:text-white">Oportunidades de conversão</h2>
    <p className="text-sm text-gray-500">Free com acesso nos últimos 30 dias. Limite atual: {data?.limit ?? '…'} receitas. Os grupos podem se sobrepor.</p>
    {error ? <p role="alert" className="text-red-500">{error}</p> : !data ? <p>Carregando oportunidades…</p> : <>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {([['Perto do limite', data.nearLimit], ['Free no limite', data.atLimit], ['Tentaram criar outra receita', data.blocked],
          ['Interesse no Master', data.masterInterest], ['Clicaram para assinar', data.checkoutInterest], ['Ex-pagantes', data.formerPayers]] as const).map(([label, value]) =>
          <div key={label} className="rounded-xl bg-gray-50 dark:bg-gray-900 p-3"><p className="text-2xl font-bold text-primary-600">{value}</p><p className="text-sm text-gray-600 dark:text-gray-300">{label}</p></div>)}
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-300">Receitas por Free ativo: {data.distribution.map(d => `${d.count} receitas: ${d.users} usuários`).join(' · ') || 'Sem usuários neste período.'}</p>
      <h3 className="font-semibold text-gray-900 dark:text-white">Resultado das ofertas</h3>
      <p className="text-xs text-gray-500">Atividade: usuários únicos por origem nos últimos 30 dias. Conversão em 7 dias: primeira oferta do período para Free sem pagamento anterior, apenas com 7 dias completos de observação. Pagamento confirmado no servidor, atribuído a uma única origem. Cliques e início do pagamento não comprovam compra.</p>
      <div className="overflow-x-auto"><table className="w-full text-sm text-left text-gray-700 dark:text-gray-200">
        <thead><tr>{['Origem', 'Bloqueados', 'Viram oferta', 'Clicaram', 'Iniciaram pagamento', 'Conversão em 7 dias'].map(h => <th key={h} className="p-2">{h}</th>)}</tr></thead>
        <tbody>{data.funnel.map(f => <tr key={f.source} className="border-t dark:border-gray-700"><td className="p-2">{sourceLabels[f.source] ?? f.source}</td><td className="p-2">{f.blocked}</td><td className="p-2">{f.viewed}</td><td className="p-2">{f.clicked}</td><td className="p-2">{f.checkout}</td><td className="p-2">{f.eligible ? `${f.converted}/${f.eligible} (${(100 * f.converted / f.eligible).toFixed(1)}%)` : 'Aguardando coorte de 7 dias'}</td></tr>)}</tbody>
      </table>{!data.funnel.length && <p className="py-3 text-gray-500">Os eventos começarão a aparecer após a atualização dos aplicativos.</p>}</div>
      <div className="flex flex-wrap gap-3 items-center"><h3 className="font-semibold text-gray-900 dark:text-white">Usuários prioritários</h3>
        <select aria-label="Filtrar oportunidades" value={segment} onChange={e => setSegment(e.target.value)} className="rounded-lg p-2 bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-200">
          <option value="all">Todos</option><option value="blocked">Tentaram outra receita</option><option value="atLimit">No limite</option><option value="master">Interesse no Master</option><option value="interested">Clicaram para assinar</option><option value="former">Ex-pagantes</option>
        </select></div>
      <p className="text-xs text-gray-500">Até 50 usuários, priorizados por tentativa de criar receita e interesse em assinatura. O filtro se aplica a esta lista; os totais acima consideram toda a base.</p>
      <div className="overflow-x-auto"><table className="w-full text-sm text-left text-gray-700 dark:text-gray-200"><thead><tr><th className="p-2">Usuário</th><th className="p-2">Receitas</th><th className="p-2">Sinais</th></tr></thead>
        <tbody>{users.map(u => <tr key={u.id} className="border-t dark:border-gray-700"><td className="p-2">{u.companyName}<p className="text-xs text-gray-500">{u.email}</p></td><td className="p-2">{u.recipes}</td><td className="p-2">{[u.blocked && 'Tentou criar receita', u.master && 'Recurso Master', u.interested && 'Clicou para assinar', u.formerPayer && 'Ex-pagante', u.recipes >= data.limit && 'No limite'].filter(Boolean).join(' · ') || 'Perto do limite'}</td></tr>)}</tbody>
      </table>{!users.length && <p className="py-3 text-gray-500">Nenhum usuário neste filtro.</p>}</div>
    </>}
  </section>;
}
