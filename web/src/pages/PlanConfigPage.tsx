import { useEffect, useState } from 'react';
import { api, PlanConfig } from '../lib/api';
import { ToastFn } from '../components';
import { Save, Crown, Gift, Plus, X } from 'lucide-react';

interface Props {
  toast: ToastFn;
}

export function PlanConfigPage({ toast }: Props) {
  const [config, setConfig] = useState<PlanConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newFreeFeature, setNewFreeFeature] = useState('');
  const [newPremiumFeature, setNewPremiumFeature] = useState('');

  const load = async () => {
    try {
      setConfig(await api.getPlanConfig());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!config) return;
    setSaving(true);
    try {
      await api.updatePlanConfig(config);
      toast.success('Configuração de planos atualizada!');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const addFreeFeature = () => {
    if (!newFreeFeature.trim() || !config) return;
    setConfig({ ...config, freeFeatures: [...config.freeFeatures, newFreeFeature.trim()] });
    setNewFreeFeature('');
  };

  const removeFreeFeature = (index: number) => {
    if (!config) return;
    setConfig({ ...config, freeFeatures: config.freeFeatures.filter((_, i) => i !== index) });
  };

  const addPremiumFeature = () => {
    if (!newPremiumFeature.trim() || !config) return;
    setConfig({ ...config, premiumFeatures: [...config.premiumFeatures, newPremiumFeature.trim()] });
    setNewPremiumFeature('');
  };

  const removePremiumFeature = (index: number) => {
    if (!config) return;
    setConfig({ ...config, premiumFeatures: config.premiumFeatures.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Configuração de Planos</h2>
        <p className="text-sm text-gray-500 mt-1">Defina limites, preços e funcionalidades dos planos Free e Premium.</p>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="space-y-4">
            <div className="h-10 bg-gray-50 rounded-lg animate-pulse" />
            <div className="h-10 bg-gray-50 rounded-lg animate-pulse" />
            <div className="h-32 bg-gray-50 rounded-lg animate-pulse" />
          </div>
        </div>
      ) : config ? (
        <>
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Gift size={18} className="text-gray-500" /> Plano Free
            </h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Limite de receitas</label>
              <input type="number" min="1" className="w-40 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-primary-400 focus:ring-1 focus:ring-primary-400 outline-none"
                value={config.freeRecipeLimit} onChange={e => setConfig({ ...config, freeRecipeLimit: parseInt(e.target.value) || 1 })} />
              <p className="text-xs text-gray-500 mt-1">Máximo de receitas no plano gratuito</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Funcionalidades do plano Free</label>
              <div className="space-y-2">
                {config.freeFeatures.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                    <span className="text-sm text-gray-700 flex-1">{f}</span>
                    <button onClick={() => removeFreeFeature(i)} className="text-gray-400 hover:text-red-500 transition-colors">
                      <X size={14} />
                    </button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <input className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-primary-400 outline-none"
                    value={newFreeFeature} onChange={e => setNewFreeFeature(e.target.value)} placeholder="Nova funcionalidade..."
                    onKeyDown={e => e.key === 'Enter' && addFreeFeature()} />
                  <button onClick={addFreeFeature} disabled={!newFreeFeature.trim()}
                    className="text-sm px-3 py-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50 transition-colors">
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Crown size={18} className="text-amber-500" /> Plano Premium
            </h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Preço mensal (R$)</label>
              <input type="number" step="0.01" min="0" className="w-40 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-primary-400 focus:ring-1 focus:ring-primary-400 outline-none"
                value={config.premiumPrice} onChange={e => setConfig({ ...config, premiumPrice: parseFloat(e.target.value) || 0 })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Funcionalidades do plano Premium</label>
              <div className="space-y-2">
                {config.premiumFeatures.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 bg-amber-50 rounded-lg px-3 py-2">
                    <span className="text-sm text-gray-700 flex-1">{f}</span>
                    <button onClick={() => removePremiumFeature(i)} className="text-gray-400 hover:text-red-500 transition-colors">
                      <X size={14} />
                    </button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <input className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-primary-400 outline-none"
                    value={newPremiumFeature} onChange={e => setNewPremiumFeature(e.target.value)} placeholder="Nova funcionalidade..."
                    onKeyDown={e => e.key === 'Enter' && addPremiumFeature()} />
                  <button onClick={addPremiumFeature} disabled={!newPremiumFeature.trim()}
                    className="text-sm px-3 py-2 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 disabled:opacity-50 transition-colors">
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <button onClick={save} disabled={saving}
            className="inline-flex items-center gap-1.5 text-sm bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 text-white px-6 py-2.5 rounded-lg transition-colors font-medium">
            <Save size={16} />
            {saving ? 'Salvando...' : 'Salvar configuração'}
          </button>
        </>
      ) : (
        <p className="text-gray-500 text-sm">Erro ao carregar configurações.</p>
      )}
    </div>
  );
}
