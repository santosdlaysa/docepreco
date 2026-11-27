import { PostgresSaleRepository } from './PostgresSaleRepository';

const saleRow = (sale_date: unknown) => ({
  id: 'sale-1',
  recipe_id: null,
  recipe_name: 'Brownie',
  quantity_sold: 2,
  sale_price: '8.00',
  total_revenue: '16.00',
  discount: '0.00',
  sale_date,
  client_name: null,
  notes: null,
  payment_method: 'pix',
  order_id: null,
  created_at: new Date('2026-11-27T12:00:00Z'),
});

function repositoryReturning(sale_date: unknown) {
  const db = {
    query: jest.fn().mockResolvedValue({ rows: [saleRow(sale_date)] }),
  };
  return new PostgresSaleRepository(db as never);
}

describe('PostgresSaleRepository sale date mapping', () => {
  it('preserves PostgreSQL DATE strings as calendar dates', async () => {
    const sales = await repositoryReturning('2026-11-27').findAll('user-1');

    expect(sales[0].saleDate).toBe('2026-11-27');
  });

  it('maps Date values consistently in UTC', async () => {
    const sales = await repositoryReturning(new Date('2026-11-27T00:00:00.000Z')).findAll('user-1');

    expect(sales[0].saleDate).toBe('2026-11-27');
  });

  it('rejects invalid database date values', async () => {
    await expect(repositoryReturning(null).findAll('user-1'))
      .rejects.toThrow('Data da venda inválida retornada pelo banco.');
  });
});
