export interface User {
  id: string;
  companyName: string;
  email: string;
  createdAt: string;
}

export interface RegisterDTO {
  companyName: string;
  email: string;
  password: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}
