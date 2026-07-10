const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'DocePreco/1.0 (https://docepreco.site)';

export interface GeoCoordinates {
  latitude: number;
  longitude: number;
}

async function searchNominatim(query: string): Promise<GeoCoordinates | null> {
  const url = `${NOMINATIM_URL}?format=jsonv2&limit=1&countrycodes=br&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    signal: AbortSignal.timeout(8_000),
  });
  if (!res.ok) return null;
  const results = (await res.json()) as Array<{ lat: string; lon: string }>;
  if (!Array.isArray(results) || results.length === 0) return null;
  const latitude = Number(results[0].lat);
  const longitude = Number(results[0].lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return { latitude, longitude };
}

/**
 * Geocodifica o endereço da loja. Tenta endereço completo e, se não achar,
 * cai para apenas a cidade (precisão de centro da cidade já ordena bem).
 * Retorna null em qualquer falha — o chamador decide se mantém as coordenadas antigas.
 */
export async function geocodeStoreLocation(
  address: string | null | undefined,
  city: string | null | undefined
): Promise<GeoCoordinates | null> {
  const trimmedAddress = address?.trim() || null;
  const trimmedCity = city?.trim() || null;
  if (!trimmedAddress && !trimmedCity) return null;

  try {
    if (trimmedAddress) {
      const full = await searchNominatim([trimmedAddress, trimmedCity, 'Brasil'].filter(Boolean).join(', '));
      if (full) return full;
    }
    if (trimmedCity) {
      return await searchNominatim(`${trimmedCity}, Brasil`);
    }
    return null;
  } catch {
    return null;
  }
}
