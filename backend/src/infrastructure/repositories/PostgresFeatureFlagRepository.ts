import { pool } from '../database/connection';

export interface FeatureFlag {
  id: string;
  key: string;
  description: string;
  isEnabled: boolean;
  createdAt: string;
}

export class PostgresFeatureFlagRepository {
  async findAll(): Promise<FeatureFlag[]> {
    const result = await pool.query('SELECT * FROM feature_flags ORDER BY key');
    return result.rows.map(this.mapRow);
  }

  async findActive(): Promise<FeatureFlag[]> {
    const result = await pool.query('SELECT * FROM feature_flags WHERE is_enabled = TRUE ORDER BY key');
    return result.rows.map(this.mapRow);
  }

  async isEnabled(key: string): Promise<boolean> {
    const result = await pool.query('SELECT is_enabled FROM feature_flags WHERE key = $1', [key]);
    if (result.rows.length === 0) return true;
    return result.rows[0].is_enabled as boolean;
  }

  async create(data: { key: string; description: string; isEnabled: boolean }): Promise<FeatureFlag> {
    const result = await pool.query(
      `INSERT INTO feature_flags (key, description, is_enabled) VALUES ($1, $2, $3) RETURNING *`,
      [data.key, data.description, data.isEnabled]
    );
    return this.mapRow(result.rows[0]);
  }

  async update(id: string, data: Partial<{ key: string; description: string; isEnabled: boolean }>): Promise<FeatureFlag | null> {
    const result = await pool.query(
      `UPDATE feature_flags SET
        key = COALESCE($2, key),
        description = COALESCE($3, description),
        is_enabled = COALESCE($4, is_enabled)
       WHERE id = $1 RETURNING *`,
      [id, data.key ?? null, data.description ?? null, data.isEnabled ?? null]
    );
    if (result.rows.length === 0) return null;
    return this.mapRow(result.rows[0]);
  }

  async delete(id: string): Promise<boolean> {
    const result = await pool.query('DELETE FROM feature_flags WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  private mapRow(row: Record<string, unknown>): FeatureFlag {
    return {
      id: row.id as string,
      key: row.key as string,
      description: (row.description as string) ?? '',
      isEnabled: row.is_enabled as boolean,
      createdAt: (row.created_at as Date).toISOString(),
    };
  }
}
