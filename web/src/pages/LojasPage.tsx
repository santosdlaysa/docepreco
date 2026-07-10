import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { SlidersHorizontal } from 'lucide-react';
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
  distanceKm: number | null;
}

interface FeaturedProduct {
  id: string;
  name: string;
  photoUrl: string | null;
  price: number;
  originalPrice?: number;
  storeName: string;
  storeSlug: string;
}

type SortOption = 'distance' | 'fee_asc';

const fmtPrice = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function LojasPage() {
  const [stores, setStores] = useState<StoreListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [cityFilter, setCityFilter] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [sortBy, setSortBy] = useState<SortOption | null>(null);
  const [freeOnly, setFreeOnly] = useState(false);
  const [locating, setLocating] = useState(false);
  const [geoFailed, setGeoFailed] = useState(false);
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [featured, setFeatured] = useState<FeaturedProduct[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Título da aba na vitrine pública
  useEffect(() => {
    const prev = document.title;
    document.title = 'DocePedidos - Peça doces das melhores lojas';
    return () => { document.title = prev; };
  }, []);

  // Debounce da busca
  useEffect(() => {
    const id = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(id);
  }, [search]);

  // Reseta a página ao trocar de categoria, cidade, ordenação ou filtro de taxa
  useEffect(() => {
    setPage(1);
  }, [selectedCategory, cityFilter, sortBy, freeOnly]);

  // Detecta a localização do cliente e filtra pela cidade dele. Sem cidade
  // detectada a página não mostra loja nenhuma (só lojas da região da pessoa).
  const detectLocation = () => {
    if (!navigator.geolocation) {
      setGeoFailed(true);
      return;
    }
    setGeoFailed(false);
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setCoords({ lat, lng });
        try {
          const r = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`
          );
          const j = await r.json();
          const city: string | undefined =
            j.address?.city || j.address?.town || j.address?.village || j.address?.municipality;
          if (city) {
            setCityFilter(city);
            localStorage.setItem(CITY_CACHE_KEY, JSON.stringify({ city, lat, lng, ts: Date.now() }));
          } else {
            setGeoFailed(true);
          }
        } catch {
          setGeoFailed(true);
        }
        setLocating(false);
      },
      () => {
        setLocating(false);
        setGeoFailed(true);
      },
      { timeout: 8000, maximumAge: 600000 }
    );
  };

  useEffect(() => {
    try {
      const cached = localStorage.getItem(CITY_CACHE_KEY);
      if (cached) {
        const { city, lat, lng, ts } = JSON.parse(cached);
        if (city && Date.now() - ts < CITY_CACHE_TTL) {
          setCityFilter(city);
          if (Number.isFinite(lat) && Number.isFinite(lng)) setCoords({ lat, lng });
          return;
        }
      }
    } catch {}
    detectLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Sem cidade detectada não lista nada — lojas de outras regiões não devem aparecer.
    if (!cityFilter) {
      setStores([]);
      setTotal(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    const params = new URLSearchParams({
      search: debouncedSearch,
      category: selectedCategory ?? '',
      city: cityFilter,
      page: String(page),
      limit: '20',
    });
    if (sortBy) params.set('sort', sortBy);
    if (freeOnly) params.set('freeDelivery', 'true');
    if (coords) {
      params.set('lat', String(coords.lat));
      params.set('lng', String(coords.lng));
    }
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
  }, [debouncedSearch, selectedCategory, cityFilter, sortBy, freeOnly, coords, page]);

  // Itens das lojas da região — vitrine horizontal acima da lista de lojas
  useEffect(() => {
    if (!cityFilter) {
      setFeatured([]);
      return;
    }
    fetch(`${API_BASE}/public/products/featured?city=${encodeURIComponent(cityFilter)}&limit=12`)
      .then(r => r.json())
      .then(json => {
        if (json.success) setFeatured(json.data.products);
      })
      .catch(() => setFeatured([]));
  }, [cityFilter]);

  const handleToggleCategory = (key: string) => {
    setSelectedCategory(prev => (prev === key ? null : key));
  };

  // Re-detecta a localização (ex.: cidade detectada errada ou usuário viajou).
  const refreshLocation = () => {
    try { localStorage.removeItem(CITY_CACHE_KEY); } catch {}
    setCityFilter(null);
    detectLocation();
  };

  // Ordenar por distância precisa das coordenadas do cliente — pede permissão se ainda não tiver.
  const handleSortDistance = () => {
    if (sortBy === 'distance') {
      setSortBy(null);
      return;
    }
    if (coords) {
      setSortBy('distance');
      return;
    }
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCoords(c);
        try {
          const cached = JSON.parse(localStorage.getItem(CITY_CACHE_KEY) ?? 'null');
          localStorage.setItem(CITY_CACHE_KEY, JSON.stringify({ ...(cached ?? {}), ...c, ts: Date.now() }));
        } catch {}
        setSortBy('distance');
        setLocating(false);
      },
      () => setLocating(false),
      { timeout: 8000, maximumAge: 600000 }
    );
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7]">
      {/* Header fixo estilo marketplace */}
      <header className="sticky top-0 z-40 bg-white shadow-sm">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/pwa-192x192.png" alt="DocePedidos" className="w-9 h-9 rounded-lg flex-shrink-0" />
            <h1 className="text-lg font-extrabold tracking-tight leading-none">
              <span className="text-[#EA4B92]">Doce</span>
              <span className="text-[#2BA3C2]">Pedidos</span>
            </h1>
          </div>
          <Link
            to="/perfil"
            className="bg-[#EA4B92] text-white text-[13px] font-bold px-4 py-2 rounded-lg active:scale-95 transition-transform"
          >
            Perfil
          </Link>
        </div>
      </header>

      {/* Topo colorido com transição ondulada para o fundo cinza */}
      <div className="relative bg-[#EA4B92]">
        <div className="max-w-lg mx-auto px-4 pt-4">
        {/* Localização detectada */}
        {(cityFilter || locating) && (
          <div className="flex items-center justify-between gap-2 px-1 mb-4">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-white min-w-0">
              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="truncate">
                {locating ? 'Buscando sua localização...' : `Lojas perto de ${cityFilter}`}
              </span>
            </div>
            {cityFilter && (
              <button onClick={refreshLocation} className="text-xs font-semibold text-white/70 flex-shrink-0">
                Atualizar
              </button>
            )}
          </div>
        )}

        {/* Busca + ordenação */}
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
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
          <div className="relative flex-shrink-0">
            <button
              onClick={() => setSortMenuOpen(o => !o)}
              aria-label="Ordenar e filtrar"
              className={`relative w-11 h-11 rounded-full flex items-center justify-center shadow-sm transition-colors active:scale-95 ${
                sortBy || freeOnly ? 'bg-gray-900 text-white' : 'bg-white text-gray-500 border border-gray-200'
              }`}
            >
              <SlidersHorizontal size={20} strokeWidth={2.2} />
            </button>
            {sortMenuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setSortMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-2 z-20 w-52 bg-white rounded-2xl shadow-lg border border-gray-100 py-1.5 overflow-hidden">
                  {([
                    { key: 'distance', label: 'Mais próximas', active: sortBy === 'distance', onClick: handleSortDistance },
                    { key: 'free', label: 'Entrega grátis', active: freeOnly, onClick: () => setFreeOnly(f => !f) },
                    { key: 'fee_asc', label: 'Menor taxa', active: sortBy === 'fee_asc', onClick: () => setSortBy(s => (s === 'fee_asc' ? null : 'fee_asc')) },
                  ] as const).map(opt => (
                    <button
                      key={opt.key}
                      onClick={() => {
                        opt.onClick();
                        setSortMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-4 py-2.5 text-sm text-left transition-colors ${
                        opt.active ? 'font-bold text-[#EA4B92]' : 'font-medium text-gray-600'
                      }`}
                    >
                      <span>{opt.label}</span>
                      {opt.active && (
                        <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Categorias — bolinhas circulares com rótulo embaixo */}
        <div className="flex gap-4 overflow-x-auto scrollbar-hide -mx-4 px-4 pt-1 pb-2">
          {FOOD_CATEGORIES.map(cat => {
            const active = selectedCategory === cat.key;
            const Icon = cat.icon;
            return (
              <button
                key={cat.key}
                onClick={() => handleToggleCategory(cat.key)}
                className="flex-shrink-0 flex flex-col items-center gap-1.5 w-[60px] active:scale-95 transition-transform"
              >
                <span
                  className={`w-[54px] h-[54px] rounded-full flex items-center justify-center transition-all duration-200 ${
                    active
                      ? 'bg-white shadow-lg shadow-black/10 scale-105'
                      : 'bg-white/20 backdrop-blur-[2px]'
                  }`}
                >
                  <Icon
                    size={22}
                    strokeWidth={2.2}
                    className={active ? 'text-[#EA4B92]' : 'text-white'}
                  />
                </span>
                <span
                  className={`text-[11px] leading-tight truncate max-w-full transition-colors ${
                    active ? 'font-bold text-white' : 'font-semibold text-white/80'
                  }`}
                >
                  {cat.label}
                </span>
                <span
                  className={`w-1 h-1 rounded-full -mt-0.5 transition-opacity ${
                    active ? 'bg-white opacity-100' : 'opacity-0'
                  }`}
                />
              </button>
            );
          })}
        </div>
        </div>

        {/* Onda de transição para o fundo cinza */}
        <svg
          className="block w-full h-10 -mb-px"
          viewBox="0 0 1440 60"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d="M0,32 C180,58 360,6 540,14 C760,24 920,56 1120,48 C1270,42 1370,20 1440,26 L1440,60 L0,60 Z"
            fill="#F5F5F7"
          />
        </svg>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-1 pb-20">
        {/* Loading inicial (buscando localização ou lojas) */}
        {(locating || (loading && page === 1 && cityFilter)) && (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="w-10 h-10 border-[3px] border-[#EA4B92] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-400">
              {locating ? 'Buscando sua localização...' : 'Carregando lojas...'}
            </p>
          </div>
        )}

        {/* Sem localização — a página só lista lojas da cidade da pessoa */}
        {!locating && !cityFilter && (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
            <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center">
              <svg className="w-7 h-7 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <p className="text-gray-500 text-sm font-medium">
              Para ver as lojas da sua região,
              <br />
              precisamos da sua localização
            </p>
            {geoFailed && (
              <p className="text-xs text-gray-400 max-w-[260px]">
                Não conseguimos detectar sua cidade. Verifique se a permissão de
                localização está ativada no navegador.
              </p>
            )}
            <button
              onClick={detectLocation}
              className="mt-1 text-sm font-bold text-white bg-[#EA4B92] shadow-sm shadow-pink-500/25 rounded-full px-6 py-3 active:scale-95 transition-transform"
            >
              Usar minha localização
            </button>
          </div>
        )}

        {/* Vazio — nenhuma loja na cidade da pessoa */}
        {!loading && cityFilter && stores.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
            <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center">
              <svg className="w-7 h-7 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
              </svg>
            </div>
            <p className="text-gray-400 text-sm">
              Nenhuma loja encontrada em {cityFilter} faz parte do DocePedidos
            </p>
          </div>
        )}

        {/* Itens das lojas da região */}
        {!loading && featured.length > 0 && stores.length > 0 && (
          <div className="mb-6 mt-2">
            <div className="flex items-center gap-2.5 mb-3">
              <span className="w-1.5 h-5 rounded-full bg-gradient-to-b from-[#EA4B92] to-[#7C3AED]" />
              <h2 className="text-[18px] font-black text-gray-900 tracking-tight leading-none">
                Destaques
              </h2>
            </div>
            <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-1">
              {featured.map(p => (
                <Link
                  key={p.id}
                  to={`/loja/${p.storeSlug}`}
                  className="flex-shrink-0 w-[132px] bg-white rounded-2xl shadow-sm overflow-hidden active:scale-95 transition-transform"
                >
                  <div className="h-[88px] bg-gradient-to-br from-[#FDDDE6] to-[#EDE9FE]">
                    {p.photoUrl ? (
                      <img src={p.photoUrl} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl font-black text-[#EA4B92]">
                        {p.name[0]?.toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="p-2.5">
                    <p className="text-xs font-bold text-gray-800 leading-tight line-clamp-1">{p.name}</p>
                    <p className="flex items-center gap-1 mt-1">
                      {p.originalPrice != null && (
                        <span className="text-[10px] text-gray-300 line-through">{fmtPrice(p.originalPrice)}</span>
                      )}
                      <span className="text-xs font-extrabold text-[#EA4B92]">{fmtPrice(p.price)}</span>
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-1">{p.storeName}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Lista de lojas */}
        {stores.length > 0 && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2.5 mb-1">
              <span className="w-1.5 h-5 rounded-full bg-gradient-to-b from-[#EA4B92] to-[#7C3AED]" />
              <h2 className="text-[18px] font-black text-gray-900 tracking-tight leading-none">
                Nossos restaurantes
              </h2>
            </div>
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
                deliveryFee={store.deliveryFee}
                city={store.city}
                distanceKm={store.distanceKm}
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
