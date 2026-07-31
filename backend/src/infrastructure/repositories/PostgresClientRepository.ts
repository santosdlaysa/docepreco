import { pool } from '../database/connection';
import { Client, CreateClientDTO } from '../../domain/entities/Client';

function mapRow(row: any): Client {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    birthday: row.birthday,
    address: row.address,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class PostgresClientRepository {
  async findAll(userId: string): Promise<Client[]> {
    const res = await pool.query(
      `SELECT * FROM clients WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );
    return res.rows.map(mapRow);
  }

  async findById(id: string, userId: string): Promise<Client | null> {
    const res = await pool.query(
      `SELECT * FROM clients WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    return res.rows[0] ? mapRow(res.rows[0]) : null;
  }

  async create(data: CreateClientDTO, userId: string): Promise<Client> {
    const res = await pool.query(
      `INSERT INTO clients (user_id, name, phone, email, birthday, address, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [userId, data.name, data.phone ?? null, data.email ?? null,
       data.birthday ?? null, data.address ?? null, data.notes ?? null]
    );
    return mapRow(res.rows[0]);
  }

  async update(id: string, userId: string, data: Partial<CreateClientDTO>): Promise<Client | null> {
    const fields: string[] = [];
    const params: any[] = [];
    let i = 1;

    if (data.name !== undefined)     { fields.push(`name = $${i++}`);     params.push(data.name); }
    if (data.phone !== undefined)    { fields.push(`phone = $${i++}`);    params.push(data.phone); }
    if (data.email !== undefined)    { fields.push(`email = $${i++}`);    params.push(data.email); }
    if (data.birthday !== undefined) { fields.push(`birthday = $${i++}`); params.push(data.birthday); }
    if (data.address !== undefined)  { fields.push(`address = $${i++}`);  params.push(data.address); }
    if (data.notes !== undefined)    { fields.push(`notes = $${i++}`);    params.push(data.notes); }

    if (fields.length === 0) return this.findById(id, userId);

    fields.push(`updated_at = NOW()`);
    params.push(id, userId);

    const res = await pool.query(
      `UPDATE clients SET ${fields.join(', ')} WHERE id = $${i++} AND user_id = $${i} RETURNING *`,
      params
    );
    return res.rows[0] ? mapRow(res.rows[0]) : null;
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const res = await pool.query(
      `DELETE FROM clients WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    return (res.rowCount ?? 0) > 0;
  }
}
