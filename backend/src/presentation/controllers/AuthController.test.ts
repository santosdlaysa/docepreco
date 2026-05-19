import { Request, Response } from 'express';

// ── Mocks (declared before jest.mock hoisting) ─────────────────────────────

const mockFindByEmail = jest.fn();
const mockFindByIdFull = jest.fn();
const mockVerifyPassword = jest.fn();
const mockCreatePasswordResetCode = jest.fn();
const mockVerifyPasswordResetCode = jest.fn();
const mockUpdatePassword = jest.fn();
const mockMarkResetCodeUsed = jest.fn();
const mockSendEmail = jest.fn();
const mockDeleteUser = jest.fn();

jest.mock('../../infrastructure/repositories/PostgresUserRepository', () => ({
  PostgresUserRepository: jest.fn(() => ({
    findByEmail: mockFindByEmail,
    findByIdFull: mockFindByIdFull,
    verifyPassword: mockVerifyPassword,
    createPasswordResetCode: mockCreatePasswordResetCode,
    verifyPasswordResetCode: mockVerifyPasswordResetCode,
    updatePassword: mockUpdatePassword,
    markResetCodeUsed: mockMarkResetCodeUsed,
    delete: mockDeleteUser,
  })),
}));

jest.mock('../../infrastructure/services/emailService', () => ({
  sendPasswordResetCode: (...args: unknown[]) => mockSendEmail(...args),
}));

jest.mock('../../infrastructure/services/telegramService', () => ({
  notifyNewUser: jest.fn(),
  notifyUserMilestone: jest.fn(),
}));

import { AuthController } from './AuthController';

// ── Helpers ────────────────────────────────────────────────────────────────

function mockReqRes(body: Record<string, unknown> = {}, userId?: string) {
  const req = { body, userId } as Request & { userId?: string };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    locals: {},
  } as unknown as Response;
  return { req, res };
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('AuthController', () => {
  const controller = new AuthController();

  beforeEach(() => jest.clearAllMocks());

  // ── forgotPassword ───────────────────────────────────────────────────────

  describe('forgotPassword', () => {
    it('retorna erro quando email não é informado', async () => {
      const { req, res } = mockReqRes({});
      await controller.forgotPassword(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining('obrigatório') })
      );
    });

    it('retorna erro quando email é inválido', async () => {
      const { req, res } = mockReqRes({ email: 'nao-eh-email' });
      await controller.forgotPassword(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining('inválido') })
      );
    });

    it('retorna sucesso mesmo quando email não existe (segurança)', async () => {
      mockFindByEmail.mockResolvedValue(null);
      const { req, res } = mockReqRes({ email: 'naoexiste@test.com' });
      await controller.forgotPassword(req, res);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
      expect(mockCreatePasswordResetCode).not.toHaveBeenCalled();
      expect(mockSendEmail).not.toHaveBeenCalled();
    });

    it('gera código e envia email quando usuário existe', async () => {
      const user = { id: 'user-1', email: 'maria@test.com' };
      mockFindByEmail.mockResolvedValue(user);
      mockCreatePasswordResetCode.mockResolvedValue('123456');
      mockSendEmail.mockResolvedValue(undefined);

      const { req, res } = mockReqRes({ email: 'maria@test.com' });
      await controller.forgotPassword(req, res);

      expect(mockCreatePasswordResetCode).toHaveBeenCalledWith('user-1');
      expect(mockSendEmail).toHaveBeenCalledWith('maria@test.com', '123456');
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });

    it('retorna erro 500 se ocorrer exceção interna', async () => {
      mockFindByEmail.mockRejectedValue(new Error('DB down'));
      const { req, res } = mockReqRes({ email: 'maria@test.com' });
      await controller.forgotPassword(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ── resetPassword ────────────────────────────────────────────────────────

  describe('resetPassword', () => {
    it('retorna erro quando campos obrigatórios faltam', async () => {
      const cases = [
        { email: 'a@b.com', code: '123456' },
        { email: 'a@b.com', newPassword: 'nova123' },
        { code: '123456', newPassword: 'nova123' },
      ];
      for (const body of cases) {
        const { req, res } = mockReqRes(body);
        await controller.resetPassword(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({ error: expect.stringContaining('obrigatórios') })
        );
      }
    });

    it('retorna erro quando senha tem menos de 6 caracteres', async () => {
      const { req, res } = mockReqRes({
        email: 'a@b.com', code: '123456', newPassword: '12345',
      });
      await controller.resetPassword(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining('6 caracteres') })
      );
    });

    it('retorna erro quando código é inválido ou expirado', async () => {
      mockVerifyPasswordResetCode.mockResolvedValue({ valid: false, userId: null });
      const { req, res } = mockReqRes({
        email: 'a@b.com', code: '999999', newPassword: 'nova123456',
      });
      await controller.resetPassword(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining('inválido ou expirado') })
      );
      expect(mockUpdatePassword).not.toHaveBeenCalled();
    });

    it('atualiza senha e marca código como usado quando válido', async () => {
      mockVerifyPasswordResetCode.mockResolvedValue({ valid: true, userId: 'user-1' });
      mockUpdatePassword.mockResolvedValue(undefined);
      mockMarkResetCodeUsed.mockResolvedValue(undefined);

      const { req, res } = mockReqRes({
        email: 'maria@test.com', code: '123456', newPassword: 'novaSenha123',
      });
      await controller.resetPassword(req, res);

      expect(mockVerifyPasswordResetCode).toHaveBeenCalledWith('maria@test.com', '123456');
      expect(mockUpdatePassword).toHaveBeenCalledWith('user-1', 'novaSenha123');
      expect(mockMarkResetCodeUsed).toHaveBeenCalledWith('user-1', '123456');
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, message: expect.stringContaining('atualizada') })
      );
    });

    it('não permite reusar código já utilizado', async () => {
      // Primeiro uso: sucesso
      mockVerifyPasswordResetCode.mockResolvedValue({ valid: true, userId: 'user-1' });
      mockUpdatePassword.mockResolvedValue(undefined);
      mockMarkResetCodeUsed.mockResolvedValue(undefined);

      const { req: req1, res: res1 } = mockReqRes({
        email: 'maria@test.com', code: '123456', newPassword: 'novaSenha1',
      });
      await controller.resetPassword(req1, res1);
      expect(res1.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));

      // Segundo uso: código já marcado como usado
      mockVerifyPasswordResetCode.mockResolvedValue({ valid: false, userId: null });
      const { req: req2, res: res2 } = mockReqRes({
        email: 'maria@test.com', code: '123456', newPassword: 'novaSenha2',
      });
      await controller.resetPassword(req2, res2);
      expect(res2.status).toHaveBeenCalledWith(400);
    });

    it('retorna erro 500 se ocorrer exceção interna', async () => {
      mockVerifyPasswordResetCode.mockRejectedValue(new Error('DB down'));
      const { req, res } = mockReqRes({
        email: 'a@b.com', code: '123456', newPassword: 'nova123456',
      });
      await controller.resetPassword(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ── changePassword ────────────────────────────────────────────────────────

  describe('changePassword', () => {
    it('retorna erro quando campos obrigatórios faltam', async () => {
      const cases = [
        { currentPassword: 'abc123' },
        { newPassword: 'nova123' },
        {},
      ];
      for (const body of cases) {
        const { req, res } = mockReqRes(body, 'user-1');
        await controller.changePassword(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({ error: expect.stringContaining('obrigatórias') })
        );
      }
    });

    it('retorna erro quando nova senha tem menos de 6 caracteres', async () => {
      const { req, res } = mockReqRes(
        { currentPassword: 'senhaAtual', newPassword: '12345' },
        'user-1',
      );
      await controller.changePassword(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining('6 caracteres') })
      );
    });

    it('retorna erro quando usuário não é encontrado', async () => {
      mockFindByIdFull.mockResolvedValue(null);
      const { req, res } = mockReqRes(
        { currentPassword: 'senhaAtual', newPassword: 'nova123456' },
        'user-inexistente',
      );
      await controller.changePassword(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('retorna erro quando senha atual está incorreta', async () => {
      mockFindByIdFull.mockResolvedValue({
        id: 'user-1',
        email: 'maria@test.com',
        passwordHash: 'hash-antigo',
      });
      mockVerifyPassword.mockResolvedValue(false);

      const { req, res } = mockReqRes(
        { currentPassword: 'senhaErrada', newPassword: 'nova123456' },
        'user-1',
      );
      await controller.changePassword(req, res);

      expect(mockVerifyPassword).toHaveBeenCalledWith('senhaErrada', 'hash-antigo');
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining('incorreta') })
      );
      expect(mockUpdatePassword).not.toHaveBeenCalled();
    });

    it('altera a senha com sucesso quando dados são válidos', async () => {
      mockFindByIdFull.mockResolvedValue({
        id: 'user-1',
        email: 'maria@test.com',
        passwordHash: 'hash-antigo',
      });
      mockVerifyPassword.mockResolvedValue(true);
      mockUpdatePassword.mockResolvedValue(undefined);

      const { req, res } = mockReqRes(
        { currentPassword: 'senhaCorreta', newPassword: 'novaSenha123' },
        'user-1',
      );
      await controller.changePassword(req, res);

      expect(mockVerifyPassword).toHaveBeenCalledWith('senhaCorreta', 'hash-antigo');
      expect(mockUpdatePassword).toHaveBeenCalledWith('user-1', 'novaSenha123');
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, message: expect.stringContaining('alterada') })
      );
    });

    it('retorna erro 500 se ocorrer exceção interna', async () => {
      mockFindByIdFull.mockRejectedValue(new Error('DB down'));
      const { req, res } = mockReqRes(
        { currentPassword: 'abc', newPassword: 'nova123456' },
        'user-1',
      );
      await controller.changePassword(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ── deleteAccount ─────────────────────────────────────────────────────────

  describe('deleteAccount', () => {
    it('exclui a conta com sucesso', async () => {
      mockDeleteUser.mockResolvedValue(true);
      const { req, res } = mockReqRes({}, 'user-1');
      await controller.deleteAccount(req, res);

      expect(mockDeleteUser).toHaveBeenCalledWith('user-1');
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, message: expect.stringContaining('excluída') })
      );
    });

    it('retorna 404 quando usuário não é encontrado', async () => {
      mockDeleteUser.mockResolvedValue(false);
      const { req, res } = mockReqRes({}, 'user-inexistente');
      await controller.deleteAccount(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining('não encontrado') })
      );
    });

    it('retorna erro 500 se ocorrer exceção interna', async () => {
      mockDeleteUser.mockRejectedValue(new Error('DB down'));
      const { req, res } = mockReqRes({}, 'user-1');
      await controller.deleteAccount(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining('excluir') })
      );
    });
  });
});
