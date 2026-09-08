const findAll = jest.fn();
const findById = jest.fn();
const create = jest.fn();

jest.mock('../infrastructure/repositories/PostgresPurchaseInvoiceRepository', () => ({
  PostgresPurchaseInvoiceRepository: jest.fn().mockImplementation(() => ({ findAll, findById, create })),
}));

import { PurchaseInvoiceController } from '../presentation/controllers/PurchaseInvoiceController';

function response() {
  const res: any = { locals: {}, statusCode: 200 };
  res.status = jest.fn((code: number) => { res.statusCode = code; return res; });
  res.json = jest.fn((body: unknown) => { res.body = body; return res; });
  return res;
}

describe('PurchaseInvoiceController', () => {
  const controller = new PurchaseInvoiceController();
  beforeEach(() => jest.clearAllMocks());

  it('lista as compras do mês do usuário autenticado', async () => {
    findAll.mockResolvedValue([{ id: 'purchase-1' }]);
    const req: any = { userId: 'user-1', query: { month: '2026-09' } };
    const res = response();
    await controller.getAll(req, res);
    expect(findAll).toHaveBeenCalledWith('user-1', '2026-09');
    expect(res.body.data).toEqual([{ id: 'purchase-1' }]);
  });

  it('rejeita item sem quantidade ou valor válido', async () => {
    const req: any = { userId: 'user-1', body: {
      supplier: 'Fornecedor', purchaseDate: '2026-09-08', items: [
        { ingredientId: 'ingredient-1', quantity: 0, total: 10, unit: 'g' },
      ],
    } };
    const res = response();
    await controller.create(req, res);
    expect(res.statusCode).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });

  it('cria a nota convertendo valores numéricos', async () => {
    create.mockResolvedValue({ id: 'purchase-1', total: 15 });
    const req: any = { userId: 'user-1', body: {
      supplier: 'Fornecedor', documentNumber: '123', purchaseDate: '2026-09-08',
      paymentStatus: 'paid', discount: '1', freight: '2',
      items: [{ ingredientId: 'ingredient-1', quantity: '500', total: '14', unit: 'g', updateIngredientPrice: true }],
    } };
    const res = response();
    await controller.create(req, res);
    expect(res.statusCode).toBe(201);
    expect(create).toHaveBeenCalledWith('user-1', expect.objectContaining({
      discount: 1, freight: 2,
      items: [expect.objectContaining({ quantity: 500, total: 14 })],
    }));
  });
});
