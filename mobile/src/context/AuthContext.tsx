import React, { createContext, useContext } from 'react';

interface AuthContextType {
  logout: () => void;
  goToRegister: () => void;
  companyName: string;
  isDemoMode: boolean;
  companyLogo: string | null;
  setCompanyLogo: (logo: string | null) => void;
}

export const AuthContext = createContext<AuthContextType>({
  logout: () => {},
  goToRegister: () => {},
  companyName: '',
  isDemoMode: false,
  companyLogo: null,
  setCompanyLogo: () => {},
});

export const useAuth = () => useContext(AuthContext);
