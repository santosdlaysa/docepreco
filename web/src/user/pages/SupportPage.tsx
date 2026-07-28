import { useEffect, useState, useCallback, useRef } from 'react';
import { Send, ImagePlus, Headset, X, Loader2 } from 'lucide-react';
import { userApi, SupportMessage } from '../userApi';
import { ToastFn } from '../../components';

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function SupportPage({ toast }: { toast: ToastFn }) {
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [adminTyping, setAdminTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      setMessages(await userApi.getSupportMessages());
    } catch {
      /* silencioso no polling */
    } finally {
      setLoading(false);
    }
  }, []);

  // Mensagens a cada 10s.
  useEffect(() => {
    load();
    const i = setInterval(load, 10000);
    return () => clearInterval(i);
  }, [load]);

  // "Digitando" do suporte a cada 3s.
  useEffect(() => {
    const i = setInterval(async () => {
      try {
        const { typing } = await userApi.getSupportTyping();
        setAdminTyping(typing);
      } catch {
        /* ignora */
      }
    }, 3000);
    return () => clearInterval(i);
  }, []);

  // Rola para o fim quando chegam mensagens.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, adminTyping]);

  const pickImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) return toast.error('Imagem muito grande (máx. 3 MB).');
    const reader = new FileReader();
    reader.onload = () => setImage(String(reader.result));
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const send = async () => {
    const msg = text.trim();
    if (!msg && !image) return;
    setSending(true);
    const imageToSend = image;
    setText('');
    setImage(null);
    try {
      await userApi.sendSupportMessage(msg, imageToSend);
      await load();
    } catch (err) {
      setText(msg);
      setImage(imageToSend);
      toast.error((err as Error).message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto flex flex-col h-[calc(100vh-9rem)]">
      {/* Cabeçalho */}
      <div className="flex items-center gap-3 pb-3 border-b border-gray-200 dark:border-gray-700">
        <div className="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center">
          <Headset size={20} className="text-white" />
        </div>
        <div>
          <p className="font-bold text-gray-900 dark:text-white">Suporte DocePreço</p>
          <p className="text-xs text-green-600 dark:text-green-400">Fale com a nossa equipe</p>
        </div>
      </div>

      {/* Mensagens */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto py-4 space-y-3">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 size={24} className="animate-spin-slow text-primary-500" />
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-6">
            <Headset size={36} className="text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
              Precisa de ajuda? Envie sua mensagem que a equipe do DocePreço responde por aqui.
            </p>
          </div>
        ) : (
          messages.map(m => {
            const mine = m.senderType === 'user';
            return (
              <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 ${
                    mine
                      ? 'bg-primary-500 text-white rounded-br-sm'
                      : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-bl-sm'
                  }`}
                >
                  {m.imageUrl && (
                    <img src={m.imageUrl} alt="" className="rounded-lg mb-1.5 max-h-52 w-auto" />
                  )}
                  {m.message && <p className="text-sm whitespace-pre-wrap break-words">{m.message}</p>}
                  <p className={`text-[10px] mt-1 ${mine ? 'text-white/70' : 'text-gray-400'}`}>{formatTime(m.createdAt)}</p>
                </div>
              </div>
            );
          })
        )}
        {adminTyping && (
          <div className="flex justify-start">
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl rounded-bl-sm px-4 py-3">
              <span className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Prévia da imagem */}
      {image && (
        <div className="relative w-16 h-16 mb-2">
          <img src={image} alt="" className="w-16 h-16 rounded-lg object-cover" />
          <button
            onClick={() => setImage(null)}
            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-gray-900 text-white flex items-center justify-center"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* Barra de envio */}
      <div className="flex items-end gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
        <label className="shrink-0 w-10 h-10 rounded-lg border border-gray-200 dark:border-gray-600 flex items-center justify-center cursor-pointer text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700">
          <ImagePlus size={18} />
          <input type="file" accept="image/*" className="hidden" onChange={pickImage} />
        </label>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Escreva sua mensagem..."
          rows={1}
          maxLength={1000}
          className="flex-1 resize-none border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white max-h-32"
        />
        <button
          onClick={send}
          disabled={sending || (!text.trim() && !image)}
          className="shrink-0 w-10 h-10 rounded-lg bg-primary-500 hover:bg-primary-600 disabled:opacity-40 text-white flex items-center justify-center transition-colors"
        >
          {sending ? <Loader2 size={18} className="animate-spin-slow" /> : <Send size={18} />}
        </button>
      </div>
    </div>
  );
}
