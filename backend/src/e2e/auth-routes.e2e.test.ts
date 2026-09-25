import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';

const userRepo = {
  findByEmail: jest.fn(), findById: jest.fn(), findByIdFull: jest.fn(),
  create: jest.fn(), countAll: jest.fn(), verifyPassword: jest.fn(),
  updateCompanyName: jest.fn(), updateInstagramHandle: jest.fn(), updatePhone: jest.fn(), updatePassword: jest.fn(),
  createPasswordResetCode: jest.fn(), verifyPasswordResetCode: jest.fn(),
  markResetCodeUsed: jest.fn(), delete: jest.fn(),
};
const suggestionRepo = { create: jest.fn() };
const socialRepo = {
  createAppleNonce: jest.fn(), consumeAppleNonce: jest.fn(), findOrCreateUser: jest.fn(),
};
const mockVerifySocialToken = jest.fn();
const sendReset = jest.fn();

jest.mock('../infrastructure/database/connection', () => ({
  pool: { query: jest.fn().mockResolvedValue({ rows: [] }) },
}));
jest.mock('../infrastructure/repositories/PostgresUserRepository', () => ({
  PostgresUserRepository: jest.fn(() => userRepo),
}));
jest.mock('../infrastructure/repositories/PostgresSuggestionRepository', () => ({
  PostgresSuggestionRepository: jest.fn(() => suggestionRepo),
}));
jest.mock('../infrastructure/repositories/PostgresSocialIdentityRepository', () => ({
  PostgresSocialIdentityRepository: jest.fn(() => socialRepo),
}));
jest.mock('../infrastructure/services/socialTokenVerifier', () => ({
  verifySocialToken: (...args: unknown[]) => mockVerifySocialToken(...args),
  SocialAuthError: class SocialAuthError extends Error {
    constructor(message: string, public readonly kind: 'invalid_token' | 'configuration') {
      super(message);
    }
  },
}));
jest.mock('../infrastructure/services/emailService', () => ({
  sendPasswordResetCode: (...args: unknown[]) => sendReset(...args),
}));
jest.mock('../infrastructure/services/telegramService', () => ({
  notifyNewUser: jest.fn(), notifyUserMilestone: jest.fn(),
}));

import authRoutes from '../presentation/routes/authRoutes';

const JWT_SECRET = 'auth-routes-secret';
const USER_ID = '11111111-1111-1111-1111-111111111111';
const token = jwt.sign({ userId: USER_ID }, JWT_SECRET);
const user = {
  id: USER_ID,
  companyName: 'Doces',
  email: 'doces@example.com',
  passwordHash: 'hash',
  isActive: true,
  isPremium: false,
  premiumUntil: null,
  premiumPlatform: null,
  createdAt: new Date().toISOString(),
};

function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json());
  app.use('/auth', authRoutes);
  return app;
}

beforeAll(() => {
  process.env.JWT_SECRET = JWT_SECRET;
});

beforeEach(() => {
  for (const repo of [userRepo, suggestionRepo, socialRepo]) {
    for (const fn of Object.values(repo)) fn.mockReset();
  }
  mockVerifySocialToken.mockReset();
  sendReset.mockReset();
});

describe('Todas as rotas de autenticação', () => {
  it('altera o nome da loja do usuário autenticado e remove espaços nas extremidades', async () => {
    userRepo.updateCompanyName.mockResolvedValue({ ...user, companyName: 'Doces da Maria' });
    const response = await request(createApp()).patch('/auth/profile')
      .set('Authorization', `Bearer ${token}`).send({ companyName: '  Doces da Maria  ' });
    expect(response.status).toBe(200);
    expect(userRepo.updateCompanyName).toHaveBeenCalledWith(USER_ID, 'Doces da Maria');
    expect(response.body.data.companyName).toBe('Doces da Maria');
    expect(response.body.data.passwordHash).toBeUndefined();
  });

  it.each(['', '   ', null, 123, {}, 'a'.repeat(256)])('rejeita nome de loja inválido: %s', async (companyName) => {
    const response = await request(createApp()).patch('/auth/profile')
      .set('Authorization', `Bearer ${token}`).send({ companyName, phone: '92999999999' });
    expect(response.status).toBe(400);
    expect(userRepo.updateCompanyName).not.toHaveBeenCalled();
    expect(userRepo.updatePhone).not.toHaveBeenCalled();
  });

  it('exige autenticação para alterar o nome da loja', async () => {
    const response = await request(createApp()).patch('/auth/profile').send({ companyName: 'Outra loja' });
    expect(response.status).toBe(401);
    expect(userRepo.updateCompanyName).not.toHaveBeenCalled();
  });

  it('registra e autentica usuário', async () => {
    userRepo.findByEmail.mockResolvedValueOnce(null);
    userRepo.create.mockResolvedValue(user);
    userRepo.countAll.mockResolvedValue({ total: 1, premium: 0, today: 1 });
    expect((await request(createApp()).post('/auth/register').send({
      companyName: 'Doces', email: 'doces@example.com', password: 'senha123', phone: '92999999999',
    })).status).toBe(201);

    userRepo.findByEmail.mockResolvedValueOnce(user);
    userRepo.verifyPassword.mockResolvedValue(true);
    expect((await request(createApp()).post('/auth/login').send({
      email: 'doces@example.com', password: 'senha123',
    })).status).toBe(200);
  });

  it.each([undefined, null, '', '   ', '@doces.da_maria', ' doces.da_maria '])(
    'aceita Instagram opcional no cadastro: %s',
    async (instagramHandle) => {
      userRepo.findByEmail.mockResolvedValue(null);
      userRepo.create.mockResolvedValue(user);
      userRepo.countAll.mockResolvedValue({ total: 1 });
      const response = await request(createApp()).post('/auth/register').send({
        companyName: 'Doces', email: user.email, password: 'senha123',
        phone: '92999999999', instagramHandle,
      });
      expect(response.status).toBe(201);
      expect(userRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        instagramHandle: instagramHandle?.trim() ? 'doces.da_maria' : null,
      }));
    },
  );

  it.each(['nome invalido', 'a'.repeat(31), 123, {}])(
    'rejeita Instagram inválido antes de criar a conta: %s',
    async (instagramHandle) => {
      const response = await request(createApp()).post('/auth/register').send({
        companyName: 'Doces', email: user.email, password: 'senha123',
        phone: '92999999999', instagramHandle,
      });
      expect(response.status).toBe(400);
      expect(userRepo.create).not.toHaveBeenCalled();
    },
  );

  it('autentica com provedor social e mantém o mesmo formato de sessão JWT', async () => {
    mockVerifySocialToken.mockResolvedValue({
      provider: 'google', subject: 'google-user-1', email: user.email, displayName: 'Doces',
    });
    socialRepo.findOrCreateUser.mockResolvedValue({ userId: USER_ID, isNew: false });
    userRepo.findById.mockResolvedValue(user);

    const response = await request(createApp()).post('/auth/social').send({
      provider: 'google', idToken: 'id-token-google-com-tamanho-valido', platform: 'android',
    });

    expect(response.status).toBe(200);
    expect(response.body.data.user.email).toBe(user.email);
    expect(response.body.data.token).toEqual(expect.any(String));
    expect(response.body.data.user.passwordHash).toBeUndefined();
  });

  it('emite nonce Apple de uso único', async () => {
    socialRepo.createAppleNonce.mockResolvedValue('nonce-seguro');
    const response = await request(createApp()).post('/auth/social/nonce');
    expect(response.status).toBe(200);
    expect(response.body.data.nonce).toBe('nonce-seguro');
  });

  it('executa recuperação e redefinição de senha', async () => {
    userRepo.findByEmail.mockResolvedValue(user);
    userRepo.createPasswordResetCode.mockResolvedValue('123456');
    sendReset.mockResolvedValue(undefined);
    expect((await request(createApp()).post('/auth/forgot-password').send({
      email: 'doces@example.com',
    })).status).toBe(200);

    userRepo.verifyPasswordResetCode.mockResolvedValue({ valid: true, userId: USER_ID });
    userRepo.updatePassword.mockResolvedValue(undefined);
    userRepo.markResetCodeUsed.mockResolvedValue(undefined);
    expect((await request(createApp()).post('/auth/reset-password').send({
      email: 'doces@example.com', code: '123456', newPassword: 'novaSenha',
    })).status).toBe(200);
  });

  it('consulta e atualiza perfil', async () => {
    userRepo.findById.mockResolvedValue(user);
    expect((await request(createApp()).get('/auth/me').set('Authorization', `Bearer ${token}`)).status).toBe(200);

    userRepo.updateInstagramHandle.mockResolvedValue(user);
    expect((await request(createApp()).patch('/auth/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ instagramHandle: '@doces' })).status).toBe(200);
  });

  it('altera senha autenticada', async () => {
    userRepo.findByIdFull.mockResolvedValue(user);
    userRepo.verifyPassword.mockResolvedValue(true);
    userRepo.updatePassword.mockResolvedValue(undefined);
    expect((await request(createApp()).post('/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'senha123', newPassword: 'novaSenha' })).status).toBe(200);
  });

  it('envia sugestão e exclui conta', async () => {
    userRepo.findById.mockResolvedValue(user);
    suggestionRepo.create.mockResolvedValue({ id: 's1' });
    expect((await request(createApp()).post('/auth/suggestion')
      .set('Authorization', `Bearer ${token}`)
      .send({ message: 'Nova função' })).status).toBe(201);

    userRepo.delete.mockResolvedValue(true);
    expect((await request(createApp()).delete('/auth/account')
      .set('Authorization', `Bearer ${token}`)).status).toBe(200);
  });
});
