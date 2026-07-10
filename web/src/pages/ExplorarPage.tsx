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
      className="w-full h-full flex items-center justify-center rounded-2xl text-xl font-black"
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

        {/* Prompt mínimo */}
        {!searched && (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
            <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center">
              <Search className="w-7 h-7 text-gray-300" strokeWidth={1.5} />
            </div>
            <p className="text-gray-400 text-sm">Digite ao menos 2 letras para buscar</p>
          </div>
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

        {/* Resultados */}
        {searched && !loading && products.length > 0 && (
          <div className="flex flex-col gap-3">
            {products.map(product => (
              <Link
                key={product.id}
                to={`/loja/${product.storeSlug}`}
                className="bg-white rounded-2xl p-4 flex items-center gap-4 shadow-sm active:scale-[0.98] transition-transform"
              >
                <div className="w-[64px] h-[64px] rounded-2xl overflow-hidden flex-shrink-0 shadow-sm">
                  {product.photoUrl ? (
                    <img src={product.photoUrl} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <ProductInitial name={product.name} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="flex items-center gap-1.5 mb-0.5">
                    {product.originalPrice != null && (
                      <span className="text-[11px] text-gray-400 line-through">{fmt(product.originalPrice)}</span>
                    )}
                    <span className="text-xs font-semibold text-[#EA4B92]">{fmt(product.price)}</span>
                  </p>
                  <p className="font-bold text-gray-900 text-[15px] leading-tight line-clamp-2">{product.name}</p>
                  <p className="text-[12px] text-gray-400 mt-0.5 truncate">{product.storeName}</p>
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
