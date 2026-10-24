import { Request, Response } from 'express';
import { pool } from '../../infrastructure/database/connection';
import { PostgresUserRepository } from '../../infrastructure/repositories/PostgresUserRepository';
import { AdminController } from './AdminController';
import { sendReturnAccessEmail } from '../../infrastructure/services/emailService';

jest.mock('../../infrastructure/database/connection', () => ({ pool: { query: jest.fn() } }));
jest.mock('../../infrastructure/services/emailService', () => ({ sendBulkUpdateEmail: jest.fn(), sendReturnAccessEmail: jest.fn() }));
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

describe('AdminController.sendReturnAccess', () => {
  const controller = new AdminController();
  const send = sendReturnAccessEmail as jest.Mock;

  beforeEach(() => { query.mockReset(); send.mockReset(); send.mockResolvedValue(undefined); });

  it('reativa a conta antes de enviar as instruções de acesso', async () => {
    query.mockResolvedValueOnce({ rowCount: 1, rows: [{ email: 'cliente@example.com', company_name: 'Doces', isActive: false }] });
    query.mockResolvedValueOnce({ rowCount: 1 });
    const res = response();
    await controller.sendReturnAccess({ params: { id: userId }, body: {} } as unknown as Request, res);
    expect(query).toHaveBeenNthCalledWith(2, 'UPDATE users SET is_active = TRUE WHERE id = $1', [userId]);
    expect(send).toHaveBeenCalledWith('cliente@example.com', 'Doces', false);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: { email: 'cliente@example.com', reactivated: true } });
  });

  it('exige e-mail para o registro excluído', async () => {
    const res = response();
    await controller.sendReturnAccess({ params: { id: userId }, body: { deleted: true, email: 'inválido' } } as unknown as Request, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(query).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it('envia convite para novo cadastro sem recriar os dados excluídos', async () => {
    query.mockResolvedValue({ rowCount: 1, rows: [{ company_name: 'Doces' }] });
    const res = response();
    await controller.sendReturnAccess({ params: { id: userId }, body: { deleted: true, email: 'cliente@example.com' } } as unknown as Request, res);
    expect(send).toHaveBeenCalledWith('cliente@example.com', 'Doces', true);
    expect(query).toHaveBeenCalledTimes(1);
  });
});
