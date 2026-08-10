import { useEffect, useState } from 'react';
import { api, Suggestion } from '../lib/api';
import { TableSkeleton, ModalOverlay, ToastFn } from '../components';
import { Lightbulb, Eye, CheckCircle, Trash2, StickyNote } from 'lucide-react';

interface Props {
  toast: ToastFn;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const STATUS_CONFIG: Record<Suggestion['status'], { label: string; color: string }> = {
  pending: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-700' },
  read: { label: 'Lido', color: 'bg-blue-100 text-blue-600' },
  done: { label: 'Concluído', color: 'bg-green-100 text-green-700' },
};

export function SuggestionsPage({ toast }: Props) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [noteModal, setNoteModal] = useState<Suggestion | null>(null);
  const [noteText, setNoteText] = useState('');
  const [sending, setSending] = useState(false);
  const [filter, setFilter] = useState<'all' | Suggestion['status']>('all');

  const load = async () => {
    try {
      setSuggestions(await api.listSuggestions());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const markAsRead = async (s: Suggestion) => {
    if (s.status !== 'pending') return;
    try {
      await api.updateSuggestionStatus(s.id, 'read');
      load();
    } catch (e) {
      console.error(e);
    }
  };

  const markAsDone = async (s: Suggestion) => {
    try {
      await api.updateSuggestionStatus(s.id, 'done');
      toast.success('Sugestão marcada como concluída!');
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const openNote = (s: Suggestion) => {
    setNoteModal(s);
    setNoteText(s.adminNote ?? '');
    markAsRead(s);
  };

  const saveNote = async () => {
    if (!noteModal || !noteText.trim()) return;
    setSending(true);
    try {
      await api.addSuggestionNote(noteModal.id, noteText.trim());
      toast.success('Nota salva!');
      setNoteModal(null);
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (s: Suggestion) => {
    if (!confirm('Remover esta sugestão?')) return;
    try {
      await api.deleteSuggestion(s.id);
      toast.success('Sugestão removida');
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const filtered = filter === 'all' ? suggestions : suggestions.filter(s => s.status === filter);
  const pendingCount = suggestions.filter(s => s.status === 'pending').length;
  const doneCount = suggestions.filter(s => s.status === 'done').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Sugestões de Melhoria</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Ideias e sugestões enviadas pelos usuários do app</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-medium">Total</p>
          <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mt-1">{suggestions.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-medium">Pendentes</p>
          <p className="text-xl sm:text-2xl font-bold text-yellow-600 mt-1">{pendingCount}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-medium">Concluídas</p>
          <p className="text-xl sm:text-2xl font-bold text-green-600 mt-1">{doneCount}</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {(['all', 'pending', 'read', 'done'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${filter === f ? 'bg-primary-500 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
            {f === 'all' ? 'Todos' : STATUS_CONFIG[f].label}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <TableSkeleton rows={5} cols={4} />
        ) : filtered.length === 0 ? (
          <p className="text-center text-gray-400 py-10">Nenhuma sugestão encontrada</p>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {filtered.map(s => {
              const statusCfg = STATUS_CONFIG[s.status];
              return (
                <div key={s.id} className={`px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${s.status === 'pending' ? 'bg-yellow-50/30' : ''}`}>
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      <Lightbulb size={18} className="text-indigo-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{s.userName}</span>
                        <span className="text-xs text-gray-400">{s.userEmail}</span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded ${statusCfg.color}`}>{statusCfg.label}</span>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-200 mt-1">{s.message}</p>
                      {s.adminNote && (
                        <div className="mt-2 pl-3 border-l-2 border-indigo-200">
                          <p className="text-xs text-indigo-600 font-medium">Nota interna:</p>
                          <p className="text-sm text-gray-600 dark:text-gray-300">{s.adminNote}</p>
                        </div>
                      )}
                      <p className="text-xs text-gray-400 mt-1">{fmtDate(s.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {s.status === 'pending' && (
                        <button onClick={() => markAsRead(s)} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-blue-50 dark:bg-blue-900/20 text-blue-600 hover:bg-blue-100 transition-colors">
                          <Eye size={12} /> Marcar lido
                        </button>
                      )}
                      {s.status !== 'done' && (
                        <button onClick={() => markAsDone(s)} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-green-50 dark:bg-green-900/20 text-green-600 hover:bg-green-100 transition-colors">
                          <CheckCircle size={12} /> Concluída
                        </button>
                      )}
                      <button onClick={() => openNote(s)} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors">
                        <StickyNote size={12} /> {s.adminNote ? 'Editar nota' : 'Nota'}
                      </button>
                      <button onClick={() => handleDelete(s)} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-red-50 dark:bg-red-900/20 text-red-600 hover:bg-red-100 transition-colors">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {noteModal && (
        <ModalOverlay onClose={() => setNoteModal(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Nota interna</h3>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 mb-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-gray-900 dark:text-white">{noteModal.userName}</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300">{noteModal.message}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Sua nota</label>
              <textarea className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 focus:border-primary-400 focus:ring-1 focus:ring-primary-400 outline-none" rows={4}
                value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Escreva uma nota interna sobre esta sugestão..." />
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setNoteModal(null)} className="text-sm px-4 py-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">Cancelar</button>
              <button onClick={saveNote} disabled={!noteText.trim() || sending}
                className="inline-flex items-center gap-1.5 text-sm bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg transition-colors font-medium">
                <StickyNote size={14} /> {sending ? 'Salvando...' : 'Salvar nota'}
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}
    </div>
  );
}
