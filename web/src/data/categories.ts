export interface FoodCategory {
  key: string;
  label: string;
  emoji: string;
}

export const FOOD_CATEGORIES: FoodCategory[] = [
  { key: 'hamburguer', label: 'Hambúrguer', emoji: '🍔' },
  { key: 'bolos', label: 'Bolos', emoji: '🎂' },
  { key: 'doces', label: 'Doces', emoji: '🍬' },
  { key: 'sorvetes', label: 'Sorvetes', emoji: '🍦' },
  { key: 'pudins', label: 'Pudins', emoji: '🍮' },
  { key: 'salgados', label: 'Salgados', emoji: '🥟' },
  { key: 'bebidas', label: 'Bebidas', emoji: '🥤' },
  { key: 'pizzas', label: 'Pizzas', emoji: '🍕' },
  { key: 'marmitas', label: 'Marmitas', emoji: '🍱' },
  { key: 'outros', label: 'Outros', emoji: '🍽️' },
];
