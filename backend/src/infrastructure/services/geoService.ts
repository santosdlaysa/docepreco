import { pool } from '../database/connection';

/**
 * Geolocalização de IP para a área de Segurança (painel + alertas do Telegram).
 *
 * A geolocalização de um IP quase não muda, então o resultado é cacheado em dois
 * níveis para não bater na API a cada visualização nem estourar limite de
 * requisições:
 *   1. Memória (Map) — caminho rápido durante a vida do processo.
 *   2. Tabela `ip_geo` no Postgres — sobrevive a restart/deploy do Render; cada
 *      IP é consultado na API no máximo uma vez a cada CACHE_TTL_DAYS.
 *
 * Fonte: ip-api.com (grátis, sem chave, com endpoint batch e localização em
 * pt-BR). É HTTP puro no plano free — aceitável aqui porque só resolvemos a
 * origem de IPs suspeitos (dado público, não sensível). Qualquer falha é
 * silenciosa: geolocalização é enriquecimento, nunca pode quebrar a Segurança.
 */

export interface IpGeo {
  ip: string;
  countryCode: string | null; // 'BR'
  country: string | null;     // 'Brasil'
  region: string | null;      // 'Roraima'
  city: string | null;        // 'Boa Vista'
  isp: string | null;         // 'Allfiber Telecom'
  org: string | null;         // 'Roraima Energia SA'
}

const MEM = new Map<string, IpGeo>();
const CACHE_TTL_DAYS = 30;

/** IPs de rede privada/reservada não têm geolocalização pública. */
function isPrivateIp(ip: string): boolean {
  const v = ip.trim();
  if (!v) return true;
  if (v === '::1' || v === '::') return true;
  if (v.startsWith('127.') || v.startsWith('10.') || v.startsWith('192.168.') || v.startsWith('169.254.')) return true;
  if (v.startsWith('fc') || v.startsWith('fd')) return true; // IPv6 unique-local
  const m = v.match(/^172\.(\d+)\./);
  if (m) { const s = parseInt(m[1], 10); if (s >= 16 && s <= 31) return true; }
  return false;
}

function privateGeo(ip: string): IpGeo {
  return { ip, countryCode: null, country: null, region: null, city: null, isp: null, org: 'Rede privada' };
}

async function loadFromDb(ips: string[]): Promise<Map<string, IpGeo>> {
  const out = new Map<string, IpGeo>();
  if (ips.length === 0) return out;
  try {
    const { rows } = await pool.query(
      `SELECT ip, country_code AS "countryCode", country, region, city, isp, org
       FROM ip_geo
       WHERE ip = ANY($1) AND fetched_at >= NOW() - INTERVAL '${CACHE_TTL_DAYS} days'`,
      [ips]
    );
    for (const r of rows) out.set(r.ip, r as IpGeo);
  } catch {
    // tabela pode não existir ainda em ambiente antigo — ignora
  }
  return out;
}

async function saveToDb(geos: IpGeo[]): Promise<void> {
  for (const g of geos) {
    try {
      await pool.query(
        `INSERT INTO ip_geo (ip, country_code, country, region, city, isp, org, fetched_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
         ON CONFLICT (ip) DO UPDATE SET
           country_code = EXCLUDED.country_code, country = EXCLUDED.country,
           region = EXCLUDED.region, city = EXCLUDED.city,
           isp = EXCLUDED.isp, org = EXCLUDED.org, fetched_at = NOW()`,
        [g.ip, g.countryCode, g.country, g.region, g.city, g.isp, g.org]
      );
    } catch {
      // best-effort — não bloqueia o retorno
    }
  }
}

/** Consulta a API (batch, até 100 IPs por chamada) apenas os que faltam no cache. */
async function fetchFromApi(ips: string[]): Promise<Map<string, IpGeo>> {
  const out = new Map<string, IpGeo>();
  if (ips.length === 0) return out;
  try {
    const res = await fetch(
      'http://ip-api.com/batch?fields=status,country,countryCode,regionName,city,isp,org,query&lang=pt-BR',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ips.slice(0, 100)),
        signal: AbortSignal.timeout(8000),
      }
    );
    if (!res.ok) return out;
    const arr = (await res.json()) as Array<Record<string, string>>;
    for (const r of arr) {
      if (!r || !r.query || r.status !== 'success') continue;
      out.set(r.query, {
        ip: r.query,
        countryCode: r.countryCode ?? null,
        country: r.country ?? null,
        region: r.regionName ?? null,
        city: r.city ?? null,
        isp: r.isp ?? null,
        org: r.org || r.isp || null,
      });
    }
  } catch {
    // timeout / rede fora — segue sem geo
  }
  return out;
}

/**
 * Resolve a geolocalização de vários IPs de uma vez (memória → banco → API).
 * Retorna um Map ip→geo apenas com os que foram resolvidos.
 */
export async function geoLookupMany(rawIps: Array<string | null | undefined>): Promise<Map<string, IpGeo>> {
  const result = new Map<string, IpGeo>();
  const unique = [...new Set(rawIps.filter((x): x is string => !!x))];

  const toResolve: string[] = [];
  for (const ip of unique) {
    const cached = MEM.get(ip);
    if (cached) { result.set(ip, cached); continue; }
    if (isPrivateIp(ip)) { const g = privateGeo(ip); MEM.set(ip, g); result.set(ip, g); continue; }
    toResolve.push(ip);
  }

  if (toResolve.length) {
    const fromDb = await loadFromDb(toResolve);
    for (const [ip, g] of fromDb) { MEM.set(ip, g); result.set(ip, g); }

    const misses = toResolve.filter((ip) => !fromDb.has(ip));
    if (misses.length) {
      const fetched = await fetchFromApi(misses);
      const saved: IpGeo[] = [];
      for (const [ip, g] of fetched) { MEM.set(ip, g); result.set(ip, g); saved.push(g); }
      await saveToDb(saved);
    }
  }
  return result;
}

/** Conveniência para um único IP. */
export async function geoLookup(ip: string | null | undefined): Promise<IpGeo | null> {
  if (!ip) return null;
  const m = await geoLookupMany([ip]);
  return m.get(ip) ?? null;
}

/** Bandeira emoji a partir do código de país ISO-2 (ex.: 'BR' → 🇧🇷). */
export function flagEmoji(cc: string | null | undefined): string {
  if (!cc || cc.length !== 2) return '🌐';
  const base = 0x1f1e6;
  const up = cc.toUpperCase();
  return String.fromCodePoint(base + up.charCodeAt(0) - 65, base + up.charCodeAt(1) - 65);
}

/** Linha compacta "🇧🇷 Boa Vista/Roraima — Allfiber" para os alertas de texto. */
export function formatGeoLine(g: IpGeo | null | undefined): string {
  if (!g) return '';
  if (g.org === 'Rede privada' && !g.country) return '🏠 Rede privada';
  const place = [g.city, g.region].filter(Boolean).join('/') || g.country || 'origem desconhecida';
  const prov = g.isp || g.org;
  return `${flagEmoji(g.countryCode)} ${place}${prov ? ` — ${prov}` : ''}`;
}
