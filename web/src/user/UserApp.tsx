import { useState, useEffect } from 'react';
import {
  Cake,
  LayoutDashboard,
  ChefHat,
  Package,
  ShoppingCart,
  ClipboardList,
  Wallet,
  CalendarRange,
  User,
  Store,
  LogOut,
  Menu,
  X,
  Moon,
  Sun,
  Loader2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { UserAuthProvider, useAuth } from './UserAuthContext';
import { UserLoginPage } from './UserLoginPage';
import { slugify } from './format';
import { useToast, ToastContainer, PageTransition } from '../components';
import { RecipesPage } from './pages/RecipesPage';
import { IngredientsPage } from './pages/IngredientsPage';
import { SalesPage } from './pages/SalesPage';
import { OrdersPage } from './pages/OrdersPage';
import { CashPage } from './pages/CashPage';
import { SeasonsPage } from './pages/SeasonsPage';
import { ReportsPage } from './pages/ReportsPage';
import { ProfilePage } from './pages/ProfilePage';
import { StorePage } from './pages/StorePage';

type Page = 'reports' | 'recipes' | 'ingredients' | 'sales' | 'orders' | 'cash' | 'seasons' | 'store' | 'profile';

const NAV: { id: Page; label: string; icon: LucideIcon }[] = [
  { id: 'cash', label: 'Caixa', icon: Wallet },
  { id: 'reports', label: 'Relatórios', icon: LayoutDashboard },
  { id: 'recipes', label: 'Receitas', icon: ChefHat },
  { id: 'ingredients', label: 'Ingredientes', icon: Package },
  { id: 'sales', label: 'Vendas', icon: ShoppingCart },
  { id: 'orders', label: 'Encomendas', icon: ClipboardList },
  { id: 'store', label: 'Loja', icon: Store },
  { id: 'seasons', label: 'Temporadas', icon: CalendarRange },
  { id: 'profile', label: 'Meu perfil', icon: User },
];

function useDarkMode() {
  const [dark, setDark] = useState(() => {
    const stored = localStorage.getItem('theme');
    if (stored === 'dark') return true;
    if (stored === 'light') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  useEffect(() => {
    const root = document.documentElement;
    if (dark) root.classList.add('dark');
    else root.classList.remove('dark');
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);
  return { dark, toggle: () => setDark(d => !d) };
}

function Shell() {
  const { user, loading, logout } = useAuth();
  const [page, setPage] = useState<Page>('reports');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { toasts, toast, removeToast } = useToast();
  const { dark, toggle: toggleDark } = useDarkMode();
  const routerNavigate = useNavigate();

  // Reflete o nome da confeitaria logada na URL (ex.: /app/doces-da-marina)
  useEffect(() => {
    if (user) {
      const target = `/app/${slugify(user.companyName)}`;
      if (window.location.pathname !== target) {
        routerNavigate(target, { replace: true });
      }
    }
  }, [user, routerNavigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 size={28} className="animate-spin-slow text-primary-500" />
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <UserLoginPage />
        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </>
    );
  }

  const navigate = (p: Page) => {
    setPage(p);
    setSidebarOpen(false);
  };

  const sidebarContent = (
    <>
      <div className="p-5 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-br from-primary-50 to-white dark:from-gray-800 dark:to-gray-800">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-primary-500 flex items-center justify-center shadow-sm">
            <Cake size={18} className="text-white" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-gray-900 dark:text-white text-sm tracking-tight">DocePreço</p>
            <p className="text-[11px] text-gray-400 font-medium truncate">{user.companyName}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {NAV.map(n => {
          const Icon = n.icon;
          const active = page === n.id;
          return (
            <button
              key={n.id}
              onClick={() => navigate(n.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all text-left relative ${
                active
                  ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary-500 rounded-r-full" />}
              <Icon size={16} className={active ? 'text-primary-500' : 'text-gray-400 dark:text-gray-500'} />
              {n.label}
            </button>
          );
        })}
      </nav>

      <div className="p-3 border-t border-gray-100 dark:border-gray-700">
        <button
          onClick={() => { logout(); routerNavigate('/', { replace: true }); }}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <LogOut size={18} className="text-gray-400" />
          Sair
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      <aside className="hidden md:flex w-56 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex-col">
        {sidebarContent}
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 md:hidden animate-fade-in" onClick={() => setSidebarOpen(false)} />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col transform transition-transform duration-200 md:hidden ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="absolute top-4 right-4">
          <button onClick={() => setSidebarOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X size={20} />
          </button>
        </div>
        {sidebarContent}
      </aside>

      <main className="flex-1 min-w-0 overflow-y-auto">
        <div className="md:hidden flex items-center gap-3 p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-30">
          <button onClick={() => setSidebarOpen(true)} className="text-gray-600 dark:text-gray-300">
            <Menu size={22} />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <div className="w-7 h-7 rounded-md bg-primary-500 flex items-center justify-center">
              <Cake size={14} className="text-white" />
            </div>
            <p className="font-bold text-gray-900 dark:text-white text-sm">DocePreço</p>
          </div>
          <ThemeToggle dark={dark} toggle={toggleDark} />
        </div>

        <div className="hidden md:flex items-center justify-end px-6 pt-4">
          <ThemeToggle dark={dark} toggle={toggleDark} />
        </div>

        <div className="p-4 md:px-6 md:pb-6 md:pt-2">
          <PageTransition pageKey={page}>
            {page === 'reports' && <ReportsPage toast={toast} />}
            {page === 'recipes' && <RecipesPage toast={toast} />}
            {page === 'ingredients' && <IngredientsPage toast={toast} />}
            {page === 'sales' && <SalesPage toast={toast} />}
            {page === 'orders' && <OrdersPage toast={toast} />}
            {page === 'store' && <StorePage toast={toast} />}
            {page === 'cash' && <CashPage toast={toast} />}
            {page === 'seasons' && <SeasonsPage toast={toast} />}
            {page === 'profile' && <ProfilePage toast={toast} />}
          </PageTransition>
        </div>
      </main>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

function ThemeToggle({ dark, toggle }: { dark: boolean; toggle: () => void }) {
  return (
    <button
      onClick={toggle}
      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      title={dark ? 'Modo claro' : 'Modo escuro'}
    >
      {dark ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} className="text-gray-500" />}
    </button>
  );
}

export default function UserApp() {
  return (
    <UserAuthProvider>
      <Shell />
    </UserAuthProvider>
  );
}
