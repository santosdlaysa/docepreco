import { pool } from '../database/connection';
import { geocodeStoreLocation } from './geocodingService';

const NOMINATIM_DELAY_MS = 1_200; // Nominatim exige no máx. 1 requisição/segundo

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Geocodifica lojas que têm cidade/endereço mas ainda não têm coordenadas
 * (lojas criadas antes da feature de distância, ou cujo geocode falhou).
 * Roda em background no boot; falhas individuais não interrompem o restante.
 */
export async function backfillStoreCoordinates(): Promise<void> {
  try {
    const result = await pool.query(
      `SELECT user_id, address, city FROM store_settings
       WHERE latitude IS NULL
         AND (NULLIF(TRIM(COALESCE(city, '')), '') IS NOT NULL
           OR NULLIF(TRIM(COALESCE(address, '')), '') IS NOT NULL)`
    );
    if (result.rows.length === 0) return;
    console.log(`[Geocode] Backfill: ${result.rows.length} loja(s) sem coordenadas`);

    for (const row of result.rows) {
      const coords = await geocodeStoreLocation(row.address, row.city);
      if (coords) {
        await pool.query(
          'UPDATE store_settings SET latitude = $1, longitude = $2 WHERE user_id = $3',
          [coords.latitude, coords.longitude, row.user_id]
        );
        console.log(`[Geocode] Backfill ok: user ${row.user_id} (${row.city ?? row.address})`);
      }
      await sleep(NOMINATIM_DELAY_MS);
    }
  } catch (error) {
    console.error('[Geocode] Backfill falhou:', (error as Error).message);
  }
}
