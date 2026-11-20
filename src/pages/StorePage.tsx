import { ShoppingBag, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { HoloCard, HoloCardLayer } from '../components/HoloCard';
import { PageReveal, SlideOverDrawer, ViewStateShell } from '../components/MotionPrimitives';
import { SiteFooter, SiteHeader } from '../components/SiteChrome';
import { StoreVaultIcon } from '../components/icons/RavfinaIcons';
import { formatMinorUnits } from '../domain/formatters';
import { calculateCartTotals } from '../domain/platform';

interface StoreVariantDto {
  id: string;
  label: string;
  sku: string;
  priceMinor: number;
  inStock: boolean;
}

interface StoreProductDto {
  id: string;
  slug: string;
  title: string;
  collection: 'Hardware Security' | 'Corporate Cards' | 'Treasury Print';
  description: string;
  imageUrl: string;
  variants: StoreVariantDto[];
}

interface CartItem {
  productId: string;
  title: string;
  variantId: string;
  variantLabel: string;
  sku: string;
  unitPriceMinor: number;
  quantity: number;
  imageUrl: string;
}

export function StorePage({ currentPath }: { currentPath: string }) {
  const [products, setProducts] = useState<StoreProductDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [collection, setCollection] = useState<string>('All');
  const [selectedVariantByProduct, setSelectedVariantByProduct] = useState<Record<string, string>>({});
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [email, setEmail] = useState('cfo@vanguardrobotics.com');
  const [orderResult, setOrderResult] = useState<string | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  const loadCatalog = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/store/products');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const loaded: StoreProductDto[] = data.products ?? [];
      setProducts(loaded);
      const defaults: Record<string, string> = {};
      for (const p of loaded) {
        if (p.variants[0]) defaults[p.id] = p.variants[0].id;
      }
      setSelectedVariantByProduct(defaults);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load store catalog.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCatalog();
  }, []);

  const collections = ['All', 'Hardware Security', 'Corporate Cards', 'Treasury Print'];
  const visibleProducts = products.filter(
    (p) => collection === 'All' || p.collection === collection,
  );

  const addToCart = (product: StoreProductDto) => {
    const activeVariantId = selectedVariantByProduct[product.id] ?? product.variants[0]?.id;
    const variant =
      product.variants.find((v) => v.id === activeVariantId) ?? product.variants[0];
    if (!variant) return;
    setOrderResult(null);
    setCart((prev) => {
      const existing = prev.find(
        (item) => item.productId === product.id && item.variantId === variant.id,
      );
      if (existing) {
        return prev.map((item) =>
          item.productId === product.id && item.variantId === variant.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          title: product.title,
          variantId: variant.id,
          variantLabel: variant.label,
          sku: variant.sku,
          unitPriceMinor: variant.priceMinor,
          quantity: 1,
          imageUrl: product.imageUrl,
        },
      ];
    });
    setCartOpen(true);
  };

  const cartTotals = calculateCartTotals(
    cart.map((item) => ({ unitPriceMinor: item.unitPriceMinor, quantity: item.quantity })),
  );

  const checkoutOrder = async () => {
    if (cart.length === 0) return;
    setCheckingOut(true);
    setOrderResult(null);
    try {
      const res = await fetch('/api/v1/store/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgSlug: 'vanguard-robotics',
          customerEmail: email,
          items: cart.map((c) => ({
            productId: c.productId,
            variantId: c.variantId,
            quantity: c.quantity,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setOrderResult(
        `Order ${data.order?.id} confirmed (${formatMinorUnits(data.order?.totalMinor ?? 0, 'USD')}). Dispatching hardware provisioning packet to ${email}.`,
      );
      setCart([]);
    } catch (err) {
      setOrderResult(err instanceof Error ? err.message : 'Checkout failed.');
    } finally {
      setCheckingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f4f6] text-zinc-950 dark:bg-[#0b0b0c] dark:text-white">
      <SiteHeader currentPath={currentPath} />

      <main className="mx-auto max-w-7xl px-6 py-12">
        <PageReveal>
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-amber-800 dark:text-[#facc15]">
                <StoreVaultIcon className="h-4 w-4" />
                <span>Ravfina Hardware, Cards &amp; Print Store</span>
              </div>
              <h1 className="mt-2 font-display text-3xl sm:text-4xl font-bold tracking-tight">
                Provision physical keys, Titanium HoloCards &amp; controller folios.
              </h1>
            </div>

            <button
              type="button"
              onClick={() => setCartOpen(true)}
              className="ravfina-cta-tactile inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-amber-500/70 bg-[#facc15] px-4 py-2 text-xs font-bold text-black hover:bg-[#fde047] dark:border-transparent"
            >
              <ShoppingBag className="h-4 w-4" />
              <span>Cart ({cartTotals.itemCount})</span>
              <span className="font-mono tabular-nums">
                · {formatMinorUnits(cartTotals.totalMinor, 'USD')}
              </span>
            </button>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {collections.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCollection(c)}
                className={`rounded-lg border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                  collection === c
                    ? 'border-amber-500 bg-amber-50 text-amber-900 dark:border-[#facc15]/50 dark:bg-[#1a1a12] dark:text-[#facc15]'
                    : 'border-zinc-300 bg-white text-zinc-700 dark:border-[#1d1d1f] dark:bg-[#111112] dark:text-[#a1a1aa]'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </PageReveal>

        <div className="mt-8">
          <ViewStateShell
            loading={loading}
            error={error}
            empty={visibleProducts.length === 0}
            onRetry={loadCatalog}
          >
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {visibleProducts.map((product) => {
                const activeVariantId =
                  selectedVariantByProduct[product.id] ?? product.variants[0]?.id;
                const activeVariant =
                  product.variants.find((v) => v.id === activeVariantId) ?? product.variants[0];

                return (
                  <HoloCard
                    key={product.id}
                    variant="product"
                    intensity="full"
                    className="flex flex-col justify-between rounded-2xl border border-zinc-300 bg-white dark:border-[#1d1d1f] dark:bg-[#111112]"
                  >
                    <div>
                      <div className="aspect-[4/3] w-full overflow-hidden border-b border-zinc-200 bg-zinc-100 dark:border-[#1d1d1f] dark:bg-[#0d0d0e]">
                        {imgErrors[product.id] ? (
                          <div className="flex h-full items-center justify-center p-6 text-zinc-500">
                            <StoreVaultIcon className="h-10 w-10 text-amber-700 dark:text-[#facc15]" />
                          </div>
                        ) : (
                          <img
                            src={product.imageUrl}
                            alt={product.title}
                            onError={() =>
                              setImgErrors((prev) => ({ ...prev, [product.id]: true }))
                            }
                            className="h-full w-full object-cover"
                          />
                        )}
                      </div>

                      <div className="p-6">
                        <HoloCardLayer depth={14}>
                          <div className="flex items-center justify-between gap-2 font-mono text-[11px] uppercase text-amber-800 dark:text-[#facc15]">
                            <span>{product.collection}</span>
                            <span>{activeVariant?.sku}</span>
                          </div>
                          <h2 className="mt-2 font-display text-lg font-bold text-zinc-950 dark:text-white">
                            {product.title}
                          </h2>
                          <p className="mt-2 text-xs leading-relaxed text-zinc-600 dark:text-[#a1a1aa]">
                            {product.description}
                          </p>
                        </HoloCardLayer>

                        <HoloCardLayer depth={20} className="mt-4">
                          <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                            Select Configuration
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {product.variants.map((v) => {
                              const selected = v.id === activeVariant?.id;
                              return (
                                <button
                                  key={v.id}
                                  type="button"
                                  onClick={() =>
                                    setSelectedVariantByProduct((prev) => ({
                                      ...prev,
                                      [product.id]: v.id,
                                    }))
                                  }
                                  className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
                                    selected
                                      ? 'border-amber-500 bg-amber-50 text-amber-900 dark:border-[#facc15]/60 dark:bg-[#1a1a12] dark:text-[#facc15]'
                                      : 'border-zinc-300 bg-zinc-50 text-zinc-700 dark:border-[#2e2e32] dark:bg-[#0b0b0c] dark:text-[#a1a1aa]'
                                  }`}
                                >
                                  {v.label}
                                </button>
                              );
                            })}
                          </div>
                        </HoloCardLayer>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 border-t border-zinc-200 px-6 py-4 dark:border-[#1d1d1f]">
                      <div className="font-mono text-lg font-bold tabular-nums text-zinc-950 dark:text-white">
                        {formatMinorUnits(activeVariant?.priceMinor ?? 0, 'USD')}
                      </div>
                      <button
                        type="button"
                        onClick={() => addToCart(product)}
                        className="ravfina-cta-tactile rounded-xl border border-amber-500/70 bg-[#facc15] px-4 py-2 text-xs font-bold text-black hover:bg-[#fde047] dark:border-transparent"
                      >
                        Add to Cart
                      </button>
                    </div>
                  </HoloCard>
                );
              })}
            </div>
          </ViewStateShell>
        </div>
      </main>

      <SlideOverDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        ariaLabel="Store Provisioning Cart"
      >
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-[#1d1d1f]">
          <div className="font-display text-lg font-bold">
            Provisioning Cart ({cartTotals.itemCount})
          </div>
          <button
            type="button"
            onClick={() => setCartOpen(false)}
            className="rounded-lg border border-zinc-300 px-3 py-1 text-xs font-semibold dark:border-[#2e2e32]"
          >
            Close
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {orderResult && (
            <div
              role="status"
              className="rounded-xl border border-emerald-400 bg-emerald-50 p-4 text-xs text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-950/30 dark:text-emerald-200"
            >
              {orderResult}
            </div>
          )}

          {cart.length === 0 ? (
            <div className="py-16 text-center text-sm text-zinc-600 dark:text-[#88888b]">
              Your hardware &amp; card provisioning cart is empty.
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={`${item.productId}-${item.variantId}`}
                className="flex items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-[#1d1d1f] dark:bg-[#0b0b0c]"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-display text-sm font-semibold">{item.title}</div>
                  <div className="mt-0.5 font-mono text-xs text-zinc-500">
                    {item.variantLabel} · {item.sku} · Qty {item.quantity}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm font-bold tabular-nums">
                    {formatMinorUnits(item.unitPriceMinor * item.quantity, 'USD')}
                  </span>
                  <button
                    type="button"
                    aria-label={`Remove ${item.title}`}
                    onClick={() =>
                      setCart((prev) =>
                        prev.filter(
                          (c) =>
                            !(
                              c.productId === item.productId &&
                              c.variantId === item.variantId
                            ),
                        ),
                      )
                    }
                    className="rounded-lg p-1.5 text-zinc-500 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="border-t border-zinc-200 p-6 space-y-4 dark:border-[#1d1d1f]">
          <div>
            <label htmlFor="store-checkout-email" className="block text-xs font-medium">
              Provisioning Receipt Email
            </label>
            <input
              id="store-checkout-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-zinc-400 bg-white px-3 py-2 text-xs text-zinc-950 dark:border-[#2e2e32] dark:bg-[#0b0b0c] dark:text-white"
            />
          </div>

          <div className="space-y-1.5 font-mono text-xs tabular-nums">
            <div className="flex justify-between text-zinc-600 dark:text-[#88888b]">
              <span>Subtotal</span>
              <span>{formatMinorUnits(cartTotals.subtotalMinor, 'USD')}</span>
            </div>
            <div className="flex justify-between text-zinc-600 dark:text-[#88888b]">
              <span>Insured Express Dispatch</span>
              <span>
                {cartTotals.shippingMinor === 0
                  ? 'Free'
                  : formatMinorUnits(cartTotals.shippingMinor, 'USD')}
              </span>
            </div>
            <div className="flex justify-between border-t border-zinc-200 pt-2 text-sm font-bold text-zinc-950 dark:border-[#1d1d1f] dark:text-white">
              <span>Total</span>
              <span>{formatMinorUnits(cartTotals.totalMinor, 'USD')}</span>
            </div>
          </div>

          <button
            type="button"
            disabled={cart.length === 0 || checkingOut}
            onClick={checkoutOrder}
            className="ravfina-cta-tactile min-h-[44px] w-full rounded-xl border border-amber-500/70 bg-[#facc15] px-4 py-2.5 text-sm font-bold text-black hover:bg-[#fde047] disabled:opacity-50 dark:border-transparent"
          >
            {checkingOut ? 'Submitting Order...' : 'Complete Provisioning Order'}
          </button>
        </div>
      </SlideOverDrawer>

      <SiteFooter />
    </div>
  );
}
