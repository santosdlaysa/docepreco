import { useEffect, useState } from 'react';
import { api, Banner, PlanConfig } from '../lib/api';
import { ConfirmModal, ToastFn } from '../components';
import { Store, Megaphone, Plus, Trash2, Power, Save, ImageOff } from 'lucide-react';

interface Props {
  toast: ToastFn;
}

const DEFAULT_AD_BANNER = {
  enabled: true,
  periods: [
    { days: 7, amountCents: 990, priceLabel: 'R$ 9,90' },
    { days: 15, amountCents: 1790, priceLabel: 'R$ 17,90' },
    { days: 30, amountCents: 2990, priceLabel: 'R$ 29,90' },
  ],
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function getStatus(b: Banner): { label: string; color: string } {
  if (!b.isActive) return { label: 'Inativo', color: 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400' };
  const end = b.paidUntil ? new Date(b.paidUntil).getTime() : null;
  if (!end) return { label: 'Aguardando pgto', color: 'bg-yellow-100 text-yellow-700' };
  if (end < Date.now()) return { label: 'Expirado', color: 'bg-orange-100 text-orange-600' };
  return { label: 'No ar', color: 'bg-green-100 text-green-700' };
}

const centsToLabel = (cents: number) => `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;

export function AdsPage({ toast }: Props) {
  const [config, setConfig] = useState<PlanConfig | null>(null);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Banner | null>(null);

  const load = async () => {
    try {
      const [cfg, list] = await Promise.all([api.getPlanConfig(), api.listBanners()]);
      setConfig({ ...cfg, adBanner: cfg.adBanner ?? DEFAULT_AD_BANNER });
      setBanners(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const carouselBanners = banners.filter(b => b.placement === 'carousel');

  const updateEnabled = (enabled: boolean) => {
    if (!config) return;
    setConfig({ ...config, adBanner: { ...config.adBanner, enabled } });
  };

  const updatePeriod = (index: number, patch: Partial<{ days: number; amountCents: number; priceLabel: string }>) => {
    if (!config) return;
    const periods = config.adBanner.periods.map((p, i) => (i === index ? { ...p, ...patch } : p));
    setConfig({ ...config, adBanner: { ...config.adBanner, periods } });
  };

  const updateAmount = (index: number, cents: number) => {
    updatePeriod(index, { amountCents: cents, priceLabel: centsToLabel(cents) });
  };

  const addPeriod = () => {
    if (!config) return;
    setConfig({ ...config, adBanner: { ...config.adBanner, periods: [...config.adBanner.periods, { days: 30, amountCents: 0, priceLabel: 'R$ 0,00' }] } });
  };

  const removePeriod = (index: number) => {
    if (!config) return;
    setConfig({ ...config, adBanner: { ...config.adBanner, periods: config.adBanner.periods.filter((_, i) => i !== index) } });
  };

  const save = async () => {
    if (!config) return;
    setSaving(true);
    try {
      await api.updatePlanConfig(config);
      toast.success('Configuração de anúncios salva!');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (b: Banner) => {
    try {
      await api.updateBanner(b.id, { isActive: !b.isActive });
      toast.success(b.isActive ? 'Anúncio desativado.' : 'Anúncio ativado!');
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const remove = async (b: Banner) => {
    try {
      await api.deleteBanner(b.id);
      toast.success('Anúncio excluído.');
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-2">
        <Store size={20} className="text-pink-500" />
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Gestão de Anúncios</h2>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 -mt-4">
        Confeitarias compram um espaço no carrossel da Home via PIX. Aqui você define os valores e acompanha quem está anunciando.
      </p>

      {/* ── Preço e períodos ── */}
      {loading ? (
        <div className="h-40 bg-gray-50 dark:bg-gray-900 rounded-xl animate-pulse" />
      ) : config ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-pink-200 dark:border-pink-900 p-6 space-y-5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Megaphone size={18} className="text-pink-500" /> Preços e períodos
            </h3>
            <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200 cursor-pointer">
              <input type="checkbox" checked={config.adBanner.enabled}
                onChange={e => updateEnabled(e.target.checked)}
                className="w-4 h-4 accent-pink-500" />
              Venda de anúncios ativada
            </label>
          </div>

          <div className="space-y-2">
            {config.adBanner.periods.map((p, i) => (
              <div key={i} className="flex flex-wrap items-end gap-3 bg-pink-50 dark:bg-pink-950/20 rounded-lg px-3 py-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-200 mb-1">Dias</label>
                  <input type="number" min="1" className="w-24 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white focus:border-primary-400 focus:ring-1 focus:ring-primary-400 outline-none"
                    value={p.days} onChange={e => updatePeriod(i, { days: parseInt(e.target.value) || 1 })} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-200 mb-1">Valor (centavos)</label>
                  <input type="number" min="0" className="w-36 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white focus:border-primary-400 focus:ring-1 focus:ring-primary-400 outline-none"
                    value={p.amountCents} onChange={e => updateAmount(i, parseInt(e.target.value) || 0)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-200 mb-1">Rótulo</label>
                  <input className="w-32 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white focus:border-primary-400 outline-none"
                    value={p.priceLabel} onChange={e => updatePeriod(i, { priceLabel: e.target.value })} placeholder="R$ 9,90" />
                </div>
                <button onClick={() => removePeriod(i)} disabled={config.adBanner.periods.length <= 1}
                  className="mb-0.5 p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-40 transition-colors" title="Remover período">
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
            <button onClick={addPeriod}
              className="inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg bg-pink-50 text-pink-600 hover:bg-pink-100 transition-colors">
              <Plus size={14} /> Adicionar período
            </button>
          </div>

          <button onClick={save} disabled={saving}
            className="inline-flex items-center gap-1.5 text-sm bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 text-white px-6 py-2.5 rounded-lg transition-colors font-medium">
            <Save size={16} />
            {saving ? 'Salvando...' : 'Salvar valores'}
          </button>
        </div>
      ) : (
        <p className="text-gray-500 dark:text-gray-400 text-sm">Erro ao carregar configuração.</p>
      )}

      {/* ── Anunciantes ativos ── */}
      <div className="space-y-3">
        <h3 className="text-base font-bold text-gray-900 dark:text-white">Confeitarias anunciando</h3>
        {loading ? (
          <div className="h-24 bg-gray-50 dark:bg-gray-900 rounded-xl animate-pulse" />
        ) : carouselBanners.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 py-8 text-center">
            Nenhuma confeitaria anunciando no momento.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {carouselBanners.map(b => {
              const status = getStatus(b);
              return (
                <div key={b.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
                  <div className="relative bg-gray-100 dark:bg-gray-900 aspect-video">
                    {b.imageUrl ? (
                      <img src={b.imageUrl} alt={b.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <ImageOff size={24} />
                      </div>
                    )}
                    <span className={`absolute top-2 right-2 text-xs font-semibold px-2 py-0.5 rounded ${status.color}`}>
                      {status.label}
                    </span>
                  </div>
                  <div className="p-3 flex-1 flex flex-col gap-2">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{b.title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Pago até {b.paidUntil ? fmtDate(b.paidUntil) : '—'}
                        {b.actionUrl ? ' · com link' : ''}
                      </p>
                    </div>
                    <div className="flex gap-2 mt-auto">
                      <button
                        onClick={() => toggleActive(b)}
                        className={`flex-1 inline-flex items-center justify-center gap-1 text-xs px-2 py-1.5 rounded transition-colors ${
                          b.isActive
                            ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 hover:bg-yellow-100 dark:hover:bg-yellow-900/30'
                            : 'bg-green-50 dark:bg-green-900/20 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30'
                        }`}
                      >
                        <Power size={12} />
                        {b.isActive ? 'Desativar' : 'Ativar'}
                      </button>
                      <button
                        onClick={() => setConfirmDelete(b)}
                        className="inline-flex items-center justify-center gap-1 text-xs px-2 py-1.5 rounded bg-red-50 dark:bg-red-900/20 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                      >
                        <Trash2 size={12} />
                        Excluir
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmModal
        open={!!confirmDelete}
        title="Excluir anúncio"
        message={`Excluir o anúncio de "${confirmDelete?.title}"? Essa ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        confirmColor="red"
        onConfirm={() => { if (confirmDelete) remove(confirmDelete); setConfirmDelete(null); }}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
