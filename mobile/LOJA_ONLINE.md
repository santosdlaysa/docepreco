# Loja Online — Plano Master

## Visão geral

Empresas com plano **Master** recebem uma loja virtual pública com link compartilhável. Clientes acessam a loja pelo browser, escolhem produtos e fazem pedidos. A empresa recebe notificações push no celular e gerencia os pedidos pelo app.

## Fluxo completo

```
Empresa (Master)
  └─ configura loja (nome, produtos, opções de entrega)
  └─ copia/compartilha o link (docepreco.com/loja/[slug])
         ↓
Cliente (browser)
  └─ vê catálogo de produtos
  └─ seleciona itens e preenche dados de contato
  └─ confirma pedido
         ↓
Empresa recebe notificação push → abre app → gerencia pedido
```

## Arquitetura

### Mobile (este repo)

| Arquivo | Propósito |
|---------|-----------|
| `src/domain/entities/StoreProduct.ts` | Entidades `StoreProduct` e `StoreSettings` |
| `src/data/api/storeApi.ts` | CRUD de produtos e configurações da loja |
| `src/presentation/screens/StoreScreen.tsx` | Painel da loja: status, link, lista de produtos |
| `src/presentation/screens/StoreProductFormScreen.tsx` | Criar / editar produto do catálogo |
| `src/presentation/screens/StoreSettingsScreen.tsx` | Configurar nome, entrega, retirada, valor mínimo |
| `src/domain/entities/Order.ts` | Campo `source: 'manual' \| 'online'` adicionado |
| `src/presentation/screens/OrdersScreen.tsx` | Badge "Online" + filtro por origem |
| `src/presentation/utils/notifications.ts` | Canal Android `orders` com importância HIGH |
| `src/presentation/navigation/types.ts` | Rotas: Store, StoreProductForm, StoreSettings |
| `src/presentation/navigation/AppNavigator.tsx` | Registro das telas + listener de notificação de pedido |
| `src/presentation/screens/HomeScreen.tsx` | Tile "Loja Online" no grid Master |

### Backend (endpoints esperados)

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/store/settings` | Retorna configurações + link da loja |
| PUT | `/store/settings` | Atualiza configurações |
| GET | `/store/products` | Lista produtos do catálogo |
| POST | `/store/products` | Cria produto |
| PUT | `/store/products/:id` | Atualiza produto |
| DELETE | `/store/products/:id` | Remove produto |

### Push notifications (pedido novo)

O backend deve enviar um push com o seguinte payload:

```json
{
  "title": "Novo pedido recebido! 🛍️",
  "body": "João Silva fez um pedido de R$ 45,00",
  "data": {
    "type": "new_order",
    "orderId": "abc123"
  }
}
```

O app navega automaticamente para a tela de Encomendas ao tocar na notificação.

## Entidades

### StoreProduct

```typescript
interface StoreProduct {
  id: string;
  name: string;
  description?: string;
  photoUrl?: string;
  publicPrice: number;
  available: boolean;
  recipeId?: string;      // vínculo opcional com receita existente
  createdAt: string;
  updatedAt: string;
}
```

### StoreSettings

```typescript
interface StoreSettings {
  active: boolean;
  storeName: string;
  slug: string;           // gerado pelo backend
  storeLink: string;      // URL pública completa
  description?: string;
  acceptsDelivery: boolean;
  acceptsPickup: boolean;
  minOrderValue?: number;
}
```

### Order (campo adicionado)

```typescript
interface Order {
  // ... campos existentes ...
  source?: 'manual' | 'online';   // 'online' = veio pelo link público
  clientEmail?: string;           // disponível em pedidos online
}
```

## Configuração de notificações Android

Canal `orders` com importância HIGH garante som e vibração para novos pedidos mesmo com o app em background.

## Gate de feature

Toda a funcionalidade de loja é exclusiva do plano **Master** (`isMaster === true` no PremiumContext). Tentativas de acesso de planos inferiores redirecionam para o Paywall com `trigger: { kind: 'master' }`.

## Status de implementação

- [x] Entidade `StoreProduct` + `StoreSettings`
- [x] API `storeApi.ts`
- [x] `StoreScreen` (painel principal)
- [x] `StoreProductFormScreen` (criar/editar produto)
- [x] `StoreSettingsScreen` (configurações)
- [x] Navegação registrada
- [x] Tile "Loja Online" na HomeScreen (Master)
- [x] Badge "Online" e filtro no OrdersScreen
- [x] Canal Android `orders` + handler de navegação por notificação
- [ ] Upload de foto de produto (aguarda endpoint de upload no backend)
- [ ] Página web pública (backend)
