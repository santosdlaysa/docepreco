export type OrderStatus = 'pending' | 'in_progress' | 'done' | 'delivered' | 'cancelled';

export type PaymentMethodType = 'pix' | 'cash' | 'credit' | 'debit';

export interface OrderPayment {
  id: string;
  amount: number;
  method: PaymentMethodType;
  date: string; // YYYY-MM-DD
}

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
  payments?: OrderPayment[];
  notes?: string;
  createdAt: string;
}
