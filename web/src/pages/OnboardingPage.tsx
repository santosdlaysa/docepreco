import { useEffect, useState } from 'react';
import { api, OnboardingStep } from '../lib/api';
import { TableSkeleton, ConfirmModal, ModalOverlay, ToastFn } from '../components';
import { Pencil, Trash2, Plus, Power, GripVertical, Smartphone, ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  toast: ToastFn;
}

const ICON_SUGGESTIONS = [
  { icon: 'sad-outline', label: 'Triste', color: '#E91E8C', bg: '#F8BBD9' },
  { icon: 'calculator-outline', label: 'Calculadora', color: '#8B4513', bg: '#F5E6D0' },
  { icon: 'trending-up-outline', label: 'Crescimento', color: '#4CAF50', bg: '#E8F5E9' },
  { icon: 'cash-outline', label: 'Dinheiro', color: '#FF9800', bg: '#FFF3E0' },
  { icon: 'heart-outline', label: 'Coração', color: '#E91E63', bg: '#FCE4EC' },
  { icon: 'star-outline', label: 'Estrela', color: '#FFC107', bg: '#FFF8E1' },
  { icon: 'cart-outline', label: 'Carrinho', color: '#2196F3', bg: '#E3F2FD' },
  { icon: 'rocket-outline', label: 'Foguete', color: '#9C27B0', bg: '#F3E5F5' },
  { icon: 'gift-outline', label: 'Presente', color: '#F44336', bg: '#FFEBEE' },
  { icon: 'sparkles', label: 'Brilho', color: '#FF9800', bg: '#FFF3E0' },
  { icon: 'ribbon-outline', label: 'Fita', color: '#E91E8C', bg: '#F8BBD9' },
  { icon: 'pie-chart-outline', label: 'Gráfico', color: '#3F51B5', bg: '#E8EAF6' },
  { icon: 'time-outline', label: 'Relógio', color: '#607D8B', bg: '#ECEFF1' },
  { icon: 'checkmark-circle-outline', label: 'Check', color: '#4CAF50', bg: '#E8F5E9' },
  { icon: 'bulb-outline', label: 'Lâmpada', color: '#FFC107', bg: '#FFF8E1' },
  { icon: 'shield-checkmark-outline', label: 'Segurança', color: '#2196F3', bg: '#E3F2FD' },
];

const EMPTY = {
  title: '',
  description: '',
  imageUrl: null as string | null,
  icon: null as string | null,
  iconColor: null as string | null,
  iconBg: null as string | null,
  sortOrder: 0,
  isActive: true,
};

export function OnboardingPage({ toast }: Props) {
  const [steps, setSteps] = useState<OnboardingStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<OnboardingStep | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [confirmDelete, setConfirmDelete] = useState<OnboardingStep | null>(null);
  const [preview, setPreview] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);

  const load = async () => {
    try {
      setSteps(await api.listOnboarding());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm({ ...EMPTY, sortOrder: steps.length }); setShowModal(true); };
  const openEdit = (step: OnboardingStep) => {
    setEditing(step);
    setForm({
      title: step.title, description: step.description, imageUrl: step.imageUrl,
      icon: step.icon, iconColor: step.iconColor, iconBg: step.iconBg,
      sortOrder: step.sortOrder, isActive: step.isActive,
    });
    setShowModal(true);
  };

  const save = async () => {
    try {
      if (editing) {
        await api.updateOnboarding(editing.id, form);
        toast.success('Etapa atualizada!');
      } else {
        await api.createOnboarding(form);
        toast.success('Etapa criada!');
      }
      setShowModal(false);
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const toggleActive = async (step: OnboardingStep) => {
    try {
      await api.updateOnboarding(step.id, { isActive: !step.isActive });
      toast.success(step.isActive ? 'Etapa desativada.' : 'Etapa ativada!');
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const remove = async (step: OnboardingStep) => {
    try {
      await api.deleteOnboarding(step.id);
      toast.success('Etapa excluída.');
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const sorted = [...steps].sort((a, b) => a.sortOrder - b.sortOrder);
  const activeSteps = sorted.filter(s => s.isActive);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Onboarding</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Configure as telas de boas-vindas para novos usuários</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setPreview(!preview); setPreviewIndex(0); }}
            className={`flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg transition-colors font-medium border ${preview ? 'bg-primary-50 border-primary-200 text-primary-700' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
            <Smartphone size={16} /> {preview ? 'Fechar preview' : 'Preview'}
          </button>
          <button onClick={openNew} className="flex items-center gap-1.5 text-sm bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg transition-colors font-medium">
            <Plus size={16} /> Nova etapa
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* List */}
        <div className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden ${preview ? 'flex-1' : 'w-full'}`}>
          {loading ? (
            <TableSkeleton rows={4} cols={3} />
          ) : sorted.length === 0 ? (
            <p className="text-center text-gray-400 py-10">Nenhuma etapa cadastrada</p>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {sorted.map((step, idx) => (
                <div key={step.id} className={`flex items-center gap-4 px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${!step.isActive ? 'opacity-50' : ''}`}>
                  <GripVertical size={14} className="text-gray-300 shrink-0" />
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                    style={{ backgroundColor: step.iconBg ?? '#F3E8FF', color: step.iconColor ?? '#7C3AED' }}>
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{step.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">{step.description}</p>
                    {step.icon && <p className="text-xs text-gray-400 mt-0.5">Ícone: {step.icon}</p>}
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded shrink-0 ${step.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                    {step.isActive ? 'Ativo' : 'Inativo'}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => toggleActive(step)}
                      className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors ${step.isActive ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 hover:bg-yellow-100' : 'bg-green-50 dark:bg-green-900/20 text-green-600 hover:bg-green-100'}`}>
                      <Power size={12} />
                    </button>
                    <button onClick={() => openEdit(step)} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-blue-50 dark:bg-blue-900/20 text-blue-600 hover:bg-blue-100 transition-colors">
                      <Pencil size={12} />
                    </button>
                    <button onClick={() => setConfirmDelete(step)} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-red-50 dark:bg-red-900/20 text-red-600 hover:bg-red-100 transition-colors">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Preview */}
        {preview && (
          <div className="w-72 shrink-0">
            <div className="bg-gray-900 rounded-[2rem] p-3 shadow-xl">
              <div className="bg-white rounded-[1.5rem] overflow-hidden" style={{ height: 500 }}>
                {activeSteps.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-gray-400 text-sm">Sem etapas ativas</div>
                ) : (
                  <div className="h-full flex flex-col">
                    {/* Skip */}
                    <div className="flex justify-end p-3">
                      <span className="text-xs text-gray-400">Pular</span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
                      <div className="w-24 h-24 rounded-full flex items-center justify-center mb-5"
                        style={{ backgroundColor: activeSteps[previewIndex]?.iconBg ?? '#F3E8FF' }}>
                        <span className="text-3xl" style={{ color: activeSteps[previewIndex]?.iconColor ?? '#7C3AED' }}>
                          {activeSteps[previewIndex]?.icon ? '●' : '?'}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-gray-900 leading-tight">{activeSteps[previewIndex]?.title}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">{activeSteps[previewIndex]?.description}</p>
                    </div>

                    {/* Footer */}
                    <div className="p-4 space-y-3">
                      <div className="flex justify-center gap-1.5">
                        {activeSteps.map((_, i) => (
                          <div key={i} className={`h-2 rounded-full transition-all ${i === previewIndex ? 'w-6 bg-primary-500' : 'w-2 bg-gray-200'}`} />
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <button disabled={previewIndex === 0} onClick={() => setPreviewIndex(previewIndex - 1)}
                          className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center disabled:opacity-30">
                          <ChevronLeft size={16} className="text-gray-600 dark:text-gray-300" />
                        </button>
                        <button onClick={() => setPreviewIndex(Math.min(previewIndex + 1, activeSteps.length - 1))}
                          className="flex-1 h-10 rounded-xl bg-primary-500 text-white text-sm font-medium flex items-center justify-center gap-1">
                          {previewIndex === activeSteps.length - 1 ? 'Começar agora' : 'Próximo'}
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <ConfirmModal
        open={!!confirmDelete}
        title="Excluir etapa"
        message={`Tem certeza que deseja excluir "${confirmDelete?.title}"?`}
        confirmLabel="Excluir"
        confirmColor="red"
        onConfirm={() => { if (confirmDelete) remove(confirmDelete); setConfirmDelete(null); }}
        onCancel={() => setConfirmDelete(null)}
      />

      {showModal && (
        <ModalOverlay onClose={() => setShowModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              {editing ? 'Editar etapa' : 'Nova etapa'}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Título</label>
                <input className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 focus:border-primary-400 focus:ring-1 focus:ring-primary-400 outline-none"
                  value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Bem-vindo ao DocePreço!" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Descrição</label>
                <textarea className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 focus:border-primary-400 focus:ring-1 focus:ring-primary-400 outline-none" rows={3}
                  value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>

              {/* Icon picker */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Ícone e cores</label>
                <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5 bg-gray-50 dark:bg-gray-900 rounded-lg p-3 max-h-40 overflow-y-auto">
                  {ICON_SUGGESTIONS.map(({ icon, label, color, bg }) => (
                    <button key={icon} onClick={() => setForm({ ...form, icon, iconColor: color, iconBg: bg })}
                      className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all hover:scale-110 ${form.icon === icon ? 'ring-2 ring-primary-400 shadow-sm' : 'hover:shadow-sm'}`}
                      style={{ backgroundColor: bg }}
                      title={label}>
                      <span className="w-4 h-4 rounded-full" style={{ backgroundColor: color }} />
                    </button>
                  ))}
                </div>
                {form.icon && (
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 dark:text-gray-400">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: form.iconBg ?? '#eee' }}>
                      <span className="text-sm font-bold" style={{ color: form.iconColor ?? '#333' }}>●</span>
                    </div>
                    <span>Ícone: <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">{form.icon}</code></span>
                    <button onClick={() => setForm({ ...form, icon: null, iconColor: null, iconBg: null })} className="text-red-400 hover:text-red-600">Remover</button>
                  </div>
                )}
              </div>

              {/* Manual color overrides */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Nome ícone (Ionicons)</label>
                  <input className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-xs font-mono dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 focus:border-primary-400 outline-none"
                    value={form.icon ?? ''} onChange={e => setForm({ ...form, icon: e.target.value || null })} placeholder="calculator-outline" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Cor do ícone</label>
                  <div className="flex gap-1">
                    <input type="color" className="w-8 h-8 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
                      value={form.iconColor ?? '#7C3AED'} onChange={e => setForm({ ...form, iconColor: e.target.value })} />
                    <input className="flex-1 border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-xs font-mono dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 focus:border-primary-400 outline-none"
                      value={form.iconColor ?? ''} onChange={e => setForm({ ...form, iconColor: e.target.value || null })} placeholder="#E91E8C" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Cor de fundo</label>
                  <div className="flex gap-1">
                    <input type="color" className="w-8 h-8 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
                      value={form.iconBg ?? '#F3E8FF'} onChange={e => setForm({ ...form, iconBg: e.target.value })} />
                    <input className="flex-1 border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-xs font-mono dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 focus:border-primary-400 outline-none"
                      value={form.iconBg ?? ''} onChange={e => setForm({ ...form, iconBg: e.target.value || null })} placeholder="#F8BBD9" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">URL da imagem (opcional)</label>
                  <input className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 focus:border-primary-400 outline-none"
                    value={form.imageUrl ?? ''} onChange={e => setForm({ ...form, imageUrl: e.target.value || null })} placeholder="https://..." />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Ordem</label>
                  <input type="number" min="0" className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 focus:border-primary-400 outline-none"
                    value={form.sortOrder} onChange={e => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })} />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="text-sm px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">Cancelar</button>
              <button onClick={save} disabled={!form.title || !form.description}
                className="text-sm bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg transition-colors font-medium">
                {editing ? 'Salvar' : 'Criar'}
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}
    </div>
  );
}
