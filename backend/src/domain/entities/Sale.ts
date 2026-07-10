export type PaymentMethod = 'dinheiro' | 'cartao' | 'credito' | 'debito' | 'pix';

export interface Sale {
  id: string;
  recipeId: string | null;
  /** Nome exibido: nome da receita ou, na falta dela, o nome do produto da loja. */
  recipeName: string;
  quantitySold: number;
  salePrice: number;
  totalRevenue: number;
  discount: number;
  saleDate: string;
  notes?: string;
  paymentMethod?: PaymentMethod | null;
  orderId?: string | null;
  createdAt: string;
}

export interface CreateSaleDTO {
  recipeId: string | null;
  /** Obrigatório quando não há receita (produto da loja sem receita vinculada). */
  productName?: string | null;
  quantitySold: number;
  salePrice: number;
  /** Valor do desconto já resolvido em R$ (não percentual). */
  discount?: number;
  saleDate: string;
  notes?: string;
  paymentMethod?: PaymentMethod | null;
  orderId?: string | null;
}
