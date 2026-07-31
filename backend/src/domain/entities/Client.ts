export interface Client {
  id: string;
  userId: string;
  name: string;
  phone: string | null;
  email: string | null;
  /** Aniversário no formato "MM-DD" (sem ano). */
  birthday: string | null;
  address: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateClientDTO {
  name: string;
  phone?: string | null;
  email?: string | null;
  birthday?: string | null;
  address?: string | null;
  notes?: string | null;
}
