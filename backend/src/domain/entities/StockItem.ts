export interface StockItem {
  id: string;
  userId: string;
  ingredientId: string;
  /** Saldo atual, na unidade base do ingrediente. */
  quantity: number;
  /** Estoque mínimo para alerta de reposição (0 = sem alerta). */
  minQuantity: number;
  unit: string;
  updatedAt: string;
}

export type StockMovementType = 'set' | 'in' | 'out';

export interface StockMovement {
  id: string;
  ingredientId: string;
  type: StockMovementType;
  /** Magnitude do movimento (sempre positivo). */
  quantity: number;
  /** Saldo resultante após o movimento. */
  balance: number;
  reason: string | null;
  createdAt: string;
}

export interface StockDeductItem {
  ingredientId: string;
  quantity: number;
  reason?: string | null;
}

export interface LowStockAlert {
  ingredientId: string;
  balance: number;
  minQuantity: number;
}
