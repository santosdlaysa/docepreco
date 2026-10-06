import { StoreReceiving } from './StoreReceiving';
import { useCallback, useEffect, useState } from 'react';
import { ExternalLink, Loader2, PackageOpen, Power, Settings, ShoppingBag, Store, Plus, Pencil, Trash2, ImagePlus, PlusCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { getLang } from '../../i18n';
import { ToastFn, TableSkeleton, ModalOverlay, ConfirmModal } from '../../components';
import { formatBRL } from '../format';
import { MyStore, StoreSettingsDTO, StoreBusinessHours, StoreProduct, StoreAddon, CreateStoreProductDTO, DiscountType, Recipe, PixKeyType, StorePaymentMethod, userApi } from '../userApi';
import { imageFileToJpegDataUrl } from '../../lib/image';
import { EmptyState, Header, FormField, FormActions, inputClass, iconBtn, iconBtnDanger } from './IngredientsPage';
import { parseLocaleNumber } from '../number';

// Rótulos dos dias vêm de store:weekday.0..6 (domingo = 0).

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
    return a.localeCompare(b, getLang() === 'en' ? 'en' : 'pt-BR');
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
  const { t } = useTranslation('store');
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
      toast.success(t('productDeleted'));
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
      toast.success(t('addonDeleted'));
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
          ? value ? t('toast.published') : t('toast.unpublished')
          : value ? t('toast.opened') : t('toast.closed')
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
      <Header title={t('title')} subtitle={t('subtitle')} />

      {loading ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <TableSkeleton rows={5} cols={3} />
        </div>
      ) : !store ? (
        <EmptyState icon={Store} text={t('notConfigured')} />
      ) : (
        <div className="space-y-4">
          <StoreReceiving />
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <p className="text-lg font-bold text-gray-900 dark:text-white truncate">{store.storeName}</p>
                {store.description && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-2xl">{store.description}</p>
                )}
                <div className="flex items-center gap-2 flex-wrap mt-3">
                  <StatusPill on={store.active} onText={t('pill.published')} offText={t('pill.unpublished')} />
                  <StatusPill on={acceptingOrders} onText={t('pill.open')} offText={t('pill.closed')} />
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowSettings(true)}
                  className="inline-flex items-center gap-1.5 text-sm font-medium border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <Settings size={15} />
                  {t('settingsButton')}
                </button>
                <a
                  href={publicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-700"
                >
                  <ExternalLink size={15} />
                  {t('viewStore')}
                </a>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-3">
            <ToggleRow
              icon={Store}
              title={t('toggle.publishedTitle')}
              description={t('toggle.publishedDesc')}
              checked={store.active}
              saving={savingField === 'active'}
              onChange={value => updateStatus('active', value)}
            />
            <ToggleRow
              icon={Power}
              title={t('toggle.ordersTitle')}
              description={t('toggle.ordersDesc')}
              checked={acceptingOrders}
              disabled={!store.active}
              saving={savingField === 'acceptingOrders'}
              onChange={value => updateStatus('acceptingOrders', value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <p className="text-xs text-gray-400">{t('stat.products')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">{store.products.length}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <p className="text-xs text-gray-400">{t('stat.service')}</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1">
                {[store.acceptsDelivery && t('stat.delivery'), store.acceptsPickup && t('stat.pickup')].filter(Boolean).join(t('stat.and')) || '-'}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <p className="text-xs text-gray-400">{t('stat.minOrder')}</p>
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
                <p className="font-semibold text-gray-900 dark:text-white">{t('menu')}</p>
              </div>
              <button
                onClick={() => setProductModal('new')}
                className="flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-lg px-3 py-1.5 transition-colors"
              >
                <Plus size={15} /> {t('addProduct')}
              </button>
            </div>
            {store.products.length === 0 ? (
              <div className="py-12 flex flex-col items-center text-center">
                <PackageOpen size={32} className="text-gray-300 dark:text-gray-600 mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('emptyMenu')}</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {groupProductsByCategory(store.products).map(group => (
                  <div key={group.category}>
                    {group.showHeader && (
                      <div className="px-4 pt-3 pb-1 bg-gray-50 dark:bg-gray-900/40">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">{group.category === SEM_CATEGORIA ? t('uncategorized') : group.category}</p>
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
                            {product.stock != null ? ` · ${t('inStock', { count: product.stock })}` : ''}
                            {!product.available ? ` · ${t('unavailable')}` : ''}
                          </p>
                        </button>
                        <button onClick={() => setProductModal(product)} className={iconBtn} title={t('edit')} aria-label={t('edit')}>
                          <Pencil size={16} />
                        </button>
                        <button onClick={() => setConfirmProductId(product.id)} className={iconBtnDanger} title={t('delete')} aria-label={t('delete')}>
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
                <p className="font-semibold text-gray-900 dark:text-white">{t('addons')}</p>
              </div>
              <button
                onClick={() => setAddonModal('new')}
                className="flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-lg px-3 py-1.5 transition-colors"
              >
                <Plus size={15} /> {t('addAddon')}
              </button>
            </div>
            {addons.length === 0 ? (
              <div className="py-8 flex flex-col items-center text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
                  {t('addonsEmpty')}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {addons.map(addon => (
                  <div key={addon.id} className="px-4 py-3 flex items-center gap-3">
                    <button onClick={() => setAddonModal(addon)} className="flex-1 min-w-0 text-left">
                      <p className="font-medium text-gray-900 dark:text-white truncate">{addon.name}</p>
                      <p className="text-xs text-gray-400">
                        {formatBRL(addon.price)}{!addon.available ? ` · ${t('unavailable')}` : ''}
                      </p>
                    </button>
                    <button onClick={() => setAddonModal(addon)} className={iconBtn} title={t('edit')} aria-label={t('edit')}>
                      <Pencil size={16} />
                    </button>
                    <button onClick={() => setConfirmAddonId(addon.id)} className={iconBtnDanger} title={t('delete')} aria-label={t('delete')}>
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
          ).sort((a, b) => a.localeCompare(b, getLang() === 'en' ? 'en' : 'pt-BR'))}
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
        title={t('deleteProductTitle')}
        message={t('deleteProductMessage')}
        onConfirm={deleteProduct}
        onCancel={() => setConfirmProductId(null)}
      />
      <ConfirmModal
        open={!!confirmAddonId}
        title={t('deleteAddonTitle')}
        message={t('deleteAddonMessage')}
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
  const { t } = useTranslation('store');
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
    if (file.size > 3 * 1024 * 1024) return toast.error(t('product.imageTooLarge'));
    const reader = new FileReader();
    reader.onload = () => setPhotoUrl(String(reader.result));
    reader.readAsDataURL(file);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error(t('product.enterName'));
    const priceN = parseLocaleNumber(price);
    if (priceN <= 0) return toast.error(t('enterValidPrice'));

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
        toast.success(t('product.updated'));
      } else {
        await userApi.createStoreProduct(data);
        toast.success(t('product.added'));
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
          {editingId ? t('product.editTitle') : t('product.newTitle')}
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
              <ImagePlus size={15} /> {photoUrl ? t('product.changePhoto') : t('product.addPhoto')}
              <input type="file" accept="image/*" className="hidden" onChange={onPickPhoto} />
            </label>
            {photoUrl && (
              <button type="button" onClick={() => setPhotoUrl('')} className="text-xs text-red-500 hover:underline text-left">
                {t('product.removePhoto')}
              </button>
            )}
          </div>
        </div>

        {recipes.length > 0 && (
          <FormField label={t('product.linkRecipe')}>
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
              <option value="">{t('product.noLink')}</option>
              {recipes.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </FormField>
        )}

        <FormField label={t('name')}>
          <input value={name} onChange={e => setName(e.target.value)} placeholder={t('product.namePlaceholder')} className={inputClass} autoFocus />
        </FormField>

        <FormField label={t('descriptionOptional')}>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} className={inputClass + ' resize-none'} />
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField label={t('product.price')}>
            <input type="text" inputMode="decimal" value={price} onChange={e => setPrice(e.target.value)} placeholder="0,00" className={inputClass} />
          </FormField>
          <FormField label={t('product.stock')}>
            <input type="text" inputMode="numeric" value={stock} onChange={e => setStock(e.target.value)} placeholder={t('product.unlimited')} className={inputClass} />
          </FormField>
        </div>

        {/* Categoria */}
        <FormField label={t('product.category')}>
          <input
            type="text"
            value={category}
            onChange={e => setCategory(e.target.value)}
            placeholder={t('product.categoryPlaceholder')}
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
          <p className="text-xs text-gray-400 mt-1.5">{t('product.categoryHint')}</p>
        </FormField>

        {/* Desconto */}
        <FormField label={t('product.discount')}>
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
          <span className="text-sm text-gray-700 dark:text-gray-200">{t('product.availableForOrder')}</span>
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
  const { t } = useTranslation('store');
  const editingId = initial?.id ?? null;
  const [name, setName] = useState(initial?.name ?? '');
  const [price, setPrice] = useState(initial ? Number(initial.price).toFixed(2).replace('.', ',') : '');
  const [available, setAvailable] = useState(initial?.available ?? true);
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error(t('addon.enterName'));
    const priceN = parseLocaleNumber(price);
    if (priceN < 0) return toast.error(t('enterValidPrice'));
    setSaving(true);
    const data = { name: name.trim(), price: priceN, available };
    try {
      if (editingId) {
        await userApi.updateStoreAddon(editingId, data);
        toast.success(t('addon.updated'));
      } else {
        await userApi.createStoreAddon(data);
        toast.success(t('addon.created'));
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
          {editingId ? t('addon.editTitle') : t('addon.newTitle')}
        </h3>
        <FormField label={t('name')}>
          <input value={name} onChange={e => setName(e.target.value)} placeholder={t('addon.namePlaceholder')} className={inputClass} autoFocus />
        </FormField>
        <FormField label={t('addon.price')}>
          <input type="text" inputMode="decimal" value={price} onChange={e => setPrice(e.target.value)} placeholder="0,00" className={inputClass} />
        </FormField>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input type="checkbox" checked={available} onChange={e => setAvailable(e.target.checked)} className="w-4 h-4 rounded accent-primary-500" />
          <span className="text-sm text-gray-700 dark:text-gray-200">{t('addon.available')}</span>
        </label>
        <FormActions saving={saving} onClose={onClose} />
      </form>
    </ModalOverlay>
  );
}

function pixKeyPlaceholder(type: PixKeyType, t: TFunction): string {
  switch (type) {
    case 'cpf': return '000.000.000-00';
    case 'cnpj': return '00.000.000/0000-00';
    case 'email': return t('store:settings.pixEmailPlaceholder');
    case 'phone': return '(00) 00000-0000';
    default: return t('store:settings.pixRandomPlaceholder');
  }
}

/** Categorias da vitrine — mesmas chaves do app (StoreSettingsScreen). Rótulo em store:category.<key>. */
const STORE_CATEGORIES = [
  { key: 'hamburguer', emoji: '🍔' },
  { key: 'bolos', emoji: '🎂' },
  { key: 'doces', emoji: '🍬' },
  { key: 'sorvetes', emoji: '🍦' },
  { key: 'pudins', emoji: '🍮' },
  { key: 'salgados', emoji: '🥟' },
  { key: 'bebidas', emoji: '🥤' },
  { key: 'pizzas', emoji: '🍕' },
  { key: 'marmitas', emoji: '🍱' },
  { key: 'outros', emoji: '🍽️' },
];

/** Rótulos em store:payment.<key>.label / .sub */
const STORE_PAYMENT_METHODS: StorePaymentMethod[] = ['pix', 'cash', 'credit', 'debit'];

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
  const { t } = useTranslation('store');
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
  const [coverImageUrl, setCoverImageUrl] = useState(store.coverImageUrl ?? '');
  const [logoUrl, setLogoUrl] = useState(store.logoUrl ?? '');
  const [category, setCategory] = useState(store.category ?? '');
  const [paymentMethods, setPaymentMethods] = useState<StorePaymentMethod[]>(
    store.paymentMethods?.length ? store.paymentMethods : ['pix', 'cash', 'credit', 'debit']
  );
  const [loyaltyEnabled, setLoyaltyEnabled] = useState(store.loyaltyEnabled ?? false);
  const [loyaltyGoal, setLoyaltyGoal] = useState(String(store.loyaltyGoal ?? 10));
  const [loyaltyReward, setLoyaltyReward] = useState(store.loyaltyReward ?? '');
  const [saving, setSaving] = useState(false);

  const pickImage = (setter: (v: string) => void, maxSide: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    imageFileToJpegDataUrl(file, maxSide).then(setter).catch(err => toast.error((err as Error).message));
  };

  const togglePayment = (m: StorePaymentMethod) =>
    setPaymentMethods(prev => (prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]));

  const updateDay = (dayOfWeek: number, patch: Partial<StoreBusinessHours>) =>
    setBusinessHours(prev => prev.map(d => (d.dayOfWeek === dayOfWeek ? { ...d, ...patch } : d)));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeName.trim()) return toast.error(t('settings.enterName'));
    if (!acceptsDelivery && !acceptsPickup) {
      return toast.error(t('settings.chooseService'));
    }
    if (paymentMethods.length === 0) return toast.error(t('settings.choosePayment'));
    if (loyaltyEnabled && !loyaltyReward.trim()) return toast.error(t('settings.enterReward'));
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
      coverImageUrl: coverImageUrl || null,
      logoUrl: logoUrl || null,
      category: category || null,
      paymentMethods,
      loyaltyEnabled,
      loyaltyGoal: Math.max(1, Math.min(100, Math.floor(Number(loyaltyGoal) || 10))),
      loyaltyReward: loyaltyReward.trim() || null,
    };
    try {
      await userApi.updateStoreSettings(data);
      toast.success(t('settings.saved'));
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
        <h3 className="font-bold text-lg text-gray-900 dark:text-white">{t('settings.title')}</h3>

        <FormField label={t('settings.storeName')}>
          <input value={storeName} onChange={e => setStoreName(e.target.value)} placeholder={t('settings.storeNamePlaceholder')} className={inputClass} autoFocus />
        </FormField>

        <FormField label={t('descriptionOptional')}>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder={t('settings.descriptionPlaceholder')}
            rows={2}
            className={inputClass + ' resize-none'}
          />
        </FormField>

        {/* Capa e logo */}
        <div className="grid grid-cols-[1fr_auto] gap-3 items-start">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">{t('settings.cover')}</label>
            <div className="relative h-24 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
              {coverImageUrl ? <img src={coverImageUrl} alt="" className="w-full h-full object-cover" /> : <ImagePlus size={22} className="text-gray-400" />}
            </div>
            <div className="flex gap-3 mt-1.5 text-xs">
              <label className="text-primary-600 font-semibold cursor-pointer hover:underline">
                {coverImageUrl ? t('settings.changeCover') : t('settings.addCover')}
                <input type="file" accept="image/*" className="hidden" onChange={pickImage(setCoverImageUrl, 1600)} />
              </label>
              {coverImageUrl && <button type="button" onClick={() => setCoverImageUrl('')} className="text-gray-500 hover:underline">{t('remove')}</button>}
            </div>
          </div>
          <div className="w-24">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">{t('settings.logo')}</label>
            <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
              {logoUrl ? <img src={logoUrl} alt="" className="w-full h-full object-cover" /> : <ImagePlus size={20} className="text-gray-400" />}
            </div>
            <div className="flex flex-col mt-1.5 text-xs">
              <label className="text-primary-600 font-semibold cursor-pointer hover:underline">
                {logoUrl ? t('settings.change') : t('settings.add')}
                <input type="file" accept="image/*" className="hidden" onChange={pickImage(setLogoUrl, 512)} />
              </label>
              {logoUrl && <button type="button" onClick={() => setLogoUrl('')} className="text-left text-gray-500 hover:underline">{t('remove')}</button>}
            </div>
          </div>
        </div>

        {/* Categoria */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">{t('settings.storeCategory')}</label>
          <div className="flex flex-wrap gap-2">
            {STORE_CATEGORIES.map(c => (
              <button
                key={c.key}
                type="button"
                onClick={() => setCategory(category === c.key ? '' : c.key)}
                className={`text-sm rounded-full px-3 py-1.5 border transition-colors ${
                  category === c.key
                    ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                    : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300'
                }`}
              >
                {c.emoji} {t(`category.${c.key}`)}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label={t('settings.city')}>
            <input value={city} onChange={e => setCity(e.target.value)} placeholder={t('settings.cityPlaceholder')} className={inputClass} />
          </FormField>
          <FormField label={t('settings.address')}>
            <input value={address} onChange={e => setAddress(e.target.value)} placeholder={t('settings.addressPlaceholder')} className={inputClass} />
          </FormField>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">{t('settings.serviceTypes')}</label>
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={acceptsDelivery} onChange={e => setAcceptsDelivery(e.target.checked)} className="w-4 h-4 rounded accent-primary-500" />
              <span className="text-sm text-gray-700 dark:text-gray-200">{t('settings.delivery')}</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={acceptsPickup} onChange={e => setAcceptsPickup(e.target.checked)} className="w-4 h-4 rounded accent-primary-500" />
              <span className="text-sm text-gray-700 dark:text-gray-200">{t('settings.pickup')}</span>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label={t('settings.minOrder')}>
            <input
              type="text"
              inputMode="decimal"
              value={minOrderValue}
              onChange={e => setMinOrderValue(e.target.value)}
              placeholder={t('settings.noMinimum')}
              className={inputClass}
            />
          </FormField>
          <FormField label={t('settings.deliveryFee')}>
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

        {/* Formas de pagamento aceitas */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">{t('settings.acceptedPayments')}</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {STORE_PAYMENT_METHODS.map(m => (
              <label key={m} className="flex items-start gap-2 rounded-lg border border-gray-200 dark:border-gray-700 p-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={paymentMethods.includes(m)}
                  onChange={() => togglePayment(m)}
                  className="mt-0.5 w-4 h-4 rounded accent-primary-500 shrink-0"
                />
                <span>
                  <span className="block text-sm text-gray-800 dark:text-gray-100">{t(`payment.${m}.label`)}</span>
                  <span className="block text-xs text-gray-400">{t(`payment.${m}.sub`)}</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Recebimento por PIX */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">{t('settings.pixTitle')}</label>
            <p className="text-xs text-gray-400 mt-0.5">
              {t('settings.pixHint')}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-[150px_1fr] gap-3">
            <FormField label={t('settings.pixKeyType')}>
              <select value={pixKeyType} onChange={e => setPixKeyType(e.target.value as PixKeyType)} className={inputClass}>
                <option value="random">{t('settings.pixRandom')}</option>
                <option value="cpf">CPF</option>
                <option value="cnpj">CNPJ</option>
                <option value="email">{t('settings.pixEmail')}</option>
                <option value="phone">{t('settings.pixPhone')}</option>
              </select>
            </FormField>
            <FormField label={t('settings.pixKey')}>
              <input value={pixKey} onChange={e => setPixKey(e.target.value)} placeholder={pixKeyPlaceholder(pixKeyType, t)} className={inputClass} />
            </FormField>
          </div>
          <FormField label={t('settings.pixReceiver')}>
            <input
              value={pixReceiverName}
              onChange={e => setPixReceiverName(e.target.value)}
              placeholder={storeName || t('settings.pixReceiverPlaceholder')}
              className={inputClass}
            />
          </FormField>
        </div>

        {/* Cartão fidelidade */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <label className="flex items-center justify-between gap-3 cursor-pointer select-none">
            <span>
              <span className="block text-sm font-medium text-gray-900 dark:text-white">{t('settings.loyaltyTitle')}</span>
              <span className="block text-xs text-gray-500 dark:text-gray-400">
                {t('settings.loyaltyHint')}
              </span>
            </span>
            <input
              type="checkbox"
              checked={loyaltyEnabled}
              onChange={e => setLoyaltyEnabled(e.target.checked)}
              className="w-4 h-4 rounded accent-primary-500 shrink-0"
            />
          </label>
          {loyaltyEnabled && (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-3">
              <FormField label={t('settings.loyaltyGoal')}>
                <input type="number" min={1} max={100} value={loyaltyGoal} onChange={e => setLoyaltyGoal(e.target.value)} className={inputClass} />
              </FormField>
              <FormField label={t('settings.loyaltyReward')}>
                <input value={loyaltyReward} onChange={e => setLoyaltyReward(e.target.value)} maxLength={255} placeholder={t('settings.loyaltyRewardPlaceholder')} className={inputClass} />
              </FormField>
            </div>
          )}
        </div>

        {/* Horários de funcionamento */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <label className="flex items-center justify-between gap-3 cursor-pointer select-none">
            <span>
              <span className="block text-sm font-medium text-gray-900 dark:text-white">{t('settings.hoursTitle')}</span>
              <span className="block text-xs text-gray-500 dark:text-gray-400">
                {t('settings.hoursHint')}
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
                  <span className="w-20 text-sm text-gray-700 dark:text-gray-200 shrink-0">{t(`weekday.${day.dayOfWeek}`)}</span>
                  {day.closed ? (
                    <span className="flex-1 text-sm text-gray-400">{t('settings.closed')}</span>
                  ) : (
                    <div className="flex-1 flex items-center gap-1.5">
                      <input
                        type="time"
                        value={day.openTime}
                        onChange={e => updateDay(day.dayOfWeek, { openTime: e.target.value })}
                        className={inputClass + ' py-1.5'}
                      />
                      <span className="text-gray-400 text-sm">{t('settings.until')}</span>
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
                    {day.closed ? t('settings.closed') : t('settings.open')}
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
