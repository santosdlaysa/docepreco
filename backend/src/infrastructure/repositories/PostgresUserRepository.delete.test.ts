import { pool } from '../database/connection';
import { PostgresUserRepository } from './PostgresUserRepository';

jest.mock('../database/connection', () => ({ pool: { connect: jest.fn() } }));

describe('PostgresUserRepository.delete', () => {
  const query = jest.fn();
  const release = jest.fn();
  const userId = '36beb087-1ba2-491b-b62f-ccf860d2a75c';

  beforeEach(() => {
    jest.clearAllMocks();
    (pool.connect as jest.Mock).mockResolvedValue({ query, release });
    query.mockImplementation(async (sql: string) => sql === 'DELETE FROM users WHERE id = $1 RETURNING company_name'
      ? { rowCount: 1, rows: [{ company_name: 'Doces da Ana' }] }
      : { rowCount: 0 });
  });

  it('remove dependências e grava ID e nome no histórico após excluir a conta', async () => {
    const deleted = await new PostgresUserRepository().delete(userId);
    expect(deleted).toBe(true);
    const statements = query.mock.calls.map(([sql]) => String(sql));
    expect(statements.indexOf('DELETE FROM store_order_payments WHERE user_id = $1')).toBeLessThan(statements.indexOf('DELETE FROM users WHERE id = $1 RETURNING company_name'));
    expect(statements.indexOf('DELETE FROM store_payment_accounts WHERE user_id = $1')).toBeLessThan(statements.indexOf('DELETE FROM users WHERE id = $1 RETURNING company_name'));
    expect(statements.indexOf('DELETE FROM users WHERE id = $1 RETURNING company_name')).toBeLessThan(statements.indexOf('INSERT INTO deleted_users (user_id, company_name) VALUES ($1, $2)'));
    expect(query).toHaveBeenCalledWith('INSERT INTO deleted_users (user_id, company_name) VALUES ($1, $2)', [userId, 'Doces da Ana']);
    expect(statements[statements.length - 1]).toBe('COMMIT');
  });

  it('desfaz a exclusão se o histórico não puder ser gravado', async () => {
    query.mockImplementation(async (sql: string) => {
      if (sql === 'INSERT INTO deleted_users (user_id, company_name) VALUES ($1, $2)') throw new Error('audit failed');
      return sql === 'DELETE FROM users WHERE id = $1 RETURNING company_name'
        ? { rowCount: 1, rows: [{ company_name: 'Doces da Ana' }] }
        : { rowCount: 0 };
    });
    await expect(new PostgresUserRepository().delete(userId)).rejects.toThrow('audit failed');
    expect(query).toHaveBeenCalledWith('ROLLBACK');
    expect(query).not.toHaveBeenCalledWith('COMMIT');
  });

  it('confere a inatividade sob bloqueio antes da exclusão administrativa', async () => {
    query.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM users WHERE id = $1 FOR UPDATE')) {
        return { rowCount: 1, rows: [{ inactive: false, activeSubscription: false }] };
      }
      return { rowCount: 0 };
    });
    const deleted = await new PostgresUserRepository().delete(userId, true);
    expect(deleted).toBe(false);
    expect(query).not.toHaveBeenCalledWith('DELETE FROM users WHERE id = $1 RETURNING company_name', [userId]);
    expect(query).toHaveBeenCalledWith('ROLLBACK');
  });
});
