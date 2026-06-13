import { apiClient } from './client';

export type ExpenseCostType = 'fixed' | 'variable';

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
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
  category: string;
  costType: ExpenseCostType;
  isRecurring: boolean;
  recurrenceDay?: number | null;
  expenseDate: string;
  notes?: string | null;
}

export const EXPENSE_CATEGORIES: { key: string; label: string }[] = [
  { key: 'aluguel', label: 'Aluguel' },
  { key: 'energia', label: 'Energia' },
  { key: 'agua', label: 'Água' },
  { key: 'internet', label: 'Internet' },
  { key: 'embalagem', label: 'Embalagem' },
  { key: 'marketing', label: 'Marketing' },
  { key: 'transporte', label: 'Transporte' },
  { key: 'equipamento', label: 'Equipamento' },
  { key: 'funcionario', label: 'Funcionário' },
  { key: 'outros', label: 'Outros' },
];

export const expenseApi = {
  getAll: async (month?: string): Promise<Expense[]> => {
    const params = month ? { month } : {};
    const res = await apiClient.get('/expenses', { params });
    return res.data.data;
  },

  create: async (data: CreateExpenseDTO): Promise<Expense> => {
    const res = await apiClient.post('/expenses', data);
    return res.data.data;
  },

  update: async (id: string, data: Partial<CreateExpenseDTO>): Promise<Expense> => {
    const res = await apiClient.put(`/expenses/${id}`, data);
    return res.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/expenses/${id}`);
  },

  getSummary: async (month: string): Promise<{ totalExpenses: number; byCategory: { category: string; total: number }[] }> => {
    const res = await apiClient.get('/expenses/summary', { params: { month } });
    return res.data.data;
  },
};
