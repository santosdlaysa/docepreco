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

  // Restaura sessão no carregamento (valida o token via /auth/me).
  // Antes disso, trata o SSO vindo do app mobile: um `?code=...` na URL é trocado
  // por uma sessão real e removido da URL (não deixa o código exposto no histórico).
  useEffect(() => {
    let active = true;
    (async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      if (code) {
        params.delete('code');
        const qs = params.toString();
        window.history.replaceState({}, '', window.location.pathname + (qs ? `?${qs}` : ''));
        try {
          const { user, token } = await userApi.webHandoffExchange(code);
          saveToken(token);
          if (active) {
            setUser(user);
            setLoading(false);
          }
          return;
        } catch {
          // Código inválido/expirado → segue para o fluxo normal (sessão salva ou login).
        }
      }

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
