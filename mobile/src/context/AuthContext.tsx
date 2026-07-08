import React, { createContext, useContext } from 'react';

interface AuthContextType {
  logout: () => void;
  deleteAccount: () => Promise<void>;
  goToRegister: () => void;
  companyName: string;
  isDemoMode: boolean;
  companyLogo: string | null;
  setCompanyLogo: (logo: string | null) => void;
  /** Nome da empresa que o admin está impersonando ("ver como"), ou null. */
  impersonatedCompany: string | null;
  /** Admin: entra no app como o usuário-alvo (troca a sessão). */
  startImpersonation: (userId: string) => Promise<void>;
  /** Sai do modo "ver como empresa" e restaura a sessão admin. */
  stopImpersonation: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  logout: () => {},
  deleteAccount: async () => {},
  goToRegister: () => {},
  companyName: '',
  isDemoMode: false,
  companyLogo: null,
  setCompanyLogo: () => {},
  impersonatedCompany: null,
  startImpersonation: async () => {},
  stopImpersonation: async () => {},
});

export const useAuth = () => useContext(AuthContext);
