export interface Sale {
  id: string;
  recipeId: string;
  recipeName: string;
  quantitySold: number;
  salePrice: number;
  totalRevenue: number;
  saleDate: string;
  notes?: string;
  createdAt: string;
}

export interface CreateSaleDTO {
  recipeId: string;
  quantitySold: number;
  salePrice: number;
  saleDate: string;
  notes?: string;
}
