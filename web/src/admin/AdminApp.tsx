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
import { useToast, ToastContainer, PageTransition } from '../components';
import {
  LayoutDashboard,
  Users,
  Megaphone,
  Bell,
  Lightbulb,
  ScrollText,
  Globe,
  LogOut,
  Cake,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type Page = 'dashboard' | 'users' | 'banners' | 'notifications' | 'tips' | 'logs' | 'requests';

const NAV: Array<{ id: Page; label: string; icon: LucideIcon }> = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'users', label: 'Usuários', icon: Users },
  { id: 'banners', label: 'Banners', icon: Megaphone },
  { id: 'notifications', label: 'Notificações', icon: Bell },
  { id: 'tips', label: 'Dicas', icon: Lightbulb },
  { id: 'logs', label: 'Logs do sistema', icon: ScrollText },
  { id: 'requests', label: 'Rotas HTTP', icon: Globe },
];

export default function AdminApp() {
  const [authed, setAuthed] = useState(!!loadSecret());
  const [page, setPage] = useState<Page>('dashboard');
  const { toasts, toast, removeToast } = useToast();

  useEffect(() => {
    setAuthed(!!loadSecret());
  }, []);

  if (!authed) {
    return (
      <>
        <LoginPage onLogin={() => setAuthed(true)} />
        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col">
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

        <nav className="flex-1 p-3 space-y-0.5">
          {NAV.map(n => {
            const Icon = n.icon;
            const active = page === n.id;
            return (
              <button
                key={n.id}
                onClick={() => setPage(n.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left relative ${
                  active
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary-500 rounded-r-full" />
                )}
                <Icon size={18} className={active ? 'text-primary-500' : 'text-gray-400'} />
                {n.label}
              </button>
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
      </aside>

      {/* Conteúdo */}
      <main className="flex-1 p-6 overflow-y-auto">
        <PageTransition pageKey={page}>
          {page === 'dashboard' && <DashboardPage />}
          {page === 'users' && <UsersPage toast={toast} />}
          {page === 'banners' && <BannersPage toast={toast} />}
          {page === 'notifications' && <NotificationsPage toast={toast} />}
          {page === 'tips' && <TipsPage toast={toast} />}
          {page === 'logs' && <LogsPage />}
          {page === 'requests' && <RequestLogsPage />}
        </PageTransition>
      </main>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
