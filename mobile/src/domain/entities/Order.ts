export type OrderStatus = 'pending' | 'in_progress' | 'done' | 'delivered';

export interface Order {
  id: string;
  clientName: string;
  clientPhone?: string;
  recipeId?: string;
  recipeName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  deliveryDate: string; // YYYY-MM-DD
  deliveryTime?: string; // HH:mm
  status: OrderStatus;
  paid?: boolean;
  paidAmount?: number;
  paymentMethod?: 'pix' | 'cash' | 'credit' | 'debit' | 'transfer' | 'other';
  notes?: string;
  createdAt: string;
}
