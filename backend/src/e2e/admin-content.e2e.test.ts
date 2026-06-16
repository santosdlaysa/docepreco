import express, { Router } from 'express';
import request from 'supertest';

type RepoMock = {
  findAll: jest.Mock;
  findActive: jest.Mock;
  create: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
};

const makeRepo = (): RepoMock => ({
  findAll: jest.fn(),
  findActive: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
});

const repos = {
  banner: makeRepo(),
  category: makeRepo(),
  changelog: makeRepo(),
  faq: makeRepo(),
  featureFlag: makeRepo(),
  featuredRecipe: makeRepo(),
  globalIngredient: makeRepo(),
  onboarding: makeRepo(),
  telegramAlert: makeRepo(),
  tip: makeRepo(),
};

jest.mock('../infrastructure/database/connection', () => ({
  pool: { query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }) },
}));
jest.mock('../infrastructure/repositories/PostgresBannerRepository', () => ({
  PostgresBannerRepository: jest.fn(() => repos.banner),
}));
jest.mock('../infrastructure/repositories/PostgresCategoryRepository', () => ({
  PostgresCategoryRepository: jest.fn(() => repos.category),
}));
jest.mock('../infrastructure/repositories/PostgresChangelogRepository', () => ({
  PostgresChangelogRepository: jest.fn(() => repos.changelog),
}));
jest.mock('../infrastructure/repositories/PostgresFaqRepository', () => ({
  PostgresFaqRepository: jest.fn(() => repos.faq),
}));
jest.mock('../infrastructure/repositories/PostgresFeatureFlagRepository', () => ({
  PostgresFeatureFlagRepository: jest.fn(() => repos.featureFlag),
}));
jest.mock('../infrastructure/repositories/PostgresFeaturedRecipeRepository', () => ({
  PostgresFeaturedRecipeRepository: jest.fn(() => repos.featuredRecipe),
}));
jest.mock('../infrastructure/repositories/PostgresGlobalIngredientRepository', () => ({
  PostgresGlobalIngredientRepository: jest.fn(() => repos.globalIngredient),
}));
jest.mock('../infrastructure/repositories/PostgresOnboardingRepository', () => ({
  PostgresOnboardingRepository: jest.fn(() => repos.onboarding),
}));
jest.mock('../infrastructure/repositories/PostgresTelegramAlertRepository', () => ({
  PostgresTelegramAlertRepository: jest.fn(() => repos.telegramAlert),
}));
jest.mock('../infrastructure/repositories/PostgresTipRepository', () => ({
  PostgresTipRepository: jest.fn(() => repos.tip),
}));

import bannerRoutes from '../presentation/routes/bannerRoutes';
import categoryRoutes from '../presentation/routes/categoryRoutes';
import changelogRoutes from '../presentation/routes/changelogRoutes';
import faqRoutes from '../presentation/routes/faqRoutes';
import featureFlagRoutes from '../presentation/routes/featureFlagRoutes';
import featuredRecipeRoutes from '../presentation/routes/featuredRecipeRoutes';
import globalIngredientRoutes from '../presentation/routes/globalIngredientRoutes';
import onboardingRoutes from '../presentation/routes/onboardingRoutes';
import telegramAlertRoutes from '../presentation/routes/telegramAlertRoutes';
import tipRoutes from '../presentation/routes/tipRoutes';

type CrudConfig = {
  name: string;
  base: string;
  router: Router;
  repo: RepoMock;
  validBody: Record<string, unknown>;
  hasActive?: boolean;
  activeUsesFindAll?: boolean;
};

const configs: CrudConfig[] = [
  {
    name: 'banners',
    base: '/banners',
    router: bannerRoutes,
    repo: repos.banner,
    validBody: { title: 'Aviso', message: 'Mensagem', type: 'info' },
    hasActive: true,
  },
  {
    name: 'categorias',
    base: '/categories',
    router: categoryRoutes,
    repo: repos.category,
    validBody: { name: 'Bolos' },
    hasActive: true,
  },
  {
    name: 'changelog',
    base: '/changelog',
    router: changelogRoutes,
    repo: repos.changelog,
    validBody: { version: '2.13.0', title: 'Novidades' },
    hasActive: true,
  },
  {
    name: 'FAQ',
    base: '/faq',
    router: faqRoutes,
    repo: repos.faq,
    validBody: { question: 'Como usar?', answer: 'Assim.' },
    hasActive: true,
  },
  {
    name: 'feature flags',
    base: '/feature-flags',
    router: featureFlagRoutes,
    repo: repos.featureFlag,
    validBody: { key: 'new_orders' },
    hasActive: true,
  },
  {
    name: 'receitas em destaque',
    base: '/featured-recipes',
    router: featuredRecipeRoutes,
    repo: repos.featuredRecipe,
    validBody: { name: 'Brigadeiro' },
    hasActive: true,
  },
  {
    name: 'ingredientes globais',
    base: '/global-ingredients',
    router: globalIngredientRoutes,
    repo: repos.globalIngredient,
    validBody: { name: 'Farinha', price: 10, unit: 'kg' },
    hasActive: true,
    activeUsesFindAll: true,
  },
  {
    name: 'onboarding',
    base: '/onboarding',
    router: onboardingRoutes,
    repo: repos.onboarding,
    validBody: { title: 'Comece aqui' },
    hasActive: true,
  },
  {
    name: 'alertas do Telegram',
    base: '/telegram-alerts',
    router: telegramAlertRoutes,
    repo: repos.telegramAlert,
    validBody: { key: 'new_sale', label: 'Nova venda' },
  },
  {
    name: 'dicas',
    base: '/tips',
    router: tipRoutes,
    repo: repos.tip,
    validBody: { message: 'Calcule seus custos.' },
    hasActive: true,
  },
];

function appFor(config: CrudConfig) {
  const app = express();
  app.use(express.json());
  app.use(config.base, config.router);
  return app;
}

function admin(req: request.Test) {
  return req.set('x-admin-secret', 'admin-content-secret');
}

beforeAll(() => {
  process.env.DOCEPRECO_ADMIN_SECRET = 'admin-content-secret';
  process.env.JWT_SECRET = 'admin-content-jwt';
});

beforeEach(() => {
  for (const repo of Object.values(repos)) {
    for (const method of Object.values(repo)) method.mockReset();
  }
});

describe.each(configs)('CRUD funcional: $name', (config) => {
  it('lista os registros com credencial administrativa', async () => {
    config.repo.findAll.mockResolvedValue([{ id: 'item-1' }]);

    const res = await admin(request(appFor(config)).get(config.base));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: [{ id: 'item-1' }] });
  });

  if (config.hasActive) {
    it('lista os registros ativos sem credencial administrativa', async () => {
      const method = config.activeUsesFindAll ? config.repo.findAll : config.repo.findActive;
      method.mockResolvedValue([{ id: 'active-1' }]);

      const res = await request(appFor(config)).get(`${config.base}/active`);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([{ id: 'active-1' }]);
    });
  }

  it('rejeita criação sem campos obrigatórios', async () => {
    const res = await admin(request(appFor(config)).post(config.base)).send({});

    expect(res.status).toBe(400);
    expect(config.repo.create).not.toHaveBeenCalled();
  });

  it('cria um registro válido', async () => {
    config.repo.create.mockResolvedValue({ id: 'created-1', ...config.validBody });

    const res = await admin(request(appFor(config)).post(config.base)).send(config.validBody);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe('created-1');
    expect(config.repo.create).toHaveBeenCalledTimes(1);
  });

  it('atualiza um registro existente', async () => {
    config.repo.update.mockResolvedValue({ id: 'item-1', updated: true });

    const res = await admin(request(appFor(config)).put(`${config.base}/item-1`))
      .send({ isActive: false });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ id: 'item-1', updated: true });
  });

  it('retorna 404 ao atualizar registro inexistente', async () => {
    config.repo.update.mockResolvedValue(null);

    const res = await admin(request(appFor(config)).put(`${config.base}/missing`))
      .send({ isActive: false });

    expect(res.status).toBe(404);
  });

  it('exclui um registro existente', async () => {
    config.repo.delete.mockResolvedValue(true);

    const res = await admin(request(appFor(config)).delete(`${config.base}/item-1`));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('retorna 404 ao excluir registro inexistente', async () => {
    config.repo.delete.mockResolvedValue(false);

    const res = await admin(request(appFor(config)).delete(`${config.base}/missing`));

    expect(res.status).toBe(404);
  });

  it('retorna 500 quando o repositório falha', async () => {
    config.repo.findAll.mockRejectedValue(new Error('database unavailable'));

    const res = await admin(request(appFor(config)).get(config.base));

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});

describe('Validações específicas de banners', () => {
  it('rejeita tipo desconhecido', async () => {
    const config = configs[0];
    const res = await admin(request(appFor(config)).post(config.base)).send({
      title: 'Aviso',
      message: 'Mensagem',
      type: 'unknown',
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('type inválido');
  });
});
