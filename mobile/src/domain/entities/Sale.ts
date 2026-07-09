export interface Sale {
  id: string;
  recipeId: string | null;
  recipeName: string;
  quantitySold: number;
  salePrice: number;
  totalRevenue: number;
  saleDate: string;
  notes?: string;
  orderId?: string | null;
  createdAt: string;
}

export interface CreateSaleDTO {
  recipeId: string | null;
  /** Obrigatório quando recipeId é null (produto avulso sem receita). */
  productName?: string | null;
  quantitySold: number;
  salePrice: number;
  saleDate: string;
  notes?: string;
}
