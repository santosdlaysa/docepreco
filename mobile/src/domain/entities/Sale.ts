export type PaymentMethod = 'dinheiro' | 'cartao' | 'credito' | 'debito' | 'pix';

export interface Sale {
  id: string;
  recipeId: string | null;
  recipeName: string;
  quantitySold: number;
  salePrice: number;
  totalRevenue: number;
  discount: number;
  saleDate: string;
  /** Cliente da venda (opcional): "vendido para fulano". */
  clientName?: string | null;
  notes?: string;
  paymentMethod?: PaymentMethod | null;
  orderId?: string | null;
  createdAt: string;
}

export interface CreateSaleDTO {
  recipeId: string | null;
  /** Obrigatório quando recipeId é null (produto avulso sem receita). */
  productName?: string | null;
  quantitySold: number;
  salePrice: number;
  /** Valor do desconto já resolvido em R$ (não percentual). */
  discount?: number;
  saleDate: string;
  /** Cliente da venda (opcional). */
  clientName?: string | null;
  notes?: string;
  paymentMethod?: PaymentMethod | null;
}
