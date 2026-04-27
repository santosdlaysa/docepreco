import { pool } from '../database/connection';

export interface ChangelogEntry {
  id: string;
  version: string;
  title: string;
  description: string;
  features: string[];
  isActive: boolean;
  createdAt: string;
}

export class PostgresChangelogRepository {
  async findAll(): Promise<ChangelogEntry[]> {
    const result = await pool.query('SELECT * FROM changelog_entries ORDER BY created_at DESC');
    return result.rows.map(this.mapRow);
  }

  async findActive(): Promise<ChangelogEntry[]> {
    const result = await pool.query('SELECT * FROM changelog_entries WHERE is_active = TRUE ORDER BY created_at DESC');
    return result.rows.map(this.mapRow);
  }

  async create(data: { version: string; title: string; description: string; features: string[]; isActive: boolean }): Promise<ChangelogEntry> {
    const result = await pool.query(
      `INSERT INTO changelog_entries (version, title, description, features, is_active) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [data.version, data.title, data.description, data.features, data.isActive]
    );
    return this.mapRow(result.rows[0]);
  }

  async update(id: string, data: Partial<{ version: string; title: string; description: string; features: string[]; isActive: boolean }>): Promise<ChangelogEntry | null> {
    const result = await pool.query(
      `UPDATE changelog_entries SET
        version = COALESCE($2, version),
        title = COALESCE($3, title),
        description = COALESCE($4, description),
        features = COALESCE($5, features),
        is_active = COALESCE($6, is_active)
       WHERE id = $1 RETURNING *`,
      [id, data.version ?? null, data.title ?? null, data.description ?? null, data.features ?? null, data.isActive ?? null]
    );
    if (result.rows.length === 0) return null;
    return this.mapRow(result.rows[0]);
  }

  async delete(id: string): Promise<boolean> {
    const result = await pool.query('DELETE FROM changelog_entries WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  private mapRow(row: Record<string, unknown>): ChangelogEntry {
    return {
      id: row.id as string,
      version: row.version as string,
      title: row.title as string,
      description: (row.description as string) ?? '',
      features: (row.features as string[]) ?? [],
      isActive: row.is_active as boolean,
      createdAt: (row.created_at as Date).toISOString(),
    };
  }
}
