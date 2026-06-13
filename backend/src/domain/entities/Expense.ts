export type ExpenseCostType = 'fixed' | 'variable';

export const EXPENSE_CATEGORIES = [
  'aluguel', 'energia', 'agua', 'internet', 'embalagem',
  'marketing', 'transporte', 'equipamento', 'funcionario', 'outros',
] as const;

export type ExpenseCategory = typeof EXPENSE_CATEGORIES[number];

export interface Expense {
  id: string;
  userId: string;
  description: string;
  amount: number;
  category: ExpenseCategory;
  costType: ExpenseCostType;
  isRecurring: boolean;
  recurrenceDay: number | null;
  expenseDate: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateExpenseDTO {
  description: string;
  amount: number;
  category: ExpenseCategory;
  costType: ExpenseCostType;
  isRecurring: boolean;
  recurrenceDay?: number | null;
  expenseDate: string;
  notes?: string | null;
}
