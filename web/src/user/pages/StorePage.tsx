import { useCallback, useEffect, useState } from 'react';
import { ExternalLink, Loader2, PackageOpen, Power, Settings, ShoppingBag, Store, Plus, Pencil, Trash2, ImagePlus, PlusCircle } from 'lucide-react';
import { ToastFn, TableSkeleton, ModalOverlay, ConfirmModal } from '../../components';
import { formatBRL } from '../format';
import { MyStore, StoreSettingsDTO, StoreBusinessHours, StoreProduct, StoreAddon, CreateStoreProductDTO, DiscountType, Recipe, PixKeyType, userApi } from '../userApi';
import { EmptyState, Header, FormField, FormActions, inputClass, iconBtn, iconBtnDanger } from './IngredientsPage';
import { parseLocaleNumber } from '../number';

const WEEKDAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

const SEM_CATEGORIA = 'Outros';
// Agrupa os produtos por categoria (alfabética; "Outros" no fim). Os cabeçalhos
// só aparecem quando há mais de um grupo — com uma categoria só, não polui.
function groupProductsByCategory(
  products: StoreProduct[]
): { category: string; items: StoreProduct[]; showHeader: boolean }[] {
  const map = new Map<string, StoreProduct[]>();
  for (const p of products) {
    const cat = (p.category ?? '').trim() || SEM_CATEGORIA;
    if (!map.has(cat)) map.set(cat, []);
    map.get(cat)!.push(p);
  }
  const cats = Array.from(map.keys()).sort((a, b) => {
    if (a === SEM_CATEGORIA) return 1;
    if (b === SEM_CATEGORIA) return -1;
    return a.localeCompare(b, 'pt-BR');
  });
  const showHeader = cats.length > 1;
  return cats.map(category => ({ category, items: map.get(category)!, showHeader }));
}

function defaultBusinessHours(): StoreBusinessHours[] {
  return Array.from({ length: 7 }, (_, dayOfWeek) => ({
    dayOfWeek,
    closed: dayOfWeek === 0,
    openTime: '08:00',
    closeTime: '18:00',
  }));
}

function StatusPill({ on, onText, offText }: { on: boolean; onText: string; offText: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-2.5 py-1 ${
        on
          ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
          : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${on ? 'bg-green-500' : 'bg-gray-400'}`} />
      {on ? onText : offText}
    </span>
  );
}

function ToggleRow({
  icon: Icon,
  title,
  description,
  checked,
  disabled,
  saving,
  onChange,
}: {
  icon: typeof Power;
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  saving?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <div className="w-10 h-10 rounded-lg bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center shrink-0">
        <Icon size={18} className="text-primary-600 dark:text-primary-300" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 dark:text-white">{title}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
      </div>
      <button
        type="button"
        disabled={disabled || saving}
        onClick={() => onChange(!checked)}
        className={`relative w-12 h-7 rounded-full transition-colors shrink-0 disabled:opacity-50 ${
          checked ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600'
        }`}
        aria-pressed={checked}
      >
        <span
          className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
        {saving && (
          <Loader2 size={12} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white animate-spin-slow" />
        )}
      </button>
    </div>
  );
}

export function StorePage({ toast }: { toast: ToastFn }) {
  const [store, setStore] = useState<MyStore | null>(null);
  const [addons, setAddons] = useState<StoreAddon[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingField, setSavingField] = useState<'active' | 'acceptingOrders' | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [productModal, setProductModal] = useState<StoreProduct | 'new' | null>(null);
  const [confirmProductId, setConfirmProductId] = useState<string | null>(null);
  const [addonModal, setAddonModal] = useState<StoreAddon | 'new' | null>(null);
  const [confirmAddonId, setConfirmAddonId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, a, r] = await Promise.all([
        userApi.getMyStore(),
        userApi.getStoreAddons().catch(() => [] as StoreAddon[]),
        userApi.listRecipes().catch(() => [] as Recipe[]),
      ]);
      setStore(s);
      setAddons(a);
      setRecipes(r);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const deleteProduct = async () => {
    if (!confirmProductId) return;
    try {
      await userApi.deleteStoreProduct(confirmProductId);
      toast.success('Produto excluído.');
      setConfirmProductId(null);
      load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const deleteAddon = async () => {
    if (!confirmAddonId) return;
    try {
      await userApi.deleteStoreAddon(confirmAddonId);
      toast.success('Adicional excluído.');
      setConfirmAddonId(null);
      load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const updateStatus = async (field: 'active' | 'acceptingOrders', value: boolean) => {
    if (!store) return;
    setSavingField(field);
    const previous = store;
    const next = { ...store, [field]: value };
    setStore(next);
    try {
      const updated = await userApi.updateMyStore({ [field]: value });
      setStore(updated);
      toast.success(
        field === 'active'
          ? value ? 'Loja publicada.' : 'Loja removida da vitrine pública.'
          : value ? 'Loja aberta para pedidos.' : 'Loja fechada para pedidos.'
      );
    } catch (e) {
      setStore(previous);
      toast.error((e as Error).message);
    } finally {
      setSavingField(null);
    }
  };

  const acceptingOrders = store?.acceptingOrders ?? store?.active ?? false;
  const publicUrl = store ? `/loja/${store.slug}` : '';

  return (
    <div>
      <Header title="Loja online" subtitle="Controle a publicação e o recebimento de pedidos" />

      {loading ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <TableSkeleton rows={5} cols={3} />
        </div>
      ) : !store ? (
        <EmptyState icon={Store} text="Loja online não configurada para esta conta." />
      ) : (
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <p className="text-lg font-bold text-gray-900 dark:text-white truncate">{store.storeName}</p>
                {store.description && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-2xl">{store.description}</p>
                )}
                <div className="flex items-center gap-2 flex-wrap mt-3">
                  <StatusPill on={store.active} onText="Publicada" offText="Não publicada" />
                  <StatusPill on={acceptingOrders} onText="Aberta para pedidos" offText="Fechada para pedidos" />
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowSettings(true)}
                  className="inline-flex items-center gap-1.5 text-sm font-medium border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <Settings size={15} />
                  Configurações
                </button>
                <a
                  href={publicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-700"
                >
                  <ExternalLink size={15} />
                  Ver loja
                </a>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-3">
            <ToggleRow
              icon={Store}
              title="Loja publicada"
              description="Quando desligada, a loja sai da vitrine pública e o link pode ficar indisponível para clientes."
              checked={store.active}
              saving={savingField === 'active'}
              onChange={value => updateStatus('active', value)}
            />
            <ToggleRow
              icon={Power}
              title="Recebendo pedidos"
              description="Quando desligada, a loja continua visível, mostra “Loja fechada” e bloqueia novos pedidos."
              checked={acceptingOrders}
              disabled={!store.active}
              saving={savingField === 'acceptingOrders'}
              onChange={value => updateStatus('acceptingOrders', value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <p className="text-xs text-gray-400">Produtos</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">{store.products.length}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <p className="text-xs text-gray-400">Atendimento</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1">
                {[store.acceptsDelivery && 'Entrega', store.acceptsPickup && 'Retirada'].filter(Boolean).join(' e ') || '-'}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <p className="text-xs text-gray-400">Pedido mínimo</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1">
                {store.minOrderValue != null ? formatBRL(store.minOrderValue) : '-'}
              </p>
            </div>
          </div>

          {/* Cardápio (produtos) */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ShoppingBag size={16} className="text-primary-500" />
                <p className="font-semibold text-gray-900 dark:text-white">Cardápio</p>
              </div>
              <button
                onClick={() => setProductModal('new')}
                className="flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-lg px-3 py-1.5 transition-colors"
              >
                <Plus size={15} /> Produto
              </button>
            </div>
            {store.products.length === 0 ? (
              <div className="py-12 flex flex-col items-center text-center">
                <PackageOpen size={32} className="text-gray-300 dark:text-gray-600 mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum produto no cardápio. Adicione o primeiro.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {groupProductsByCategory(store.products).map(group => (
                  <div key={group.category}>
                    {group.showHeader && (
                      <div className="px-4 pt-3 pb-1 bg-gray-50 dark:bg-gray-900/40">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">{group.category}</p>
                      </div>
                    )}
                    {group.items.map(product => (
                      <div key={product.id} className="px-4 py-3 flex items-center gap-3">
                        {product.photoUrl ? (
                          <img src={product.photoUrl} alt={product.name} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0">
                            <ShoppingBag size={16} className="text-gray-400" />
                          </div>
                        )}
                        <button onClick={() => setProductModal(product)} className="flex-1 min-w-0 text-left">
                          <p className="font-medium text-gray-900 dark:text-white truncate">{product.name}</p>
                          <p className="text-xs text-gray-400 truncate">
                            {formatBRL(product.publicPrice)}
                            {product.stock != null ? ` · ${product.stock} em estoque` : ''}
                            {!product.available ? ' · Indisponível' : ''}
                          </p>
                        </button>
                        <button onClick={() => setProductModal(product)} className={iconBtn}>
                          <Pencil size={16} />
                        </button>
                        <button onClick={() => setConfirmProductId(product.id)} className={iconBtnDanger}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Adicionais / complementos */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <PlusCircle size={16} className="text-primary-500" />
                <p className="font-semibold text-gray-900 dark:text-white">Adicionais</p>
              </div>
              <button
                onClick={() => setAddonModal('new')}
                className="flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-lg px-3 py-1.5 transition-colors"
              >
                <Plus size={15} /> Adicional
              </button>
            </div>
            {addons.length === 0 ? (
              <div className="py-8 flex flex-col items-center text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
                  Complementos que o cliente pode incluir no pedido (ex.: cobertura extra, embalagem para presente).
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {addons.map(addon => (
                  <div key={addon.id} className="px-4 py-3 flex items-center gap-3">
                    <button onClick={() => setAddonModal(addon)} className="flex-1 min-w-0 text-left">
                      <p className="font-medium text-gray-900 dark:text-white truncate">{addon.name}</p>
                      <p className="text-xs text-gray-400">
                        {formatBRL(addon.price)}{!addon.available ? ' · Indisponível' : ''}
                      </p>
                    </button>
                    <button onClick={() => setAddonModal(addon)} className={iconBtn}>
                      <Pencil size={16} />
                    </button>
                    <button onClick={() => setConfirmAddonId(addon.id)} className={iconBtnDanger}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {store && showSettings && (
        <StoreSettingsForm
          store={store}
          onClose={() => setShowSettings(false)}
          onSaved={() => { setShowSettings(false); load(); }}
          toast={toast}
        />
      )}

      {productModal && (
        <StoreProductForm
          initial={productModal === 'new' ? null : productModal}
          recipes={recipes}
          knownCategories={Array.from(
            new Set((store?.products ?? []).map(p => (p.category ?? '').trim()).filter(Boolean))
          ).sort((a, b) => a.localeCompare(b, 'pt-BR'))}
          onClose={() => setProductModal(null)}
          onSaved={() => { setProductModal(null); load(); }}
          toast={toast}
        />
      )}

      {addonModal && (
        <StoreAddonForm
          initial={addonModal === 'new' ? null : addonModal}
          onClose={() => setAddonModal(null)}
          onSaved={() => { setAddonModal(null); load(); }}
          toast={toast}
        />
      )}

      <ConfirmModal
        open={!!confirmProductId}
        title="Excluir produto"
        message="Tem certeza? O produto sai do cardápio da loja."
        onConfirm={deleteProduct}
        onCancel={() => setConfirmProductId(null)}
      />
      <ConfirmModal
        open={!!confirmAddonId}
        title="Excluir adicional"
        message="Tem certeza?"
        onConfirm={deleteAddon}
        onCancel={() => setConfirmAddonId(null)}
      />
    </div>
  );
}

function StoreProductForm({
  initial,
  recipes,
  knownCategories,
  onClose,
  onSaved,
  toast,
}: {
  initial: StoreProduct | null;
  recipes: Recipe[];
  knownCategories: string[];
  onClose: () => void;
  onSaved: () => void;
  toast: ToastFn;
}) {
  const editingId = initial?.id ?? null;
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [price, setPrice] = useState(initial ? Number(initial.publicPrice).toFixed(2).replace('.', ',') : '');
  const [available, setAvailable] = useState(initial?.available ?? true);
  const [stock, setStock] = useState(initial?.stock != null ? String(initial.stock) : '');
  const [category, setCategory] = useState(initial?.category ?? '');
  const [photoUrl, setPhotoUrl] = useState(initial?.photoUrl ?? '');
  const [recipeId, setRecipeId] = useState(initial?.recipeId ?? '');
  const [discountType, setDiscountType] = useState<DiscountType>(initial?.discountType ?? 'fixed');
  const [discountValue, setDiscountValue] = useState(
    initial?.discountValue != null ? String(initial.discountValue).replace('.', ',') : ''
  );
  const [saving, setSaving] = useState(false);

  const onPickPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) return toast.error('Imagem muito grande (máx. 3 MB).');
    const reader = new FileReader();
    reader.onload = () => setPhotoUrl(String(reader.result));
    reader.readAsDataURL(file);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('Informe o nome do produto.');
    const priceN = parseLocaleNumber(price);
    if (priceN <= 0) return toast.error('Informe um preço válido.');

    const discN = discountValue.trim() ? parseLocaleNumber(discountValue) : 0;
    setSaving(true);
    const data: CreateStoreProductDTO = {
      name: name.trim(),
      description: description.trim() || null,
      publicPrice: priceN,
      available,
      photoUrl: photoUrl || null,
      recipeId: recipeId || null,
      stock: stock.trim() === '' ? null : Math.max(0, parseInt(stock, 10) || 0),
      discountType: discN > 0 ? discountType : null,
      discountValue: discN > 0 ? discN : null,
      category: category.trim() || null,
    };
    try {
      if (editingId) {
        await userApi.updateStoreProduct(editingId, data);
        toast.success('Produto atualizado.');
      } else {
        await userApi.createStoreProduct(data);
        toast.success('Produto adicionado.');
      }
      onSaved();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalOverlay onClose={onClose}>
      <form onSubmit={submit} className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 space-y-4">
        <h3 className="font-bold text-lg text-gray-900 dark:text-white">
          {editingId ? 'Editar produto' : 'Novo produto'}
        </h3>

        {/* Foto */}
        <div className="flex items-center gap-3">
          {photoUrl ? (
            <img src={photoUrl} alt="" className="w-16 h-16 rounded-xl object-cover" />
          ) : (
            <div className="w-16 h-16 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
              <ImagePlus size={22} className="text-gray-400" />
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <label className="inline-flex items-center gap-1.5 text-sm font-medium border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200">
              <ImagePlus size={15} /> {photoUrl ? 'Trocar foto' : 'Adicionar foto'}
              <input type="file" accept="image/*" className="hidden" onChange={onPickPhoto} />
            </label>
            {photoUrl && (
              <button type="button" onClick={() => setPhotoUrl('')} className="text-xs text-red-500 hover:underline text-left">
                Remover foto
              </button>
            )}
          </div>
        </div>

        {recipes.length > 0 && (
          <FormField label="Vincular a uma receita (opcional)">
            <select
              value={recipeId}
              onChange={e => {
                const id = e.target.value;
                setRecipeId(id);
                const r = recipes.find(x => x.id === id);
                if (r && !name.trim()) setName(r.name);
              }}
              className={inputClass}
            >
              <option value="">Sem vínculo</option>
              {recipes.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </FormField>
        )}

        <FormField label="Nome">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Ex.: Brigadeiro gourmet" className={inputClass} autoFocus />
        </FormField>

        <FormField label="Descrição (opcional)">
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} className={inputClass + ' resize-none'} />
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Preço de venda (R$)">
            <input type="text" inputMode="decimal" value={price} onChange={e => setPrice(e.target.value)} placeholder="0,00" className={inputClass} />
          </FormField>
          <FormField label="Estoque (opcional)">
            <input type="text" inputMode="numeric" value={stock} onChange={e => setStock(e.target.value)} placeholder="Ilimitado" className={inputClass} />
          </FormField>
        </div>

        {/* Categoria */}
        <FormField label="Categoria (opcional)">
          <input
            type="text"
            value={category}
            onChange={e => setCategory(e.target.value)}
            placeholder="Ex.: Bolos, Tortas, Doces"
            maxLength={60}
            className={inputClass}
          />
          {knownCategories.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {knownCategories.map(c => {
                const active = category.trim().toLowerCase() === c.toLowerCase();
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategory(active ? '' : c)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-full border transition-colors ${
                      active
                        ? 'bg-primary-500 border-primary-500 text-white'
                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-primary-400'
                    }`}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          )}
          <p className="text-xs text-gray-400 mt-1.5">Produtos com a mesma categoria ficam agrupados no cardápio. Vazio = "Outros".</p>
        </FormField>

        {/* Desconto */}
        <FormField label="Desconto (opcional)">
          <div className="flex gap-2">
            <div className="flex rounded-lg bg-gray-100 dark:bg-gray-700 p-0.5 shrink-0">
              {([['fixed', 'R$'], ['percent', '%']] as [DiscountType, string][]).map(([val, lbl]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setDiscountType(val)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${discountType === val ? 'bg-white dark:bg-gray-800 text-primary-600 shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
                >
                  {lbl}
                </button>
              ))}
            </div>
            <input
              type="text"
              inputMode="decimal"
              value={discountValue}
              onChange={e => setDiscountValue(e.target.value)}
              placeholder={discountType === 'percent' ? '10' : '0,00'}
              className={inputClass}
            />
          </div>
        </FormField>

        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input type="checkbox" checked={available} onChange={e => setAvailable(e.target.checked)} className="w-4 h-4 rounded accent-primary-500" />
          <span className="text-sm text-gray-700 dark:text-gray-200">Disponível para pedido</span>
        </label>

        <FormActions saving={saving} onClose={onClose} />
      </form>
    </ModalOverlay>
  );
}

function StoreAddonForm({
  initial,
  onClose,
  onSaved,
  toast,
}: {
  initial: StoreAddon | null;
  onClose: () => void;
  onSaved: () => void;
  toast: ToastFn;
}) {
  const editingId = initial?.id ?? null;
  const [name, setName] = useState(initial?.name ?? '');
  const [price, setPrice] = useState(initial ? Number(initial.price).toFixed(2).replace('.', ',') : '');
  const [available, setAvailable] = useState(initial?.available ?? true);
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('Informe o nome do adicional.');
    const priceN = parseLocaleNumber(price);
    if (priceN < 0) return toast.error('Informe um preço válido.');
    setSaving(true);
    const data = { name: name.trim(), price: priceN, available };
    try {
      if (editingId) {
        await userApi.updateStoreAddon(editingId, data);
        toast.success('Adicional atualizado.');
      } else {
        await userApi.createStoreAddon(data);
        toast.success('Adicional criado.');
      }
      onSaved();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalOverlay onClose={onClose}>
      <form onSubmit={submit} className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 space-y-4">
        <h3 className="font-bold text-lg text-gray-900 dark:text-white">
          {editingId ? 'Editar adicional' : 'Novo adicional'}
        </h3>
        <FormField label="Nome">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Ex.: Cobertura extra" className={inputClass} autoFocus />
        </FormField>
        <FormField label="Preço (R$)">
          <input type="text" inputMode="decimal" value={price} onChange={e => setPrice(e.target.value)} placeholder="0,00" className={inputClass} />
        </FormField>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input type="checkbox" checked={available} onChange={e => setAvailable(e.target.checked)} className="w-4 h-4 rounded accent-primary-500" />
          <span className="text-sm text-gray-700 dark:text-gray-200">Disponível</span>
        </label>
        <FormActions saving={saving} onClose={onClose} />
      </form>
    </ModalOverlay>
  );
}

function pixKeyPlaceholder(type: PixKeyType): string {
  switch (type) {
    case 'cpf': return '000.000.000-00';
    case 'cnpj': return '00.000.000/0000-00';
    case 'email': return 'voce@email.com';
    case 'phone': return '(00) 00000-0000';
    default: return 'chave aleatória (UUID)';
  }
}

function StoreSettingsForm({
  store,
  onClose,
  onSaved,
  toast,
}: {
  store: MyStore;
  onClose: () => void;
  onSaved: () => void;
  toast: ToastFn;
}) {
  const [storeName, setStoreName] = useState(store.storeName ?? '');
  const [description, setDescription] = useState(store.description ?? '');
  const [city, setCity] = useState(store.city ?? '');
  const [address, setAddress] = useState(store.address ?? '');
  const [acceptsDelivery, setAcceptsDelivery] = useState(store.acceptsDelivery);
  const [acceptsPickup, setAcceptsPickup] = useState(store.acceptsPickup);
  const [minOrderValue, setMinOrderValue] = useState(
    store.minOrderValue != null ? String(store.minOrderValue).replace('.', ',') : ''
  );
  const [deliveryFee, setDeliveryFee] = useState(
    store.deliveryFee != null ? String(store.deliveryFee).replace('.', ',') : ''
  );
  const [useBusinessHours, setUseBusinessHours] = useState(store.useBusinessHours ?? false);
  const [businessHours, setBusinessHours] = useState<StoreBusinessHours[]>(
    store.businessHours?.length === 7 ? store.businessHours : defaultBusinessHours()
  );
  const [pixKeyType, setPixKeyType] = useState<PixKeyType>(store.pixKeyType ?? 'random');
  const [pixKey, setPixKey] = useState(store.pixKey ?? '');
  const [pixReceiverName, setPixReceiverName] = useState(store.pixReceiverName ?? '');
  const [saving, setSaving] = useState(false);

  const updateDay = (dayOfWeek: number, patch: Partial<StoreBusinessHours>) =>
    setBusinessHours(prev => prev.map(d => (d.dayOfWeek === dayOfWeek ? { ...d, ...patch } : d)));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeName.trim()) return toast.error('Informe o nome da loja.');
    if (!acceptsDelivery && !acceptsPickup) {
      return toast.error('Escolha ao menos uma forma de atendimento (entrega ou retirada).');
    }
    setSaving(true);
    const data: StoreSettingsDTO = {
      storeName: storeName.trim(),
      description: description.trim() || null,
      city: city.trim() || null,
      address: address.trim() || null,
      acceptsDelivery,
      acceptsPickup,
      minOrderValue: minOrderValue.trim() ? parseLocaleNumber(minOrderValue) : null,
      deliveryFee: deliveryFee.trim() ? parseLocaleNumber(deliveryFee) : null,
      pixKey: pixKey.trim() || null,
      pixKeyType: pixKey.trim() ? pixKeyType : null,
      pixReceiverName: pixReceiverName.trim() || null,
      useBusinessHours,
      businessHours,
    };
    try {
      await userApi.updateStoreSettings(data);
      toast.success('Configurações da loja salvas.');
      onSaved();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalOverlay onClose={onClose}>
      <form onSubmit={submit} className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 space-y-4">
        <h3 className="font-bold text-lg text-gray-900 dark:text-white">Configurações da loja</h3>

        <FormField label="Nome da loja">
          <input value={storeName} onChange={e => setStoreName(e.target.value)} placeholder="Doces da Maria" className={inputClass} autoFocus />
        </FormField>

        <FormField label="Descrição (opcional)">
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Uma frase que apresenta sua loja aos clientes."
            rows={2}
            className={inputClass + ' resize-none'}
          />
        </FormField>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label="Cidade">
            <input value={city} onChange={e => setCity(e.target.value)} placeholder="Sua cidade" className={inputClass} />
          </FormField>
          <FormField label="Endereço (opcional)">
            <input value={address} onChange={e => setAddress(e.target.value)} placeholder="Rua, nº, bairro" className={inputClass} />
          </FormField>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Formas de atendimento</label>
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={acceptsDelivery} onChange={e => setAcceptsDelivery(e.target.checked)} className="w-4 h-4 rounded accent-primary-500" />
              <span className="text-sm text-gray-700 dark:text-gray-200">Entrega (delivery)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={acceptsPickup} onChange={e => setAcceptsPickup(e.target.checked)} className="w-4 h-4 rounded accent-primary-500" />
              <span className="text-sm text-gray-700 dark:text-gray-200">Retirada no local</span>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label="Pedido mínimo (R$)">
            <input
              type="text"
              inputMode="decimal"
              value={minOrderValue}
              onChange={e => setMinOrderValue(e.target.value)}
              placeholder="Sem mínimo"
              className={inputClass}
            />
          </FormField>
          <FormField label="Taxa de entrega (R$)">
            <input
              type="text"
              inputMode="decimal"
              value={deliveryFee}
              onChange={e => setDeliveryFee(e.target.value)}
              placeholder="0,00"
              className={inputClass}
              disabled={!acceptsDelivery}
            />
          </FormField>
        </div>

        {/* Recebimento por PIX */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Recebimento por PIX</label>
            <p className="text-xs text-gray-400 mt-0.5">
              Cadastre sua chave PIX para o cliente pagar na hora do pedido. O dinheiro cai
              direto na sua conta — você confere e marca o pedido como pago na tela de encomendas.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-[150px_1fr] gap-3">
            <FormField label="Tipo de chave">
              <select value={pixKeyType} onChange={e => setPixKeyType(e.target.value as PixKeyType)} className={inputClass}>
                <option value="random">Aleatória</option>
                <option value="cpf">CPF</option>
                <option value="cnpj">CNPJ</option>
                <option value="email">E-mail</option>
                <option value="phone">Celular</option>
              </select>
            </FormField>
            <FormField label="Chave PIX">
              <input value={pixKey} onChange={e => setPixKey(e.target.value)} placeholder={pixKeyPlaceholder(pixKeyType)} className={inputClass} />
            </FormField>
          </div>
          <FormField label="Nome do recebedor (opcional)">
            <input
              value={pixReceiverName}
              onChange={e => setPixReceiverName(e.target.value)}
              placeholder={storeName || 'Aparece no app do banco do cliente'}
              className={inputClass}
            />
          </FormField>
        </div>

        {/* Horários de funcionamento */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <label className="flex items-center justify-between gap-3 cursor-pointer select-none">
            <span>
              <span className="block text-sm font-medium text-gray-900 dark:text-white">Horários de funcionamento</span>
              <span className="block text-xs text-gray-500 dark:text-gray-400">
                Mostra aos clientes os dias e horários em que a loja atende.
              </span>
            </span>
            <input
              type="checkbox"
              checked={useBusinessHours}
              onChange={e => setUseBusinessHours(e.target.checked)}
              className="w-4 h-4 rounded accent-primary-500 shrink-0"
            />
          </label>

          {useBusinessHours && (
            <div className="mt-3 space-y-2">
              {businessHours.map(day => (
                <div key={day.dayOfWeek} className="flex items-center gap-2">
                  <span className="w-20 text-sm text-gray-700 dark:text-gray-200 shrink-0">{WEEKDAYS[day.dayOfWeek]}</span>
                  {day.closed ? (
                    <span className="flex-1 text-sm text-gray-400">Fechado</span>
                  ) : (
                    <div className="flex-1 flex items-center gap-1.5">
                      <input
                        type="time"
                        value={day.openTime}
                        onChange={e => updateDay(day.dayOfWeek, { openTime: e.target.value })}
                        className={inputClass + ' py-1.5'}
                      />
                      <span className="text-gray-400 text-sm">às</span>
                      <input
                        type="time"
                        value={day.closeTime}
                        onChange={e => updateDay(day.dayOfWeek, { closeTime: e.target.value })}
                        className={inputClass + ' py-1.5'}
                      />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => updateDay(day.dayOfWeek, { closed: !day.closed })}
                    className={`shrink-0 text-xs font-semibold rounded-lg px-2.5 py-1.5 transition-colors ${
                      day.closed
                        ? 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300'
                        : 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                    }`}
                  >
                    {day.closed ? 'Fechado' : 'Aberto'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <FormActions saving={saving} onClose={onClose} />
      </form>
    </ModalOverlay>
  );
}
