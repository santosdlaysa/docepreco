import { useState, useEffect } from 'react';
import { loadSecret, clearSecret } from './lib/api';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { UsersPage } from './pages/UsersPage';

type Page = 'dashboard' | 'users';

const NAV: Array<{ id: Page; label: string; icon: string }> = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'users', label: 'Usuários', icon: '👥' },
];

export default function App() {
  const [authed, setAuthed] = useState(!!loadSecret());
  const [page, setPage] = useState<Page>('dashboard');

  useEffect(() => {
    setAuthed(!!loadSecret());
  }, []);

  if (!authed) {
    return <LoginPage onLogin={() => setAuthed(true)} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-xl">🍰</span>
            <div>
              <p className="font-bold text-gray-900 text-sm">DocePreço</p>
              <p className="text-xs text-gray-400">Painel Admin</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {NAV.map(n => (
            <button
              key={n.id}
              onClick={() => setPage(n.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                page === n.id
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span>{n.icon}</span>
              {n.label}
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-gray-100">
          <button
            onClick={() => { clearSecret(); setAuthed(false); }}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <span>🚪</span>
            Sair
          </button>
        </div>
      </aside>

      {/* Conteúdo */}
      <main className="flex-1 p-6 overflow-y-auto">
        {page === 'dashboard' && <DashboardPage />}
        {page === 'users' && <UsersPage />}
      </main>
    </div>
  );
}
