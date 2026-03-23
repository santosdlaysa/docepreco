import React, { createContext, useContext } from 'react';

interface AuthContextType {
  logout: () => void;
  companyName: string;
}

export const AuthContext = createContext<AuthContextType>({
  logout: () => {},
  companyName: '',
});

export const useAuth = () => useContext(AuthContext);
