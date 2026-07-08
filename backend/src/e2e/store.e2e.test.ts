import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';

const mockQuery = jest.fn();

jest.mock('../infrastructure/database/connection', () => ({
  pool: { query: (...args: unknown[]) => mockQuery(...args) },
}));

jest.mock('../infrastructure/services/pushService', () => ({
  sendPushNotifications: jest.fn().mockResolvedValue(undefined),
}));

import storeRoutes from '../presentation/routes/storeRoutes';
import publicRoutes from '../presentation/routes/publicRoutes';
import { authMiddleware } from '../presentation/middleware/authMiddleware';

const JWT_SECRET = 'store-e2e-secret';
const USER_ID    = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const OTHER_ID   = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const PROD_ID    = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const SETTINGS_ID = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

const token      = jwt.sign({ userId: USER_ID }, JWT_SECRET, { expiresIn: '1h' });
const otherToken = jwt.sign({ userId: OTHER_ID }, JWT_SECRET, { expiresIn: '1h' });

const settingsRow = {
  id: SETTINGS_ID,
  user_id: USER_ID,
  active: false,
  store_name: 'Doceria Teste',
  slug: 'doceria-teste',
  description: null,
  accepts_delivery: true,
  accepts_pickup: true,
  min_order_value: null,
  created_at: new Date('2026-07-01T10:00:00Z'),
  updated_at: new Date('2026-07-01T10:00:00Z'),
};

const productRow = {
  id: PROD_ID,
  user_id: USER_ID,
  name: 'Brigadeiro Gourmet',
  description: 'Caixinha com 9 unidades',
  photo_url: null,
  public_price: '45.00',
  available: true,
  recipe_id: null,
  created_at: new Date('2026-07-01T10:00:00Z'),
  updated_at: new Date('2026-07-01T10:00:00Z'),
};

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/store', authMiddleware, storeRoutes);
  return app;
}

function createPublicApp() {
  const app = express();
  app.use(express.json());
  app.use('/public', publicRoutes);
  return app;
}

function auth(method: 'get' | 'post' | 'put' | 'delete', path: string, tok = token) {
  return request(createApp())[method](path).set('Authorization', `Bearer ${tok}`);
}

beforeAll(() => {
  process.env.JWT_SECRET = JWT_SECRET;
});

beforeEach(() => {
  mockQuery.mockReset();
  // default: last_seen_at update always resolves
  mockQuery.mockImplementation((sql: string) => {
    if (String(sql).includes('UPDATE users SET last_seen_at')) {
      return Promise.resolve({ rows: [], rowCount: 0 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });
});

// ─── helpers ───────────────────────────────────────────────────────────────

function mockSettingsFound() {
  mockQuery.mockImplementation((sql: string) => {
    if (String(sql).includes('UPDATE users SET last_seen_at')) return Promise.resolve({ rows: [] });
    if (String(sql).includes('FROM store_settings WHERE user_id')) return Promise.resolve({ rows: [settingsRow] });
    return Promise.resolve({ rows: [settingsRow], rowCount: 1 });
  });
}

function mockSettingsNotFound() {
  mockQuery.mockImplementation((sql: string, params?: unknown[]) => {
    if (String(sql).includes('UPDATE users SET last_seen_at')) return Promise.resolve({ rows: [] });
    if (String(sql).includes('FROM store_settings WHERE user_id')) return Promise.resolve({ rows: [] });
    if (String(sql).includes('company_name FROM users')) return Promise.resolve({ rows: [{ company_name: 'Doceria Teste' }] });
    if (String(sql).includes('slug = $1 AND user_id')) return Promise.resolve({ rows: [] }); // sem colisão
    if (String(sql).includes('INSERT INTO store_settings')) return Promise.resolve({ rows: [settingsRow], rowCount: 1 });
    return Promise.resolve({ rows: [], rowCount: 0 });
  });
}

// ─── Autenticação ──────────────────────────────────────────────────────────

describe('Rotas da Loja Online — autenticação', () => {
  const endpoints: ['get' | 'post' | 'put' | 'delete', string][] = [
    ['get',    '/store/settings'],
    ['put',    '/store/settings'],
    ['get',    '/store/products'],
    ['post',   '/store/products'],
    ['put',    `/store/products/${PROD_ID}`],
    ['delete', `/store/products/${PROD_ID}`],
  ];

  it.each(endpoints)('retorna 401 em %s %s sem token', async (method, path) => {
    const res = await request(createApp())[method](path);
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('retorna 401 com token inválido', async () => {
    const res = await request(createApp())
      .get('/store/settings')
      .set('Authorization', 'Bearer token-invalido');
    expect(res.status).toBe(401);
  });

  it('retorna 401 com token expirado', async () => {
    const expired = jwt.sign({ userId: USER_ID }, JWT_SECRET, { expiresIn: '0s' });
    const res = await request(createApp())
      .get('/store/settings')
      .set('Authorization', `Bearer ${expired}`);
    expect(res.status).toBe(401);
  });
});

// ─── GET /store/settings ───────────────────────────────────────────────────

describe('GET /store/settings', () => {
  it('retorna configurações existentes', async () => {
    mockSettingsFound();
    const res = await auth('get', '/store/settings');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      id: SETTINGS_ID,
      storeName: 'Doceria Teste',
      slug: 'doceria-teste',
      active: false,
      acceptsDelivery: true,
      acceptsPickup: true,
    });
    expect(res.body.data.storeLink).toContain('doceria-teste');
  });

  it('cria configurações automaticamente quando não existem (slug do nome da empresa)', async () => {
    mockSettingsNotFound();
    const res = await auth('get', '/store/settings');
    expect(res.status).toBe(200);
    expect(res.body.data.slug).toBe('doceria-teste');
    // deve ter consultado o company_name
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('company_name FROM users'),
      [USER_ID],
    );
  });

  it('retorna 500 quando o banco falha', async () => {
    mockQuery.mockImplementation((sql: string) => {
      if (String(sql).includes('UPDATE users SET last_seen_at')) return Promise.resolve({ rows: [] });
      return Promise.reject(new Error('db error'));
    });
    const res = await auth('get', '/store/settings');
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});

// ─── PUT /store/settings ───────────────────────────────────────────────────

describe('PUT /store/settings', () => {
  it('atualiza configurações e retorna dados atualizados', async () => {
    const updatedRow = { ...settingsRow, store_name: 'Nova Doceria', description: 'Descrição nova', min_order_value: '30.00', updated_at: new Date() };
    mockQuery.mockImplementation((sql: string) => {
      if (String(sql).includes('UPDATE users SET last_seen_at')) return Promise.resolve({ rows: [] });
      if (String(sql).includes('UPDATE store_settings SET')) return Promise.resolve({ rows: [updatedRow], rowCount: 1 });
      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    const res = await auth('put', '/store/settings').send({
      storeName: 'Nova Doceria',
      description: 'Descrição nova',
      minOrderValue: 30,
      acceptsDelivery: true,
      acceptsPickup: false,
    });

    expect(res.status).toBe(200);
    expect(res.body.data.storeName).toBe('Nova Doceria');
    expect(res.body.data.description).toBe('Descrição nova');
  });

  it('ativa a loja com active=true', async () => {
    const activeRow = { ...settingsRow, active: true, updated_at: new Date() };
    mockQuery.mockImplementation((sql: string) => {
      if (String(sql).includes('UPDATE users SET last_seen_at')) return Promise.resolve({ rows: [] });
      if (String(sql).includes('UPDATE store_settings SET')) return Promise.resolve({ rows: [activeRow], rowCount: 1 });
      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    const res = await auth('put', '/store/settings').send({ active: true });
    expect(res.status).toBe(200);
    expect(res.body.data.active).toBe(true);
  });

  it('retorna 500 quando o banco falha', async () => {
    mockQuery.mockImplementation((sql: string) => {
      if (String(sql).includes('UPDATE users SET last_seen_at')) return Promise.resolve({ rows: [] });
      return Promise.reject(new Error('db error'));
    });
    const res = await auth('put', '/store/settings').send({ storeName: 'Teste' });
    expect(res.status).toBe(500);
  });
});

// ─── GET /store/products ───────────────────────────────────────────────────

describe('GET /store/products', () => {
  it('lista produtos do usuário autenticado', async () => {
    mockQuery.mockImplementation((sql: string, params?: unknown[]) => {
      if (String(sql).includes('UPDATE users SET last_seen_at')) return Promise.resolve({ rows: [] });
      if (String(sql).includes('FROM store_products WHERE user_id')) {
        expect(params).toEqual([USER_ID]);
        return Promise.resolve({ rows: [productRow] });
      }
      return Promise.resolve({ rows: [] });
    });

    const res = await auth('get', '/store/products');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toMatchObject({
      id: PROD_ID,
      name: 'Brigadeiro Gourmet',
      publicPrice: 45,
      available: true,
    });
  });

  it('retorna lista vazia quando não há produtos', async () => {
    mockQuery.mockImplementation((sql: string) => {
      if (String(sql).includes('UPDATE users SET last_seen_at')) return Promise.resolve({ rows: [] });
      return Promise.resolve({ rows: [] });
    });
    const res = await auth('get', '/store/products');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('retorna 500 quando o banco falha', async () => {
    mockQuery.mockImplementation((sql: string) => {
      if (String(sql).includes('UPDATE users SET last_seen_at')) return Promise.resolve({ rows: [] });
      return Promise.reject(new Error('db error'));
    });
    const res = await auth('get', '/store/products');
    expect(res.status).toBe(500);
  });
});

// ─── POST /store/products ──────────────────────────────────────────────────

describe('POST /store/products', () => {
  it.each([
    [{ description: 'sem nome', publicPrice: 10 }, 'name'],
    [{ name: 'Produto sem preço' }, 'publicPrice'],
  ])('retorna 400 quando falta campo obrigatório (%s)', async (body, _field) => {
    const res = await auth('post', '/store/products').send(body);
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('cria produto e associa ao usuário autenticado', async () => {
    mockQuery.mockImplementation((sql: string, params?: unknown[]) => {
      if (String(sql).includes('UPDATE users SET last_seen_at')) return Promise.resolve({ rows: [] });
      if (String(sql).includes('INSERT INTO store_products')) {
        expect(params?.[0]).toBe(USER_ID);
        return Promise.resolve({ rows: [productRow], rowCount: 1 });
      }
      return Promise.resolve({ rows: [] });
    });

    const res = await auth('post', '/store/products').send({
      name: 'Brigadeiro Gourmet',
      description: 'Caixinha com 9 unidades',
      publicPrice: 45,
      available: true,
    });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ name: 'Brigadeiro Gourmet', publicPrice: 45 });
  });

  it('available padrão é true quando não informado', async () => {
    mockQuery.mockImplementation((sql: string, params?: unknown[]) => {
      if (String(sql).includes('UPDATE users SET last_seen_at')) return Promise.resolve({ rows: [] });
      if (String(sql).includes('INSERT INTO store_products')) {
        expect(params?.[5]).toBe(true); // available
        return Promise.resolve({ rows: [productRow], rowCount: 1 });
      }
      return Promise.resolve({ rows: [] });
    });

    await auth('post', '/store/products').send({ name: 'Produto', publicPrice: 20 });
  });

  it('retorna 500 quando o banco falha', async () => {
    mockQuery.mockImplementation((sql: string) => {
      if (String(sql).includes('UPDATE users SET last_seen_at')) return Promise.resolve({ rows: [] });
      return Promise.reject(new Error('insert failed'));
    });
    const res = await auth('post', '/store/products').send({ name: 'Teste', publicPrice: 10 });
    expect(res.status).toBe(500);
  });
});

// ─── PUT /store/products/:id ───────────────────────────────────────────────

describe('PUT /store/products/:id', () => {
  it('atualiza campos enviados e não apaga campos omitidos', async () => {
    const updatedRow = { ...productRow, available: false, public_price: '50.00', description: 'Caixinha com 9 unidades' };
    mockQuery.mockImplementation((sql: string) => {
      if (String(sql).includes('UPDATE users SET last_seen_at')) return Promise.resolve({ rows: [] });
      if (String(sql).includes('UPDATE store_products SET')) return Promise.resolve({ rows: [updatedRow], rowCount: 1 });
      return Promise.resolve({ rows: [] });
    });

    const res = await auth('put', `/store/products/${PROD_ID}`).send({
      available: false,
      publicPrice: 50,
      // description NÃO enviada — não deve ser zerada
    });

    expect(res.status).toBe(200);
    expect(res.body.data.available).toBe(false);
    expect(res.body.data.publicPrice).toBe(50);
    expect(res.body.data.description).toBe('Caixinha com 9 unidades');
    // garante que a query não inclui description
    const updateCall = mockQuery.mock.calls.find(([sql]) => String(sql).includes('UPDATE store_products'));
    expect(updateCall?.[0]).not.toContain('description');
  });

  it('retorna 404 quando o produto não existe ou não pertence ao usuário', async () => {
    mockQuery.mockImplementation((sql: string) => {
      if (String(sql).includes('UPDATE users SET last_seen_at')) return Promise.resolve({ rows: [] });
      return Promise.resolve({ rows: [], rowCount: 0 });
    });
    const res = await auth('put', `/store/products/${PROD_ID}`).send({ available: true });
    expect(res.status).toBe(404);
  });

  it('retorna 500 quando o banco falha', async () => {
    mockQuery.mockImplementation((sql: string) => {
      if (String(sql).includes('UPDATE users SET last_seen_at')) return Promise.resolve({ rows: [] });
      return Promise.reject(new Error('update failed'));
    });
    const res = await auth('put', `/store/products/${PROD_ID}`).send({ available: false });
    expect(res.status).toBe(500);
  });
});

// ─── DELETE /store/products/:id ────────────────────────────────────────────

describe('DELETE /store/products/:id', () => {
  it('exclui produto do usuário autenticado', async () => {
    mockQuery.mockImplementation((sql: string, params?: unknown[]) => {
      if (String(sql).includes('UPDATE users SET last_seen_at')) return Promise.resolve({ rows: [] });
      if (String(sql).includes('DELETE FROM store_products')) {
        expect(params).toEqual([PROD_ID, USER_ID]);
        return Promise.resolve({ rows: [], rowCount: 1 });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    const res = await auth('delete', `/store/products/${PROD_ID}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('não exclui produto de outro usuário (retorna 404)', async () => {
    mockQuery.mockImplementation((sql: string, params?: unknown[]) => {
      if (String(sql).includes('UPDATE users SET last_seen_at')) return Promise.resolve({ rows: [] });
      if (String(sql).includes('DELETE FROM store_products')) {
        // banco retorna 0 linhas porque user_id não bate
        expect(params?.[1]).toBe(OTHER_ID);
        return Promise.resolve({ rows: [], rowCount: 0 });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    const res = await auth('delete', `/store/products/${PROD_ID}`, otherToken);
    expect(res.status).toBe(404);
  });

  it('retorna 500 quando o banco falha', async () => {
    mockQuery.mockImplementation((sql: string) => {
      if (String(sql).includes('UPDATE users SET last_seen_at')) return Promise.resolve({ rows: [] });
      return Promise.reject(new Error('delete failed'));
    });
    const res = await auth('delete', `/store/products/${PROD_ID}`);
    expect(res.status).toBe(500);
  });
});

// ─── POST /public/store/:slug/orders — forma de pagamento ─────────────────

describe('POST /public/store/:slug/orders — forma de pagamento', () => {
  const ORDER_ID = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';

  function mockPublicOrderFlow(paymentMethods: string[]) {
    mockQuery.mockImplementation((sql: string) => {
      const q = String(sql);
      if (q.includes('FROM store_settings WHERE slug')) {
        return Promise.resolve({
          rows: [{
            user_id: USER_ID,
            store_name: 'Doceria Teste',
            min_order_value: null,
            delivery_fee: null,
            payment_methods: paymentMethods,
          }],
        });
      }
      if (q.includes('FROM store_products WHERE id = ANY')) {
        return Promise.resolve({ rows: [{ id: PROD_ID, name: 'Brigadeiro Gourmet', public_price: '45.00', recipe_id: null }] });
      }
      if (q.includes('INSERT INTO orders')) {
        return Promise.resolve({ rows: [{ id: ORDER_ID }] });
      }
      if (q.includes('FROM push_tokens')) return Promise.resolve({ rows: [] });
      return Promise.resolve({ rows: [], rowCount: 0 });
    });
  }

  const baseOrder = {
    clientName: 'Cliente Teste',
    clientPhone: '95999990000',
    items: [{ productId: PROD_ID, quantity: 2 }],
    deliveryType: 'pickup',
  };

  it('cria pedido com forma de pagamento aceita e persiste payment_method', async () => {
    mockPublicOrderFlow(['pix', 'cash']);
    const res = await request(createPublicApp())
      .post('/public/store/doceria-teste/orders')
      .send({ ...baseOrder, paymentMethod: 'pix' });

    expect(res.status).toBe(201);
    expect(res.body.data.orderId).toBe(ORDER_ID);
    const insertCall = mockQuery.mock.calls.find(([sql]) => String(sql).includes('INSERT INTO orders'));
    expect(insertCall?.[1]).toEqual(expect.arrayContaining(['pix']));
  });

  it('retorna 400 quando a forma não é aceita pela loja', async () => {
    mockPublicOrderFlow(['pix']);
    const res = await request(createPublicApp())
      .post('/public/store/doceria-teste/orders')
      .send({ ...baseOrder, paymentMethod: 'credit' });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Forma de pagamento');
  });

  it('persiste troco (change_for) quando pagamento em dinheiro', async () => {
    mockPublicOrderFlow(['pix', 'cash']);
    const res = await request(createPublicApp())
      .post('/public/store/doceria-teste/orders')
      .send({ ...baseOrder, paymentMethod: 'cash', changeFor: 100 });

    expect(res.status).toBe(201);
    const insertCall = mockQuery.mock.calls.find(([sql]) => String(sql).includes('INSERT INTO orders'));
    expect(insertCall?.[1]).toEqual(expect.arrayContaining(['cash', 100]));
  });

  it('ignora troco quando a forma não é dinheiro', async () => {
    mockPublicOrderFlow(['pix', 'cash']);
    const res = await request(createPublicApp())
      .post('/public/store/doceria-teste/orders')
      .send({ ...baseOrder, paymentMethod: 'pix', changeFor: 100 });

    expect(res.status).toBe(201);
    const insertCall = mockQuery.mock.calls.find(([sql]) => String(sql).includes('INSERT INTO orders'));
    expect(insertCall?.[1]).not.toEqual(expect.arrayContaining([100]));
  });

  it('aceita pedido sem forma de pagamento (compatibilidade)', async () => {
    mockPublicOrderFlow(['pix']);
    const res = await request(createPublicApp())
      .post('/public/store/doceria-teste/orders')
      .send(baseOrder);

    expect(res.status).toBe(201);
  });
});
