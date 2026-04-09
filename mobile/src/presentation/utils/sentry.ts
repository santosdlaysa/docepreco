import * as Sentry from '@sentry/react-native';

const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

let initialized = false;

export function initSentry(): void {
  if (initialized) return;
  if (!DSN) {
    // No DSN configured — skip silently so dev builds don't crash.
    return;
  }
  Sentry.init({
    dsn: DSN,
    // Captura 100% dos erros; ajuste se quiser amostragem
    tracesSampleRate: 0.2,
    // Em dev, não queremos enviar erros pro Sentry
    enabled: !__DEV__,
    // Evita enviar dados pessoais automaticamente
    sendDefaultPii: false,
  });
  initialized = true;
}

export function captureError(error: unknown, context?: Record<string, unknown>): void {
  if (!initialized) return;
  if (context) {
    Sentry.withScope(scope => {
      Object.entries(context).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
      Sentry.captureException(error);
    });
  } else {
    Sentry.captureException(error);
  }
}

export function setUserContext(user: { id?: string; companyName?: string } | null): void {
  if (!initialized) return;
  if (user) {
    Sentry.setUser({ id: user.id, username: user.companyName });
  } else {
    Sentry.setUser(null);
  }
}

export { Sentry };
