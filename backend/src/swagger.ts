import { Express } from 'express';
import swaggerUi from 'swagger-ui-express';

const spec = {
  openapi: '3.0.3',
  info: {
    title: 'DocePreço API',
    version: '2.3.0',
    description: 'API do aplicativo DocePreço — precificação de doces para confeiteiras.',
  },
  servers: [
    { url: 'http://localhost:3000/api', description: 'Local' },
    { url: 'https://docepreco.onrender.com/api', description: 'Produção' },
  ],
  tags: [
    { name: 'Auth', description: 'Autenticação' },
    { name: 'Recipes', description: 'Receitas do usuário' },
    { name: 'Ingredients', description: 'Ingredientes do usuário' },
    { name: 'Sales', description: 'Vendas do usuário' },
    { name: 'Goals', description: 'Metas de receita mensal' },
    { name: 'Seasons', description: 'Temporadas sazonais' },
    { name: 'Price History', description: 'Histórico de preços' },
    { name: 'Push Tokens', description: 'Tokens de push notification' },
    { name: 'Premium', description: 'Assinatura premium (RevenueCat)' },
    { name: 'Banners', description: 'Banners do app' },
    { name: 'Notifications', description: 'Notificações push' },
    { name: 'Notification Templates', description: 'Templates de notificações locais' },
    { name: 'Tips', description: 'Dicas motivacionais' },
    { name: 'Admin', description: 'Dashboard e gestão de usuários' },
    { name: 'Global Ingredients', description: 'Ingredientes com preços de referência' },
    { name: 'Featured Recipes', description: 'Receitas sugeridas (premium)' },
    { name: 'Plan Config', description: 'Configuração de planos Free/Premium' },
    { name: 'Feature Flags', description: 'Liga/desliga de funcionalidades' },
    { name: 'FAQ', description: 'Perguntas frequentes' },
    { name: 'Coupons', description: 'Cupons de desconto' },
    { name: 'Categories', description: 'Categorias de receitas' },
    { name: 'Feedbacks', description: 'Feedbacks dos usuários' },
    { name: 'Changelog', description: 'Novidades por versão' },
    { name: 'Onboarding', description: 'Telas de boas-vindas' },
  ],
  components: {
    securitySchemes: {
      BearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', description: 'Token JWT retornado no login' },
      AdminSecret: { type: 'apiKey', in: 'header', name: 'x-admin-secret', description: 'Secret do admin (DOCEPRECO_ADMIN_SECRET)' },
    },
    schemas: {
      // ── Auth ──
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          companyName: { type: 'string' },
          email: { type: 'string' },
          isPremium: { type: 'boolean' },
          premiumUntil: { type: 'string', nullable: true },
          premiumPlatform: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          lastSeenAt: { type: 'string', format: 'date-time', nullable: true },
        },
      },
      // ── Recipes ──
      Recipe: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          yield: { type: 'integer' },
          profitMargin: { type: 'number' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          ingredients: { type: 'array', items: { $ref: '#/components/schemas/RecipeIngredient' } },
          additionalCosts: { type: 'array', items: { $ref: '#/components/schemas/AdditionalCost' } },
        },
      },
      RecipeIngredient: {
        type: 'object',
        properties: {
          ingredientId: { type: 'string', format: 'uuid' },
          ingredientName: { type: 'string' },
          quantityUsed: { type: 'number' },
          unit: { type: 'string' },
        },
      },
      AdditionalCost: {
        type: 'object',
        properties: { name: { type: 'string' }, value: { type: 'number' } },
      },
      // ── Ingredients ──
      Ingredient: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          purchaseQuantity: { type: 'number' },
          purchasePrice: { type: 'number' },
          unit: { type: 'string', enum: ['g', 'kg', 'ml', 'l', 'unit'] },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      // ── Sales ──
      Sale: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          recipeName: { type: 'string', nullable: true },
          quantitySold: { type: 'integer' },
          salePrice: { type: 'number' },
          totalRevenue: { type: 'number' },
          saleDate: { type: 'string', format: 'date' },
          notes: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      // ── Banner ──
      Banner: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          title: { type: 'string' },
          message: { type: 'string' },
          type: { type: 'string', enum: ['info', 'warning', 'promo', 'update'] },
          actionUrl: { type: 'string', nullable: true },
          startsAt: { type: 'string', format: 'date-time' },
          endsAt: { type: 'string', format: 'date-time', nullable: true },
          isActive: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      // ── Notification ──
      AppNotification: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          title: { type: 'string' },
          body: { type: 'string' },
          target: { type: 'string', enum: ['all', 'premium', 'free'] },
          scheduledAt: { type: 'string', format: 'date-time', nullable: true },
          sentAt: { type: 'string', format: 'date-time', nullable: true },
          status: { type: 'string', enum: ['pending', 'scheduled', 'sent', 'failed'] },
          recipientsCount: { type: 'integer' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      // ── Notification Template ──
      NotificationTemplate: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          slug: { type: 'string' },
          title: { type: 'string' },
          body: { type: 'string' },
          isActive: { type: 'boolean' },
          scheduleType: { type: 'string', enum: ['daily', 'weekly', 'interval'] },
          scheduleHour: { type: 'integer', nullable: true },
          scheduleMinute: { type: 'integer', nullable: true },
          scheduleWeekday: { type: 'integer', nullable: true, description: '1=Dom, 2=Seg... 7=Sáb' },
          scheduleIntervalHours: { type: 'integer', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      // ── Tip ──
      Tip: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          message: { type: 'string' },
          isActive: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      // ── Global Ingredient ──
      GlobalIngredient: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          price: { type: 'number' },
          unit: { type: 'string', enum: ['g', 'kg', 'ml', 'L', 'un'] },
          packageAmount: { type: 'number' },
          category: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      // ── Featured Recipe ──
      FeaturedRecipeIngredient: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          quantityUsed: { type: 'number' },
          unit: { type: 'string' },
          purchaseQuantity: { type: 'number' },
          purchasePrice: { type: 'number' },
        },
      },
      FeaturedRecipe: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          yield: { type: 'integer' },
          profitMargin: { type: 'number' },
          isActive: { type: 'boolean' },
          sortOrder: { type: 'integer' },
          ingredients: { type: 'array', items: { $ref: '#/components/schemas/FeaturedRecipeIngredient' } },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      // ── Plan Config ──
      PlanConfig: {
        type: 'object',
        properties: {
          freeRecipeLimit: { type: 'integer' },
          premiumPrice: { type: 'number' },
          premiumFeatures: { type: 'array', items: { type: 'string' } },
          freeFeatures: { type: 'array', items: { type: 'string' } },
        },
      },
      // ── Feature Flag ──
      FeatureFlag: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          key: { type: 'string' },
          description: { type: 'string' },
          isEnabled: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      // ── FAQ ──
      FaqItem: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          question: { type: 'string' },
          answer: { type: 'string' },
          category: { type: 'string' },
          sortOrder: { type: 'integer' },
          isActive: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      // ── Coupon ──
      Coupon: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          code: { type: 'string' },
          discountPercent: { type: 'integer' },
          maxUses: { type: 'integer', description: '0 = ilimitado' },
          usedCount: { type: 'integer' },
          expiresAt: { type: 'string', format: 'date-time', nullable: true },
          isActive: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      // ── Category ──
      RecipeCategory: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          icon: { type: 'string', description: 'Emoji' },
          sortOrder: { type: 'integer' },
          isActive: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      // ── Feedback ──
      Feedback: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          userId: { type: 'string', format: 'uuid' },
          userName: { type: 'string' },
          userEmail: { type: 'string' },
          message: { type: 'string' },
          rating: { type: 'integer', minimum: 1, maximum: 5 },
          status: { type: 'string', enum: ['pending', 'read', 'replied'] },
          reply: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      // ── Changelog ──
      ChangelogEntry: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          version: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string' },
          features: { type: 'array', items: { type: 'string' } },
          isActive: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      // ── Onboarding ──
      OnboardingStep: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          title: { type: 'string' },
          description: { type: 'string' },
          imageUrl: { type: 'string', nullable: true },
          icon: { type: 'string', nullable: true, description: 'Nome do ícone Ionicons' },
          iconColor: { type: 'string', nullable: true, description: 'Cor hex do ícone' },
          iconBg: { type: 'string', nullable: true, description: 'Cor hex do fundo' },
          sortOrder: { type: 'integer' },
          isActive: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      // ── Shared ──
      Season: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          startDate: { type: 'string', format: 'date' },
          endDate: { type: 'string', format: 'date' },
          multiplier: { type: 'number' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      RevenueGoal: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          amount: { type: 'number' },
          month: { type: 'integer' },
          year: { type: 'integer' },
        },
      },
    },
  },
  paths: {
    // ══════════════════════════════════════════════════════════
    //  AUTH
    // ══════════════════════════════════════════════════════════
    '/auth/register': {
      post: {
        tags: ['Auth'], summary: 'Registrar usuário',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['companyName', 'email', 'password'], properties: { companyName: { type: 'string' }, email: { type: 'string' }, password: { type: 'string' } } } } } },
        responses: { 201: { description: 'Usuário criado + token JWT' }, 400: { description: 'Dados inválidos ou email já existe' } },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'], summary: 'Login',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['email', 'password'], properties: { email: { type: 'string' }, password: { type: 'string' } } } } } },
        responses: { 200: { description: 'Token JWT (30 dias)' }, 401: { description: 'Credenciais inválidas' } },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'], summary: 'Dados do usuário autenticado', security: [{ BearerAuth: [] }],
        responses: { 200: { description: 'Dados do usuário', content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } } },
      },
    },

    // ══════════════════════════════════════════════════════════
    //  RECIPES
    // ══════════════════════════════════════════════════════════
    '/recipes': {
      get: { tags: ['Recipes'], summary: 'Listar receitas', security: [{ BearerAuth: [] }], responses: { 200: { description: 'Lista de receitas' } } },
      post: { tags: ['Recipes'], summary: 'Criar receita', security: [{ BearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['name', 'yield'], properties: { name: { type: 'string' }, yield: { type: 'integer' }, profitMargin: { type: 'number' }, ingredients: { type: 'array', items: { type: 'object' } }, additionalCosts: { type: 'array', items: { type: 'object' } } } } } } },
        responses: { 201: { description: 'Receita criada' }, 403: { description: 'Limite atingido (free)' } },
      },
    },
    '/recipes/{id}': {
      get: { tags: ['Recipes'], summary: 'Detalhe da receita', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { 200: { description: 'Receita' } } },
      put: { tags: ['Recipes'], summary: 'Atualizar receita', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } }, responses: { 200: { description: 'Atualizada' } } },
      delete: { tags: ['Recipes'], summary: 'Excluir receita', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { 200: { description: 'Excluída' } } },
    },
    '/recipes/{id}/calculate': {
      post: { tags: ['Recipes'], summary: 'Calcular custo/preço', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { 200: { description: 'Cálculo completo' } } },
    },

    // ══════════════════════════════════════════════════════════
    //  INGREDIENTS
    // ══════════════════════════════════════════════════════════
    '/ingredients': {
      get: { tags: ['Ingredients'], summary: 'Listar ingredientes', security: [{ BearerAuth: [] }], responses: { 200: { description: 'Lista' } } },
      post: { tags: ['Ingredients'], summary: 'Criar ingrediente', security: [{ BearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['name', 'purchaseQuantity', 'purchasePrice', 'unit'], properties: { name: { type: 'string' }, purchaseQuantity: { type: 'number' }, purchasePrice: { type: 'number' }, unit: { type: 'string', enum: ['g', 'kg', 'ml', 'l', 'unit'] } } } } } },
        responses: { 201: { description: 'Criado' }, 403: { description: 'Limite free' } },
      },
    },
    '/ingredients/{id}': {
      get: { tags: ['Ingredients'], summary: 'Detalhe', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { 200: { description: 'Ingrediente' } } },
      put: { tags: ['Ingredients'], summary: 'Atualizar', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } }, responses: { 200: { description: 'Atualizado' } } },
      delete: { tags: ['Ingredients'], summary: 'Excluir', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { 200: { description: 'Excluído' } } },
    },

    // ══════════════════════════════════════════════════════════
    //  SALES
    // ══════════════════════════════════════════════════════════
    '/sales': {
      get: { tags: ['Sales'], summary: 'Listar vendas', security: [{ BearerAuth: [] }], parameters: [{ name: 'period', in: 'query', schema: { type: 'string', enum: ['week', 'month'] } }], responses: { 200: { description: 'Lista' } } },
      post: { tags: ['Sales'], summary: 'Registrar venda', security: [{ BearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['recipeId', 'quantitySold', 'salePrice', 'saleDate'], properties: { recipeId: { type: 'string', format: 'uuid' }, quantitySold: { type: 'integer' }, salePrice: { type: 'number' }, saleDate: { type: 'string', format: 'date' }, notes: { type: 'string' } } } } } },
        responses: { 201: { description: 'Venda registrada' } },
      },
    },
    '/sales/{id}': {
      delete: { tags: ['Sales'], summary: 'Excluir venda', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { 200: { description: 'Excluída' } } },
    },

    // ══════════════════════════════════════════════════════════
    //  GOALS
    // ══════════════════════════════════════════════════════════
    '/goals': {
      get: { tags: ['Goals'], summary: 'Obter meta mensal', security: [{ BearerAuth: [] }], parameters: [{ name: 'month', in: 'query', schema: { type: 'integer' } }, { name: 'year', in: 'query', schema: { type: 'integer' } }], responses: { 200: { description: 'Meta' } } },
      put: { tags: ['Goals'], summary: 'Criar/atualizar meta', security: [{ BearerAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['amount', 'month', 'year'], properties: { amount: { type: 'number' }, month: { type: 'integer' }, year: { type: 'integer' } } } } } }, responses: { 200: { description: 'Meta salva' } } },
    },

    // ══════════════════════════════════════════════════════════
    //  SEASONS
    // ══════════════════════════════════════════════════════════
    '/seasons': {
      get: { tags: ['Seasons'], summary: 'Listar temporadas', security: [{ BearerAuth: [] }], responses: { 200: { description: 'Lista' } } },
      post: { tags: ['Seasons'], summary: 'Criar temporada', security: [{ BearerAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['name', 'startDate', 'endDate', 'multiplier'], properties: { name: { type: 'string' }, startDate: { type: 'string', format: 'date' }, endDate: { type: 'string', format: 'date' }, multiplier: { type: 'number' } } } } } }, responses: { 201: { description: 'Criada' } } },
    },
    '/seasons/{id}': {
      get: { tags: ['Seasons'], summary: 'Detalhe', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { 200: { description: 'Temporada' } } },
      put: { tags: ['Seasons'], summary: 'Atualizar', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } }, responses: { 200: { description: 'Atualizada' } } },
      delete: { tags: ['Seasons'], summary: 'Excluir', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { 200: { description: 'Excluída' } } },
    },

    // ══════════════════════════════════════════════════════════
    //  PRICE HISTORY
    // ══════════════════════════════════════════════════════════
    '/ingredients/{ingredientId}/price-history': {
      get: { tags: ['Price History'], summary: 'Histórico de preços', security: [{ BearerAuth: [] }], parameters: [{ name: 'ingredientId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { 200: { description: 'Lista de preços' } } },
    },

    // ══════════════════════════════════════════════════════════
    //  PUSH TOKENS
    // ══════════════════════════════════════════════════════════
    '/push-tokens/register': { post: { tags: ['Push Tokens'], summary: 'Registrar token', security: [{ BearerAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['token', 'platform'], properties: { token: { type: 'string' }, platform: { type: 'string', enum: ['ios', 'android'] } } } } } }, responses: { 200: { description: 'Registrado' } } } },
    '/push-tokens/unregister': { post: { tags: ['Push Tokens'], summary: 'Remover token', security: [{ BearerAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['token'], properties: { token: { type: 'string' } } } } } }, responses: { 200: { description: 'Removido' } } } },

    // ══════════════════════════════════════════════════════════
    //  BANNERS
    // ══════════════════════════════════════════════════════════
    '/banners/active': { get: { tags: ['Banners'], summary: 'Listar banners ativos (público)', responses: { 200: { description: 'Lista', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Banner' } } } } } } } },
    '/banners': {
      get: { tags: ['Banners'], summary: 'Listar todos', security: [{ AdminSecret: [] }], responses: { 200: { description: 'Lista' } } },
      post: { tags: ['Banners'], summary: 'Criar', security: [{ AdminSecret: [] }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['title', 'message', 'type'], properties: { title: { type: 'string' }, message: { type: 'string' }, type: { type: 'string', enum: ['info', 'warning', 'promo', 'update'] }, actionUrl: { type: 'string' }, startsAt: { type: 'string', format: 'date-time' }, endsAt: { type: 'string', format: 'date-time' } } } } } }, responses: { 201: { description: 'Criado' } } },
    },
    '/banners/{id}': {
      put: { tags: ['Banners'], summary: 'Atualizar', security: [{ AdminSecret: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } }, responses: { 200: { description: 'Atualizado' } } },
      delete: { tags: ['Banners'], summary: 'Excluir', security: [{ AdminSecret: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { 200: { description: 'Excluído' } } },
    },

    // ══════════════════════════════════════════════════════════
    //  NOTIFICATIONS
    // ══════════════════════════════════════════════════════════
    '/notifications': {
      get: { tags: ['Notifications'], summary: 'Listar', security: [{ AdminSecret: [] }], responses: { 200: { description: 'Lista' } } },
      post: { tags: ['Notifications'], summary: 'Criar', security: [{ AdminSecret: [] }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['title', 'body'], properties: { title: { type: 'string' }, body: { type: 'string' }, target: { type: 'string', enum: ['all', 'premium', 'free'] }, scheduledAt: { type: 'string', format: 'date-time' } } } } } }, responses: { 201: { description: 'Criada' } } },
    },
    '/notifications/{id}/send': { post: { tags: ['Notifications'], summary: 'Enviar agora', security: [{ AdminSecret: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { 200: { description: 'Enviada' } } } },
    '/notifications/{id}': { delete: { tags: ['Notifications'], summary: 'Excluir', security: [{ AdminSecret: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { 200: { description: 'Excluída' } } } },

    // ══════════════════════════════════════════════════════════
    //  NOTIFICATION TEMPLATES
    // ══════════════════════════════════════════════════════════
    '/notification-templates/active': { get: { tags: ['Notification Templates'], summary: 'Listar ativos com agendamento (público)', responses: { 200: { description: 'Lista', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/NotificationTemplate' } } } } } } } },
    '/notification-templates': { get: { tags: ['Notification Templates'], summary: 'Listar todos', security: [{ AdminSecret: [] }], responses: { 200: { description: 'Lista' } } } },
    '/notification-templates/{id}': { put: { tags: ['Notification Templates'], summary: 'Atualizar template + agendamento', security: [{ AdminSecret: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { title: { type: 'string' }, body: { type: 'string' }, isActive: { type: 'boolean' }, scheduleType: { type: 'string', enum: ['daily', 'weekly', 'interval'] }, scheduleHour: { type: 'integer' }, scheduleMinute: { type: 'integer' }, scheduleWeekday: { type: 'integer' }, scheduleIntervalHours: { type: 'integer' } } } } } }, responses: { 200: { description: 'Atualizado' } } } },
    '/notification-templates/{id}/send': { post: { tags: ['Notification Templates'], summary: 'Enviar push do template', security: [{ AdminSecret: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { target: { type: 'string', enum: ['all', 'premium', 'free'] } } } } } }, responses: { 200: { description: 'Enviado' } } } },

    // ══════════════════════════════════════════════════════════
    //  TIPS
    // ══════════════════════════════════════════════════════════
    '/tips/active': { get: { tags: ['Tips'], summary: 'Listar dicas ativas (público)', responses: { 200: { description: 'Lista' } } } },
    '/tips': {
      get: { tags: ['Tips'], summary: 'Listar todas', security: [{ AdminSecret: [] }], responses: { 200: { description: 'Lista' } } },
      post: { tags: ['Tips'], summary: 'Criar', security: [{ AdminSecret: [] }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['message'], properties: { message: { type: 'string' } } } } } }, responses: { 201: { description: 'Criada' } } },
    },
    '/tips/{id}': {
      put: { tags: ['Tips'], summary: 'Atualizar', security: [{ AdminSecret: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { message: { type: 'string' }, isActive: { type: 'boolean' } } } } } }, responses: { 200: { description: 'Atualizada' } } },
      delete: { tags: ['Tips'], summary: 'Excluir', security: [{ AdminSecret: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { 200: { description: 'Excluída' } } },
    },

    // ══════════════════════════════════════════════════════════
    //  GLOBAL INGREDIENTS
    // ══════════════════════════════════════════════════════════
    '/admin/global-ingredients/active': { get: { tags: ['Global Ingredients'], summary: 'Listar (público/app)', responses: { 200: { description: 'Lista', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/GlobalIngredient' } } } } } } } },
    '/admin/global-ingredients': {
      get: { tags: ['Global Ingredients'], summary: 'Listar todos', security: [{ AdminSecret: [] }], responses: { 200: { description: 'Lista' } } },
      post: { tags: ['Global Ingredients'], summary: 'Criar', security: [{ AdminSecret: [] }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['name', 'price', 'unit'], properties: { name: { type: 'string' }, price: { type: 'number' }, unit: { type: 'string', enum: ['g', 'kg', 'ml', 'L', 'un'] }, packageAmount: { type: 'number' }, category: { type: 'string' } } } } } }, responses: { 201: { description: 'Criado' } } },
    },
    '/admin/global-ingredients/{id}': {
      put: { tags: ['Global Ingredients'], summary: 'Atualizar', security: [{ AdminSecret: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } }, responses: { 200: { description: 'Atualizado' } } },
      delete: { tags: ['Global Ingredients'], summary: 'Excluir', security: [{ AdminSecret: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { 200: { description: 'Excluído' } } },
    },

    // ══════════════════════════════════════════════════════════
    //  FEATURED RECIPES
    // ══════════════════════════════════════════════════════════
    '/admin/featured-recipes/active': { get: { tags: ['Featured Recipes'], summary: 'Listar ativas com ingredientes (público/app)', responses: { 200: { description: 'Lista', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/FeaturedRecipe' } } } } } } } },
    '/admin/featured-recipes': {
      get: { tags: ['Featured Recipes'], summary: 'Listar todas', security: [{ AdminSecret: [] }], responses: { 200: { description: 'Lista' } } },
      post: { tags: ['Featured Recipes'], summary: 'Criar com ingredientes', security: [{ AdminSecret: [] }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['name'], properties: { name: { type: 'string' }, yield: { type: 'integer' }, profitMargin: { type: 'number' }, sortOrder: { type: 'integer' }, ingredients: { type: 'array', items: { $ref: '#/components/schemas/FeaturedRecipeIngredient' } } } } } } }, responses: { 201: { description: 'Criada' } } },
    },
    '/admin/featured-recipes/{id}': {
      put: { tags: ['Featured Recipes'], summary: 'Atualizar com ingredientes', security: [{ AdminSecret: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } }, responses: { 200: { description: 'Atualizada' } } },
      delete: { tags: ['Featured Recipes'], summary: 'Excluir', security: [{ AdminSecret: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { 200: { description: 'Excluída' } } },
    },

    // ══════════════════════════════════════════════════════════
    //  PLAN CONFIG
    // ══════════════════════════════════════════════════════════
    '/admin/settings/plans': {
      get: { tags: ['Plan Config'], summary: 'Ler configuração (público/app)', responses: { 200: { description: 'Config', content: { 'application/json': { schema: { $ref: '#/components/schemas/PlanConfig' } } } } } },
      put: { tags: ['Plan Config'], summary: 'Atualizar', security: [{ AdminSecret: [] }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/PlanConfig' } } } }, responses: { 200: { description: 'Atualizado' } } },
    },

    // ══════════════════════════════════════════════════════════
    //  FEATURE FLAGS
    // ══════════════════════════════════════════════════════════
    '/admin/feature-flags/active': { get: { tags: ['Feature Flags'], summary: 'Listar ativas (público/app)', responses: { 200: { description: 'Lista', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/FeatureFlag' } } } } } } } },
    '/admin/feature-flags': {
      get: { tags: ['Feature Flags'], summary: 'Listar todas', security: [{ AdminSecret: [] }], responses: { 200: { description: 'Lista' } } },
      post: { tags: ['Feature Flags'], summary: 'Criar', security: [{ AdminSecret: [] }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['key'], properties: { key: { type: 'string' }, description: { type: 'string' }, isEnabled: { type: 'boolean' } } } } } }, responses: { 201: { description: 'Criada' } } },
    },
    '/admin/feature-flags/{id}': {
      put: { tags: ['Feature Flags'], summary: 'Atualizar', security: [{ AdminSecret: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } }, responses: { 200: { description: 'Atualizada' } } },
      delete: { tags: ['Feature Flags'], summary: 'Excluir', security: [{ AdminSecret: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { 200: { description: 'Excluída' } } },
    },

    // ══════════════════════════════════════════════════════════
    //  FAQ
    // ══════════════════════════════════════════════════════════
    '/admin/faq/active': { get: { tags: ['FAQ'], summary: 'Listar ativas (público/app)', responses: { 200: { description: 'Lista', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/FaqItem' } } } } } } } },
    '/admin/faq': {
      get: { tags: ['FAQ'], summary: 'Listar todas', security: [{ AdminSecret: [] }], responses: { 200: { description: 'Lista' } } },
      post: { tags: ['FAQ'], summary: 'Criar', security: [{ AdminSecret: [] }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['question', 'answer'], properties: { question: { type: 'string' }, answer: { type: 'string' }, category: { type: 'string' }, sortOrder: { type: 'integer' } } } } } }, responses: { 201: { description: 'Criada' } } },
    },
    '/admin/faq/{id}': {
      put: { tags: ['FAQ'], summary: 'Atualizar', security: [{ AdminSecret: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } }, responses: { 200: { description: 'Atualizada' } } },
      delete: { tags: ['FAQ'], summary: 'Excluir', security: [{ AdminSecret: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { 200: { description: 'Excluída' } } },
    },

    // ══════════════════════════════════════════════════════════
    //  COUPONS
    // ══════════════════════════════════════════════════════════
    '/admin/coupons/validate/{code}': { get: { tags: ['Coupons'], summary: 'Validar cupom (público/app)', parameters: [{ name: 'code', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Válido — retorna discountPercent' }, 400: { description: 'Expirado ou esgotado' }, 404: { description: 'Não encontrado' } } } },
    '/admin/coupons': {
      get: { tags: ['Coupons'], summary: 'Listar todos', security: [{ AdminSecret: [] }], responses: { 200: { description: 'Lista' } } },
      post: { tags: ['Coupons'], summary: 'Criar', security: [{ AdminSecret: [] }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['code', 'discountPercent'], properties: { code: { type: 'string' }, discountPercent: { type: 'integer' }, maxUses: { type: 'integer' }, expiresAt: { type: 'string', format: 'date' }, isActive: { type: 'boolean' } } } } } }, responses: { 201: { description: 'Criado' } } },
    },
    '/admin/coupons/{id}': {
      put: { tags: ['Coupons'], summary: 'Atualizar', security: [{ AdminSecret: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } }, responses: { 200: { description: 'Atualizado' } } },
      delete: { tags: ['Coupons'], summary: 'Excluir', security: [{ AdminSecret: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { 200: { description: 'Excluído' } } },
    },

    // ══════════════════════════════════════════════════════════
    //  CATEGORIES
    // ══════════════════════════════════════════════════════════
    '/admin/categories/active': { get: { tags: ['Categories'], summary: 'Listar ativas (público/app)', responses: { 200: { description: 'Lista', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/RecipeCategory' } } } } } } } },
    '/admin/categories': {
      get: { tags: ['Categories'], summary: 'Listar todas', security: [{ AdminSecret: [] }], responses: { 200: { description: 'Lista' } } },
      post: { tags: ['Categories'], summary: 'Criar', security: [{ AdminSecret: [] }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['name'], properties: { name: { type: 'string' }, icon: { type: 'string' }, sortOrder: { type: 'integer' } } } } } }, responses: { 201: { description: 'Criada' } } },
    },
    '/admin/categories/{id}': {
      put: { tags: ['Categories'], summary: 'Atualizar', security: [{ AdminSecret: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } }, responses: { 200: { description: 'Atualizada' } } },
      delete: { tags: ['Categories'], summary: 'Excluir', security: [{ AdminSecret: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { 200: { description: 'Excluída' } } },
    },

    // ══════════════════════════════════════════════════════════
    //  FEEDBACKS
    // ══════════════════════════════════════════════════════════
    '/admin/feedbacks': {
      get: { tags: ['Feedbacks'], summary: 'Listar todos', security: [{ AdminSecret: [] }], responses: { 200: { description: 'Lista', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Feedback' } } } } } } },
      post: { tags: ['Feedbacks'], summary: 'Enviar feedback (usuário autenticado)', security: [{ BearerAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['message', 'rating'], properties: { message: { type: 'string' }, rating: { type: 'integer', minimum: 1, maximum: 5 } } } } } }, responses: { 201: { description: 'Enviado' } } },
    },
    '/admin/feedbacks/{id}': { put: { tags: ['Feedbacks'], summary: 'Atualizar status', security: [{ AdminSecret: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string', enum: ['pending', 'read', 'replied'] } } } } } }, responses: { 200: { description: 'Atualizado' } } } },
    '/admin/feedbacks/{id}/reply': { post: { tags: ['Feedbacks'], summary: 'Responder feedback', security: [{ AdminSecret: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['reply'], properties: { reply: { type: 'string' } } } } } }, responses: { 200: { description: 'Respondido' } } } },

    // ══════════════════════════════════════════════════════════
    //  CHANGELOG
    // ══════════════════════════════════════════════════════════
    '/admin/changelog/active': { get: { tags: ['Changelog'], summary: 'Listar ativos (público/app)', responses: { 200: { description: 'Lista', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/ChangelogEntry' } } } } } } } },
    '/admin/changelog': {
      get: { tags: ['Changelog'], summary: 'Listar todos', security: [{ AdminSecret: [] }], responses: { 200: { description: 'Lista' } } },
      post: { tags: ['Changelog'], summary: 'Criar', security: [{ AdminSecret: [] }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['version', 'title'], properties: { version: { type: 'string' }, title: { type: 'string' }, description: { type: 'string' }, features: { type: 'array', items: { type: 'string' } } } } } } }, responses: { 201: { description: 'Criado' } } },
    },
    '/admin/changelog/{id}': {
      put: { tags: ['Changelog'], summary: 'Atualizar', security: [{ AdminSecret: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } }, responses: { 200: { description: 'Atualizado' } } },
      delete: { tags: ['Changelog'], summary: 'Excluir', security: [{ AdminSecret: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { 200: { description: 'Excluído' } } },
    },

    // ══════════════════════════════════════════════════════════
    //  ONBOARDING
    // ══════════════════════════════════════════════════════════
    '/admin/onboarding/active': { get: { tags: ['Onboarding'], summary: 'Listar ativas (público/app)', responses: { 200: { description: 'Lista', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/OnboardingStep' } } } } } } } },
    '/admin/onboarding': {
      get: { tags: ['Onboarding'], summary: 'Listar todas', security: [{ AdminSecret: [] }], responses: { 200: { description: 'Lista' } } },
      post: { tags: ['Onboarding'], summary: 'Criar', security: [{ AdminSecret: [] }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['title'], properties: { title: { type: 'string' }, description: { type: 'string' }, imageUrl: { type: 'string' }, icon: { type: 'string' }, iconColor: { type: 'string' }, iconBg: { type: 'string' }, sortOrder: { type: 'integer' } } } } } }, responses: { 201: { description: 'Criada' } } },
    },
    '/admin/onboarding/{id}': {
      put: { tags: ['Onboarding'], summary: 'Atualizar', security: [{ AdminSecret: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } }, responses: { 200: { description: 'Atualizada' } } },
      delete: { tags: ['Onboarding'], summary: 'Excluir', security: [{ AdminSecret: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { 200: { description: 'Excluída' } } },
    },

    // ══════════════════════════════════════════════════════════
    //  ADMIN DASHBOARD
    // ══════════════════════════════════════════════════════════
    '/admin/stats': { get: { tags: ['Admin'], summary: 'Estatísticas do dashboard', security: [{ AdminSecret: [] }], responses: { 200: { description: 'Stats completas' } } } },
    '/admin/users': { get: { tags: ['Admin'], summary: 'Listar usuários', security: [{ AdminSecret: [] }], parameters: [{ name: 'search', in: 'query', schema: { type: 'string' } }, { name: 'page', in: 'query', schema: { type: 'integer' } }, { name: 'isPremium', in: 'query', schema: { type: 'boolean' } }, { name: 'sortBy', in: 'query', schema: { type: 'string' } }], responses: { 200: { description: 'Lista paginada' } } } },
    '/admin/users/{id}': { get: { tags: ['Admin'], summary: 'Detalhe do usuário', security: [{ AdminSecret: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { 200: { description: 'Usuário' } } } },
    '/admin/users/{id}/data': { get: { tags: ['Admin'], summary: 'Dados do usuário (receitas, ingredientes, vendas)', security: [{ AdminSecret: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { 200: { description: 'Dados completos' } } } },
    '/admin/users/{id}/premium': { post: { tags: ['Admin'], summary: 'Toggle premium do usuário', security: [{ AdminSecret: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['isPremium'], properties: { isPremium: { type: 'boolean' }, premiumUntil: { type: 'string', format: 'date-time' } } } } } }, responses: { 200: { description: 'Atualizado' } } } },
    '/admin/logs': { get: { tags: ['Admin'], summary: 'Logs de atividade', security: [{ AdminSecret: [] }], parameters: [{ name: 'limit', in: 'query', schema: { type: 'integer' } }], responses: { 200: { description: 'Lista' } } } },
    '/admin/request-logs': { get: { tags: ['Admin'], summary: 'Logs de requisições HTTP', security: [{ AdminSecret: [] }], parameters: [{ name: 'limit', in: 'query', schema: { type: 'integer' } }, { name: 'method', in: 'query', schema: { type: 'string' } }, { name: 'search', in: 'query', schema: { type: 'string' } }], responses: { 200: { description: 'Lista' } } } },
    '/admin/send-update-email': { post: { tags: ['Admin'], summary: 'Enviar email em massa', security: [{ AdminSecret: [] }], requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { subject: { type: 'string' }, intro: { type: 'string' }, features: { type: 'array', items: { type: 'string' } }, ctaText: { type: 'string' }, ctaUrl: { type: 'string' } } } } } }, responses: { 200: { description: 'Enviado' } } } },
    '/admin/settings/daily-registration-goal': {
      get: { tags: ['Admin'], summary: 'Meta diária de cadastros', security: [{ AdminSecret: [] }], responses: { 200: { description: 'Meta e progresso' } } },
      put: { tags: ['Admin'], summary: 'Atualizar meta', security: [{ AdminSecret: [] }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['goal'], properties: { goal: { type: 'integer' } } } } } }, responses: { 200: { description: 'Atualizada' } } },
    },

    // ══════════════════════════════════════════════════════════
    //  PREMIUM / WEBHOOK
    // ══════════════════════════════════════════════════════════
    '/premium/webhooks/revenuecat': { post: { tags: ['Premium'], summary: 'Webhook RevenueCat', responses: { 200: { description: 'Processado' } } } },

    // ══════════════════════════════════════════════════════════
    //  HEALTH
    // ══════════════════════════════════════════════════════════
    '/health': { get: { tags: ['Admin'], summary: 'Health check', responses: { 200: { description: 'OK' } } } },
  },
};

export function setupSwagger(app: Express) {
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(spec, {
    customSiteTitle: 'DocePreço API Docs',
    customCss: '.swagger-ui .topbar { display: none }',
  }));
}
