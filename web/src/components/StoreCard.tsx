import { Link } from 'react-router-dom';
import { fmt, initials } from '../utils/format';

interface StoreCardProps {
  storeName: string;
  slug: string;
  description: string | null;
  coverImageUrl: string | null;
  acceptsDelivery: boolean;
  acceptsPickup: boolean;
  minOrderValue: number | null;
  city: string | null;
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
      className="w-full h-full flex items-center justify-center text-2xl font-black"
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
  city,
}: StoreCardProps) {
  return (
    <Link
      to={`/loja/${slug}`}
      className="block bg-white rounded-2xl shadow-sm overflow-hidden active:scale-[0.98] transition-transform"
    >
      <div className="h-28 w-full bg-gradient-to-br from-[#EA4B92] to-[#7C3AED] rounded-t-2xl overflow-hidden">
        {coverImageUrl ? (
          <img src={coverImageUrl} alt={storeName} className="w-full h-full object-cover" />
        ) : (
          <StoreInitial name={storeName} />
        )}
      </div>
      <div className="p-4">
        <p className="font-bold text-gray-900 text-[15px] leading-tight">{storeName}</p>
        {description && (
          <p className="text-gray-400 text-sm mt-1 line-clamp-2">{description}</p>
        )}
        <div className="flex flex-wrap items-center gap-1.5 mt-3">
          {acceptsDelivery && (
            <span className="text-[11px] font-semibold text-[#EA4B92] bg-rose-50 rounded-full px-2.5 py-1">
              Entrega
            </span>
          )}
          {acceptsPickup && (
            <span className="text-[11px] font-semibold text-[#7C3AED] bg-[#EDE9FE] rounded-full px-2.5 py-1">
              Retirada
            </span>
          )}
          {city && (
            <span className="text-[11px] font-semibold text-gray-500 bg-gray-100 rounded-full px-2.5 py-1">
              {city}
            </span>
          )}
          {minOrderValue != null && (
            <span className="text-[11px] font-semibold text-gray-500 bg-gray-100 rounded-full px-2.5 py-1">
              Mín. {fmt(minOrderValue)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
