import React, { createContext, useContext } from 'react';

interface AuthContextType {
  logout: () => void;
  companyName: string;
  isDemoMode: boolean;
}

export const AuthContext = createContext<AuthContextType>({
  logout: () => {},
  companyName: '',
  isDemoMode: false,
});

export const useAuth = () => useContext(AuthContext);
