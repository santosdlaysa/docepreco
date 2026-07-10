import { useState, useEffect } from 'react';
import { StoreCard } from '../components/StoreCard';
import { BottomNav } from '../components/BottomNav';
import { FOOD_CATEGORIES } from '../data/categories';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';
const CITY_CACHE_KEY = 'dpeco_detected_city';
const CITY_CACHE_TTL = 24 * 60 * 60 * 1000;

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
  const [cityFilter, setCityFilter] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
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

  // Reseta a página ao trocar de categoria ou cidade
  useEffect(() => {
    setPage(1);
  }, [selectedCategory, cityFilter]);

  // Detecta a localização do cliente (uma vez) e pré-filtra pela cidade dele.
  useEffect(() => {
    try {
      const cached = localStorage.getItem(CITY_CACHE_KEY);
      if (cached) {
        const { city, ts } = JSON.parse(cached);
        if (city && Date.now() - ts < CITY_CACHE_TTL) {
          setCityFilter(city);
          return;
        }
      }
    } catch {}
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async pos => {
        try {
          const { latitude, longitude } = pos.coords;
          const r = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`
          );
          const j = await r.json();
          const city: string | undefined =
            j.address?.city || j.address?.town || j.address?.village || j.address?.municipality;
          if (city) {
            setCityFilter(city);
            localStorage.setItem(CITY_CACHE_KEY, JSON.stringify({ city, ts: Date.now() }));
          }
        } catch {}
        setLocating(false);
      },
      () => setLocating(false),
      { timeout: 8000, maximumAge: 600000 }
    );
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({
      search: debouncedSearch,
      category: selectedCategory ?? '',
      city: cityFilter ?? '',
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
  }, [debouncedSearch, selectedCategory, cityFilter, page]);

  const handleToggleCategory = (key: string) => {
    setSelectedCategory(prev => (prev === key ? null : key));
  };

  const clearCityFilter = () => {
    setCityFilter(null);
    try { localStorage.removeItem(CITY_CACHE_KEY); } catch {}
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7]">
      <div className="max-w-lg mx-auto px-4 pt-8 pb-20">
        {/* Cabeçalho */}
        <div className="flex items-center gap-2 mb-5">
          <img src="/pwa-192x192.png" alt="DocePreço" className="w-9 h-9 rounded-xl shadow-lg shadow-pink-500/25 flex-shrink-0" />
          <div>
            <h1 className="text-[17px] font-extrabold text-gray-900 leading-tight tracking-tight">DocePreço</h1>
            <p className="text-gray-400 text-xs">Escolha uma loja para pedir</p>
          </div>
        </div>

        {/* Localização detectada */}
        {(cityFilter || locating) && (
          <div className="flex items-center justify-between gap-2 bg-white rounded-full px-3.5 py-2 mb-4 shadow-sm">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 min-w-0">
              <svg className="w-3.5 h-3.5 text-[#EA4B92] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="truncate">
                {locating ? 'Buscando sua localização...' : `Lojas perto de ${cityFilter}`}
              </span>
            </div>
            {cityFilter && (
              <button onClick={clearCityFilter} className="text-xs font-semibold text-gray-400 flex-shrink-0">
                Ver todas
              </button>
            )}
          </div>
        )}

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
            {cityFilter && (
              <button onClick={clearCityFilter} className="text-xs font-semibold text-[#EA4B92]">
                Ver lojas de outras cidades
              </button>
            )}
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
