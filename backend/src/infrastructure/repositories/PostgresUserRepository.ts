import { pool } from '../database/connection';
import { User, RegisterDTO } from '../../domain/entities/User';
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

  private mapRow(row: Record<string, unknown>): User & { passwordHash: string } {
    return {
      id: row.id as string,
      companyName: row.company_name as string,
      email: row.email as string,
      passwordHash: row.password_hash as string,
      createdAt: (row.created_at as Date).toISOString(),
    };
  }
}
