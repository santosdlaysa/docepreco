import { Link, useLocation } from 'react-router-dom';
import { Home, Search, Receipt, User } from 'lucide-react';

const TABS = [
  { to: '/lojas', label: 'Início', icon: Home },
  { to: '/explorar', label: 'Explorar', icon: Search },
  { to: '/meus-pedidos', label: 'Histórico', icon: Receipt },
  { to: '/perfil', label: 'Perfil', icon: User },
];

const ACTIVE_COLOR = '#EA4B92';
const INACTIVE_COLOR = '#9CA3AF';

export function BottomNav() {
  const { pathname } = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex items-center justify-around pb-[env(safe-area-inset-bottom)] z-50">
      {TABS.map(tab => {
        const active = pathname === tab.to;
        const color = active ? ACTIVE_COLOR : INACTIVE_COLOR;
        const Icon = tab.icon;
        return (
          <Link
            key={tab.to}
            to={tab.to}
            className="flex flex-col items-center justify-center gap-0.5 flex-1 py-2.5 active:scale-95 transition-transform"
          >
            <Icon size={20} color={color} strokeWidth={active ? 2.5 : 2} />
            <span className="text-[11px] font-semibold" style={{ color }}>
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
