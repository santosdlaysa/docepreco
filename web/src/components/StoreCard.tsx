import { Link } from 'react-router-dom';
import { MapPin, Bike, ShoppingBag } from 'lucide-react';
import { fmt, initials } from '../utils/format';

interface StoreCardProps {
  storeName: string;
  slug: string;
  description: string | null;
  /** Logo/foto de perfil da loja — usada como miniatura na lista. */
  logoUrl?: string | null;
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

function StoreInitial({ name }: { name: string }) {
  const idx = name.charCodeAt(0) % COLORS.length;
  const [bg, fg] = COLORS[idx];
  return (
    <div
      className="w-full h-full flex items-center justify-center text-lg font-black"
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
  logoUrl,
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
      className="block bg-white rounded-2xl shadow-sm p-3.5 active:scale-[0.98] transition-transform"
    >
      <div className="flex items-center gap-3.5">
        {/* Logo da loja (foto de perfil da empresa) */}
        <div className="w-[68px] h-[68px] rounded-2xl overflow-hidden flex-shrink-0 shadow-sm">
          {logoUrl ? (
            <img src={logoUrl} alt={storeName} className="w-full h-full object-cover" />
          ) : (
            <StoreInitial name={storeName} />
          )}
        </div>

        {/* Infos */}
        <div className="flex-1 min-w-0">
          <p className="font-extrabold text-gray-900 text-[15px] leading-tight truncate">
            {storeName}
          </p>
          <p className="flex items-center gap-1.5 text-[11px] text-gray-400 font-medium mt-0.5 truncate">
            {distanceKm != null && (
              <span className="flex items-center gap-0.5 text-sky-600 font-bold flex-shrink-0">
                <MapPin size={11} strokeWidth={2.5} />
                {fmtDistance(distanceKm)}
              </span>
            )}
            {distanceKm != null && city && <span className="text-gray-300">•</span>}
            {city && <span className="truncate">{city}</span>}
          </p>
          {description && (
            <p className="text-gray-400 text-[12px] mt-1 line-clamp-1 leading-relaxed">
              {description}
            </p>
          )}

          {/* Linha de entrega/retirada */}
          <div className="flex items-center gap-2.5 mt-1.5 text-[11px] font-bold flex-wrap">
            {acceptsDelivery && (
              <span className={`flex items-center gap-1 ${freeDelivery ? 'text-emerald-600' : 'text-[#EA4B92]'}`}>
                <Bike size={12} strokeWidth={2.4} />
                {freeDelivery ? 'Grátis' : deliveryFee != null ? fmt(deliveryFee) : 'Entrega'}
              </span>
            )}
            {acceptsPickup && (
              <span className="flex items-center gap-1 text-[#7C3AED]">
                <ShoppingBag size={12} strokeWidth={2.4} />
                Retirada
              </span>
            )}
            {minOrderValue != null && (
              <span className="font-medium text-gray-400">Mín. {fmt(minOrderValue)}</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
