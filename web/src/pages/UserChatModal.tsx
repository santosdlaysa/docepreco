import { useEffect, useState, useCallback, useRef } from 'react';
import { api, SupportMessage } from '../lib/api';
import { ModalOverlay } from '../components';
import { Crown, X, MessageSquare, ImagePlus, Send, Trash2, Bell, BellOff } from 'lucide-react';

const MAX_CHAT_IMAGE_BYTES = 3 * 1024 * 1024;

// Marcador de call-to-action de assinatura. O admin escreve [[assinar]] (ou [[assinar:master]])
// na mensagem; no chat da pessoa isso vira um botão "Assinar agora" que abre o paywall no app.
const SUBSCRIBE_CTA_RE = /\[\[assinar(?::(master|premium))?\]\]/i;

export function parseSubscribeCta(message: string): { text: string; cta: 'premium' | 'master' | null } {
  const match = message.match(SUBSCRIBE_CTA_RE);
  if (!match) return { text: message, cta: null };
  const cta = match[1]?.toLowerCase() === 'master' ? 'master' : 'premium';
  return { text: message.replace(SUBSCRIBE_CTA_RE, '').trim(), cta };
}

const SUBSCRIBE_PRESET = 'Oi! 💖 Que tal desbloquear todos os recursos do DocePreço? É só tocar no botão abaixo para assinar:\n[[assinar]]';

// Chat interno (mesmo backend do Suporte Chat), estilo WhatsApp, aberto direto na conversa do usuário.
export function UserChatModal({ userId, userName, userEmail, onClose, onError }: {
  userId: string;
  userName: string;
  userEmail: string;
  onClose: () => void;
  onError?: (msg: string) => void;
}) {
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedImageName, setSelectedImageName] = useState('');
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [pushStatus, setPushStatus] = useState<{ hasToken: boolean; tokenCount: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const lastTypingSentRef = useRef(0);

  const load = useCallback(async () => {
    try {
      const data = await api.getSupportMessages(userId);
      setMessages(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Carrega e faz polling das mensagens a cada 10s.
  useEffect(() => {
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, [load]);

  // Rola para o fim sempre que chegam mensagens.
  useEffect(() => {
    const c = containerRef.current;
    if (c) c.scrollTop = c.scrollHeight;
  }, [messages, loading]);

  useEffect(() => {
    setTimeout(() => textareaRef.current?.focus(), 0);
  }, []);

  // Verifica se a pessoa tem app com notificações ativas (senão o push não chega).
  useEffect(() => {
    api.getSupportPushStatus(userId).then(setPushStatus).catch(() => setPushStatus(null));
  }, [userId]);

  const fmtMsgDate = (iso: string) =>
    new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

  const handleSend = async () => {
    const text = newMessage.trim();
    if ((!text && !selectedImage) || sending) return;
    setSending(true);
    try {
      const sent = await api.sendSupportMessage(userId, text, selectedImage);
      setMessages(prev => [...prev, sent]);
      setNewMessage('');
      setSelectedImage(null);
      setSelectedImageName('');
      textareaRef.current?.focus();
    } catch {
      onError?.('Erro ao enviar mensagem');
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Apagar esta mensagem? Ela some para você e para a pessoa.')) return;
    try {
      await api.deleteSupportMessage(id);
      setMessages(prev => prev.filter(m => m.id !== id));
    } catch {
      onError?.('Erro ao apagar mensagem');
    }
  };

  const handlePickImage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      onError?.('Selecione um arquivo de imagem');
      return;
    }
    if (file.size > MAX_CHAT_IMAGE_BYTES) {
      onError?.('A imagem deve ter no máximo 3 MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') return;
      setSelectedImage(reader.result);
      setSelectedImageName(file.name);
    };
    reader.onerror = () => onError?.('Não foi possível ler a imagem');
    reader.readAsDataURL(file);
  };

  const sendTypingSignal = () => {
    const now = Date.now();
    if (now - lastTypingSentRef.current < 3000) return;
    lastTypingSentRef.current = now;
    api.sendSupportTyping(userId).catch(() => {});
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMessage(e.target.value);
    if (e.target.value.trim()) sendTypingSignal();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg flex flex-col overflow-hidden" style={{ height: 'min(80vh, 640px)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-bold text-sm flex-shrink-0">
              {(userName || userEmail).charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-medium text-sm text-gray-800 dark:text-gray-100 truncate">{userName || 'Usuário'}</p>
              <p className="text-xs text-gray-400 truncate">{userEmail}</p>
              {pushStatus && (
                <span
                  className={`mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium ${pushStatus.hasToken ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}
                  title={pushStatus.hasToken
                    ? 'A pessoa tem o app com notificações ativas — recebe push ao enviar.'
                    : 'A pessoa não tem app com notificações ativas — sua mensagem não vira notificação no celular.'}
                >
                  {pushStatus.hasToken ? <Bell size={11} /> : <BellOff size={11} />}
                  {pushStatus.hasToken ? 'Recebe notificações' : 'Sem notificações no app'}
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0" aria-label="Fechar chat">
            <X size={20} />
          </button>
        </div>

        {/* Mensagens */}
        <div ref={containerRef} className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary-500 border-t-transparent" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center text-gray-400 py-8 text-sm">
              <MessageSquare size={40} className="mx-auto mb-2 opacity-40" />
              Nenhuma mensagem ainda. Envie a primeira!
            </div>
          ) : (
            messages.map(msg => (
              <div key={msg.id} className={`group flex items-center gap-1.5 ${msg.senderType === 'admin' ? 'justify-end' : 'justify-start'}`}>
                {msg.senderType === 'admin' && (
                  <button
                    onClick={() => handleDelete(msg.id)}
                    className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-opacity flex-shrink-0"
                    title="Apagar mensagem"
                    aria-label="Apagar mensagem"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                    msg.senderType === 'admin'
                      ? 'bg-primary-500 text-white rounded-br-sm'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-bl-sm'
                  }`}
                >
                  {msg.imageUrl && (
                    <img
                      src={msg.imageUrl}
                      alt="Imagem enviada no chat"
                      className="mb-1.5 max-h-64 max-w-full cursor-zoom-in rounded-xl object-cover"
                      onClick={() => setExpandedImage(msg.imageUrl)}
                    />
                  )}
                  {(() => {
                    const parsed = msg.senderType === 'admin'
                      ? parseSubscribeCta(msg.message)
                      : { text: msg.message, cta: null as 'premium' | 'master' | null };
                    return (
                      <>
                        {parsed.text && <p className="text-sm whitespace-pre-wrap break-words">{parsed.text}</p>}
                        {parsed.cta && (
                          <span className="mt-1.5 inline-flex items-center gap-1 rounded-lg bg-white/20 px-2 py-1 text-[11px] font-semibold">
                            <Crown size={12} /> Botão: Assinar {parsed.cta === 'master' ? 'Master' : 'agora'}
                          </span>
                        )}
                      </>
                    );
                  })()}
                  <p className={`text-[10px] mt-1 text-right ${msg.senderType === 'admin' ? 'text-white/70' : 'text-gray-400'}`}>
                    {fmtMsgDate(msg.createdAt)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {expandedImage && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Visualização ampliada da imagem"
            onClick={() => setExpandedImage(null)}
          >
            <img
              src={expandedImage}
              alt="Imagem ampliada do chat"
              className="max-h-[90vh] max-w-[95vw] rounded-lg object-contain shadow-2xl"
              onClick={event => event.stopPropagation()}
            />
          </div>
        )}

        {/* Input */}
        <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          {/* Ações rápidas: insere o texto de assinatura (com o marcador [[assinar]]) para você editar antes de enviar. */}
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setNewMessage(prev =>
                  SUBSCRIBE_CTA_RE.test(prev)
                    ? prev
                    : (prev.trim() ? `${prev.trimEnd()}\n[[assinar]]` : SUBSCRIBE_PRESET)
                );
                setTimeout(() => textareaRef.current?.focus(), 0);
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-900/20 px-3 py-1 text-xs font-semibold text-primary-700 dark:text-primary-300 hover:bg-primary-100 dark:hover:bg-primary-900/40 transition-colors"
              title="Insere uma mensagem com botão de assinatura para você editar antes de enviar"
            >
              <Crown size={13} />
              Botão de assinatura
            </button>
            <span className="text-[11px] text-gray-400">A tag <code className="text-primary-500">[[assinar]]</code> vira um botão "Assinar agora" no chat da pessoa.</span>
          </div>
          {selectedImage && (
            <div className="mb-2 flex items-center gap-2 rounded-xl bg-gray-50 dark:bg-gray-700 p-2">
              <img src={selectedImage} alt="Pré-visualização" className="h-16 w-16 rounded-lg object-cover" />
              <span className="min-w-0 flex-1 truncate text-xs text-gray-500 dark:text-gray-300">{selectedImageName}</span>
              <button
                type="button"
                onClick={() => { setSelectedImage(null); setSelectedImageName(''); }}
                className="rounded-full p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-gray-600"
                aria-label="Remover imagem"
              >
                <X size={16} />
              </button>
            </div>
          )}
          <div className="flex items-end gap-2">
            <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handlePickImage} />
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              disabled={sending}
              className="rounded-xl border border-gray-200 p-2.5 text-gray-500 transition-colors hover:border-primary-300 hover:text-primary-500 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300"
              aria-label="Anexar imagem"
              title="Anexar imagem (máximo 3 MB)"
            >
              <ImagePlus size={18} />
            </button>
            <textarea
              ref={textareaRef}
              value={newMessage}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Digite sua mensagem... (Enter envia, Shift+Enter nova linha)"
              rows={1}
              className="flex-1 resize-none border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary-400 max-h-32"
              style={{ minHeight: 42 }}
            />
            <button
              onClick={handleSend}
              disabled={(!newMessage.trim() && !selectedImage) || sending}
              className="bg-primary-500 text-white rounded-xl p-2.5 hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Enviar mensagem"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </ModalOverlay>
  );
}
