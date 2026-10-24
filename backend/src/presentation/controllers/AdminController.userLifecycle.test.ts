import { Request, Response } from 'express';
import { pool } from '../../infrastructure/database/connection';
import { PostgresUserRepository } from '../../infrastructure/repositories/PostgresUserRepository';
import { AdminController } from './AdminController';

jest.mock('../../infrastructure/database/connection', () => ({ pool: { query: jest.fn() } }));
jest.mock('../../infrastructure/services/emailService', () => ({ sendBulkUpdateEmail: jest.fn() }));
jest.mock('../../infrastructure/services/pushService', () => ({ sendPushNotifications: jest.fn() }));
jest.mock('../../infrastructure/repositories/PostgresUserRepository', () => ({
  PostgresUserRepository: jest.fn().mockImplementation(() => ({ delete: jest.fn() })),
}));

const query = pool.query as jest.Mock;
const userId = '36beb087-1ba2-491b-b62f-ccf860d2a75c';

function response() {
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
  return res as unknown as Response & typeof res;
}

describe('AdminController.deleteInactiveUser', () => {
  const controller = new AdminController();
  const deleteUser = (PostgresUserRepository as jest.Mock).mock.results[0].value.delete as jest.Mock;
  const req = { params: { id: userId } } as unknown as Request;

  beforeEach(() => {
    query.mockReset();
    deleteUser.mockReset();
    deleteUser.mockResolvedValue(true);
  });

  it('bloqueia conta com atividade recente', async () => {
    query.mockResolvedValue({ rowCount: 1, rows: [{ inactive: false, activeSubscription: false }] });
    const res = response();
    await controller.deleteInactiveUser(req, res);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it('bloqueia conta com assinatura ativa mesmo sem acesso recente', async () => {
    query.mockResolvedValue({ rowCount: 1, rows: [{ inactive: true, activeSubscription: true }] });
    const res = response();
    await controller.deleteInactiveUser(req, res);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it('exclui uma conta elegível', async () => {
    query.mockResolvedValue({ rowCount: 1, rows: [{ inactive: true, activeSubscription: false }] });
    const res = response();
    await controller.deleteInactiveUser(req, res);
    expect(deleteUser).toHaveBeenCalledWith(userId, true);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: { userId } });
  });
});
