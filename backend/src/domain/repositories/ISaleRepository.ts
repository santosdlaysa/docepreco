import { Sale, CreateSaleDTO } from '../entities/Sale';

export interface ISaleRepository {
  findAll(userId: string, startDate?: string): Promise<Sale[]>;
  findById(id: string, userId: string): Promise<Sale | null>;
  create(data: CreateSaleDTO, userId: string): Promise<Sale>;
  update(id: string, data: CreateSaleDTO, userId: string): Promise<Sale | null>;
  delete(id: string, userId: string): Promise<boolean>;
}
