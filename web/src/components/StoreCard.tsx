import { Link } from 'react-router-dom';
import { MapPin, Bike, ShoppingBag } from 'lucide-react';
import { fmt, initials } from '../utils/format';

interface StoreCardProps {
  storeName: string;
  slug: string;
  description: string | null;
  coverImageUrl: string | null;
  acceptsDelivery: boolean;
  acceptsPickup: boolean;
  minOrderValue: number | null;
  deliveryFee?: number | null;
  city: string | null;
  distanceKm?: number | null;
}

function fmtDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(1).replace('.', ',')} km`;
  return `${Math.round(km)} km`;
}

const COLORS: Array<[string, string]> = [
  ['#FDDDE6', '#EA4B92'],
  ['#EDE9FE', '#7C3AED'],
  ['#FCE7F3', '#DB2777'],
  ['#FEF3C7', '#D97706'],
  ['#D1FAE5', '#059669'],
];

function StoreInitial({ name, large }: { name: string; large?: boolean }) {
  const idx = name.charCodeAt(0) % COLORS.length;
  const [bg, fg] = COLORS[idx];
  return (
    <div
      className={`w-full h-full flex items-center justify-center font-black ${large ? 'text-2xl' : 'text-base'}`}
      style={{ backgroundColor: bg, color: fg }}
    >
      {initials(name)}
    </div>
  );
}

export function StoreCard({
  storeName,
  slug,
  description,
  coverImageUrl,
  acceptsDelivery,
  acceptsPickup,
  minOrderValue,
  deliveryFee,
  city,
  distanceKm,
}: StoreCardProps) {
  const freeDelivery = acceptsDelivery && deliveryFee === 0;

  return (
    <Link
      to={`/loja/${slug}`}
      className="block bg-white rounded-3xl shadow-sm overflow-hidden active:scale-[0.98] transition-transform"
    >
      {/* Capa com chips sobrepostos */}
      <div className="relative h-32 w-full overflow-hidden">
        {coverImageUrl ? (
          <img src={coverImageUrl} alt={storeName} className="w-full h-full object-cover" />
        ) : (
          <StoreInitial name={storeName} large />
        )}
        {/* leve escurecimento para os chips lerem bem */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/15 to-transparent" />

        {distanceKm != null && (
          <span className="absolute top-3 left-3 flex items-center gap-1 bg-black/40 backdrop-blur-sm text-white text-[11px] font-bold px-2.5 py-1 rounded-full">
            <MapPin size={11} strokeWidth={2.5} />
            {fmtDistance(distanceKm)}
          </span>
        )}
        {freeDelivery && (
          <span className="absolute top-3 right-3 bg-emerald-500 text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-sm">
            Entrega grátis
          </span>
        )}
      </div>

      <div className="px-4 pb-4">
        {/* Avatar saltando da capa + nome */}
        <div className="flex items-start gap-3">
          <div className="w-14 h-14 rounded-2xl overflow-hidden ring-4 ring-white shadow-md -mt-6 flex-shrink-0 relative z-10 bg-white">
            <StoreInitial name={storeName} />
          </div>
          <div className="pt-2.5 flex-1 min-w-0">
            <p className="font-extrabold text-gray-900 text-[15px] leading-tight truncate">
              {storeName}
            </p>
            {city && (
              <p className="text-[11px] text-gray-400 font-medium mt-0.5 truncate">{city}</p>
            )}
          </div>
        </div>

        {description && (
          <p className="text-gray-400 text-[13px] mt-2 line-clamp-1 leading-relaxed">
            {description}
          </p>
        )}

        {/* Linha de infos */}
        <div className="flex items-center gap-2 mt-3 text-[12px] font-semibold text-gray-500 flex-wrap">
          {acceptsDelivery && (
            <span
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 ${
                freeDelivery ? 'text-emerald-600 bg-emerald-50' : 'text-gray-600 bg-gray-50'
              }`}
            >
              <Bike size={13} strokeWidth={2.4} />
              {freeDelivery ? 'Grátis' : deliveryFee != null ? fmt(deliveryFee) : 'Entrega'}
            </span>
          )}
          {acceptsPickup && (
            <span className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-gray-600 bg-gray-50">
              <ShoppingBag size={13} strokeWidth={2.4} />
              Retirada
            </span>
          )}
          {minOrderValue != null && (
            <span className="text-[11px] font-medium text-gray-400 ml-auto">
              Pedido mín. {fmt(minOrderValue)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
