import type { Sale } from '../entities/Sale';

export function localSalesDate(date = new Date()): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function salesOnDate(sales: Sale[], date: string): Sale[] {
  return sales.filter(sale => sale.saleDate === date);
}

export function sumSaleRevenue(sales: Sale[]): number {
  return sales.reduce((sum, sale) => sum + sale.totalRevenue, 0);
}
