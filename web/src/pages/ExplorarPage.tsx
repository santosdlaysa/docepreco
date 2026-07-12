import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { fmt } from '../utils/format';
import { BottomNav } from '../components/BottomNav';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

interface ProductSearchResult {
  id: string;
  name: string;
  description: string | null;
  photoUrl: string | null;
  price: number;
  originalPrice?: number;
  storeName: string;
  storeSlug: string;
}

interface ExploreStore {
  storeName: string;
  slug: string;
  coverImageUrl: string | null;
  logoUrl: string | null;
  city: string | null;
  deliveryFee: number | null;
  acceptsDelivery: boolean;
}

const COLORS: Array<[string, string]> = [
  ['#FDDDE6', '#EA4B92'],
  ['#EDE9FE', '#7C3AED'],
  ['#FCE7F3', '#DB2777'],
  ['#FEF3C7', '#D97706'],
  ['#D1FAE5', '#059669'],
];

function ProductInitial({ name }: { name: string }) {
  const idx = name.charCodeAt(0) % COLORS.length;
  const [bg, fg] = COLORS[idx];
  return (
    <div
      className="w-full h-full flex items-center justify-center text-xl font-black"
      style={{ backgroundColor: bg, color: fg }}
    >
      {name[0]?.toUpperCase()}
    </div>
  );
}

export function ExplorarPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [products, setProducts] = useState<ProductSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [stores, setStores] = useState<ExploreStore[]>([]);
  const [storesLoading, setStoresLoading] = useState(true);

  // Lojas exibidas por padrão, antes de qualquer busca
  useEffect(() => {
    fetch(`${API_BASE}/public/stores?limit=30`)
      .then(r => r.json())
      .then(json => {
        if (json.success) setStores(json.data.stores);
      })
      .catch(() => setStores([]))
      .finally(() => setStoresLoading(false));
  }, []);

  // Debounce da busca
  useEffect(() => {
    const id = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(id);
  }, [search]);

  useEffect(() => {
    if (debouncedSearch.trim().length < 2) {
      setProducts([]);
      setSearched(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    setSearched(true);
    const params = new URLSearchParams({ q: debouncedSearch, limit: '30' });
    fetch(`${API_BASE}/public/products/search?${params.toString()}`)
      .then(r => r.json())
      .then(json => {
        if (json.success) setProducts(json.data.products);
        else setProducts([]);
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [debouncedSearch]);

  return (
    <div className="min-h-screen bg-[#F5F5F7]">
      <div className="max-w-lg mx-auto px-4 pt-8 pb-20">
        {/* Cabeçalho */}
        <h1 className="text-[22px] font-extrabold text-gray-900 leading-tight mb-1">Explorar</h1>
        <p className="text-gray-400 text-sm mb-5">Busque produtos em todas as lojas</p>

        {/* Busca */}
        <div className="relative mb-5">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" strokeWidth={2} />
          <input
            className="w-full bg-white border border-gray-200 rounded-full pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-[#EA4B92] focus:ring-2 focus:ring-[#EA4B92]/10 transition-all placeholder:text-gray-300"
            placeholder="Buscar produto..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Lojas em destaque — exibidas antes de qualquer busca */}
        {!searched && (
          <>
            {storesLoading && (
              <div className="flex flex-col items-center justify-center py-24 gap-3">
                <div className="w-10 h-10 border-[3px] border-[#EA4B92] border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-gray-400">Carregando lojas...</p>
              </div>
            )}

            {!storesLoading && stores.length === 0 && (
              <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
                <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center">
                  <Search className="w-7 h-7 text-gray-300" strokeWidth={1.5} />
                </div>
                <p className="text-gray-400 text-sm">Nenhuma loja disponível no momento</p>
              </div>
            )}

            {!storesLoading && stores.length > 0 && (
              <>
                <div className="flex items-center gap-2.5 mb-3">
                  <span className="w-1.5 h-5 rounded-full bg-gradient-to-b from-[#EA4B92] to-[#7C3AED]" />
                  <h2 className="text-[18px] font-black text-gray-900 tracking-tight leading-none">
                    Todas as lojas
                  </h2>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {stores.map(store => (
                    <Link
                      key={store.slug}
                      to={`/loja/${store.slug}`}
                      className="bg-white rounded-2xl shadow-sm overflow-hidden active:scale-[0.97] transition-transform"
                    >
                      <div className="h-24 w-full overflow-hidden">
                        {store.logoUrl || store.coverImageUrl ? (
                          <img
                            src={store.logoUrl ?? store.coverImageUrl!}
                            alt={store.storeName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <ProductInitial name={store.storeName} />
                        )}
                      </div>
                      <div className="p-3">
                        <p className="font-bold text-gray-900 text-[13px] leading-tight line-clamp-1">
                          {store.storeName}
                        </p>
                        {store.city && (
                          <p className="text-[11px] text-gray-400 mt-0.5 truncate">{store.city}</p>
                        )}
                        {store.acceptsDelivery && (
                          <p className={`text-[11px] font-bold mt-1 ${store.deliveryFee === 0 ? 'text-emerald-600' : 'text-[#EA4B92]'}`}>
                            {store.deliveryFee === 0
                              ? 'Entrega grátis'
                              : store.deliveryFee != null
                              ? `Entrega ${fmt(store.deliveryFee)}`
                              : 'Faz entrega'}
                          </p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {/* Loading */}
        {searched && loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="w-10 h-10 border-[3px] border-[#EA4B92] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-400">Buscando produtos...</p>
          </div>
        )}

        {/* Vazio */}
        {searched && !loading && products.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
            <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center">
              <Search className="w-7 h-7 text-gray-300" strokeWidth={1.5} />
            </div>
            <p className="text-gray-400 text-sm">Nenhum produto encontrado</p>
          </div>
        )}

        {/* Resultados em duas colunas */}
        {searched && !loading && products.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {products.map(product => (
              <Link
                key={product.id}
                to={`/loja/${product.storeSlug}`}
                className="bg-white rounded-2xl shadow-sm overflow-hidden active:scale-[0.97] transition-transform"
              >
                <div className="h-28 w-full overflow-hidden">
                  {product.photoUrl ? (
                    <img src={product.photoUrl} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <ProductInitial name={product.name} />
                  )}
                </div>
                <div className="p-3">
                  <p className="font-bold text-gray-900 text-[13px] leading-tight line-clamp-2 min-h-[32px]">
                    {product.name}
                  </p>
                  <p className="flex items-center gap-1.5 mt-1.5">
                    {product.originalPrice != null && (
                      <span className="text-[10px] text-gray-300 line-through">{fmt(product.originalPrice)}</span>
                    )}
                    <span className="text-[13px] font-extrabold text-[#EA4B92]">{fmt(product.price)}</span>
                  </p>
                  <p className="text-[11px] text-gray-400 mt-1 truncate">{product.storeName}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
