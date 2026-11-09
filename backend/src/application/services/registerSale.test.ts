import { registerSale } from './registerSale';
import { pool } from '../../infrastructure/database/connection';
import { canCreateMore, getFreeSaleLimit } from '../../domain/services/premium';
import { PostgresSaleRepository } from '../../infrastructure/repositories/PostgresSaleRepository';

jest.mock('../../infrastructure/database/connection', () => ({ pool: { connect: jest.fn() } }));
jest.mock('../../domain/services/premium', () => ({ canCreateMore: jest.fn(), getFreeSaleLimit: jest.fn(), PREMIUM_ERROR_CODES: { sales: 'SALE_LIMIT' } }));
jest.mock('../../infrastructure/repositories/PostgresSaleRepository');
const client = { query: jest.fn(), release: jest.fn() };
const create = jest.fn(); const findById = jest.fn();
const input = { recipeId: 'owned', quantitySold: 10, salePrice: 8, saleDate: '09/11/2026', paymentMethod: 'pix' as const };
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(pool.connect).mockResolvedValue(client as never);
  jest.mocked(PostgresSaleRepository).mockImplementation(() => ({ create, findById } as never));
  jest.mocked(canCreateMore).mockReturnValue(true);
  jest.mocked(getFreeSaleLimit).mockResolvedValue(20);
  create.mockResolvedValue({ id: 'sale' });
  client.query.mockImplementation(async (sql: string) => ({ rows: sql.includes('SELECT * FROM users') ? [{ is_premium: false, premium_until: null }] : sql.includes('COUNT(*)') ? [{ count: 1 }] : [] }));
});
it('uses a transaction, serializes quota checks, normalizes dates and commits', async () => {
  await registerSale('owner', input);
  expect(client.query).toHaveBeenCalledWith('SELECT * FROM users WHERE id = $1 FOR UPDATE', ['owner']);
  expect(canCreateMore).toHaveBeenCalledWith({ isPremium: false, premiumUntil: null }, 'sales', 1, 20);
  expect(create).toHaveBeenCalledWith(expect.objectContaining({ saleDate: '2026-11-09' }), 'owner');
  expect(client.query).toHaveBeenLastCalledWith('COMMIT'); expect(client.release).toHaveBeenCalled();
});
it('rolls back on plan limit without inserting a sale', async () => {
  jest.mocked(canCreateMore).mockReturnValue(false);
  await expect(registerSale('owner', input)).rejects.toMatchObject({ code: 'SALE_LIMIT', status: 403 });
  expect(create).not.toHaveBeenCalled(); expect(client.query).toHaveBeenLastCalledWith('ROLLBACK');
});
it('uses the webhook transaction without committing it and records its unique ID', async () => {
  await registerSale('owner', input, client as never, 'wamid.confirm');
  expect(pool.connect).not.toHaveBeenCalled(); expect(client.query).not.toHaveBeenCalledWith('COMMIT');
  expect(client.query).toHaveBeenCalledWith('UPDATE sales SET whatsapp_message_id=$1 WHERE id=$2', ['wamid.confirm', 'sale']);
});
it('returns an existing message-linked sale without reinserting', async () => {
  const original = client.query.getMockImplementation()!;
  client.query.mockImplementation(async (...args) => args[0].includes('SELECT id FROM sales') ? { rows: [{ id: 'sale' }] } : original(...args));
  findById.mockResolvedValue({ id: 'sale' });
  await expect(registerSale('owner', input, client as never, 'wamid.confirm')).resolves.toEqual({ id: 'sale' });
  expect(create).not.toHaveBeenCalled();
});
it.each([{ quantitySold: 0 }, { quantitySold: -1 }, { quantitySold: 1.5 }, { salePrice: NaN }, { discount: -1 }, { discount: 1000 }, { saleDate: '31/02/2026' }])('rejects invalid sale fields %j', async patch => {
  await expect(registerSale('owner', { ...input, ...patch })).rejects.toThrow();
  expect(create).not.toHaveBeenCalled(); expect(client.query).toHaveBeenLastCalledWith('ROLLBACK');
});
