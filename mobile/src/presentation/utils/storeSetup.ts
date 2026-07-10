import { StoreSettings } from '../../domain/entities/StoreProduct';

export interface MissingStoreItem {
  key: string;
  label: string;
}

/**
 * Itens de configuração de loja que ficam realmente vazios até o lojista preencher.
 * Nome da loja e forma de pagamento não entram aqui: já vêm preenchidos por padrão
 * (nome da conta e todos os métodos, ver PostgresStoreRepository.getSettings/migrate.ts),
 * então nunca ficam faltando de fato.
 */
export function getMissingStoreItems(settings: StoreSettings | null): MissingStoreItem[] {
  if (!settings) return [];
  const missing: MissingStoreItem[] = [];
  if (!settings.city?.trim()) missing.push({ key: 'city', label: 'Cidade' });
  if (!settings.category?.trim()) missing.push({ key: 'category', label: 'Categoria da loja' });
  return missing;
}
