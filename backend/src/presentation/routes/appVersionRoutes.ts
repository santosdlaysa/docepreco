import { Router, Request, Response } from 'express';

const router = Router();

/**
 * Versão do app publicada nas lojas.
 *
 * Controlado por variáveis de ambiente para que o alerta de "atualize o app"
 * possa ser disparado/ajustado SEM precisar publicar um build novo:
 *
 *  - APP_{ANDROID,IOS}_LATEST_VERSION_CODE: build mais recente publicado.
 *      Uma instalação anterior recebe um aviso de atualização ao abrir o app.
 *  - APP_{ANDROID,IOS}_MIN_VERSION_CODE: build mínimo suportado.
 *      Abaixo deste número, a atualização passa a ser obrigatória.
 *  - APP_{ANDROID,IOS}_STORE_URL: link da loja correspondente.
 *
 * GET /api/app-version
 */
router.get('/', (_req: Request, res: Response) => {
  const androidStoreUrl =
    process.env.APP_ANDROID_STORE_URL ||
    'https://play.google.com/store/apps/details?id=com.orgenyx';
  const iosStoreUrl =
    process.env.APP_IOS_STORE_URL ||
    'https://apps.apple.com/us/app/docepre%C3%A7o/id6761034172';

  res.json({
    android: {
      latestVersionCode: Number(process.env.APP_ANDROID_LATEST_VERSION_CODE) || 98,
      minVersionCode: Number(process.env.APP_ANDROID_MIN_VERSION_CODE) || 0,
      storeUrl: androidStoreUrl,
    },
    ios: {
      latestVersionCode: Number(process.env.APP_IOS_LATEST_VERSION_CODE) || 44,
      minVersionCode: Number(process.env.APP_IOS_MIN_VERSION_CODE) || 0,
      storeUrl: iosStoreUrl,
    },
  });
});

export default router;
