import { pool } from '../database/connection';

export interface Banner {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'promo' | 'update';
  actionUrl: string | null;
  startsAt: string;
  endsAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  /** 'notification' = aviso no meio da Home; 'carousel' = anúncio patrocinado; 'plan' = banner institucional do carrossel. */
  placement: 'notification' | 'carousel' | 'plan';
  /** Público-alvo dos banners 'plan': 'all' | 'non_master' | 'master'. */
  audience: 'all' | 'non_master' | 'master';
  /** Texto pequeno acima do título (banners 'plan'). */
  eyebrow: string | null;
  /** Rótulo do botão (banners 'plan'). */
  ctaLabel: string | null;
  /** Arte do banner de carrossel (data URI base64). */
  imageUrl: string | null;
  /** Confeitaria anunciante (dono do banner de carrossel). */
  companyId: string | null;
  /** Ordem no carrossel (maior aparece primeiro). */
  priority: number;
  /** Até quando o anúncio está pago/ativo. */
  paidUntil: string | null;
  /** Duração contratada em dias — usada para calcular paidUntil ao confirmar o pagamento. */
  durationDays: number;
}

export class PostgresBannerRepository {
  async findAll(): Promise<Banner[]> {
    const result = await pool.query(
      'SELECT * FROM banners ORDER BY created_at DESC'
    );
    return result.rows.map(this.mapRow);
  }

  async findActive(): Promise<Banner[]> {
    const result = await pool.query(
      `SELECT * FROM banners
       WHERE is_active = TRUE
         AND placement = 'notification'
         AND starts_at <= NOW()
         AND (ends_at IS NULL OR ends_at >= NOW())
       ORDER BY created_at DESC`
    );
    return result.rows.map(this.mapRow);
  }

  /** Banners de carrossel patrocinados que estão ativos E com pagamento em dia. */
  async findActiveCarousel(): Promise<Banner[]> {
    const result = await pool.query(
      `SELECT * FROM banners
       WHERE is_active = TRUE
         AND placement = 'carousel'
         AND paid_until IS NOT NULL
         AND paid_until >= NOW()
       ORDER BY priority DESC, created_at DESC`
    );
    return result.rows.map(this.mapRow);
  }

  /** Banners institucionais do carrossel (placement='plan') ativos, para o mobile. */
  async findActivePlan(): Promise<Banner[]> {
    const result = await pool.query(
      `SELECT * FROM banners
       WHERE is_active = TRUE
         AND placement = 'plan'
         AND starts_at <= NOW()
         AND (ends_at IS NULL OR ends_at >= NOW())
       ORDER BY priority DESC, created_at ASC`
    );
    return result.rows.map(this.mapRow);
  }

  async findById(id: string): Promise<Banner | null> {
    const result = await pool.query('SELECT * FROM banners WHERE id = $1', [id]);
    if (result.rows.length === 0) return null;
    return this.mapRow(result.rows[0]);
  }

  async create(data: {
    title: string;
    message: string;
    type: string;
    actionUrl?: string;
    startsAt?: string;
    endsAt?: string;
    placement?: string;
    audience?: string;
    eyebrow?: string | null;
    ctaLabel?: string | null;
  }): Promise<Banner> {
    const result = await pool.query(
      `INSERT INTO banners (title, message, type, action_url, starts_at, ends_at, placement, audience, eyebrow, cta_label)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        data.title,
        data.message,
        data.type,
        data.actionUrl ?? null,
        data.startsAt ?? new Date().toISOString(),
        data.endsAt ?? null,
        data.placement ?? 'notification',
        data.audience ?? 'all',
        data.eyebrow ?? null,
        data.ctaLabel ?? null,
      ]
    );
    return this.mapRow(result.rows[0]);
  }

  /** Cria um banner de carrossel patrocinado (inativo até o PIX confirmar). */
  async createSponsored(data: {
    title: string;
    message: string;
    actionUrl?: string | null;
    imageUrl: string;
    companyId: string;
    durationDays: number;
    priority?: number;
  }): Promise<Banner> {
    const result = await pool.query(
      `INSERT INTO banners
         (title, message, type, placement, action_url, image_url, company_id, duration_days, priority, is_active)
       VALUES ($1, $2, 'promo', 'carousel', $3, $4, $5, $6, $7, FALSE)
       RETURNING *`,
      [
        data.title,
        data.message,
        data.actionUrl ?? null,
        data.imageUrl,
        data.companyId,
        data.durationDays,
        data.priority ?? 0,
      ]
    );
    return this.mapRow(result.rows[0]);
  }

  /** Ativa o anúncio após o pagamento confirmado: liga is_active e estende paid_until. */
  async activateSponsored(id: string, durationDays: number): Promise<Banner | null> {
    const result = await pool.query(
      `UPDATE banners SET
         is_active = TRUE,
         paid_until = GREATEST(COALESCE(paid_until, NOW()), NOW()) + ($2 || ' days')::interval,
         updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, String(durationDays)]
    );
    if (result.rows.length === 0) return null;
    return this.mapRow(result.rows[0]);
  }

  async update(
    id: string,
    data: {
      title?: string;
      message?: string;
      type?: string;
      actionUrl?: string | null;
      startsAt?: string;
      endsAt?: string | null;
      isActive?: boolean;
      audience?: string;
      eyebrow?: string | null;
      ctaLabel?: string | null;
    }
  ): Promise<Banner | null> {
    const result = await pool.query(
      `UPDATE banners SET
        title = COALESCE($2, title),
        message = COALESCE($3, message),
        type = COALESCE($4, type),
        action_url = COALESCE($5, action_url),
        starts_at = COALESCE($6, starts_at),
        ends_at = COALESCE($7, ends_at),
        is_active = COALESCE($8, is_active),
        audience = COALESCE($9, audience),
        eyebrow = COALESCE($10, eyebrow),
        cta_label = COALESCE($11, cta_label),
        updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [
        id,
        data.title ?? null,
        data.message ?? null,
        data.type ?? null,
        data.actionUrl !== undefined ? data.actionUrl : null,
        data.startsAt ?? null,
        data.endsAt !== undefined ? data.endsAt : null,
        data.isActive ?? null,
        data.audience ?? null,
        data.eyebrow !== undefined ? data.eyebrow : null,
        data.ctaLabel !== undefined ? data.ctaLabel : null,
      ]
    );
    if (result.rows.length === 0) return null;
    return this.mapRow(result.rows[0]);
  }

  async delete(id: string): Promise<boolean> {
    const result = await pool.query('DELETE FROM banners WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  private mapRow(row: Record<string, unknown>): Banner {
    return {
      id: row.id as string,
      title: row.title as string,
      message: row.message as string,
      type: row.type as Banner['type'],
      actionUrl: (row.action_url as string) ?? null,
      startsAt: (row.starts_at as Date).toISOString(),
      endsAt: row.ends_at ? (row.ends_at as Date).toISOString() : null,
      isActive: row.is_active as boolean,
      createdAt: (row.created_at as Date).toISOString(),
      updatedAt: (row.updated_at as Date).toISOString(),
      placement: ((row.placement as string) ?? 'notification') as Banner['placement'],
      audience: ((row.audience as string) ?? 'all') as Banner['audience'],
      eyebrow: (row.eyebrow as string) ?? null,
      ctaLabel: (row.cta_label as string) ?? null,
      imageUrl: (row.image_url as string) ?? null,
      companyId: (row.company_id as string) ?? null,
      priority: (row.priority as number) ?? 0,
      paidUntil: row.paid_until ? (row.paid_until as Date).toISOString() : null,
      durationDays: (row.duration_days as number) ?? 0,
    };
  }
}
