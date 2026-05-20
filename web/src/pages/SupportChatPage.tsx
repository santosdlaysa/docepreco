import { useEffect, useState, useRef, useCallback } from 'react';
import { api, SupportConversation, SupportMessage } from '../lib/api';
import { TableSkeleton, ToastFn } from '../components';
import { Headset, Send, MessageCircle, Search } from 'lucide-react';

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
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesPollRef = useRef<ReturnType<typeof setInterval>>();

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

  const handleSelectConversation = async (userId: string) => {
    setSelectedUserId(userId);
    setLoadingMessages(true);
    setMessages([]);
    await loadMessages(userId);
    // Update unread in conversation list
    setConversations(prev => prev.map(c => c.userId === userId ? { ...c, unreadCount: 0 } : c));
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedUserId || sending) return;
    setSending(true);
    try {
      const sent = await api.sendSupportMessage(selectedUserId, newMessage.trim());
      setMessages(prev => [...prev, sent]);
      setNewMessage('');
      textareaRef.current?.focus();
      // Update conversation list preview
      setConversations(prev => prev.map(c =>
        c.userId === selectedUserId
          ? { ...c, lastMessage: sent.message, lastMessageAt: sent.createdAt, lastSenderType: 'admin' }
          : c
      ));
    } catch {
      toast.error('Erro ao enviar mensagem');
    } finally {
      setSending(false);
    }
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

  const selectedConversation = conversations.find(c => c.userId === selectedUserId);

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Headset className="text-primary-500" size={24} />
        <div>
          <h1 className="text-xl font-bold text-gray-800">Suporte Chat</h1>
          <p className="text-sm text-gray-500">
            {conversations.length} conversa{conversations.length !== 1 ? 's' : ''}
            {totalUnread > 0 && <span className="ml-2 text-red-500 font-medium">{totalUnread} não lida{totalUnread !== 1 ? 's' : ''}</span>}
          </p>
        </div>
      </div>

      {loading ? (
        <TableSkeleton rows={5} cols={3} />
      ) : conversations.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-gray-400">
          <div className="text-center">
            <MessageCircle size={48} className="mx-auto mb-3 opacity-50" />
            <p>Nenhuma conversa de suporte ainda</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex bg-white rounded-xl border border-gray-200 overflow-hidden" style={{ minHeight: 500 }}>
          {/* Left panel: conversations list */}
          <div className="w-80 border-r border-gray-200 flex flex-col">
            {/* Search */}
            <div className="p-3 border-b border-gray-100">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar conversa..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary-400"
                />
              </div>
            </div>

            {/* Conversation list */}
            <div className="flex-1 overflow-y-auto">
              {filtered.map(conv => (
                <button
                  key={conv.userId}
                  onClick={() => handleSelectConversation(conv.userId)}
                  className={`w-full text-left p-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${
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
                        <span className="font-medium text-sm text-gray-800 truncate">{conv.userName}</span>
                        <span className="text-xs text-gray-400 flex-shrink-0 ml-2">{formatTimeAgo(conv.lastMessageAt)}</span>
                      </div>
                      <p className="text-xs text-gray-400 truncate">{conv.userEmail}</p>
                      <p className="text-sm text-gray-500 truncate mt-0.5">
                        {conv.lastSenderType === 'admin' && <span className="text-primary-500">Você: </span>}
                        {conv.lastMessage}
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
                <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-bold text-sm">
                      {selectedConversation?.userName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-sm text-gray-800">{selectedConversation?.userName}</p>
                      <p className="text-xs text-gray-400">{selectedConversation?.userEmail}</p>
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
                              : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
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
                <div className="p-3 border-t border-gray-200 bg-white">
                  <div className="flex items-end gap-2">
                    <textarea
                      ref={textareaRef}
                      value={newMessage}
                      onChange={e => setNewMessage(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Digite sua resposta... (Enter para enviar, Shift+Enter nova linha)"
                      rows={1}
                      className="flex-1 resize-none border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary-400 max-h-32"
                      style={{ minHeight: 42 }}
                    />
                    <button
                      onClick={handleSend}
                      disabled={!newMessage.trim() || sending}
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
    </div>
  );
}
