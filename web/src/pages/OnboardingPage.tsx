import { useEffect, useState } from 'react';
import { api, OnboardingStep } from '../lib/api';
import { TableSkeleton, ConfirmModal, ModalOverlay, ToastFn } from '../components';
import { Pencil, Trash2, Plus, Power, GripVertical, Smartphone } from 'lucide-react';

interface Props {
  toast: ToastFn;
}

const EMPTY = {
  title: '',
  description: '',
  imageUrl: null as string | null,
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
    setForm({ title: step.title, description: step.description, imageUrl: step.imageUrl, sortOrder: step.sortOrder, isActive: step.isActive });
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
          <h2 className="text-xl font-bold text-gray-900">Onboarding</h2>
          <p className="text-sm text-gray-500 mt-0.5">Configure as telas de boas-vindas para novos usuários</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setPreview(!preview)}
            className={`flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg transition-colors font-medium border ${preview ? 'bg-primary-50 border-primary-200 text-primary-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            <Smartphone size={16} /> {preview ? 'Fechar preview' : 'Preview'}
          </button>
          <button onClick={openNew} className="flex items-center gap-1.5 text-sm bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg transition-colors font-medium">
            <Plus size={16} /> Nova etapa
          </button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* List */}
        <div className={`bg-white rounded-xl border border-gray-200 overflow-hidden ${preview ? 'flex-1' : 'w-full'}`}>
          {loading ? (
            <TableSkeleton rows={4} cols={3} />
          ) : sorted.length === 0 ? (
            <p className="text-center text-gray-400 py-10">Nenhuma etapa cadastrada</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {sorted.map((step, idx) => (
                <div key={step.id} className={`flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors ${!step.isActive ? 'opacity-50' : ''}`}>
                  <GripVertical size={14} className="text-gray-300 shrink-0" />
                  <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-sm font-bold shrink-0">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{step.title}</p>
                    <p className="text-xs text-gray-500 line-clamp-1">{step.description}</p>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded shrink-0 ${step.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {step.isActive ? 'Ativo' : 'Inativo'}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => toggleActive(step)}
                      className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors ${step.isActive ? 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>
                      <Power size={12} />
                    </button>
                    <button onClick={() => openEdit(step)} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">
                      <Pencil size={12} />
                    </button>
                    <button onClick={() => setConfirmDelete(step)} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100 transition-colors">
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
              <div className="bg-white rounded-[1.5rem] overflow-hidden" style={{ height: 480 }}>
                {activeSteps.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-gray-400 text-sm">Sem etapas ativas</div>
                ) : (
                  <div className="h-full flex flex-col">
                    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                      {activeSteps[0].imageUrl ? (
                        <img src={activeSteps[0].imageUrl} alt="" className="w-32 h-32 object-contain mb-4" />
                      ) : (
                        <div className="w-32 h-32 rounded-full bg-primary-100 flex items-center justify-center mb-4">
                          <Smartphone size={40} className="text-primary-400" />
                        </div>
                      )}
                      <h3 className="text-lg font-bold text-gray-900">{activeSteps[0].title}</h3>
                      <p className="text-sm text-gray-500 mt-2">{activeSteps[0].description}</p>
                    </div>
                    <div className="p-4">
                      <div className="flex justify-center gap-1.5 mb-4">
                        {activeSteps.map((_, i) => (
                          <div key={i} className={`w-2 h-2 rounded-full ${i === 0 ? 'bg-primary-500' : 'bg-gray-200'}`} />
                        ))}
                      </div>
                      <div className="bg-primary-500 text-white text-center py-2.5 rounded-xl text-sm font-medium">
                        Continuar
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
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {editing ? 'Editar etapa' : 'Nova etapa'}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
                <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-primary-400 focus:ring-1 focus:ring-primary-400 outline-none"
                  value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Bem-vindo ao DocePreço!" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                <textarea className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-primary-400 focus:ring-1 focus:ring-primary-400 outline-none" rows={3}
                  value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">URL da imagem (opcional)</label>
                  <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-primary-400 outline-none"
                    value={form.imageUrl ?? ''} onChange={e => setForm({ ...form, imageUrl: e.target.value || null })} placeholder="https://..." />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ordem</label>
                  <input type="number" min="0" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-primary-400 outline-none"
                    value={form.sortOrder} onChange={e => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })} />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="text-sm px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors">Cancelar</button>
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
