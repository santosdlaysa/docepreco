import { pool } from '../database/connection';
import { User, RegisterDTO, PremiumPlatform } from '../../domain/entities/User';
import bcrypt from 'bcryptjs';

export class PostgresUserRepository {
  async findByEmail(email: string): Promise<(User & { passwordHash: string }) | null> {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    if (result.rows.length === 0) return null;
    return this.mapRow(result.rows[0]);
  }

  async findById(id: string): Promise<User | null> {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    if (result.rows.length === 0) return null;
    return this.mapRow(result.rows[0]);
  }

  async create(data: RegisterDTO): Promise<User> {
    const passwordHash = await bcrypt.hash(data.password, 10);
    const result = await pool.query(
      `INSERT INTO users (company_name, email, password_hash) VALUES ($1, $2, $3) RETURNING *`,
      [data.companyName, data.email.toLowerCase(), passwordHash]
    );
    return this.mapRow(result.rows[0]);
  }

  async verifyPassword(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }

  async updatePremiumStatus(
    userId: string,
    isPremium: boolean,
    premiumUntil: Date | null,
    platform: PremiumPlatform | null
  ): Promise<User | null> {
    const result = await pool.query(
      `UPDATE users
         SET is_premium = $2, premium_until = $3, premium_platform = $4
         WHERE id = $1
         RETURNING *`,
      [userId, isPremium, premiumUntil, platform]
    );
    if (result.rows.length === 0) return null;
    return this.mapRow(result.rows[0]);
  }

  async countIngredients(userId: string): Promise<number> {
    const result = await pool.query(
      'SELECT COUNT(*)::int AS total FROM ingredients WHERE user_id = $1',
      [userId]
    );
    return result.rows[0].total;
  }

  async countRecipes(userId: string): Promise<number> {
    const result = await pool.query(
      'SELECT COUNT(*)::int AS total FROM recipes WHERE user_id = $1',
      [userId]
    );
    return result.rows[0].total;
  }

  async createPasswordResetCode(userId: string): Promise<string> {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    // Invalidate previous unused codes for this user
    await pool.query(
      `UPDATE password_reset_codes SET used = TRUE WHERE user_id = $1 AND used = FALSE`,
      [userId]
    );
    await pool.query(
      `INSERT INTO password_reset_codes (user_id, code, expires_at) VALUES ($1, $2, $3)`,
      [userId, code, expiresAt]
    );
    return code;
  }

  async verifyPasswordResetCode(email: string, code: string): Promise<{ valid: boolean; userId: string | null }> {
    const result = await pool.query(
      `SELECT prc.user_id FROM password_reset_codes prc
       JOIN users u ON u.id = prc.user_id
       WHERE u.email = $1 AND prc.code = $2 AND prc.used = FALSE AND prc.expires_at > NOW()
       ORDER BY prc.created_at DESC LIMIT 1`,
      [email.toLowerCase(), code]
    );
    if (result.rows.length === 0) return { valid: false, userId: null };
    return { valid: true, userId: result.rows[0].user_id };
  }

  async markResetCodeUsed(userId: string, code: string): Promise<void> {
    await pool.query(
      `UPDATE password_reset_codes SET used = TRUE WHERE user_id = $1 AND code = $2`,
      [userId, code]
    );
  }

  async updatePassword(userId: string, newPassword: string): Promise<void> {
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await pool.query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [passwordHash, userId]);
  }

  private mapRow(row: Record<string, unknown>): User & { passwordHash: string } {
    const premiumUntil = row.premium_until as Date | null;
    return {
      id: row.id as string,
      companyName: row.company_name as string,
      email: row.email as string,
      passwordHash: row.password_hash as string,
      createdAt: (row.created_at as Date).toISOString(),
      isPremium: Boolean(row.is_premium),
      premiumUntil: premiumUntil ? premiumUntil.toISOString() : null,
      premiumPlatform: (row.premium_platform as PremiumPlatform | null) ?? null,
    };
  }
}
