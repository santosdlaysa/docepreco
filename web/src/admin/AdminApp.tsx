import { useState, useEffect, useRef, useCallback } from 'react';
import { loadSecret, clearSecret, api, LogEntry } from '../lib/api';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';
import { UsersPage } from '../pages/UsersPage';
import { LogsPage } from '../pages/LogsPage';
import { RequestLogsPage } from '../pages/RequestLogsPage';
import { BannersPage } from '../pages/BannersPage';
import { NotificationsPage } from '../pages/NotificationsPage';
import { TipsPage } from '../pages/TipsPage';
import { SettingsPage } from '../pages/SettingsPage';
import { UserDataPage } from '../pages/UserDataPage';
import { GlobalIngredientsPage } from '../pages/GlobalIngredientsPage';
import { FeaturedRecipesPage } from '../pages/FeaturedRecipesPage';
import { PlanConfigPage } from '../pages/PlanConfigPage';
import { FeatureFlagsPage } from '../pages/FeatureFlagsPage';
import { FaqPage } from '../pages/FaqPage';
import { CouponsPage } from '../pages/CouponsPage';
import { CategoriesPage } from '../pages/CategoriesPage';
import { FeedbacksPage } from '../pages/FeedbacksPage';
import { SuggestionsPage } from '../pages/SuggestionsPage';
import { ChangelogPage } from '../pages/ChangelogPage';
import { OnboardingPage } from '../pages/OnboardingPage';
import { TelegramAlertsPage } from '../pages/TelegramAlertsPage';
import { SupportChatPage } from '../pages/SupportChatPage';
import { useToast, ToastContainer, PageTransition } from '../components';
import {
  LayoutDashboard,
  Users,
  Megaphone,
  Bell,
  Lightbulb,
  ScrollText,
  Globe,
  Settings,
  LogOut,
  Cake,
  Menu,
  X,
  Package,
  ChefHat,
  CreditCard,
  ToggleLeft,
  HelpCircle,
  Ticket,
  Tag,
  MessageCircle,
  MessagesSquare,
  Rocket,
  Smartphone,
  Bot,
  Headset,
  BellRing,
  UserRoundPlus,
  ShoppingCart,
  Crown,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type Page = 'dashboard' | 'users' | 'banners' | 'notifications' | 'tips' | 'logs' | 'requests' | 'settings'
  | 'ingredients' | 'recipes' | 'plans' | 'flags' | 'faq' | 'coupons' | 'categories' | 'feedbacks' | 'suggestions' | 'changelog' | 'onboarding' | 'telegram' | 'support';

interface NavItem {
  id: Page;
  label: string;
  icon: LucideIcon;
  section?: string;
}

const NAV: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'users', label: 'Usuários', icon: Users },

  { id: 'ingredients', label: 'Ingredientes', icon: Package, section: 'Conteúdo' },
  { id: 'recipes', label: 'Receitas destaque', icon: ChefHat },
  { id: 'categories', label: 'Categorias', icon: Tag },
  { id: 'faq', label: 'FAQ / Ajuda', icon: HelpCircle },
  { id: 'changelog', label: 'Novidades', icon: Rocket },
  { id: 'onboarding', label: 'Onboarding', icon: Smartphone },

  { id: 'banners', label: 'Banners', icon: Megaphone, section: 'Comunicação' },
  { id: 'notifications', label: 'Notificações', icon: Bell },
  { id: 'tips', label: 'Dicas', icon: Lightbulb },
  { id: 'feedbacks', label: 'Feedbacks', icon: MessageCircle },
  { id: 'suggestions', label: 'Sugestões', icon: MessagesSquare },
  { id: 'support', label: 'Suporte Chat', icon: Headset },

  { id: 'plans', label: 'Planos', icon: CreditCard, section: 'Configuração' },
  { id: 'coupons', label: 'Cupons', icon: Ticket },
  { id: 'flags', label: 'Feature flags', icon: ToggleLeft },
  { id: 'telegram', label: 'Telegram', icon: Bot },
  { id: 'settings', label: 'Configurações', icon: Settings },

  { id: 'logs', label: 'Logs do sistema', icon: ScrollText, section: 'Sistema' },
  { id: 'requests', label: 'Rotas HTTP', icon: Globe },
];

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

const EVENT_CONFIG: Record<string, { icon: LucideIcon; color: string; bg: string; label: string }> = {
  new_user:    { icon: UserRoundPlus, color: 'text-green-600', bg: 'bg-green-50', label: 'Novo cadastro' },
  sale:        { icon: ShoppingCart,  color: 'text-blue-600',  bg: 'bg-blue-50',  label: 'Nova venda' },
  premium_on:  { icon: Crown,        color: 'text-primary-600', bg: 'bg-primary-50', label: 'Novo premium' },
  premium_off: { icon: Crown,        color: 'text-gray-500',  bg: 'bg-gray-50',  label: 'Cancelou premium' },
};

function SupportBubble({ onNavigate, currentPage }: { onNavigate: (p: Page) => void; currentPage: Page }) {
  const [unread, setUnread] = useState(0);

  const fetchUnread = useCallback(async () => {
    try {
      const data = await api.getSupportUnreadCount();
      setUnread(data.unreadCount);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [fetchUnread]);

  // Reset when viewing support page
  useEffect(() => {
    if (currentPage === 'support') setUnread(0);
  }, [currentPage]);

  if (currentPage === 'support') return null;

  return (
    <button
      onClick={() => onNavigate('support')}
      className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary-500 text-white shadow-lg hover:bg-primary-600 transition-all hover:scale-105 flex items-center justify-center"
      title="Suporte Chat"
    >
      <Headset size={24} />
      {unread > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[22px] h-[22px] px-1 flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full ring-2 ring-white">
          {unread > 99 ? '99+' : unread}
        </span>
      )}
    </button>
  );
}

function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [unread, setUnread] = useState(0);
  const lastSeenRef = useRef<string | null>(localStorage.getItem('notif_last_seen'));
  const panelRef = useRef<HTMLDivElement>(null);

  const fetchLogs = useCallback(async () => {
    try {
      const data = await api.getLogs(20);
      setLogs(data);
      if (lastSeenRef.current) {
        const count = data.filter(l => l.ts > lastSeenRef.current!).length;
        setUnread(count);
      } else {
        setUnread(0);
        if (data.length > 0) {
          lastSeenRef.current = data[0].ts;
          localStorage.setItem('notif_last_seen', data[0].ts);
        }
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 30000);
    return () => clearInterval(interval);
  }, [fetchLogs]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleOpen = () => {
    setOpen(o => !o);
    if (!open && logs.length > 0) {
      lastSeenRef.current = logs[0].ts;
      localStorage.setItem('notif_last_seen', logs[0].ts);
      setUnread(0);
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      <button onClick={handleOpen} className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors">
        <BellRing size={20} className={unread > 0 ? 'text-primary-600' : 'text-gray-500'} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl border border-gray-200 shadow-xl z-50 overflow-hidden animate-fade-in">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <p className="font-semibold text-gray-900 text-sm">Notificações</p>
            {unread > 0 && <span className="text-xs text-primary-600 font-medium">{unread} nova{unread !== 1 ? 's' : ''}</span>}
          </div>
          <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
            {logs.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-8">Nenhuma notificação</p>
            ) : (
              logs.map((l, i) => {
                const cfg = EVENT_CONFIG[l.type] ?? EVENT_CONFIG.new_user;
                const Icon = cfg.icon;
                const isNew = lastSeenRef.current ? l.ts > lastSeenRef.current : false;
                return (
                  <div key={`${l.ts}-${i}`} className={`px-4 py-3 flex items-start gap-3 ${isNew ? 'bg-primary-50/30' : ''}`}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${cfg.bg}`}>
                      <Icon size={14} className={cfg.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-500">{cfg.label}</p>
                      <p className="text-sm text-gray-900 font-medium truncate">{l.label}</p>
                      {l.detail && <p className="text-xs text-gray-400 truncate">{l.detail}</p>}
                    </div>
                    <span className="text-[11px] text-gray-400 shrink-0 mt-0.5">{formatTimeAgo(l.ts)}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminApp() {
  const [authed, setAuthed] = useState(!!loadSecret());
  const [page, setPage] = useState<Page>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [impersonateUserId, setImpersonateUserId] = useState<string | null>(null);
  const { toasts, toast, removeToast } = useToast();

  useEffect(() => {
    setAuthed(!!loadSecret());
  }, []);

  const navigate = (p: Page) => {
    setPage(p);
    setImpersonateUserId(null);
    setSidebarOpen(false);
  };

  if (!authed) {
    return (
      <>
        <LoginPage onLogin={() => setAuthed(true)} />
        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </>
    );
  }

  const sidebarContent = (
    <>
      <div className="p-5 border-b border-gray-100 bg-gradient-to-br from-primary-50 to-white">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-primary-500 flex items-center justify-center shadow-sm">
            <Cake size={18} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-gray-900 text-sm tracking-tight">DocePreço</p>
            <p className="text-[11px] text-gray-400 font-medium">Painel Admin</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {NAV.map(n => {
          const Icon = n.icon;
          const active = page === n.id;
          return (
            <div key={n.id}>
              {n.section && (
                <p className="text-[10px] uppercase font-semibold text-gray-400 tracking-wider px-3 pt-4 pb-1">{n.section}</p>
              )}
              <button
                onClick={() => navigate(n.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all text-left relative ${
                  active
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary-500 rounded-r-full" />
                )}
                <Icon size={16} className={active ? 'text-primary-500' : 'text-gray-400'} />
                {n.label}
              </button>
            </div>
          );
        })}
      </nav>

      <div className="p-3 border-t border-gray-100">
        <button
          onClick={() => { clearSecret(); setAuthed(false); }}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors"
        >
          <LogOut size={18} className="text-gray-400" />
          Sair
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar desktop */}
      <aside className="hidden md:flex w-56 bg-white border-r border-gray-200 flex-col">
        {sidebarContent}
      </aside>

      {/* Overlay mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar mobile */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 flex flex-col transform transition-transform duration-200 md:hidden ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="absolute top-4 right-4">
          <button onClick={() => setSidebarOpen(false)} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>
        {sidebarContent}
      </aside>

      {/* Conteúdo */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        {/* Header mobile */}
        <div className="md:hidden flex items-center gap-3 p-4 bg-white border-b border-gray-200 sticky top-0 z-30">
          <button onClick={() => setSidebarOpen(true)} className="text-gray-600">
            <Menu size={22} />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <div className="w-7 h-7 rounded-md bg-primary-500 flex items-center justify-center">
              <Cake size={14} className="text-white" />
            </div>
            <p className="font-bold text-gray-900 text-sm">DocePreço</p>
          </div>
          <NotificationBell />
        </div>

        <div className="hidden md:flex items-center justify-end px-6 pt-4">
          <NotificationBell />
        </div>

        <div className="p-4 md:px-6 md:pb-6 md:pt-2">
          <PageTransition pageKey={impersonateUserId ? `user-${impersonateUserId}` : page}>
            {page === 'dashboard' && <DashboardPage toast={toast} />}
            {page === 'users' && !impersonateUserId && <UsersPage toast={toast} onImpersonate={setImpersonateUserId} />}
            {page === 'users' && impersonateUserId && <UserDataPage userId={impersonateUserId} onBack={() => setImpersonateUserId(null)} />}
            {page === 'banners' && <BannersPage toast={toast} />}
            {page === 'notifications' && <NotificationsPage toast={toast} />}
            {page === 'tips' && <TipsPage toast={toast} />}
            {page === 'logs' && <LogsPage />}
            {page === 'requests' && <RequestLogsPage />}
            {page === 'settings' && <SettingsPage toast={toast} />}
            {page === 'ingredients' && <GlobalIngredientsPage toast={toast} />}
            {page === 'recipes' && <FeaturedRecipesPage toast={toast} />}
            {page === 'plans' && <PlanConfigPage toast={toast} />}
            {page === 'flags' && <FeatureFlagsPage toast={toast} />}
            {page === 'faq' && <FaqPage toast={toast} />}
            {page === 'coupons' && <CouponsPage toast={toast} />}
            {page === 'categories' && <CategoriesPage toast={toast} />}
            {page === 'feedbacks' && <FeedbacksPage toast={toast} />}
            {page === 'suggestions' && <SuggestionsPage toast={toast} />}
            {page === 'support' && <SupportChatPage toast={toast} />}
            {page === 'changelog' && <ChangelogPage toast={toast} />}
            {page === 'onboarding' && <OnboardingPage toast={toast} />}
            {page === 'telegram' && <TelegramAlertsPage toast={toast} />}
          </PageTransition>
        </div>
      </main>

      <SupportBubble onNavigate={navigate} currentPage={page} />
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
