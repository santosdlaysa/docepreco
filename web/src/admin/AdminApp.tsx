import { useState, useEffect } from 'react';
import { loadSecret, clearSecret } from '../lib/api';
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
import { ChangelogPage } from '../pages/ChangelogPage';
import { OnboardingPage } from '../pages/OnboardingPage';
import { TelegramAlertsPage } from '../pages/TelegramAlertsPage';
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
  Rocket,
  Smartphone,
  Bot,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type Page = 'dashboard' | 'users' | 'banners' | 'notifications' | 'tips' | 'logs' | 'requests' | 'settings'
  | 'ingredients' | 'recipes' | 'plans' | 'flags' | 'faq' | 'coupons' | 'categories' | 'feedbacks' | 'changelog' | 'onboarding' | 'telegram';

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

  { id: 'plans', label: 'Planos', icon: CreditCard, section: 'Configuração' },
  { id: 'coupons', label: 'Cupons', icon: Ticket },
  { id: 'flags', label: 'Feature flags', icon: ToggleLeft },
  { id: 'telegram', label: 'Telegram', icon: Bot },
  { id: 'settings', label: 'Configurações', icon: Settings },

  { id: 'logs', label: 'Logs do sistema', icon: ScrollText, section: 'Sistema' },
  { id: 'requests', label: 'Rotas HTTP', icon: Globe },
];

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
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-primary-500 flex items-center justify-center">
              <Cake size={14} className="text-white" />
            </div>
            <p className="font-bold text-gray-900 text-sm">DocePreço</p>
          </div>
        </div>

        <div className="p-4 md:p-6">
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
            {page === 'changelog' && <ChangelogPage toast={toast} />}
            {page === 'onboarding' && <OnboardingPage toast={toast} />}
            {page === 'telegram' && <TelegramAlertsPage toast={toast} />}
          </PageTransition>
        </div>
      </main>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
