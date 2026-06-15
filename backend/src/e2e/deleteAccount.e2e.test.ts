import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';

process.env.JWT_SECRET = 'delete-account-e2e-secret';

// ── Mocks ─────────────────────────────────────────────────────────────────

const mockFindById = jest.fn();
const mockFindByEmail = jest.fn();
const mockFindByIdFull = jest.fn();
const mockCreate = jest.fn();
const mockDeleteUser = jest.fn();
const mockVerifyPassword = jest.fn();
const mockCountAll = jest.fn();

jest.mock('../infrastructure/repositories/PostgresUserRepository', () => ({
  PostgresUserRepository: jest.fn(() => ({
    findById: mockFindById,
    findByEmail: mockFindByEmail,
    findByIdFull: mockFindByIdFull,
    create: mockCreate,
    delete: mockDeleteUser,
    verifyPassword: mockVerifyPassword,
    countAll: mockCountAll,
    updateInstagramHandle: jest.fn(),
    updatePhone: jest.fn(),
    updatePassword: jest.fn(),
    createPasswordResetCode: jest.fn(),
    verifyPasswordResetCode: jest.fn(),
    markResetCodeUsed: jest.fn(),
  })),
}));

jest.mock('../infrastructure/repositories/PostgresSuggestionRepository', () => ({
  PostgresSuggestionRepository: jest.fn(() => ({
    create: jest.fn(),
  })),
}));

jest.mock('../infrastructure/services/emailService', () => ({
  sendPasswordResetCode: jest.fn(),
}));

jest.mock('../infrastructure/services/telegramService', () => ({
  notifyNewUser: jest.fn(),
  notifyUserMilestone: jest.fn(),
}));

// Mock the pool for authMiddleware's last_seen_at update
jest.mock('../infrastructure/database/connection', () => ({
  pool: { query: jest.fn().mockResolvedValue({ rows: [] }) },
}));

import authRoutes from '../presentation/routes/authRoutes';

// ── App setup ─────────────────────────────────────────────────────────────

const JWT_SECRET = process.env.JWT_SECRET;

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  return app;
}

function generateToken(userId: string) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '1h' });
}

const TEST_USER = {
  id: 'user-e2e-123',
  companyName: 'Doces da Maria',
  email: 'maria@test.com',
  phone: null,
  instagramHandle: null,
  passwordHash: '$2a$10$hashedpassword',
  createdAt: new Date().toISOString(),
  isPremium: false,
  premiumUntil: null,
  premiumPlatform: null,
};

// ── Tests ─────────────────────────────────────────────────────────────────

describe('E2E – Exclusão de conta', () => {
  let app: express.Express;

  beforeAll(() => {
    app = createApp();
  });

  beforeEach(() => jest.clearAllMocks());

  // ── DELETE /api/auth/account ────────────────────────────────────────────

  describe('DELETE /api/auth/account', () => {
    it('exclui a conta com sucesso quando autenticado', async () => {
      mockDeleteUser.mockResolvedValue(true);
      const token = generateToken(TEST_USER.id);

      const res = await request(app)
        .delete('/api/auth/account')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('excluída');
      expect(mockDeleteUser).toHaveBeenCalledWith(TEST_USER.id);
    });

    it('retorna 401 sem token de autenticação', async () => {
      const res = await request(app)
        .delete('/api/auth/account');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(mockDeleteUser).not.toHaveBeenCalled();
    });

    it('retorna 401 com token inválido', async () => {
      const res = await request(app)
        .delete('/api/auth/account')
        .set('Authorization', 'Bearer token-invalido-123');

      expect(res.status).toBe(401);
      expect(mockDeleteUser).not.toHaveBeenCalled();
    });

    it('retorna 401 com token expirado', async () => {
      const expiredToken = jwt.sign(
        { userId: TEST_USER.id },
        JWT_SECRET,
        { expiresIn: '0s' }
      );

      const res = await request(app)
        .delete('/api/auth/account')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(res.status).toBe(401);
      expect(mockDeleteUser).not.toHaveBeenCalled();
    });

    it('retorna 404 quando usuário já foi excluído', async () => {
      mockDeleteUser.mockResolvedValue(false);
      const token = generateToken('user-ja-excluido');

      const res = await request(app)
        .delete('/api/auth/account')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('retorna 500 quando ocorre erro no banco', async () => {
      mockDeleteUser.mockRejectedValue(new Error('connection refused'));
      const token = generateToken(TEST_USER.id);

      const res = await request(app)
        .delete('/api/auth/account')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });

  // ── Fluxo completo: registro → exclusão → tentativa de login ───────────

  describe('Fluxo completo: registro → login → exclusão → login falha', () => {
    it('completa o fluxo inteiro de vida da conta', async () => {
      // 1. Registrar nova conta
      const newUser = { ...TEST_USER };
      mockFindByEmail.mockResolvedValueOnce(null); // email não existe ainda
      mockCreate.mockResolvedValueOnce(newUser);
      mockCountAll.mockResolvedValue({ total: 10, premium: 0, today: 1 });

      const registerRes = await request(app)
        .post('/api/auth/register')
        .send({
          companyName: newUser.companyName,
          email: newUser.email,
          password: 'senha123456',
          phone: '95981234567',
        });

      expect(registerRes.status).toBe(201);
      expect(registerRes.body.success).toBe(true);
      expect(registerRes.body.data.token).toBeDefined();
      const token = registerRes.body.data.token;

      // 2. Verificar que está autenticado (GET /me)
      mockFindById.mockResolvedValueOnce(newUser);

      const meRes = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(meRes.status).toBe(200);
      expect(meRes.body.data.email).toBe(newUser.email);

      // 3. Excluir a conta
      mockDeleteUser.mockResolvedValueOnce(true);

      const deleteRes = await request(app)
        .delete('/api/auth/account')
        .set('Authorization', `Bearer ${token}`);

      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.success).toBe(true);

      // 4. Tentar login após exclusão — deve falhar
      mockFindByEmail.mockResolvedValueOnce(null); // usuário não existe mais

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: newUser.email, password: 'senha123456' });

      expect(loginRes.status).toBe(401);
      expect(loginRes.body.success).toBe(false);
    });
  });

  // ── Segurança ──────────────────────────────────────────────────────────

  describe('Segurança', () => {
    it('não permite excluir conta de outro usuário (token isolado)', async () => {
      const attackerToken = generateToken('attacker-id');
      mockDeleteUser.mockResolvedValue(true);

      const res = await request(app)
        .delete('/api/auth/account')
        .set('Authorization', `Bearer ${attackerToken}`);

      // O middleware extrai o userId do token, então só exclui a conta do próprio token
      expect(mockDeleteUser).toHaveBeenCalledWith('attacker-id');
      expect(mockDeleteUser).not.toHaveBeenCalledWith(TEST_USER.id);
    });

    it('aceita apenas método DELETE', async () => {
      const token = generateToken(TEST_USER.id);

      const postRes = await request(app)
        .post('/api/auth/account')
        .set('Authorization', `Bearer ${token}`);
      expect(postRes.status).toBe(404);

      const getRes = await request(app)
        .get('/api/auth/account')
        .set('Authorization', `Bearer ${token}`);
      expect(getRes.status).toBe(404);

      const putRes = await request(app)
        .put('/api/auth/account')
        .set('Authorization', `Bearer ${token}`);
      expect(putRes.status).toBe(404);

      expect(mockDeleteUser).not.toHaveBeenCalled();
    });

    it('requer header Authorization com prefixo Bearer', async () => {
      const token = generateToken(TEST_USER.id);

      // Token sem prefixo Bearer
      const res = await request(app)
        .delete('/api/auth/account')
        .set('Authorization', token);

      expect(res.status).toBe(401);
      expect(mockDeleteUser).not.toHaveBeenCalled();
    });
  });
});
