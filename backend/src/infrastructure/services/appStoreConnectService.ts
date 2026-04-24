import jwt from 'jsonwebtoken';
import { gunzipSync } from 'zlib';

const ASC_ISSUER_ID = process.env.ASC_ISSUER_ID;
const ASC_KEY_ID = process.env.ASC_KEY_ID;
const ASC_PRIVATE_KEY = process.env.ASC_PRIVATE_KEY; // .p8 contents (with \n)
const ASC_VENDOR_NUMBER = process.env.ASC_VENDOR_NUMBER;

function generateToken(): string {
  if (!ASC_ISSUER_ID || !ASC_KEY_ID || !ASC_PRIVATE_KEY) {
    throw new Error('App Store Connect credentials not configured');
  }

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: ASC_ISSUER_ID,
    iat: now,
    exp: now + 20 * 60, // 20 minutes
    aud: 'appstoreconnect-v1',
  };

  // Replace literal \n with actual newlines (env vars often escape them)
  const privateKey = ASC_PRIVATE_KEY.replace(/\\n/g, '\n');

  return jwt.sign(payload, privateKey, {
    algorithm: 'ES256',
    header: { alg: 'ES256', kid: ASC_KEY_ID, typ: 'JWT' },
  });
}

interface SalesReportRow {
  provider: string;
  providerCountry: string;
  sku: string;
  developer: string;
  title: string;
  version: string;
  productTypeIdentifier: string;
  units: number;
  developerProceeds: number;
  customerCurrency: string;
  countryCode: string;
  currencyOfProceeds: string;
  appleIdentifier: string;
  customerPrice: number;
  promoCode: string;
  parentIdentifier: string;
  subscription: string;
  period: string;
  category: string;
  cmb: string;
  device: string;
  supportedPlatforms: string;
  proceedsReason: string;
  preservedPricing: string;
  client: string;
  orderType: string;
}

function parseSalesReport(tsv: string): SalesReportRow[] {
  const lines = tsv.trim().split('\n');
  if (lines.length < 2) return [];

  return lines.slice(1).filter(l => l.trim()).map(line => {
    const cols = line.split('\t');
    return {
      provider: cols[0] || '',
      providerCountry: cols[1] || '',
      sku: cols[2] || '',
      developer: cols[3] || '',
      title: cols[4] || '',
      version: cols[5] || '',
      productTypeIdentifier: cols[6] || '',
      units: parseInt(cols[7] || '0', 10),
      developerProceeds: parseFloat(cols[8] || '0'),
      customerCurrency: cols[9] || '',
      countryCode: cols[10] || '',
      currencyOfProceeds: cols[11] || '',
      appleIdentifier: cols[12] || '',
      customerPrice: parseFloat(cols[13] || '0'),
      promoCode: cols[14] || '',
      parentIdentifier: cols[15] || '',
      subscription: cols[16] || '',
      period: cols[17] || '',
      category: cols[18] || '',
      cmb: cols[19] || '',
      device: cols[20] || '',
      supportedPlatforms: cols[21] || '',
      proceedsReason: cols[22] || '',
      preservedPricing: cols[23] || '',
      client: cols[24] || '',
      orderType: cols[25] || '',
    };
  });
}

// Product type identifiers that represent downloads (free + paid)
const DOWNLOAD_TYPES = new Set([
  '1',   // Free or paid app (iPhone)
  '1F',  // Free app (iPhone)
  '1T',  // Paid app (iPhone)
  '7',   // Free or paid app (iPad)
  '7F',  // Free app (iPad)
  '7T',  // Paid app (iPad)
  'F1',  // Free app (universal)
  'F7',  // Free app (iPad)
]);

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export interface DownloadStats {
  date: string;
  totalUnits: number;
  freeUnits: number;
  byCountry: Record<string, number>;
  byDevice: Record<string, number>;
}

export async function fetchSalesReport(reportDate: Date): Promise<DownloadStats | null> {
  if (!ASC_VENDOR_NUMBER) {
    throw new Error('ASC_VENDOR_NUMBER not configured');
  }

  const token = generateToken();
  const dateStr = formatDate(reportDate);

  const url = new URL('https://api.appstoreconnect.apple.com/v1/salesReports');
  url.searchParams.set('filter[frequency]', 'DAILY');
  url.searchParams.set('filter[reportDate]', dateStr);
  url.searchParams.set('filter[reportSubType]', 'SUMMARY');
  url.searchParams.set('filter[reportType]', 'SALES');
  url.searchParams.set('filter[vendorNumber]', ASC_VENDOR_NUMBER);

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/a-gzip',
    },
  });

  // 404 = no data for that date (e.g. today's report not ready yet)
  if (response.status === 404) return null;

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`App Store Connect API error ${response.status}: ${body}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const tsv = gunzipSync(buffer).toString('utf-8');
  const rows = parseSalesReport(tsv);

  // Filter only app downloads (not IAP, not updates)
  const downloadRows = rows.filter(r => DOWNLOAD_TYPES.has(r.productTypeIdentifier));

  const stats: DownloadStats = {
    date: dateStr,
    totalUnits: 0,
    freeUnits: 0,
    byCountry: {},
    byDevice: {},
  };

  for (const row of downloadRows) {
    stats.totalUnits += row.units;
    if (row.customerPrice === 0) {
      stats.freeUnits += row.units;
    }
    stats.byCountry[row.countryCode] = (stats.byCountry[row.countryCode] || 0) + row.units;
    if (row.device) {
      stats.byDevice[row.device] = (stats.byDevice[row.device] || 0) + row.units;
    }
  }

  return stats;
}

export async function fetchDownloadsLastDays(days: number): Promise<DownloadStats[]> {
  const results: DownloadStats[] = [];
  const now = new Date();

  // Reports are available with ~2 day delay
  for (let i = days + 1; i >= 2; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    try {
      const stats = await fetchSalesReport(date);
      if (stats) results.push(stats);
    } catch {
      // Skip days without data
    }
  }

  return results;
}
