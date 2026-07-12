import {
  Cake,
  Candy,
  Croissant,
  CupSoda,
  Dessert,
  Hamburger,
  IceCreamCone,
  Pizza,
  Utensils,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react';

export interface FoodCategory {
  key: string;
  label: string;
  icon: LucideIcon;
}

export const FOOD_CATEGORIES: FoodCategory[] = [
  { key: 'hamburguer', label: 'Hambúrguer', icon: Hamburger },
  { key: 'bolos', label: 'Bolos', icon: Cake },
  { key: 'doces', label: 'Doces', icon: Candy },
  { key: 'sorvetes', label: 'Sorvetes', icon: IceCreamCone },
  { key: 'pudins', label: 'Pudins', icon: Dessert },
  { key: 'salgados', label: 'Salgados', icon: Croissant },
  { key: 'bebidas', label: 'Bebidas', icon: CupSoda },
  { key: 'pizzas', label: 'Pizzas', icon: Pizza },
  { key: 'marmitas', label: 'Marmitas', icon: UtensilsCrossed },
  { key: 'outros', label: 'Outros', icon: Utensils },
];
