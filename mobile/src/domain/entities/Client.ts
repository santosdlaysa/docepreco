export interface Client {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  birthday?: string; // MM-DD
  address?: string;
  notes?: string;
  createdAt: string;
}
