import { useState, useEffect } from 'react';
import { Cake } from 'lucide-react';
import { StoreCard } from '../components/StoreCard';
import { BottomNav } from '../components/BottomNav';
import { FOOD_CATEGORIES } from '../data/categories';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

interface StoreListItem {
  storeName: string;
  slug: string;
  description: string | null;
  coverImageUrl: string | null;
  acceptsDelivery: boolean;
  acceptsPickup: boolean;
  minOrderValue: number | null;
  deliveryFee: number | null;
  city: string | null;
  category: string | null;
}

export function LojasPage() {
  const [stores, setStores] = useState<StoreListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Debounce da busca
  useEffect(() => {
    const id = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(id);
  }, [search]);

  // Reseta a página ao trocar de categoria
  useEffect(() => {
    setPage(1);
  }, [selectedCategory]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({
      search: debouncedSearch,
      category: selectedCategory ?? '',
      page: String(page),
      limit: '20',
    });
    fetch(`${API_BASE}/public/stores?${params.toString()}`)
      .then(r => r.json())
      .then(json => {
        if (json.success) {
          setStores(prev => (page === 1 ? json.data.stores : [...prev, ...json.data.stores]));
          setTotal(json.data.total);
        }
      })
      .catch(() => {
        if (page === 1) setStores([]);
      })
      .finally(() => setLoading(false));
  }, [debouncedSearch, selectedCategory, page]);

  const handleToggleCategory = (key: string) => {
    setSelectedCategory(prev => (prev === key ? null : key));
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7]">
      <div className="max-w-lg mx-auto px-4 pt-8 pb-20">
        {/* Cabeçalho */}
        <div className="flex items-center gap-2 mb-5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#EA4B92] to-[#7C3AED] flex items-center justify-center shadow-lg shadow-pink-500/25 flex-shrink-0">
            <Cake size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-[17px] font-extrabold text-gray-900 leading-tight tracking-tight">DocePreço</h1>
            <p className="text-gray-400 text-xs">Escolha uma loja para pedir</p>
          </div>
        </div>

        {/* Busca */}
        <div className="relative mb-4">
          <svg
            className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
          </svg>
          <input
            className="w-full bg-white border border-gray-200 rounded-full pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-[#EA4B92] focus:ring-2 focus:ring-[#EA4B92]/10 transition-all placeholder:text-gray-300"
            placeholder="Buscar loja..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Categorias */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-5 -mx-4 px-4">
          {FOOD_CATEGORIES.map(cat => {
            const active = selectedCategory === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => handleToggleCategory(cat.key)}
                className={`flex-shrink-0 flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold transition-colors active:scale-95 ${
                  active
                    ? 'bg-[#EA4B92] text-white shadow-sm shadow-pink-500/25'
                    : 'bg-white text-gray-500 shadow-sm'
                }`}
              >
                <span>{cat.emoji}</span>
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Loading inicial */}
        {loading && page === 1 && (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="w-10 h-10 border-[3px] border-[#EA4B92] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-400">Carregando lojas...</p>
          </div>
        )}

        {/* Vazio */}
        {!loading && stores.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
            <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center">
              <svg className="w-7 h-7 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
              </svg>
            </div>
            <p className="text-gray-400 text-sm">Nenhuma loja encontrada</p>
          </div>
        )}

        {/* Lista de lojas */}
        {stores.length > 0 && (
          <div className="flex flex-col gap-3">
            {stores.map(store => (
              <StoreCard
                key={store.slug}
                storeName={store.storeName}
                slug={store.slug}
                description={store.description}
                coverImageUrl={store.coverImageUrl}
                acceptsDelivery={store.acceptsDelivery}
                acceptsPickup={store.acceptsPickup}
                minOrderValue={store.minOrderValue}
                city={store.city}
              />
            ))}
          </div>
        )}

        {/* Carregar mais */}
        {stores.length < total && !loading && (
          <div className="flex justify-center mt-6">
            <button
              onClick={() => setPage(p => p + 1)}
              className="text-sm font-bold text-[#EA4B92] bg-white shadow-sm rounded-full px-6 py-3 active:scale-95 transition-transform"
            >
              Carregar mais
            </button>
          </div>
        )}

        {loading && page > 1 && (
          <div className="flex justify-center mt-6">
            <div className="w-6 h-6 border-[3px] border-[#EA4B92] border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
