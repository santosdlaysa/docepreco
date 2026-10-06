import { useEffect, useRef, useState } from 'react';
import { req, saveToken, AuthUser } from './userApi';
import { useAuth } from './UserAuthContext';

/**
 * Entrar com Google (Google Identity Services). Usa o MESMO "web client ID" do
 * app (EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID) — o backend valida o token contra
 * GOOGLE_CLIENT_IDS. Sem VITE_GOOGLE_CLIENT_ID o botão não aparece.
 * No Google Cloud Console, docepreco.site precisa estar em "Origens JavaScript autorizadas".
 */
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
export const googleSignInEnabled = Boolean(CLIENT_ID);

interface GoogleId {
  accounts: {
    id: {
      initialize: (opts: { client_id: string; callback: (r: { credential?: string }) => void }) => void;
      renderButton: (el: HTMLElement, opts: Record<string, unknown>) => void;
    };
  };
}
declare global {
  interface Window { google?: GoogleId }
}

let scriptPromise: Promise<void> | null = null;
function loadScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  scriptPromise ??= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => { scriptPromise = null; reject(new Error('Não foi possível carregar o login do Google.')); };
    document.head.appendChild(s);
  });
  return scriptPromise;
}

export function GoogleSignInButton({ onError }: { onError: (msg: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const { setUser } = useAuth();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!CLIENT_ID) return;
    let active = true;
    loadScript()
      .then(() => {
        if (!active || !ref.current || !window.google) return;
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: async ({ credential }) => {
            if (!credential) return onError('Login com Google cancelado.');
            setBusy(true);
            try {
              const { user, token } = await req<{ user: AuthUser; token: string; isNew?: boolean }>('/auth/social', {
                method: 'POST',
                body: JSON.stringify({ provider: 'google', idToken: credential, platform: 'web' }),
              });
              saveToken(token);
              setUser(user);
            } catch (err) {
              onError((err as Error).message || 'Não foi possível entrar com o Google.');
            } finally {
              setBusy(false);
            }
          },
        });
        window.google.accounts.id.renderButton(ref.current, {
          theme: 'outline', size: 'large', text: 'continue_with', shape: 'rectangular', width: 320, locale: 'pt-BR',
        });
      })
      .catch(err => onError((err as Error).message));
    return () => { active = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!CLIENT_ID) return null;
  return (
    <div className={`flex justify-center ${busy ? 'opacity-50 pointer-events-none' : ''}`}>
      <div ref={ref} />
    </div>
  );
}
