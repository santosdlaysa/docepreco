import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { userApi, loadToken, saveToken, clearToken, setOnUnauthorized, AuthUser } from './userApi';

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (companyName: string, email: string, password: string, phone?: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
  setUser: (u: AuthUser) => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function UserAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  // Logout automático quando o backend rejeita o token
  useEffect(() => {
    setOnUnauthorized(() => setUser(null));
  }, []);

  // Restaura sessão no carregamento (valida o token via /auth/me)
  useEffect(() => {
    let active = true;
    (async () => {
      if (!loadToken()) {
        setLoading(false);
        return;
      }
      try {
        const me = await userApi.me();
        if (active) setUser(me);
      } catch {
        clearToken();
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { user, token } = await userApi.login(email, password);
    saveToken(token);
    setUser(user);
  }, []);

  const register = useCallback(
    async (companyName: string, email: string, password: string, phone?: string) => {
      const { user, token } = await userApi.register(companyName, email, password, phone);
      saveToken(token);
      setUser(user);
    },
    []
  );

  const refresh = useCallback(async () => {
    const me = await userApi.me();
    setUser(me);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refresh, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de UserAuthProvider');
  return ctx;
}
