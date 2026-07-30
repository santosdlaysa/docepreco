import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';

const mockQuery = jest.fn();

jest.mock('../infrastructure/database/connection', () => ({
  pool: { query: (...args: unknown[]) => mockQuery(...args) },
}));

import orderRoutes from '../presentation/routes/orderRoutes';
import { authMiddleware } from '../presentation/middleware/authMiddleware';

const JWT_SECRET = 'orders-e2e-secret';
const USER_ID = '11111111-1111-1111-1111-111111111111';
const OTHER_USER_ID = '22222222-2222-2222-2222-222222222222';
const ORDER_ID = '33333333-3333-3333-3333-333333333333';

const token = jwt.sign({ userId: USER_ID }, JWT_SECRET, { expiresIn: '1h' });

const orderRow = {
  id: ORDER_ID,
  user_id: USER_ID,
  client_name: 'Maria',
  client_phone: null,
  recipe_id: null,
  recipe_name: 'Bolo',
  quantity: '1',
  unit_price: '100.00',
  total_price: '100.00',
  delivery_date: '2026-06-20',
  delivery_time: null,
  status: 'pending',
  paid: false,
  paid_amount: '0.00',
  payments: [],
  items: [],
  notes: null,
  created_at: new Date('2026-06-15T12:00:00.000Z'),
};

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/orders', authMiddleware, orderRoutes);
  return app;
}

function authorized(method: 'get' | 'post' | 'put' | 'delete', path: string) {
  return request(createApp())[method](path).set('Authorization', `Bearer ${token}`);
}

beforeAll(() => {
  process.env.JWT_SECRET = JWT_SECRET;
});

beforeEach(() => {
  mockQuery.mockReset();
  mockQuery.mockImplementation((sql: string) => {
    if (sql.includes('UPDATE users SET last_seen_at')) {
      return Promise.resolve({ rows: [], rowCount: 0 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });
});

describe('Rotas de pedidos', () => {
  describe('autenticação e contrato HTTP', () => {
    it.each([
      ['get', '/orders'],
      ['get', `/orders/${ORDER_ID}`],
      ['post', '/orders'],
      ['put', `/orders/${ORDER_ID}`],
      ['delete', `/orders/${ORDER_ID}`],
    ] as const)('retorna 401 em %s %s sem token', async (method, path) => {
      const res = await request(createApp())[method](path);
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('retorna 401 com token inválido', async () => {
      const res = await request(createApp())
        .get('/orders')
        .set('Authorization', 'Bearer token-invalido');

      expect(res.status).toBe(401);
    });

    it('retorna 401 com token expirado', async () => {
      const expired = jwt.sign({ userId: USER_ID }, JWT_SECRET, { expiresIn: '0s' });
      const res = await request(createApp())
        .get('/orders')
        .set('Authorization', `Bearer ${expired}`);

      expect(res.status).toBe(401);
    });

    it('retorna 404 para método não suportado', async () => {
      const res = await request(createApp())
        .patch(`/orders/${ORDER_ID}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });

    it('retorna 400 para JSON malformado', async () => {
      const res = await request(createApp())
        .post('/orders')
        .set('Authorization', `Bearer ${token}`)
        .set('Content-Type', 'application/json')
        .send('{"clientName":');

      expect(res.status).toBe(400);
    });
  });

  describe('GET /orders', () => {
    it('lista somente os pedidos do usuário autenticado', async () => {
      mockQuery.mockImplementation((sql: string, params?: unknown[]) => {
        if (sql.includes('UPDATE users SET last_seen_at')) return Promise.resolve({ rows: [] });
        if (sql.includes('FROM orders WHERE user_id')) {
          expect(params).toEqual([USER_ID]);
          return Promise.resolve({ rows: [orderRow] });
        }
        return Promise.resolve({ rows: [] });
      });

      const res = await authorized('get', '/orders');

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([
        expect.objectContaining({ id: ORDER_ID, clientName: 'Maria', paid: false }),
      ]);
    });

    it('retorna 500 quando o banco falha', async () => {
      mockQuery.mockImplementation((sql: string) => {
        if (sql.includes('UPDATE users SET last_seen_at')) return Promise.resolve({ rows: [] });
        return Promise.reject(new Error('database unavailable'));
      });

      const res = await authorized('get', '/orders');

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /orders/:id', () => {
    it('busca o pedido pelo id e pelo usuário autenticado', async () => {
      mockQuery.mockImplementation((sql: string, params?: unknown[]) => {
        if (sql.includes('UPDATE users SET last_seen_at')) return Promise.resolve({ rows: [] });
        expect(params).toEqual([ORDER_ID, USER_ID]);
        return Promise.resolve({ rows: [orderRow] });
      });

      const res = await authorized('get', `/orders/${ORDER_ID}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(ORDER_ID);
    });

    it('retorna 404 quando o pedido não pertence ao usuário', async () => {
      const otherToken = jwt.sign({ userId: OTHER_USER_ID }, JWT_SECRET);
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });

      const res = await request(createApp())
        .get(`/orders/${ORDER_ID}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(res.status).toBe(404);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('id = $1 AND user_id = $2'),
        [ORDER_ID, OTHER_USER_ID],
      );
    });

    it('retorna 500 quando o banco falha', async () => {
      mockQuery.mockImplementation((sql: string) => {
        if (sql.includes('UPDATE users SET last_seen_at')) return Promise.resolve({ rows: [] });
        return Promise.reject(new Error('database unavailable'));
      });

      const res = await authorized('get', `/orders/${ORDER_ID}`);
      expect(res.status).toBe(500);
    });
  });

  describe('POST /orders', () => {
    it.each([
      [{ recipeName: 'Bolo', deliveryDate: '2026-06-20' }, 'clientName'],
      [{ clientName: 'Maria', deliveryDate: '2026-06-20' }, 'recipeName'],
      [{ clientName: 'Maria', recipeName: 'Bolo' }, 'deliveryDate'],
    ])('retorna 400 quando falta campo obrigatório: %s', async (body, _field) => {
      const res = await authorized('post', '/orders').send(body);
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('cria pedido e persiste os dados de pagamento', async () => {
      const paidRow = {
        ...orderRow,
        paid: true,
        paid_amount: '100.00',
        payments: [{ id: 'p1', amount: 100, method: 'cash', date: '2026-06-15' }],
      };
      mockQuery.mockImplementation((sql: string, params?: unknown[]) => {
        if (sql.includes('UPDATE users SET last_seen_at')) return Promise.resolve({ rows: [] });
        expect(params?.[0]).toBe(USER_ID);
        expect(params?.[11]).toBe(true);
        expect(params?.[12]).toBe(100);
        expect(params?.[13]).toBe(JSON.stringify(paidRow.payments));
        return Promise.resolve({ rows: [paidRow], rowCount: 1 });
      });

      const res = await authorized('post', '/orders').send({
        clientName: 'Maria',
        recipeName: 'Bolo',
        deliveryDate: '2026-06-20',
        totalPrice: 100,
        paid: true,
        paidAmount: 100,
        payments: paidRow.payments,
      });

      expect(res.status).toBe(201);
      expect(res.body.data).toMatchObject({ paid: true, paidAmount: 100 });
    });

    it('retorna 500 quando a criação falha', async () => {
      mockQuery.mockImplementation((sql: string) => {
        if (sql.includes('UPDATE users SET last_seen_at')) return Promise.resolve({ rows: [] });
        return Promise.reject(new Error('insert failed'));
      });

      const res = await authorized('post', '/orders').send({
        clientName: 'Maria',
        recipeName: 'Bolo',
        deliveryDate: '2026-06-20',
      });

      expect(res.status).toBe(500);
    });

    it('cria rascunho sem data de entrega e sem produto (delivery_date = null)', async () => {
      const draftRow = { ...orderRow, status: 'draft', recipe_name: '', delivery_date: null };
      mockQuery.mockImplementation((sql: string, params?: unknown[]) => {
        if (sql.includes('INSERT INTO orders')) {
          expect(params?.[8]).toBeNull(); // delivery_date
          expect(params?.[10]).toBe('draft'); // status
          return Promise.resolve({ rows: [draftRow], rowCount: 1 });
        }
        return Promise.resolve({ rows: [], rowCount: 0 });
      });

      const res = await authorized('post', '/orders').send({
        clientName: 'Maria',
        status: 'draft',
      });

      expect(res.status).toBe(201);
      expect(res.body.data).toMatchObject({ status: 'draft', deliveryDate: null });
    });

    it('salva rascunho ignorando data de entrega inválida (não quebra o insert)', async () => {
      const draftRow = { ...orderRow, status: 'draft', delivery_date: null };
      mockQuery.mockImplementation((sql: string, params?: unknown[]) => {
        if (sql.includes('INSERT INTO orders')) {
          expect(params?.[8]).toBeNull(); // 31/06 não existe → salvo sem data
          return Promise.resolve({ rows: [draftRow], rowCount: 1 });
        }
        return Promise.resolve({ rows: [], rowCount: 0 });
      });

      const res = await authorized('post', '/orders').send({
        clientName: 'Maria',
        deliveryDate: '2026-06-31',
        status: 'draft',
      });

      expect(res.status).toBe(201);
    });

    it('rejeita rascunho sem nome do cliente', async () => {
      const res = await authorized('post', '/orders').send({ status: 'draft' });
      expect(res.status).toBe(400);
      expect(mockQuery.mock.calls.some(([sql]) => String(sql).includes('INSERT INTO orders'))).toBe(false);
    });

    it('rejeita encomenda normal com data inexistente (31/06)', async () => {
      const res = await authorized('post', '/orders').send({
        clientName: 'Maria',
        recipeName: 'Bolo',
        deliveryDate: '2026-06-31',
      });
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Data de entrega inválida');
      expect(mockQuery.mock.calls.some(([sql]) => String(sql).includes('INSERT INTO orders'))).toBe(false);
    });

    it('retorna 400 para status inválido sem consultar a tabela de pedidos', async () => {
      const res = await authorized('post', '/orders').send({
        clientName: 'Maria',
        recipeName: 'Bolo',
        deliveryDate: '2026-06-20',
        status: 'ready',
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Status inválido');
      expect(mockQuery.mock.calls.some(([sql]) => String(sql).includes('INSERT INTO orders'))).toBe(false);
    });
  });

  describe('PUT /orders/:id', () => {
    it('atualiza pagamento integral e mantém o filtro por usuário', async () => {
      const payments = [{ id: 'p1', amount: 100, method: 'cash', date: '2026-06-15' }];
      const paidRow = { ...orderRow, paid: true, paid_amount: '100.00', payments };

      mockQuery.mockImplementation((sql: string, params?: unknown[]) => {
        if (sql.includes('UPDATE users SET last_seen_at')) return Promise.resolve({ rows: [] });
        expect(sql).toContain('WHERE id = $1 AND user_id = $2');
        expect(params?.[0]).toBe(ORDER_ID);
        expect(params?.[1]).toBe(USER_ID);
        expect(params?.[12]).toBe(true);
        expect(params?.[13]).toBe(100);
        expect(params?.[14]).toBe(JSON.stringify(payments));
        return Promise.resolve({ rows: [paidRow], rowCount: 1 });
      });

      const res = await authorized('put', `/orders/${ORDER_ID}`).send({
        paid: true,
        paidAmount: 100,
        payments,
      });

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ paid: true, paidAmount: 100, payments });
    });

    it('permite gravar explicitamente paid=false e paidAmount=0', async () => {
      mockQuery.mockImplementation((sql: string, params?: unknown[]) => {
        if (sql.includes('UPDATE users SET last_seen_at')) return Promise.resolve({ rows: [] });
        expect(params?.[12]).toBe(false);
        expect(params?.[13]).toBe(0);
        return Promise.resolve({ rows: [orderRow], rowCount: 1 });
      });

      const res = await authorized('put', `/orders/${ORDER_ID}`).send({
        paid: false,
        paidAmount: 0,
        payments: [],
      });

      expect(res.status).toBe(200);
      expect(res.body.data.paid).toBe(false);
    });

    it('retorna 404 quando o pedido não existe', async () => {
      const res = await authorized('put', `/orders/${ORDER_ID}`).send({ paid: true });
      expect(res.status).toBe(404);
    });

    it('retorna 500 quando a atualização falha', async () => {
      mockQuery.mockImplementation((sql: string) => {
        if (sql.includes('UPDATE users SET last_seen_at')) return Promise.resolve({ rows: [] });
        return Promise.reject(new Error('update failed'));
      });

      const res = await authorized('put', `/orders/${ORDER_ID}`).send({ paid: true });
      expect(res.status).toBe(500);
    });

    it('retorna 400 para status inválido sem executar UPDATE em pedidos', async () => {
      const res = await authorized('put', `/orders/${ORDER_ID}`).send({ status: 'ready' });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Status inválido');
      expect(mockQuery.mock.calls.some(([sql]) => String(sql).includes('UPDATE orders SET'))).toBe(false);
    });
  });

  describe('DELETE /orders/:id', () => {
    it('exclui somente pelo id e usuário autenticado', async () => {
      mockQuery.mockImplementation((sql: string, params?: unknown[]) => {
        if (sql.includes('UPDATE users SET last_seen_at')) return Promise.resolve({ rows: [] });
        expect(params).toEqual([ORDER_ID, USER_ID]);
        return Promise.resolve({ rows: [], rowCount: 1 });
      });

      const res = await authorized('delete', `/orders/${ORDER_ID}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('retorna 404 quando nada é excluído', async () => {
      const res = await authorized('delete', `/orders/${ORDER_ID}`);
      expect(res.status).toBe(404);
    });

    it('retorna 500 quando a exclusão falha', async () => {
      mockQuery.mockImplementation((sql: string) => {
        if (sql.includes('UPDATE users SET last_seen_at')) return Promise.resolve({ rows: [] });
        return Promise.reject(new Error('delete failed'));
      });

      const res = await authorized('delete', `/orders/${ORDER_ID}`);
      expect(res.status).toBe(500);
    });
  });
});
