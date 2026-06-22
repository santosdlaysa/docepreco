import { useEffect, useState, useRef, useCallback } from 'react';
import { api, SupportConversation, SupportMessage, AdminUser } from '../lib/api';
import { TableSkeleton, ModalOverlay, ToastFn } from '../components';
import { Headset, Send, MessageCircle, Search, PenSquare, X, ImagePlus } from 'lucide-react';

const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

interface Props {
  toast: ToastFn;
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export function SupportChatPage({ toast }: Props) {
  const [conversations, setConversations] = useState<SupportConversation[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserInfo, setSelectedUserInfo] = useState<{ userName: string; userEmail: string } | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedImageName, setSelectedImageName] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  // Nova conversa (iniciar suporte proativamente)
  const [showNewConv, setShowNewConv] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [userResults, setUserResults] = useState<AdminUser[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const messagesPollRef = useRef<ReturnType<typeof setInterval>>();
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const lastTypingSentRef = useRef(0);

  const loadConversations = useCallback(async () => {
    try {
      const data = await api.listSupportConversations();
      setConversations(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMessages = useCallback(async (userId: string) => {
    try {
      const data = await api.getSupportMessages(userId);
      setMessages(data);
    } catch {
      // silent
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  // Poll conversations every 30s
  useEffect(() => {
    loadConversations();
    const interval = setInterval(loadConversations, 30000);
    return () => clearInterval(interval);
  }, [loadConversations]);

  // Poll messages every 10s when a conversation is selected
  useEffect(() => {
    if (messagesPollRef.current) clearInterval(messagesPollRef.current);
    if (!selectedUserId) return;
    messagesPollRef.current = setInterval(() => loadMessages(selectedUserId), 10000);
    return () => { if (messagesPollRef.current) clearInterval(messagesPollRef.current); };
  }, [selectedUserId, loadMessages]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Busca usuários (debounced) enquanto o modal de nova conversa está aberto
  useEffect(() => {
    if (!showNewConv) return;
    setSearchingUsers(true);
    const handle = setTimeout(async () => {
      try {
        const res = await api.listUsers({ search: userSearch.trim() || undefined, sortBy: 'lastSeenAt' });
        setUserResults(res.users);
      } catch {
        setUserResults([]);
      } finally {
        setSearchingUsers(false);
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [userSearch, showNewConv]);

  const handleSelectConversation = async (userId: string) => {
    const conv = conversations.find(c => c.userId === userId);
    if (conv) setSelectedUserInfo({ userName: conv.userName, userEmail: conv.userEmail });
    setSelectedUserId(userId);
    setLoadingMessages(true);
    setMessages([]);
    setSelectedImage(null);
    setSelectedImageName('');
    await loadMessages(userId);
    // Update unread in conversation list
    setConversations(prev => prev.map(c => c.userId === userId ? { ...c, unreadCount: 0 } : c));
  };

  // Inicia (ou reabre) uma conversa com um usuário escolhido no seletor
  const handleStartConversation = async (user: AdminUser) => {
    setShowNewConv(false);
    setUserSearch('');
    setUserResults([]);
    const existing = conversations.find(c => c.userId === user.id);
    if (existing) {
      await handleSelectConversation(user.id);
      return;
    }
    setSelectedUserInfo({ userName: user.companyName, userEmail: user.email });
    setSelectedUserId(user.id);
    setLoadingMessages(true);
    setMessages([]);
    await loadMessages(user.id);
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const handleSend = async () => {
    const text = newMessage.trim();
    if ((!text && !selectedImage) || !selectedUserId || sending) return;
    setSending(true);
    try {
      const sent = await api.sendSupportMessage(selectedUserId, text, selectedImage);
      setMessages(prev => [...prev, sent]);
      setNewMessage('');
      setSelectedImage(null);
      setSelectedImageName('');
      textareaRef.current?.focus();
      // Update conversation list preview — ou cria a entrada se for conversa nova
      setConversations(prev => {
        if (prev.some(c => c.userId === selectedUserId)) {
          return prev.map(c =>
            c.userId === selectedUserId
              ? { ...c, lastMessage: sent.message || '[Imagem]', lastMessageAt: sent.createdAt, lastSenderType: 'admin' }
              : c
          );
        }
        const fresh: SupportConversation = {
          userId: selectedUserId,
          userName: selectedUserInfo?.userName ?? '',
          userEmail: selectedUserInfo?.userEmail ?? '',
          lastMessage: sent.message || '[Imagem]',
          lastMessageAt: sent.createdAt,
          lastSenderType: 'admin',
          unreadCount: 0,
        };
        return [fresh, ...prev];
      });
    } catch {
      toast.error('Erro ao enviar mensagem');
    } finally {
      setSending(false);
    }
  };

  const handlePickImage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Selecione um arquivo de imagem');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error('A imagem deve ter no máximo 3 MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') return;
      setSelectedImage(reader.result);
      setSelectedImageName(file.name);
    };
    reader.onerror = () => toast.error('Não foi possível ler a imagem');
    reader.readAsDataURL(file);
  };

  const sendTypingSignal = useCallback(() => {
    if (!selectedUserId) return;
    const now = Date.now();
    if (now - lastTypingSentRef.current < 3000) return;
    lastTypingSentRef.current = now;
    api.sendSupportTyping(selectedUserId).catch(() => {});
  }, [selectedUserId]);

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

  const filtered = searchTerm
    ? conversations.filter(c =>
        c.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.userEmail.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : conversations;

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Headset className="text-primary-500" size={24} />
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Suporte Chat</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {conversations.length} conversa{conversations.length !== 1 ? 's' : ''}
            {totalUnread > 0 && <span className="ml-2 text-red-500 font-medium">{totalUnread} não lida{totalUnread !== 1 ? 's' : ''}</span>}
          </p>
        </div>
        <button
          onClick={() => setShowNewConv(true)}
          className="flex items-center gap-2 bg-primary-500 text-white text-sm font-medium rounded-xl px-4 py-2 hover:bg-primary-600 transition-colors"
        >
          <PenSquare size={16} />
          Nova conversa
        </button>
      </div>

      {loading ? (
        <TableSkeleton rows={5} cols={3} />
      ) : conversations.length === 0 && !selectedUserId ? (
        <div className="flex-1 flex items-center justify-center text-gray-400">
          <div className="text-center">
            <MessageCircle size={48} className="mx-auto mb-3 opacity-50" />
            <p>Nenhuma conversa de suporte ainda</p>
            <button
              onClick={() => setShowNewConv(true)}
              className="mt-4 inline-flex items-center gap-2 bg-primary-500 text-white text-sm font-medium rounded-xl px-4 py-2 hover:bg-primary-600 transition-colors"
            >
              <PenSquare size={16} />
              Iniciar conversa
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden" style={{ height: 'calc(100vh - 180px)', maxHeight: 700 }}>
          {/* Left panel: conversations list */}
          <div className="w-80 border-r border-gray-200 dark:border-gray-700 flex flex-col">
            {/* Search */}
            <div className="p-3 border-b border-gray-100 dark:border-gray-700">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar conversa..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 rounded-lg focus:outline-none focus:border-primary-400"
                />
              </div>
            </div>

            {/* Conversation list */}
            <div className="flex-1 overflow-y-auto">
              {filtered.map(conv => (
                <button
                  key={conv.userId}
                  onClick={() => handleSelectConversation(conv.userId)}
                  className={`w-full text-left p-3 border-b border-gray-50 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                    selectedUserId === conv.userId ? 'bg-primary-50 border-l-2 border-l-primary-500' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-bold text-sm flex-shrink-0">
                      {conv.userName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm text-gray-800 dark:text-gray-100 truncate">{conv.userName}</span>
                        <span className="text-xs text-gray-400 flex-shrink-0 ml-2">{formatTimeAgo(conv.lastMessageAt)}</span>
                      </div>
                      <p className="text-xs text-gray-400 truncate">{conv.userEmail}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">
                        {conv.lastSenderType === 'admin' && <span className="text-primary-500">Você: </span>}
                        {conv.lastMessage || '[Imagem]'}
                      </p>
                    </div>
                    {conv.unreadCount > 0 && (
                      <span className="bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Right panel: messages */}
          <div className="flex-1 flex flex-col">
            {!selectedUserId ? (
              <div className="flex-1 flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <MessageCircle size={48} className="mx-auto mb-3 opacity-50" />
                  <p>Selecione uma conversa</p>
                </div>
              </div>
            ) : (
              <>
                {/* Chat header */}
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-bold text-sm">
                      {selectedUserInfo?.userName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-sm text-gray-800 dark:text-gray-100">{selectedUserInfo?.userName || 'Usuário'}</p>
                      <p className="text-xs text-gray-400">{selectedUserInfo?.userEmail}</p>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {loadingMessages ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary-500 border-t-transparent" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center text-gray-400 py-8">Nenhuma mensagem</div>
                  ) : (
                    messages.map(msg => (
                      <div key={msg.id} className={`flex ${msg.senderType === 'admin' ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${
                            msg.senderType === 'admin'
                              ? 'bg-primary-500 text-white rounded-br-sm'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-bl-sm'
                          }`}
                        >
                          {msg.imageUrl && (
                            <img
                              src={msg.imageUrl}
                              alt="Imagem enviada no chat"
                              className="mb-1.5 max-h-72 max-w-full rounded-xl object-cover"
                            />
                          )}
                          {msg.message && <p className="text-sm whitespace-pre-wrap">{msg.message}</p>}
                          <p className={`text-[10px] mt-1 text-right ${
                            msg.senderType === 'admin' ? 'text-white/70' : 'text-gray-400'
                          }`}>
                            {fmtDate(msg.createdAt)}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
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
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handlePickImage}
                    />
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
                      placeholder="Digite sua resposta... (Enter para enviar, Shift+Enter nova linha)"
                      rows={1}
                      className="flex-1 resize-none border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary-400 max-h-32"
                      style={{ minHeight: 42 }}
                    />
                    <button
                      onClick={handleSend}
                      disabled={(!newMessage.trim() && !selectedImage) || sending}
                      className="bg-primary-500 text-white rounded-xl p-2.5 hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Send size={18} />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal: nova conversa — selecionar usuário */}
      {showNewConv && (
        <ModalOverlay onClose={() => setShowNewConv(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <PenSquare size={18} className="text-primary-500" />
                <h2 className="font-bold text-gray-800 dark:text-gray-100">Nova conversa</h2>
              </div>
              <button onClick={() => setShowNewConv(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X size={20} />
              </button>
            </div>

            <div className="p-4 border-b border-gray-100 dark:border-gray-700">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Buscar usuário por nome ou e-mail..."
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 rounded-lg focus:outline-none focus:border-primary-400"
                />
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto">
              {searchingUsers ? (
                <div className="flex items-center justify-center py-10">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary-500 border-t-transparent" />
                </div>
              ) : userResults.length === 0 ? (
                <div className="text-center text-gray-400 py-10 text-sm">Nenhum usuário encontrado</div>
              ) : (
                userResults.map(user => {
                  const hasConv = conversations.some(c => c.userId === user.id);
                  return (
                    <button
                      key={user.id}
                      onClick={() => handleStartConversation(user)}
                      className="w-full text-left p-3 flex items-center gap-3 border-b border-gray-50 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-bold text-sm flex-shrink-0">
                        {(user.companyName || user.email).charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-800 dark:text-gray-100 truncate">{user.companyName || 'Sem nome'}</p>
                        <p className="text-xs text-gray-400 truncate">{user.email}</p>
                      </div>
                      {hasConv && (
                        <span className="text-[10px] font-medium text-primary-600 bg-primary-50 dark:bg-primary-900/30 rounded-full px-2 py-0.5 flex-shrink-0">
                          conversa existente
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </ModalOverlay>
      )}
    </div>
  );
}
