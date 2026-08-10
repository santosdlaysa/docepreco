import { Router, Request, Response } from 'express';

const router = Router();

/**
 * Versão do app publicada nas lojas.
 *
 * Controlado por variáveis de ambiente para que o alerta de "atualize o app"
 * possa ser disparado/ajustado SEM precisar publicar um build novo:
 *
 *  - APP_ANDROID_LATEST_VERSION_CODE: versionCode da última versão publicada.
 *      Se o versionCode instalado for MENOR que este, o app mostra um aviso
 *      dispensável ("Nova versão disponível").
 *  - APP_ANDROID_MIN_VERSION_CODE: versionCode mínimo suportado (bloqueante).
 *      0 = nunca bloqueia. Reservado para uso futuro; hoje o app trata como aviso.
 *  - APP_ANDROID_STORE_URL: link da Play Store (fallback abaixo).
 *
 * GET /api/app-version
 */
router.get('/', (_req: Request, res: Response) => {
  const latestVersionCode = Number(process.env.APP_ANDROID_LATEST_VERSION_CODE) || 85;
  const minVersionCode = Number(process.env.APP_ANDROID_MIN_VERSION_CODE) || 0;
  const storeUrl =
    process.env.APP_ANDROID_STORE_URL ||
    'https://play.google.com/store/apps/details?id=com.orgenyx';

  res.json({
    android: {
      latestVersionCode,
      minVersionCode,
      storeUrl,
    },
  });
});

export default router;
