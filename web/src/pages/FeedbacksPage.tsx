import { useEffect, useState } from 'react';
import { api, Feedback } from '../lib/api';
import { TableSkeleton, ModalOverlay, ToastFn } from '../components';
import { Star, Send, MessageCircle, Eye } from 'lucide-react';

interface Props {
  toast: ToastFn;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const STATUS_CONFIG: Record<Feedback['status'], { label: string; color: string }> = {
  pending: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-700' },
  read: { label: 'Lido', color: 'bg-blue-100 text-blue-600' },
  replied: { label: 'Respondido', color: 'bg-green-100 text-green-700' },
};

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} size={12} className={i <= rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200'} />
      ))}
    </div>
  );
}

export function FeedbacksPage({ toast }: Props) {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyModal, setReplyModal] = useState<Feedback | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [filter, setFilter] = useState<'all' | Feedback['status']>('all');

  const load = async () => {
    try {
      setFeedbacks(await api.listFeedbacks());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const markAsRead = async (f: Feedback) => {
    if (f.status !== 'pending') return;
    try {
      await api.updateFeedbackStatus(f.id, 'read');
      load();
    } catch (e) {
      console.error(e);
    }
  };

  const openReply = (f: Feedback) => {
    setReplyModal(f);
    setReplyText(f.reply ?? '');
    markAsRead(f);
  };

  const sendReply = async () => {
    if (!replyModal || !replyText.trim()) return;
    setSending(true);
    try {
      await api.replyFeedback(replyModal.id, replyText.trim());
      toast.success('Resposta enviada!');
      setReplyModal(null);
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSending(false);
    }
  };

  const filtered = filter === 'all' ? feedbacks : feedbacks.filter(f => f.status === filter);
  const pendingCount = feedbacks.filter(f => f.status === 'pending').length;
  const avgRating = feedbacks.length > 0 ? (feedbacks.reduce((s, f) => s + f.rating, 0) / feedbacks.length).toFixed(1) : '—';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Feedbacks dos Usuários</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Avaliações e comentários enviados pelo app</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-medium">Total</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{feedbacks.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-medium">Pendentes</p>
          <p className="text-2xl font-bold text-yellow-600 mt-1">{pendingCount}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-medium">Nota média</p>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{avgRating}</p>
            <Star size={18} className="text-amber-400 fill-amber-400" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-medium">Respondidos</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{feedbacks.filter(f => f.status === 'replied').length}</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {(['all', 'pending', 'read', 'replied'] as const).map(f => (
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
          <p className="text-center text-gray-400 py-10">Nenhum feedback encontrado</p>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {filtered.map(f => {
              const statusCfg = STATUS_CONFIG[f.status];
              return (
                <div key={f.id} className={`px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${f.status === 'pending' ? 'bg-yellow-50/30' : ''}`}>
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{f.userName}</span>
                        <span className="text-xs text-gray-400">{f.userEmail}</span>
                        <Stars rating={f.rating} />
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded ${statusCfg.color}`}>{statusCfg.label}</span>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-200 mt-1">{f.message}</p>
                      {f.reply && (
                        <div className="mt-2 pl-3 border-l-2 border-primary-200">
                          <p className="text-xs text-primary-600 font-medium">Sua resposta:</p>
                          <p className="text-sm text-gray-600 dark:text-gray-300">{f.reply}</p>
                        </div>
                      )}
                      <p className="text-xs text-gray-400 mt-1">{fmtDate(f.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {f.status === 'pending' && (
                        <button onClick={() => markAsRead(f)} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-blue-50 dark:bg-blue-900/20 text-blue-600 hover:bg-blue-100 transition-colors">
                          <Eye size={12} /> Marcar lido
                        </button>
                      )}
                      <button onClick={() => openReply(f)} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-primary-50 dark:bg-primary-900/20 text-primary-600 hover:bg-primary-100 transition-colors">
                        <MessageCircle size={12} /> {f.reply ? 'Editar resposta' : 'Responder'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {replyModal && (
        <ModalOverlay onClose={() => setReplyModal(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Responder feedback</h3>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 mb-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-gray-900 dark:text-white">{replyModal.userName}</span>
                <Stars rating={replyModal.rating} />
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300">{replyModal.message}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Sua resposta</label>
              <textarea className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 focus:border-primary-400 focus:ring-1 focus:ring-primary-400 outline-none" rows={4}
                value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Escreva sua resposta..." />
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setReplyModal(null)} className="text-sm px-4 py-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">Cancelar</button>
              <button onClick={sendReply} disabled={!replyText.trim() || sending}
                className="inline-flex items-center gap-1.5 text-sm bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg transition-colors font-medium">
                <Send size={14} /> {sending ? 'Enviando...' : 'Enviar resposta'}
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}
    </div>
  );
}
