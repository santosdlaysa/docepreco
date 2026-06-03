import { useEffect, useState } from 'react';
import { api, PlanConfig, PixPlanConfig } from '../lib/api';
import { ToastFn } from '../components';
import { Save, Crown, Gift, Plus, X, QrCode, Upload } from 'lucide-react';

interface Props {
  toast: ToastFn;
}

// Default usado quando o backend ainda não retorna a config de PIX (backend antigo).
// O QR não vem aqui — assim que o backend novo subir, o GET traz o QR embutido em base64.
const DEFAULT_PIX = {
  monthly: { amountCents: 1490, priceLabel: 'R$ 14,90', copyPaste: '00020126330014BR.GOV.BCB.PIX011103381053280520400005303986540514.905802BR5901N6001C62150511mensalidade630450C7', qrImage: '' },
  annual: { amountCents: 12000, priceLabel: 'R$ 120,00', copyPaste: '00020126330014BR.GOV.BCB.PIX0111033810532805204000053039865406120.005802BR5901N6001C62090505ANUAL6304F5D2', qrImage: '' },
  masterMonthly: { amountCents: 3000, priceLabel: 'R$ 30,00', copyPaste: '', qrImage: '' },
  masterAnnual: { amountCents: 30000, priceLabel: 'R$ 300,00', copyPaste: '', qrImage: '' },
};

type PixKey = 'monthly' | 'annual' | 'masterMonthly' | 'masterAnnual';
const PIX_LABELS: Record<PixKey, string> = {
  monthly: 'Premium Mensal',
  annual: 'Premium Anual',
  masterMonthly: 'Master Mensal',
  masterAnnual: 'Master Anual',
};

export function PlanConfigPage({ toast }: Props) {
  const [config, setConfig] = useState<PlanConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newFreeFeature, setNewFreeFeature] = useState('');
  const [newPremiumFeature, setNewPremiumFeature] = useState('');
  const [newMasterFeature, setNewMasterFeature] = useState('');

  const load = async () => {
    try {
      const data = await api.getPlanConfig();
      // Garante campos novos (Master/PIX) mesmo se o backend ainda não os retornar
      setConfig({
        ...data,
        masterPrice: data.masterPrice ?? 30,
        masterFeatures: data.masterFeatures ?? ['Tudo do Premium', 'Gestão financeira (DRE)', 'Controle de estoque', 'Dicas de vendas'],
        pix: { ...DEFAULT_PIX, ...(data.pix ?? {}) },
      });
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

  const addMasterFeature = () => {
    if (!newMasterFeature.trim() || !config) return;
    setConfig({ ...config, masterFeatures: [...config.masterFeatures, newMasterFeature.trim()] });
    setNewMasterFeature('');
  };

  const removeMasterFeature = (index: number) => {
    if (!config) return;
    setConfig({ ...config, masterFeatures: config.masterFeatures.filter((_, i) => i !== index) });
  };

  const updatePix = (plan: PixKey, patch: Partial<PixPlanConfig>) => {
    if (!config) return;
    setConfig({ ...config, pix: { ...config.pix, [plan]: { ...config.pix[plan], ...patch } } });
  };

  const handleQrUpload = async (plan: PixKey, file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Selecione um arquivo de imagem.'); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error('Imagem muito grande (máx. 2 MB).'); return; }
    const dataUri = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    updatePix(plan, { qrImage: dataUri });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Configuração de Planos</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Defina limites, preços e funcionalidades dos planos Free, Premium e Master.</p>
      </div>

      {loading ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="space-y-4">
            <div className="h-10 bg-gray-50 dark:bg-gray-900 rounded-lg animate-pulse" />
            <div className="h-10 bg-gray-50 dark:bg-gray-900 rounded-lg animate-pulse" />
            <div className="h-32 bg-gray-50 dark:bg-gray-900 rounded-lg animate-pulse" />
          </div>
        </div>
      ) : config ? (
        <>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-5">
            <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Gift size={18} className="text-gray-500 dark:text-gray-400" /> Plano Free
            </h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Limite de receitas</label>
              <input type="number" min="1" className="w-40 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 focus:border-primary-400 focus:ring-1 focus:ring-primary-400 outline-none"
                value={config.freeRecipeLimit} onChange={e => setConfig({ ...config, freeRecipeLimit: parseInt(e.target.value) || 1 })} />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Máximo de receitas no plano gratuito</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Funcionalidades do plano Free</label>
              <div className="space-y-2">
                {config.freeFeatures.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900 rounded-lg px-3 py-2">
                    <span className="text-sm text-gray-700 dark:text-gray-200 flex-1">{f}</span>
                    <button onClick={() => removeFreeFeature(i)} className="text-gray-400 hover:text-red-500 transition-colors">
                      <X size={14} />
                    </button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <input className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 focus:border-primary-400 outline-none"
                    value={newFreeFeature} onChange={e => setNewFreeFeature(e.target.value)} placeholder="Nova funcionalidade..."
                    onKeyDown={e => e.key === 'Enter' && addFreeFeature()} />
                  <button onClick={addFreeFeature} disabled={!newFreeFeature.trim()}
                    className="text-sm px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 disabled:opacity-50 transition-colors">
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-5">
            <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Crown size={18} className="text-amber-500" /> Plano Premium
            </h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Preço mensal (R$)</label>
              <input type="number" step="0.01" min="0" className="w-40 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 focus:border-primary-400 focus:ring-1 focus:ring-primary-400 outline-none"
                value={config.premiumPrice} onChange={e => setConfig({ ...config, premiumPrice: parseFloat(e.target.value) || 0 })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Funcionalidades do plano Premium</label>
              <div className="space-y-2">
                {config.premiumFeatures.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 bg-amber-50 rounded-lg px-3 py-2">
                    <span className="text-sm text-gray-700 dark:text-gray-200 flex-1">{f}</span>
                    <button onClick={() => removePremiumFeature(i)} className="text-gray-400 hover:text-red-500 transition-colors">
                      <X size={14} />
                    </button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <input className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 focus:border-primary-400 outline-none"
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

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-purple-200 dark:border-purple-900 p-6 space-y-5">
            <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Crown size={18} className="text-purple-500" /> Plano Master
            </h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Preço mensal (R$)</label>
              <input type="number" step="0.01" min="0" className="w-40 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 focus:border-primary-400 focus:ring-1 focus:ring-primary-400 outline-none"
                value={config.masterPrice} onChange={e => setConfig({ ...config, masterPrice: parseFloat(e.target.value) || 0 })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Funcionalidades exclusivas do Master</label>
              <div className="space-y-2">
                {config.masterFeatures.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 bg-purple-50 dark:bg-purple-950/30 rounded-lg px-3 py-2">
                    <span className="text-sm text-gray-700 dark:text-gray-200 flex-1">{f}</span>
                    <button onClick={() => removeMasterFeature(i)} className="text-gray-400 hover:text-red-500 transition-colors">
                      <X size={14} />
                    </button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <input className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 focus:border-primary-400 outline-none"
                    value={newMasterFeature} onChange={e => setNewMasterFeature(e.target.value)} placeholder="Nova funcionalidade..."
                    onKeyDown={e => e.key === 'Enter' && addMasterFeature()} />
                  <button onClick={addMasterFeature} disabled={!newMasterFeature.trim()}
                    className="text-sm px-3 py-2 rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-100 disabled:opacity-50 transition-colors">
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-5">
            <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <QrCode size={18} className="text-emerald-500" /> Pagamento via PIX
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 -mt-3">
              Valor, código copia-e-cola e QR exibidos no app. Assinantes antigos de R$ 10,00 mantêm o preço anterior na renovação.
            </p>
            {(['monthly', 'annual', 'masterMonthly', 'masterAnnual'] as const).map(plan => {
              const p = config.pix[plan];
              const isMaster = plan === 'masterMonthly' || plan === 'masterAnnual';
              return (
                <div key={plan} className={`border rounded-lg p-4 space-y-3 ${isMaster ? 'border-purple-200 dark:border-purple-900' : 'border-gray-200 dark:border-gray-700'}`}>
                  <h4 className={`text-sm font-bold flex items-center gap-1.5 ${isMaster ? 'text-purple-700 dark:text-purple-300' : 'text-gray-800 dark:text-gray-100'}`}>
                    {isMaster && <Crown size={14} className="text-purple-500" />}
                    {PIX_LABELS[plan]}
                  </h4>
                  <div className="flex flex-wrap gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-200 mb-1">Valor (centavos)</label>
                      <input type="number" min="0" className="w-36 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white focus:border-primary-400 focus:ring-1 focus:ring-primary-400 outline-none"
                        value={p.amountCents} onChange={e => updatePix(plan, { amountCents: parseInt(e.target.value) || 0 })} />
                      <p className="text-[11px] text-gray-400 mt-1">Ex.: 1490 = R$ 14,90</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-200 mb-1">Rótulo exibido</label>
                      <input className="w-36 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white focus:border-primary-400 outline-none"
                        value={p.priceLabel} onChange={e => updatePix(plan, { priceLabel: e.target.value })} placeholder="R$ 14,90" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-200 mb-1">Código PIX (copia-e-cola)</label>
                    <textarea rows={2} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-xs font-mono dark:bg-gray-700 dark:text-white focus:border-primary-400 outline-none"
                      value={p.copyPaste} onChange={e => updatePix(plan, { copyPaste: e.target.value.trim() })} placeholder="00020126..." />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-200 mb-1">QR Code</label>
                    <div className="flex items-center gap-3">
                      {p.qrImage ? (
                        <img src={p.qrImage} alt="QR PIX" className="w-20 h-20 rounded-lg border border-gray-200 dark:border-gray-600 object-contain bg-white" />
                      ) : (
                        <div className="w-20 h-20 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center text-[10px] text-gray-400 text-center px-1">{isMaster ? 'Sem QR — envie um' : 'QR embutido do app'}</div>
                      )}
                      <div className="flex flex-col gap-2">
                        <label className="inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 cursor-pointer transition-colors">
                          <Upload size={13} /> Enviar imagem
                          <input type="file" accept="image/*" className="hidden" onChange={e => handleQrUpload(plan, e.target.files?.[0] ?? null)} />
                        </label>
                        {p.qrImage && (
                          <button onClick={() => updatePix(plan, { qrImage: '' })} className="text-xs text-red-500 hover:text-red-600 text-left">Remover (usar QR do app)</button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <button onClick={save} disabled={saving}
            className="inline-flex items-center gap-1.5 text-sm bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 text-white px-6 py-2.5 rounded-lg transition-colors font-medium">
            <Save size={16} />
            {saving ? 'Salvando...' : 'Salvar configuração'}
          </button>
        </>
      ) : (
        <p className="text-gray-500 dark:text-gray-400 text-sm">Erro ao carregar configurações.</p>
      )}
    </div>
  );
}
