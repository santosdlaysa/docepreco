import { pool } from '../database/connection';

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  imageUrl: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
}

export class PostgresOnboardingRepository {
  async findAll(): Promise<OnboardingStep[]> {
    const result = await pool.query('SELECT * FROM onboarding_steps ORDER BY sort_order, created_at');
    return result.rows.map(this.mapRow);
  }

  async findActive(): Promise<OnboardingStep[]> {
    const result = await pool.query('SELECT * FROM onboarding_steps WHERE is_active = TRUE ORDER BY sort_order');
    return result.rows.map(this.mapRow);
  }

  async create(data: { title: string; description: string; imageUrl?: string | null; sortOrder: number; isActive: boolean }): Promise<OnboardingStep> {
    const result = await pool.query(
      `INSERT INTO onboarding_steps (title, description, image_url, sort_order, is_active) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [data.title, data.description, data.imageUrl ?? null, data.sortOrder, data.isActive]
    );
    return this.mapRow(result.rows[0]);
  }

  async update(id: string, data: Partial<{ title: string; description: string; imageUrl: string | null; sortOrder: number; isActive: boolean }>): Promise<OnboardingStep | null> {
    const result = await pool.query(
      `UPDATE onboarding_steps SET
        title = COALESCE($2, title),
        description = COALESCE($3, description),
        image_url = COALESCE($4, image_url),
        sort_order = COALESCE($5, sort_order),
        is_active = COALESCE($6, is_active)
       WHERE id = $1 RETURNING *`,
      [id, data.title ?? null, data.description ?? null, data.imageUrl !== undefined ? data.imageUrl : null, data.sortOrder ?? null, data.isActive ?? null]
    );
    if (result.rows.length === 0) return null;
    return this.mapRow(result.rows[0]);
  }

  async delete(id: string): Promise<boolean> {
    const result = await pool.query('DELETE FROM onboarding_steps WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  private mapRow(row: Record<string, unknown>): OnboardingStep {
    return {
      id: row.id as string,
      title: row.title as string,
      description: (row.description as string) ?? '',
      imageUrl: (row.image_url as string) ?? null,
      sortOrder: row.sort_order as number,
      isActive: row.is_active as boolean,
      createdAt: (row.created_at as Date).toISOString(),
    };
  }
}
