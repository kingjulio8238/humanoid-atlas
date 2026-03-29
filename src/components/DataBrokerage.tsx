import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth, useClerk, SignInButton, SignUpButton } from '@clerk/clerk-react';
import { loadStripe, type Stripe, type StripeElements } from '@stripe/stripe-js';
import { api, setTokenGetter } from '../lib/brokerage-api';
import { useCart } from '../hooks/useCart';

const stripePromise = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)
  : null;

const CLERK_AVAILABLE = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

// Safe Clerk hook — returns defaults if ClerkProvider is not mounted
function useClerkAuth(): { isSignedIn: boolean; getToken: () => Promise<string | null> } {
  if (!CLERK_AVAILABLE) return { isSignedIn: false, getToken: async () => null };
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const auth = useAuth();
  return { isSignedIn: auth.isSignedIn ?? false, getToken: auth.getToken };
}

function ClerkSignInBtn({ children }: { children: React.ReactNode }) {
  if (!CLERK_AVAILABLE) return <>{children}</>;
  return <SignInButton mode="modal">{children}</SignInButton>;
}

function ClerkSignUpBtn({ children }: { children: React.ReactNode }) {
  if (!CLERK_AVAILABLE) return <>{children}</>;
  return <SignUpButton mode="modal">{children}</SignUpButton>;
}

interface Listing {
  id: string; title: string; slug: string; description: string; modality: string;
  environment: string; use_cases: string[]; tags: string[]; total_hours: number | null;
  format: string | null; resolution: string | null; price_per_hour: number; currency: string;
  minimum_hours: number; license_type: string; license_terms: string | null; featured: boolean;
  created_at: string; thumbnail_url?: string | null;
  providers?: { id: string; name: string; slug: string; logo_url: string | null };
  samples?: Array<{ id: string; url: string; filename: string; content_type: string; duration_seconds: number | null }>;
}

interface CollectionProgram {
  id: string; title: string; description: string; requirements: string | null;
  compensation_description: string | null; signup_type: string; external_url: string | null;
  form_fields: Record<string, unknown> | null; created_at: string;
  providers?: { id: string; name: string; slug: string; logo_url: string | null; website_url: string | null };
}

// ═══════════════════════════════════════════════════════════
// BUY DATA
// ═══════════════════════════════════════════════════════════

function SampleGallery({ samples }: { samples: Array<{ id: string; url: string; filename: string }> }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const active = samples[activeIdx];

  return (
    <div className="db-video-section">
      <video className="db-video-player" controls src={active.url} key={active.id + activeIdx} />
      <div className="db-thumb-strip">
        {samples.map((s, i) => (
          <div key={s.id} className={`db-thumb${i === activeIdx ? ' db-thumb--active' : ''}`} onClick={() => setActiveIdx(i)}>{i + 1}</div>
        ))}
      </div>
    </div>
  );
}

function PurchaseSection({ listing, cart, onCartOpen }: { listing: Listing; cart: ReturnType<typeof useCart>; onCartOpen: () => void }) {
  const [hoursStr, setHoursStr] = useState(String(listing.minimum_hours));
  const [minNotice, setMinNotice] = useState(false);
  const hours = parseInt(hoursStr) || 0;
  const subtotal = hours * listing.price_per_hour;
  const prov = listing.providers;
  const inCart = cart.isInCart(listing.id);

  return (
    <div className="db-purchase-section">
      <div className="db-purchase-row">
        <div className="db-purchase-input">
          <div className="db-meta-label">Hours</div>
          <input type="text" inputMode="numeric" className="db-purchase-hours" value={hoursStr}
            onChange={e => { setHoursStr(e.target.value.replace(/[^0-9]/g, '')); setMinNotice(false); }} />
        </div>
        <div className="db-purchase-total">
          <div className="db-meta-label">Subtotal</div>
          <div className="db-purchase-amount">${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
        </div>
      </div>
      {minNotice && <div className="db-min-notice">Minimum {listing.minimum_hours} hrs required</div>}
      <button className={`db-add-cart-btn${inCart ? ' db-add-cart-btn--in-cart' : ''}`} onClick={() => {
        if (hours < listing.minimum_hours) {
          setHoursStr(String(listing.minimum_hours));
          setMinNotice(true);
          setTimeout(() => setMinNotice(false), 3000);
          return;
        }
        setMinNotice(false);
        cart.addItem({
          listing_id: listing.id, title: listing.title, provider_name: prov?.name ?? '', provider_id: prov?.id ?? '',
          modality: listing.modality, price_per_hour: listing.price_per_hour, hours,
        });
        onCartOpen();
      }}>{inCart ? 'IN CART - UPDATE' : 'ADD TO CART'}</button>
    </div>
  );
}

function BuyData() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [filters, setFilters] = useState({ modality: '', environment: '', q: '', min_price: '', max_price: '' });
  const [facets, setFacets] = useState<{ modalities: string[]; environments: string[] }>({ modalities: [], environments: [] });
  const [showCustomRequest, setShowCustomRequest] = useState(false);
  const [showPurchases, setShowPurchases] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [pendingCheckout, setPendingCheckout] = useState(false);
  const { isSignedIn } = useClerkAuth();
  const cart = useCart();

  // Auto-open cart and trigger checkout after sign-in
  useEffect(() => {
    if (isSignedIn && localStorage.getItem('db_pending_checkout') && cart.totalItems > 0) {
      localStorage.removeItem('db_pending_checkout');
      setShowCart(true);
      setPendingCheckout(true);
    }
  }, [isSignedIn, cart.totalItems]);

  // Debounced search: only refetch after 300ms pause in typing
  const [debouncedQ, setDebouncedQ] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(filters.q), 300);
    return () => clearTimeout(t);
  }, [filters.q]);

  const fetchListings = useCallback(() => {
    // Only show full loading on initial load (when listings are empty)
    if (listings.length === 0) setLoading(true);
    const params = new URLSearchParams();
    if (filters.modality) params.set('modality', filters.modality);
    if (filters.environment) params.set('environment', filters.environment);
    if (debouncedQ) params.set('q', debouncedQ);
    if (filters.min_price) params.set('min_price', filters.min_price);
    if (filters.max_price) params.set('max_price', filters.max_price);
    api.get<{ data: Listing[] }>(`/catalog?${params}`).then(r => setListings(r.data)).catch(console.error).finally(() => setLoading(false));
  }, [filters.modality, filters.environment, filters.min_price, filters.max_price, debouncedQ]);

  useEffect(() => { fetchListings(); }, [fetchListings]);
  useEffect(() => { api.get<{ data: typeof facets }>('/catalog/facets').then(r => setFacets(r.data)).catch(console.error); }, []);

  const selectListing = async (slug: string) => {
    try {
      const r = await api.get<{ data: Listing }>(`/catalog/${slug}`);
      setSelectedListing(r.data);
    } catch (err) { console.error(err); }
  };

  const formatUsd = (cents: number) => `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

  if (selectedListing) {
    const l = selectedListing;
    const prov = l.providers;
    return (
      <div className="api-docs">
        <button className="db-back-btn" onClick={() => setSelectedListing(null)}>← Back to catalog</button>
        <h2 className="api-docs-title">{l.title}</h2>
        <p className="api-docs-desc">{prov ? `by ${prov.name}` : ''}</p>
        <div className="db-badges">
          <span className="db-badge">{l.modality}</span>
          <span className="db-badge">{l.environment}</span>
          {l.format && <span className="db-badge">{l.format}</span>}
        </div>

        {l.samples && l.samples.length > 0 && (
          <SampleGallery samples={l.samples} />
        )}

        <div className="api-preamble" style={{ marginTop: 16 }}>
          <div className="db-meta-grid">
            <div><div className="db-meta-label">Modality</div><div className="db-meta-value">{l.modality}</div></div>
            <div><div className="db-meta-label">Environment</div><div className="db-meta-value">{l.environment}</div></div>
            <div><div className="db-meta-label">Format</div><div className="db-meta-value">{l.format ?? '—'}</div></div>
            <div><div className="db-meta-label">Hours Available</div><div className="db-meta-value">{l.total_hours?.toLocaleString() ?? '—'}</div></div>
            <div><div className="db-meta-label">Price</div><div className="db-meta-value">${l.price_per_hour}/hr</div></div>
            <div><div className="db-meta-label">Min Purchase</div><div className="db-meta-value">{l.minimum_hours} hrs</div></div>
            <div><div className="db-meta-label">License</div><div className="db-meta-value">{l.license_type.replace(/_/g, ' ')}</div></div>
          </div>
        </div>

        <div className="db-detail-description">{l.description}</div>
        {l.license_terms && <div className="db-license-terms"><strong>License terms:</strong> {l.license_terms}</div>}

        <PurchaseSection listing={l} cart={cart} onCartOpen={() => {}} />

        {cart.totalItems > 0 && <InlineCart cart={cart} formatUsd={formatUsd} autoCheckout={pendingCheckout} onAutoCheckoutDone={() => setPendingCheckout(false)} onPurchaseComplete={() => setShowPurchases(true)} />}
      </div>
    );
  }

  return (
    <div className="api-docs">
      <div className="api-docs-header">
        <div className="api-docs-header-top">
          <div>
            <div className="api-docs-title-row">
              <h2 className="api-docs-title">Buy Data</h2>
              {!showPurchases && <button className="api-md-btn" onClick={() => setShowCustomRequest(true)}>Request Custom Dataset</button>}
              {isSignedIn && (
                <button className="api-md-btn" onClick={() => setShowPurchases(!showPurchases)}>
                  {showPurchases ? 'Browse Catalog' : 'My Purchases'}
                </button>
              )}
            </div>
            {!showPurchases && <p className="api-docs-desc">Browse and purchase training datasets</p>}
          </div>
        </div>
      </div>

      {showPurchases ? (
        <MyPurchases />
      ) : (
        <>
          <div className="db-filter-bar" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input className="db-search" placeholder="Search datasets..." value={filters.q}
              onChange={e => setFilters(f => ({ ...f, q: e.target.value }))} style={{ maxWidth: 280 }} />
            <div style={{ position: 'relative', flex: '0 0 auto' }}>
              <select className="db-form-select" style={{ width: 140, fontSize: 10, paddingRight: 28, appearance: 'none' }} value={filters.modality}
                onChange={e => setFilters(f => ({ ...f, modality: e.target.value }))}>
                <option value="">Modality</option>
                {facets.modalities.map(m => <option key={m} value={m}>{m.replace(/_/g, ' ')}</option>)}
              </select>
              <svg style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 1L5 5L9 1" stroke="#8a8580" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <div style={{ position: 'relative', flex: '0 0 auto' }}>
              <select className="db-form-select" style={{ width: 140, fontSize: 10, paddingRight: 28, appearance: 'none' }} value={filters.environment}
                onChange={e => setFilters(f => ({ ...f, environment: e.target.value }))}>
                <option value="">Environment</option>
                {facets.environments.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
              <svg style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 1L5 5L9 1" stroke="#8a8580" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <div style={{ position: 'relative', flex: '0 0 auto' }}>
              <select className="db-form-select" style={{ width: 120, fontSize: 10, paddingRight: 28, appearance: 'none' }} value={`${filters.min_price}-${filters.max_price}`}
                onChange={e => {
                  const [min, max] = e.target.value.split('-');
                  setFilters(f => ({ ...f, min_price: min, max_price: max }));
                }}>
                <option value="-">Price</option>
                <option value="-50">&lt; $50/hr</option>
                <option value="50-100">$50–100</option>
                <option value="100-200">$100–200</option>
                <option value="200-">$200+</option>
              </select>
              <svg style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 1L5 5L9 1" stroke="#8a8580" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
          </div>

          {loading ? (
            <div className="db-loading">Loading datasets...</div>
          ) : listings.length === 0 ? (
            <div className="db-empty">No datasets found. Try adjusting your filters.</div>
          ) : (
            <div className="db-catalog-list">
              {listings.map(l => (
                <div key={l.id} className="db-catalog-row" onClick={() => selectListing(l.slug)}>
                  <div className="db-catalog-row__line1">
                    <span className="db-catalog-row__title">{l.title}</span>
                    <span className="db-catalog-row__view">View →</span>
                  </div>
                  <div className="db-catalog-row__line2">
                    <div className="db-catalog-row__meta">
                      <span className="db-catalog-row__provider">{l.providers?.name ?? ''}</span>
                      <span className="db-catalog-row__details">
                        {l.modality.replace(/_/g, ' ')} · {l.environment}{l.total_hours ? ` · ${l.total_hours.toLocaleString()} hrs` : ''}
                      </span>
                    </div>
                    <span className="db-catalog-row__price">${l.price_per_hour}/hr</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {cart.totalItems > 0 && <CatalogCartBar cart={cart} formatUsd={formatUsd} onViewCart={() => setShowCart(!showCart)} showCart={showCart} />}
          {showCart && cart.totalItems > 0 && <InlineCart cart={cart} formatUsd={formatUsd} autoCheckout={pendingCheckout} onAutoCheckoutDone={() => setPendingCheckout(false)} onPurchaseComplete={() => setShowPurchases(true)} />}
        </>
      )}

      {showCustomRequest && <CustomRequestModal onClose={() => setShowCustomRequest(false)} />}
    </div>
  );
}

function CatalogCartBar({ cart, formatUsd, onViewCart, showCart }: { cart: ReturnType<typeof useCart>; formatUsd: (c: number) => string; onViewCart: () => void; showCart: boolean }) {
  return (
    <div className="db-cart-bar" onClick={onViewCart}>
      <div className="db-cart-bar__left">
        <span className="db-cart-bar__label">Cart</span>
        <span className="db-cart-bar__count">{cart.totalItems} {cart.totalItems === 1 ? 'item' : 'items'}</span>
      </div>
      <div className="db-cart-bar__right">
        {!showCart && <span className="db-cart-bar__total">{formatUsd(cart.subtotalCents)}</span>}
        <span className="db-cart-bar__toggle">{showCart ? 'Hide' : 'View'}</span>
      </div>
    </div>
  );
}

interface PaymentIntentData {
  provider_id: string;
  provider_name: string;
  client_secret: string;
  amount_cents: number;
  platform_fee_cents: number;
  transaction_id: string;
}

function InlineCart({ cart, formatUsd, autoCheckout, onAutoCheckoutDone, onPurchaseComplete }: { cart: ReturnType<typeof useCart>; formatUsd: (c: number) => string; autoCheckout?: boolean; onAutoCheckoutDone?: () => void; onPurchaseComplete?: () => void }) {
  const { isSignedIn } = useClerkAuth();
  const [checkingOut, setCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [paymentIntents, setPaymentIntents] = useState<PaymentIntentData[] | null>(null);

  const handleCheckout = useCallback(async () => {
    if (!isSignedIn) return;
    setCheckingOut(true);
    setCheckoutError('');
    try {
      // Clear server cart then sync localStorage cart (parallel for speed)
      const serverCart = await api.get<{ data: { items: Array<{ id: string }> } }>('/cart').catch(() => ({ data: { items: [] } }));
      await Promise.all(serverCart.data.items.map(item => api.delete(`/cart/items/${item.id}`).catch(() => {})));
      const allItems = Object.values(cart.byProvider).flatMap(g => g.items);
      await Promise.all(allItems.map(item => api.post('/cart/items', { listing_id: item.listing_id, hours: item.hours })));
      const res = await api.post<{ data: { payment_intents: PaymentIntentData[] } }>('/checkout/create-payment-intents');
      setPaymentIntents(res.data.payment_intents);
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : 'Checkout failed');
      setCheckingOut(false);
    }
  }, [isSignedIn, cart.byProvider]);

  // Auto-trigger checkout if flagged by parent
  useEffect(() => {
    if (autoCheckout && isSignedIn) {
      onAutoCheckoutDone?.();
      handleCheckout();
    }
  }, [autoCheckout, isSignedIn, handleCheckout, onAutoCheckoutDone]);

  const handlePaymentSuccess = async (transactionIds: string[]) => {
    try {
      await api.post('/checkout/confirm', { transaction_ids: transactionIds });
    } catch { /* confirmation happens via webhook too */ }
    cart.clearCart();
    // Don't clear paymentIntents here — let the success screen show
    // paymentIntents will be cleared when user clicks "Done" (onClose)
  };

  if (paymentIntents) {
    return (
      <CheckoutModal
        paymentIntents={paymentIntents}
        formatUsd={formatUsd}
        onSuccess={handlePaymentSuccess}
        onClose={() => { setPaymentIntents(null); setCheckingOut(false); onPurchaseComplete?.(); }}
      />
    );
  }

  return (
    <div className="db-inline-cart">
      {Object.entries(cart.byProvider).map(([provId, group]) => (
        <div key={provId} className="db-inline-cart__group">
          {group.items.map(item => (
            <div key={item.listing_id} className="db-inline-cart__item">
              <div className="db-inline-cart__item-left">
                <div className="db-inline-cart__item-title">{item.title}</div>
                <div className="db-inline-cart__item-provider">{group.provider_name}</div>
                <div className="db-inline-cart__item-detail">{item.hours} hrs x ${item.price_per_hour}/hr</div>
              </div>
              <div className="db-inline-cart__item-right">
                <div className="db-inline-cart__item-price-row">
                  <span className="db-inline-cart__item-subtotal">{formatUsd(Math.round(item.price_per_hour * item.hours * 100))}</span>
                  <button className="db-inline-cart__remove" onClick={() => cart.removeItem(item.listing_id)}>Remove</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ))}
      <div className="db-inline-cart__footer">
        <span className="db-inline-cart__total-label">Total</span>
        <div className="db-inline-cart__total-right">
          <span className="db-inline-cart__total-amount">{formatUsd(cart.subtotalCents)}</span>
          {isSignedIn ? (
            <button className="db-checkout-btn" onClick={handleCheckout} disabled={checkingOut}>
              {checkingOut ? 'Processing...' : 'Checkout'}
            </button>
          ) : (
            <ClerkSignInBtn><button className="db-checkout-btn" onClick={() => localStorage.setItem('db_pending_checkout', '1')}>Checkout</button></ClerkSignInBtn>
          )}
        </div>
      </div>
      {checkoutError && <div className="db-form-error" style={{ marginTop: 8 }}>{checkoutError}</div>}
    </div>
  );
}

function CheckoutModal({ paymentIntents, formatUsd, onSuccess, onClose }: {
  paymentIntents: PaymentIntentData[];
  formatUsd: (c: number) => string;
  onSuccess: (transactionIds: string[]) => void;
  onClose: () => void;
}) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [completed, setCompleted] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [paying, setPaying] = useState(false);
  const [stripeReady, setStripeReady] = useState(false);
  const paymentElementRef = useRef<HTMLDivElement>(null);
  const stripeRef = useRef<Stripe | null>(null);
  const elementsRef = useRef<StripeElements | null>(null);

  const current = paymentIntents[currentIdx];
  const totalAmount = paymentIntents.reduce((s, pi) => s + pi.amount_cents, 0);
  const allDone = completed.length === paymentIntents.length;

  // Mount Stripe Payment Element for current PaymentIntent
  useEffect(() => {
    if (!current || !stripePromise || allDone) return;
    let mounted = true;

    async function init() {
      const stripe = await stripePromise;
      if (!stripe || !mounted) return;
      stripeRef.current = stripe;

      const elements = stripe.elements({
        clientSecret: current.client_secret,
        appearance: {
          theme: 'flat',
          variables: {
            colorPrimary: '#1a1a1a',
            colorBackground: '#f5f2ed',
            colorText: '#1a1a1a',
            colorTextSecondary: '#8a8580',
            borderRadius: '4px',
            fontFamily: 'Inter, sans-serif',
            fontSizeBase: '12px',
          },
          rules: {
            '.Input': { border: '1px solid #e0ddd8', padding: '8px 10px' },
            '.Input:focus': { borderColor: '#1a1a1a', boxShadow: 'none' },
            '.Label': { fontFamily: "'Share Tech Mono', monospace", fontSize: '9px', textTransform: 'uppercase', letterSpacing: '1px', color: '#a0a0a0' },
          },
        },
      });
      elementsRef.current = elements;

      const paymentElement = elements.create('payment', { layout: 'tabs' });
      paymentElement.on('ready', () => { if (mounted) setStripeReady(true); });
      if (paymentElementRef.current) {
        paymentElement.mount(paymentElementRef.current);
      }
    }

    setStripeReady(false);
    init();

    return () => {
      mounted = false;
      if (elementsRef.current) {
        elementsRef.current.getElement('payment')?.destroy();
      }
      elementsRef.current = null;
    };
  }, [current?.client_secret, allDone]);

  const handlePay = async () => {
    const stripe = stripeRef.current;
    const elements = elementsRef.current;
    if (!stripe || !elements) return;

    setPaying(true);
    setError('');

    const { error: submitError } = await elements.submit();
    if (submitError) {
      setError(submitError.message ?? 'Validation failed');
      setPaying(false);
      return;
    }

    const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: `${window.location.origin}/data/buy` },
      redirect: 'if_required',
    });

    if (confirmError) {
      setError(confirmError.message ?? 'Payment failed');
      setPaying(false);
      return;
    }

    if (paymentIntent?.status === 'succeeded') {
      const newCompleted = [...completed, current.transaction_id];
      setCompleted(newCompleted);

      if (currentIdx < paymentIntents.length - 1) {
        setCurrentIdx(currentIdx + 1);
      } else {
        onSuccess(newCompleted);
      }
    }
    setPaying(false);
  };

  return (
    <div className="db-modal-overlay" onClick={onClose}>
      <div className="db-modal db-modal--wide" onClick={e => e.stopPropagation()}>
        <div className="db-modal-header">
          <div>
            <div className="db-modal-title">{allDone ? 'Payment Complete' : 'Checkout'}</div>
            {paymentIntents.length > 1 && !allDone && (
              <div className="db-modal-subtitle">Payment {currentIdx + 1} of {paymentIntents.length}</div>
            )}
          </div>
          <button className="db-modal-close" onClick={onClose}>&times;</button>
        </div>

        {allDone ? (
          <div className="db-modal-success">
            <div className="db-modal-success__title">Purchase successful</div>
            <div className="db-modal-success__note">
              Your data access is being prepared.
            </div>
            <button className="db-add-cart-btn" onClick={() => { onClose(); onPurchaseComplete?.(); }}>View My Purchases</button>
          </div>
        ) : (
          <>
            {/* Order summary */}
            <div className="db-checkout-summary">
              <div className="db-checkout-summary__row">
                <span>{current.provider_name}</span>
                <span>{formatUsd(current.amount_cents)}</span>
              </div>
              {paymentIntents.length > 1 && (
                <div className="db-checkout-summary__total">
                  <span>Total (all providers)</span>
                  <span>{formatUsd(totalAmount)}</span>
                </div>
              )}
            </div>

            {/* Stripe Payment Element */}
            <div ref={paymentElementRef} style={{ minHeight: 120, marginBottom: 16 }} />
            {!stripeReady && <div className="db-loading">Loading payment form...</div>}

            {error && <div className="db-form-error" style={{ marginBottom: 12 }}>{error}</div>}

            <button className="db-add-cart-btn" onClick={handlePay} disabled={paying || !stripeReady}>
              {paying ? 'Processing...' : `Pay ${formatUsd(current.amount_cents)}`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SELL DATA
// ═══════════════════════════════════════════════════════════

function ProviderRegistrationForm({ onRegistered }: { onRegistered: (url: string) => void }) {
  const [form, setForm] = useState({ name: '', contact_email: '', company_name: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!form.name || !form.contact_email) { setError('Name and email are required'); return; }
    setSubmitting(true);
    setError('');
    try {
      const res = await api.post<{ data: { stripe_onboarding_url: string } }>('/auth/provider/register', form);
      onRegistered(res.data.stripe_onboarding_url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
      setSubmitting(false);
    }
  };

  return (
    <div className="api-preamble" style={{ marginTop: 16, maxWidth: 480 }}>
      <div className="db-meta-label" style={{ marginBottom: 16 }}>Complete your provider profile</div>
      {error && <div className="db-form-error" style={{ marginBottom: 12 }}>{error}</div>}
      <div className="db-form-field">
        <label className="db-meta-label">Name *</label>
        <input className="db-form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Your name or company name" />
      </div>
      <div className="db-form-field">
        <label className="db-meta-label">Email *</label>
        <input className="db-form-input" type="email" value={form.contact_email} onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))} placeholder="contact@company.com" />
      </div>
      <div className="db-form-field">
        <label className="db-meta-label">Company (optional)</label>
        <input className="db-form-input" value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} placeholder="Company name" />
      </div>
      <button className="db-add-cart-btn" onClick={handleSubmit} disabled={submitting}>
        {submitting ? 'Setting up...' : 'Continue to Stripe Setup'}
      </button>
    </div>
  );
}

function SellData({ viewCount }: { viewCount: number | null }) {
  const { isSignedIn } = useClerkAuth();
  const [providerStatus, setProviderStatus] = useState<'loading' | 'not_registered' | 'pending_onboarding' | 'active'>('loading');
  const [stripeUrl, setStripeUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!isSignedIn) return;
    api.get<{ data: { status: string; stripe_onboarding_complete: boolean } }>('/auth/provider/onboarding-status')
      .then(r => {
        if (r.data.stripe_onboarding_complete || r.data.status === 'active') {
          setProviderStatus('active');
        } else {
          setProviderStatus('pending_onboarding');
        }
      })
      .catch(() => setProviderStatus('not_registered'));
  }, [isSignedIn]);

  // Handle Stripe onboarding return
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('onboarding') === 'complete' || params.get('onboarding') === 'refresh') {
      // Re-check status after returning from Stripe
      api.get<{ data: { status: string; stripe_onboarding_complete: boolean } }>('/auth/provider/onboarding-status')
        .then(r => {
          if (r.data.stripe_onboarding_complete || r.data.status === 'active') {
            setProviderStatus('active');
          } else {
            setProviderStatus('pending_onboarding');
          }
        })
        .catch(() => setProviderStatus('not_registered'));
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Redirect to Stripe if we have a URL
  useEffect(() => {
    if (stripeUrl) {
      window.location.href = stripeUrl;
    }
  }, [stripeUrl]);

  if (!isSignedIn) {
    return (
      <div className="api-docs">
        <div className="api-docs-header">
          <div><h2 className="api-docs-title">Sell Data</h2>
          <p className="api-docs-desc">List your datasets on Atlas Data Brokerage</p></div>
        </div>

        <div className="db-sell-hero">
          <div className="db-sell-hero__stat">
            <div className="db-sell-hero__num">{viewCount ? viewCount.toLocaleString() + '+' : '...'}</div>
            <div className="db-sell-hero__label">Site visits</div>
          </div>
          <div className="db-sell-hero__divider" />
          <div className="db-sell-hero__stat">
            <div className="db-sell-hero__num">37</div>
            <div className="db-sell-hero__label">OEMs on platform</div>
          </div>
          <div className="db-sell-hero__divider" />
          <div className="db-sell-hero__stat">
            <div className="db-sell-hero__num">$0</div>
            <div className="db-sell-hero__label">Upfront cost to list</div>
          </div>
        </div>

        <div className="db-sell-value">
          <div className="db-sell-value__left">
            <h3 className="db-sell-value__title">OEMs & labs are already here</h3>
            <p className="db-sell-value__body">
              OEMs and labs visit the Atlas daily for supply chain intelligence.
              List your training data where they're already looking.
            </p>
            <div className="db-sell-value__cta">
              <ClerkSignUpBtn><button className="db-sell-cta-btn">Become a Provider</button></ClerkSignUpBtn>
              <div className="db-sell-login">Have an account? <ClerkSignInBtn><span className="db-sell-login-link">Log in</span></ClerkSignInBtn></div>
            </div>
          </div>
          <div className="db-sell-value__right">
            <div className="db-sell-terms">
              <div className="db-sell-term">
                <div className="db-sell-term__label">You set</div>
                <div className="db-sell-term__value">Your price per hour</div>
              </div>
              <div className="db-sell-term">
                <div className="db-sell-term__label">Platform fee</div>
                <div className="db-sell-term__value">15% commission</div>
              </div>
              <div className="db-sell-term">
                <div className="db-sell-term__label">Payouts via</div>
                <div className="db-sell-term__value">Stripe</div>
              </div>
              <div className="db-sell-term">
                <div className="db-sell-term__label">Listing review</div>
                <div className="db-sell-term__value">Quality verified by Atlas</div>
              </div>
              <div className="db-sell-term">
                <div className="db-sell-term__label">Bonus</div>
                <div className="db-sell-term__value">Opt into collection programs</div>
              </div>
            </div>
          </div>
        </div>

        <div className="db-sell-how">
          <div className="db-sell-how__label">How it works</div>
          <div className="db-sell-how__steps">
            <div className="db-sell-how__step">
              <div className="db-sell-how__num">01</div>
              <div className="db-sell-how__title">List</div>
              <div className="db-sell-how__desc">Upload samples, set pricing, describe your dataset and collection methodology</div>
            </div>
            <div className="db-sell-how__connector" />
            <div className="db-sell-how__step">
              <div className="db-sell-how__num">02</div>
              <div className="db-sell-how__title">Review</div>
              <div className="db-sell-how__desc">Our team verifies quality and accuracy before your listing goes live on the marketplace</div>
            </div>
            <div className="db-sell-how__connector" />
            <div className="db-sell-how__step">
              <div className="db-sell-how__num">03</div>
              <div className="db-sell-how__title">Earn</div>
              <div className="db-sell-how__desc">OEMs purchase hours of your data directly. Payouts deposited to your Stripe account</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (providerStatus === 'loading') {
    return (
      <div className="api-docs">
        <div className="api-docs-header">
          <div><h2 className="api-docs-title">Sell Data</h2></div>
        </div>
        <div className="db-loading">Loading...</div>
      </div>
    );
  }

  if (providerStatus === 'not_registered') {
    return (
      <div className="api-docs">
        <div className="api-docs-header">
          <div><h2 className="api-docs-title">Sell Data</h2>
          <p className="api-docs-desc">Set up your provider account</p></div>
        </div>
        <ProviderRegistrationForm onRegistered={(url) => setStripeUrl(url)} />
      </div>
    );
  }

  if (providerStatus === 'pending_onboarding') {
    const handleConnect = async () => {
      try {
        const r = await api.post<{ data: { stripe_onboarding_url: string } }>('/auth/provider/refresh-onboarding');
        window.location.href = r.data.stripe_onboarding_url;
      } catch (err) { console.error(err); }
    };

    return (
      <div className="api-docs">
        <div className="api-docs-header">
          <div><h2 className="api-docs-title">Sell Data</h2>
          <p className="api-docs-desc">Complete your Stripe setup to start selling</p></div>
        </div>
        <div className="api-preamble" style={{ marginTop: 16 }}>
          <div className="db-meta-label" style={{ marginBottom: 16 }}>Stripe onboarding</div>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 16 }}>
            Complete your Stripe Express setup to receive payments from data buyers. This takes about 2 minutes.
          </p>
          <button className="db-add-cart-btn" style={{ maxWidth: 280 }} onClick={handleConnect}>
            Complete Stripe Setup
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="api-docs">
      <div className="api-docs-header">
        <div><h2 className="api-docs-title">Sell Data</h2>
        <p className="api-docs-desc">Manage your listings and track sales</p></div>
      </div>
      <ProviderDashboard />
    </div>
  );
}

function ProviderDashboard() {
  const [activeTab, setActiveTab] = useState('listings');
  const [listings, setListings] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);

  useEffect(() => {
    api.get<{ data: Record<string, unknown>[] }>('/provider/listings')
      .then(r => setListings(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const tabs = [
    { id: 'listings', label: 'My Listings' },
    { id: 'create', label: 'Create Listing' },
    { id: 'programs', label: 'Programs' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'stripe', label: 'Settings' },
  ];

  return (
    <div>
      <div className="db-provider-nav">
        {tabs.map(t => (
          <button key={t.id} className={`db-filter-pill${activeTab === t.id ? ' db-filter-pill--active' : ''}`}
            onClick={() => setActiveTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {activeTab === 'listings' && (
        loading ? <div className="db-loading">Loading listings...</div> :
        selectedListingId ? (
          <div>
            <button className="db-back-btn" onClick={() => setSelectedListingId(null)}>&larr; Back to listings</button>
            {(() => {
              const l = listings.find(x => String(x.id) === selectedListingId);
              if (!l) return <div className="db-empty">Listing not found</div>;
              return (
                <div>
                  <div className="api-preamble" style={{ marginTop: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <div className="db-catalog-row__title" style={{ fontSize: 16 }}>{String(l.title)}</div>
                      <span className={`db-status-badge db-status-badge--${String(l.review_status)}`}>{String(l.review_status).replace(/_/g, ' ')}</span>
                    </div>
                    <div className="db-meta-grid">
                      <div><div className="db-meta-label">Modality</div><div className="db-meta-value">{String(l.modality)}</div></div>
                      <div><div className="db-meta-label">Environment</div><div className="db-meta-value">{String(l.environment)}</div></div>
                      <div><div className="db-meta-label">Price</div><div className="db-meta-value">${String(l.price_per_hour)}/hr</div></div>
                      <div><div className="db-meta-label">Min hours</div><div className="db-meta-value">{String(l.minimum_hours)}</div></div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        ) :
        listings.length === 0 ? <div className="db-empty">No listings yet - create your first listing</div> :
        <div>
          {listings.map(l => (
            <div key={String(l.id)} className="db-catalog-row" onClick={() => setSelectedListingId(String(l.id))}>
              <div className="db-catalog-row__line1">
                <span className="db-catalog-row__title">{String(l.title)}</span>
                <span className="db-catalog-row__view">Manage →</span>
              </div>
              <div className="db-catalog-row__line2">
                <div className="db-catalog-row__meta">
                  <span className="db-catalog-row__details">{String(l.modality)} · ${String(l.price_per_hour)}/hr</span>
                </div>
                <span className={`db-status-badge db-status-badge--${String(l.review_status)}`}>{String(l.review_status).replace(/_/g, ' ')}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'create' && <CreateListingForm />}
      {activeTab === 'programs' && <CollectionProgramsManager />}
      {activeTab === 'analytics' && <ProviderAnalytics />}
      {activeTab === 'stripe' && <StripeStatus />}
    </div>
  );
}


function CreateListingForm() {
  const [form, setForm] = useState({
    title: '', description: '', modality: 'video', environment: 'domestic',
    price_per_hour: '', minimum_hours: '1', total_hours: '', format: '',
    license_type: 'commercial', license_terms: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState('');

  const modalities = ['video', 'motion_capture', 'point_cloud', 'tactile', 'force_torque', 'audio', 'multimodal', 'simulation', 'other'];
  const environments = ['indoor', 'outdoor', 'industrial', 'domestic', 'laboratory', 'warehouse', 'retail', 'healthcare', 'mixed', 'simulation'];
  const licenses = ['standard', 'exclusive', 'research_only', 'commercial', 'custom'];

  const update = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }));

  const handleSubmit = async () => {
    if (!form.title || !form.description || !form.price_per_hour) {
      setError('Title, description, and price are required');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await api.post('/provider/listings', {
        title: form.title,
        description: form.description,
        modality: form.modality,
        environment: form.environment,
        price_per_hour: parseFloat(form.price_per_hour),
        minimum_hours: parseFloat(form.minimum_hours) || 1,
        total_hours: form.total_hours ? parseFloat(form.total_hours) : undefined,
        format: form.format || undefined,
        license_type: form.license_type,
        license_terms: form.license_terms || undefined,
      });
      setResult('Listing submitted for review');
      setForm({ title: '', description: '', modality: 'video', environment: 'domestic', price_per_hour: '', minimum_hours: '1', total_hours: '', format: '', license_type: 'commercial', license_terms: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create listing');
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    return (
      <div className="api-preamble" style={{ marginTop: 16, textAlign: 'center', padding: 32 }}>
        <div className="db-sell-headline" style={{ fontSize: 14, marginBottom: 8 }}>{result}</div>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 16 }}>Your listing is pending review and will be published once approved</p>
        <button className="db-add-cart-btn" style={{ maxWidth: 200, margin: '0 auto' }} onClick={() => setResult(null)}>Create Another</button>
      </div>
    );
  }

  return (
    <div className="db-create-form">
      {error && <div className="db-form-error">{error}</div>}

      <div className="db-form-field">
        <label className="db-meta-label">Title</label>
        <input className="db-form-input" placeholder="e.g. Household Cooking - Egocentric Video" value={form.title} onChange={e => update('title', e.target.value)} />
      </div>

      <div className="db-form-row">
        <div className="db-form-field" style={{ flex: 1 }}>
          <label className="db-meta-label">Modality</label>
          <select className="db-form-select" value={form.modality} onChange={e => update('modality', e.target.value)}>
            {modalities.map(m => <option key={m} value={m}>{m.replace(/_/g, ' ')}</option>)}
          </select>
        </div>
        <div className="db-form-field" style={{ flex: 1 }}>
          <label className="db-meta-label">Environment</label>
          <select className="db-form-select" value={form.environment} onChange={e => update('environment', e.target.value)}>
            {environments.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>
      </div>

      <div className="db-form-field">
        <label className="db-meta-label">Description</label>
        <textarea className="db-form-textarea" rows={4} placeholder="Describe your dataset, collection methodology, and what makes it valuable" value={form.description} onChange={e => update('description', e.target.value)} />
      </div>

      <div className="db-form-row">
        <div className="db-form-field" style={{ flex: 1 }}>
          <label className="db-meta-label">Price per hour (USD)</label>
          <input className="db-form-input" type="number" placeholder="50.00" value={form.price_per_hour} onChange={e => update('price_per_hour', e.target.value)} />
        </div>
        <div className="db-form-field" style={{ flex: 1 }}>
          <label className="db-meta-label">Minimum hours</label>
          <input className="db-form-input" type="number" placeholder="1" value={form.minimum_hours} onChange={e => update('minimum_hours', e.target.value)} />
        </div>
        <div className="db-form-field" style={{ flex: 1 }}>
          <label className="db-meta-label">Total hours available</label>
          <input className="db-form-input" type="number" placeholder="10000" value={form.total_hours} onChange={e => update('total_hours', e.target.value)} />
        </div>
      </div>

      <div className="db-form-row">
        <div className="db-form-field" style={{ flex: 1 }}>
          <label className="db-meta-label">Format</label>
          <input className="db-form-input" placeholder="e.g. MP4 / H.264" value={form.format} onChange={e => update('format', e.target.value)} />
        </div>
        <div className="db-form-field" style={{ flex: 1 }}>
          <label className="db-meta-label">License</label>
          <select className="db-form-select" value={form.license_type} onChange={e => update('license_type', e.target.value)}>
            {licenses.map(l => <option key={l} value={l}>{l.replace(/_/g, ' ')}</option>)}
          </select>
        </div>
      </div>

      <button className="db-add-cart-btn" onClick={handleSubmit} disabled={submitting}>
        {submitting ? 'Submitting...' : 'Submit for Review'}
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// BUYER PURCHASES VIEW
// ═══════════════════════════════════════════════════════════

function CopyableCode({ label, code }: { label: string; code: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(console.error);
  };
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <div className="db-meta-label">{label}</div>
        <button className="db-regen-btn" style={{ margin: 0, padding: '3px 10px', fontSize: '8px' }} onClick={handleCopy}>
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="db-code-block" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{code}</pre>
    </div>
  );
}

function MyPurchases() {
  const [purchases, setPurchases] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPurchase, setSelectedPurchase] = useState<Record<string, unknown> | null>(null);
  const [urlCopied, setUrlCopied] = useState(false);

  useEffect(() => {
    api.get<{ data: Array<Record<string, unknown>> }>('/purchases')
      .then(r => setPurchases(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const viewPurchase = async (id: string) => {
    try {
      const r = await api.get<{ data: Record<string, unknown> }>(`/purchases/${id}`);
      setSelectedPurchase(r.data);
    } catch (err) { console.error(err); }
  };

  const formatUsd = (cents: number) => `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

  if (loading) return <div className="db-loading">Loading purchases...</div>;

  if (selectedPurchase) {
    const access = selectedPurchase.access as Record<string, unknown> | null;
    const items = (selectedPurchase.transaction_items as Array<Record<string, unknown>>) ?? [];
    const totalHours = items.reduce((s, i) => s + ((i.hours as number) ?? 0), 0);
    const status = String(selectedPurchase.provisioning_status);
    const accessUrl = access?.access_url ? String(access.access_url) : null;
    const providerName = String((selectedPurchase.providers as Record<string, unknown>)?.name ?? 'Provider');
    const datasetName = items.map(i => {
      const listing = i.listings as Record<string, unknown> | null;
      return listing?.title ?? '';
    }).filter(Boolean).join(', ') || 'Dataset';

    const statusLabel = status === 'ready' ? 'Ready' : status === 'processing' ? 'Processing' : status === 'requested' ? 'Requested' : 'Pending';
    const statusColor = status === 'ready' ? 'var(--green)' : 'var(--text-dim)';

    const copyUrl = () => {
      if (!accessUrl) return;
      navigator.clipboard.writeText(accessUrl).then(() => {
        setUrlCopied(true);
        setTimeout(() => setUrlCopied(false), 2000);
      }).catch(console.error);
    };

    return (
      <div>
        <button className="db-back-btn" onClick={() => setSelectedPurchase(null)}>&larr; Back to purchases</button>

        {/* Dataset name */}
        <div style={{ marginTop: 12, marginBottom: 4 }}>
          <div style={{ fontSize: 16, fontWeight: 500 }}>{datasetName}</div>
          <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-dim)', marginTop: 4 }}>{providerName}</div>
        </div>

        <div className="api-preamble" style={{ marginTop: 12 }}>
          <div className="db-meta-label" style={{ marginBottom: 12 }}>Purchase details</div>
          <div className="db-meta-grid">
            <div><div className="db-meta-label">Status</div><div className="db-meta-value" style={{ color: statusColor }}>{statusLabel}</div></div>
            <div><div className="db-meta-label">Total</div><div className="db-meta-value">{formatUsd((selectedPurchase.total_cents as number) ?? 0)}</div></div>
            <div><div className="db-meta-label">Hours</div><div className="db-meta-value">{totalHours}</div></div>
            <div><div className="db-meta-label">Date</div><div className="db-meta-value">{new Date(String(selectedPurchase.created_at)).toLocaleDateString()}</div></div>
          </div>
        </div>

        {status === 'ready' && accessUrl ? (
          <>
            <div className="api-preamble" style={{ marginTop: 12 }}>
              <div className="db-meta-label" style={{ marginBottom: 12 }}>Data access</div>
              {access?.access_instructions && (
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 16 }}>{String(access.access_instructions)}</p>
              )}
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <a href={accessUrl} target="_blank" rel="noopener noreferrer" className="db-regen-btn"
                  style={{ margin: 0, background: 'var(--accent)', color: 'var(--bg-card)', borderColor: 'var(--accent)', textDecoration: 'none' }}>Access dataset</a>
                <button className="db-regen-btn" style={{ margin: 0 }} onClick={copyUrl}>
                  {urlCopied ? 'Copied' : 'Copy URL'}
                </button>
              </div>
              <div className="db-code-block" style={{ fontSize: 9, wordBreak: 'break-all', whiteSpace: 'pre-wrap' }}>
                {accessUrl}
              </div>
            </div>

            <div className="api-preamble" style={{ marginTop: 12 }}>
              <div className="db-meta-label" style={{ marginBottom: 12 }}>Quick start</div>
              <CopyableCode label="curl" code={`curl -L -o dataset.mov \\\n  "${accessUrl}"`} />
              <CopyableCode label="Python" code={`import requests\n\nurl = "${accessUrl}"\nresponse = requests.get(url, stream=True)\n\nwith open("dataset.mov", "wb") as f:\n    for chunk in response.iter_content(chunk_size=8192):\n        f.write(chunk)\n\nprint(f"Downloaded successfully")`} />
              <CopyableCode label="wget" code={`wget -O dataset.mov \\\n  "${accessUrl}"`} />
            </div>
          </>
        ) : status === 'ready' && !accessUrl ? (
          <div className="api-preamble" style={{ marginTop: 12 }}>
            <div className="db-meta-label" style={{ marginBottom: 8 }}>Access</div>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Your data is ready. {providerName} will send access details to the email address on your account.
            </p>
          </div>
        ) : status === 'processing' ? (
          <div className="api-preamble" style={{ marginTop: 12 }}>
            <div className="db-meta-label" style={{ marginBottom: 8 }}>Preparing your data</div>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              {providerName} is preparing your dataset. This page will update automatically when your data is ready to access.
            </p>
          </div>
        ) : status === 'requested' ? (
          <div className="api-preamble" style={{ marginTop: 12 }}>
            <div className="db-meta-label" style={{ marginBottom: 8 }}>Request sent</div>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Access has been requested from {providerName}. You will be notified once your data is ready.
            </p>
          </div>
        ) : (
          <div className="api-preamble" style={{ marginTop: 12 }}>
            <div className="db-meta-label" style={{ marginBottom: 8 }}>Purchase confirmed</div>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Your payment has been received. {providerName} has been notified and will set up data access for you shortly.
            </p>
          </div>
        )}
      </div>
    );
  }

  if (purchases.length === 0) return <div className="db-empty">No purchases yet</div>;

  return (
    <div>
      {purchases.map(p => (
        <div key={String(p.id)} className="db-catalog-row" onClick={() => viewPurchase(String(p.id))}>
          <div className="db-catalog-row__line1">
            <span className="db-catalog-row__title">
              {((p.transaction_items as Array<Record<string, unknown>>) ?? []).map(i => {
                const listing = i.listings as Record<string, unknown> | null;
                return listing?.title ?? '';
              }).join(', ')}
            </span>
            <span className="db-catalog-row__view">{String(p.provisioning_status) === 'ready' ? 'Download →' : 'View →'}</span>
          </div>
          <div className="db-catalog-row__line2">
            <div className="db-catalog-row__meta">
              <span className="db-catalog-row__provider">{String((p.providers as Record<string, unknown>)?.name ?? '')}</span>
              <span className="db-catalog-row__details">{formatUsd((p.total_cents as number) ?? 0)} · {new Date(String(p.created_at)).toLocaleDateString()}</span>
            </div>
            <span className="db-catalog-row__price">{String(p.provisioning_status)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// CHARTS
// ═══════════════════════════════════════════════════════════

function AreaChart({ data, label }: { data: { label: string; value: number }[]; label: string }) {
  const w = 640;
  const h = 150;
  const padL = 24;
  const padR = 24;
  const padB = 28;
  const padT = 8;
  const chartW = w - padL - padR;
  const chartH = h - padB - padT;
  const max = Math.max(...data.map(d => d.value), 1);

  const getY = (v: number) => padT + chartH - (v / max) * chartH;
  const getX = (i: number) => padL + (i / Math.max(data.length - 1, 1)) * chartW;

  const points = data.map((d, i) => `${getX(i)},${getY(d.value)}`).join(' ');
  const areaPoints = `${getX(0)},${h - padB} ${points} ${getX(data.length - 1)},${h - padB}`;

  return (
    <div className="db-chart-wrap">
      <div className="db-meta-label" style={{ marginBottom: 16 }}>{label}</div>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 'auto' }}>
        {[0, 0.25, 0.5, 0.75, 1].map(pct => (
          <line key={pct} x1={padL} y1={getY(max * pct)} x2={w - padR} y2={getY(max * pct)} stroke="var(--border)" strokeWidth="0.5" strokeDasharray={pct === 0 ? 'none' : '4 4'} />
        ))}
        <polyline points={areaPoints} fill="rgba(26,26,26,0.03)" stroke="none" />
        <polyline points={points} fill="none" stroke="var(--accent)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
        {data.map((d, i) => (
          <circle key={i} cx={getX(i)} cy={getY(d.value)} r="2" fill="var(--bg-card)" stroke="var(--accent)" strokeWidth="1" />
        ))}
        {data.map((d, i) => (
          <text key={`l${i}`} x={getX(i)} y={h - 8} textAnchor="middle" fill="var(--text-dim)"
            style={{ fontSize: 10, fontFamily: 'Share Tech Mono, monospace', letterSpacing: '1px' }}>{d.label}</text>
        ))}
      </svg>
    </div>
  );
}

function VerticalBarChart({ data, label }: { data: { label: string; value: number }[]; label: string }) {
  const max = Math.max(...data.map(d => d.value), 1);
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="db-chart-wrap">
      <div className="db-meta-label" style={{ marginBottom: 16 }}>{label}</div>
      {total === 0 ? (
        <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)', fontSize: 10, fontFamily: 'Share Tech Mono, monospace' }}>No data for this period</div>
      ) : (
        <div className="db-vbar-chart">
          {data.map((d, i) => (
            <div key={i} className="db-vbar-chart__col" title={`${d.value} transactions`}>
              <div className="db-vbar-chart__val">{d.value > 0 ? d.value : ''}</div>
              <div className="db-vbar-chart__bar-wrap">
                <div className="db-vbar-chart__bar" style={{ height: d.value > 0 ? `${Math.max((d.value / max) * 100, 12)}%` : '0%' }} />
              </div>
              <div className="db-vbar-chart__label">{d.label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function HoursBarChart({ listings }: { listings: Array<Record<string, unknown>> }) {
  if (listings.length === 0) return null;
  const maxHours = Math.max(...listings.map(l => l.hours as number), 1);

  return (
    <div className="db-chart-wrap">
      <div className="db-meta-label" style={{ marginBottom: 16 }}>Hours sold by listing</div>
      <div className="db-bar-chart">
        {listings.map(l => (
          <div key={String(l.listing_id)} className="db-bar-chart__row">
            <div className="db-bar-chart__label">{String(l.title)}</div>
            <div className="db-bar-chart__bar-wrap">
              <div className="db-bar-chart__bar" style={{ width: `${((l.hours as number) / maxHours) * 100}%` }} />
            </div>
            <div className="db-bar-chart__value">{String(l.hours)} hrs</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DonutChart({ segments, label }: { segments: { name: string; value: number; color: string }[]; label: string }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
  const r = 60;
  const cx = 80;
  const cy = 80;
  const circumference = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="db-chart-wrap">
      <div className="db-meta-label" style={{ marginBottom: 16 }}>{label}</div>
      <div className="db-donut-layout">
        <svg width={160} height={160} viewBox="0 0 160 160">
          {total === 0 ? (
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--border)" strokeWidth="16" />
          ) : segments.map((seg, i) => {
            const pct = seg.value / total;
            const dash = pct * circumference;
            const el = (
              <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={seg.color} strokeWidth="16"
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-offset} transform={`rotate(-90 ${cx} ${cy})`}
                style={{ transition: 'stroke-dasharray 0.3s, stroke-dashoffset 0.3s' }} />
            );
            offset += dash;
            return el;
          })}
          <text x={cx} y={cy - 2} textAnchor="middle" fill="var(--text)"
            style={{ fontSize: 22, fontFamily: 'Share Tech Mono, monospace' }}>{total}</text>
          <text x={cx} y={cy + 14} textAnchor="middle" fill="var(--text-dim)"
            style={{ fontSize: 9, fontFamily: 'Share Tech Mono, monospace', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Total</text>
        </svg>
        <div className="db-donut-legend">
          {segments.map((seg, i) => (
            <div key={i} className="db-donut-legend__row">
              <span className="db-donut-legend__dot" style={{ background: seg.color }} />
              <span className="db-donut-legend__name">{seg.name}</span>
              <span className="db-donut-legend__value">{seg.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CollectionProgramsManager() {
  const [programs, setPrograms] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const fetchPrograms = () => {
    setLoading(true);
    api.get<{ data: Record<string, unknown>[] }>('/provider/collection-programs')
      .then(r => setPrograms(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchPrograms(); }, []);

  if (loading) return <div className="db-loading">Loading programs...</div>;

  if (selectedProgramId) {
    return <ProgramSignups programId={selectedProgramId} program={programs.find(p => String(p.id) === selectedProgramId)} onBack={() => setSelectedProgramId(null)} />;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div className="db-meta-label" style={{ fontSize: 11 }}>{programs.length} program{programs.length !== 1 ? 's' : ''}</div>
        <button className="db-filter-pill" style={{ fontSize: 9, padding: '5px 16px', cursor: 'pointer' }} onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? 'Cancel' : '+ New program'}
        </button>
      </div>

      {showCreate && <CreateProgramForm onCreated={() => { setShowCreate(false); fetchPrograms(); }} />}

      {programs.length === 0 && !showCreate ? (
        <div className="db-empty">No collection programs yet. Create one to start recruiting data collectors.</div>
      ) : (
        programs.map(p => {
          const signups = p.collector_signups as Array<{ count: number }> | undefined;
          const count = signups?.[0]?.count ?? 0;
          return (
            <div key={String(p.id)} className="db-catalog-row" onClick={() => setSelectedProgramId(String(p.id))}>
              <div className="db-catalog-row__line1">
                <span className="db-catalog-row__title">{String(p.title)}</span>
                <span className="db-catalog-row__view">Manage →</span>
              </div>
              <div className="db-catalog-row__line2">
                <div className="db-catalog-row__meta">
                  <span className="db-catalog-row__details">
                    {count} signup{count !== 1 ? 's' : ''} · ${((p.referral_fee_cents as number ?? 0) / 100).toFixed(0)} referral fee
                    {p.is_active ? '' : ' · inactive'}
                  </span>
                </div>
                <span className={`db-status-badge db-status-badge--${p.is_active ? 'approved' : 'rejected'}`}>
                  {p.is_active ? 'active' : 'inactive'}
                </span>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

function ProgramSignups({ programId, program, onBack }: { programId: string; program?: Record<string, unknown>; onBack: () => void }) {
  const [signups, setSignups] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const fetchSignups = () => {
    setLoading(true);
    api.get<{ data: Record<string, unknown>[] }>(`/provider/collection-programs/${programId}/signups`)
      .then(r => setSignups(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchSignups(); }, [programId]);

  const handleStatusChange = async (signupId: string, status: string) => {
    setActionLoading(signupId);
    setActionMsg(null);
    try {
      const res = await api.patch<{ data: Record<string, unknown> }>(`/provider/collection-programs/${programId}/signups/${signupId}`, { status });
      fetchSignups();
      if (status === 'accepted') {
        const webhookSent = res.data?.webhook_sent;
        if (webhookSent) {
          setActionMsg('Collector accepted and synced to your system.');
        } else {
          setActionMsg('Collector accepted. Configure your provisioning API in Settings to auto-sync collectors to your database.');
        }
        setTimeout(() => setActionMsg(null), 8000);
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const formatUsd = (cents: number) => `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

  return (
    <div>
      <button className="db-back-btn" onClick={onBack}>&larr; Back to programs</button>

      {program && (
        <div className="api-preamble" style={{ marginTop: 12, marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div className="db-catalog-row__title" style={{ fontSize: 16 }}>{String(program.title)}</div>
            <span className={`db-status-badge db-status-badge--${program.is_active ? 'approved' : 'rejected'}`}>
              {program.is_active ? 'active' : 'inactive'}
            </span>
          </div>
          <div className="db-meta-grid">
            <div><div className="db-meta-label">Compensation</div><div className="db-meta-value">{String(program.compensation_description ?? '—')}</div></div>
            <div><div className="db-meta-label">Referral fee</div><div className="db-meta-value">{formatUsd((program.referral_fee_cents as number) ?? 0)}</div></div>
            <div><div className="db-meta-label">Signup type</div><div className="db-meta-value">{String(program.signup_type ?? 'atlas_form')}</div></div>
          </div>
          {program.requirements && <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 12 }}><strong>Requirements:</strong> {String(program.requirements)}</div>}
        </div>
      )}

      {actionMsg && (
        <div style={{ fontSize: 10, fontFamily: 'Share Tech Mono, monospace', padding: '8px 12px', marginBottom: 12, borderRadius: 4, background: actionMsg.includes('synced') ? 'rgba(39,103,73,0.08)' : 'rgba(214,158,46,0.08)', color: actionMsg.includes('synced') ? '#276749' : '#8a6d00' }}>
          {actionMsg}
        </div>
      )}

      <div className="db-meta-label" style={{ marginBottom: 12 }}>{signups.length} signup{signups.length !== 1 ? 's' : ''}</div>

      {loading ? <div className="db-loading">Loading signups...</div> :
       signups.length === 0 ? <div className="db-empty">No signups yet for this program.</div> :
        signups.map(s => (
          <div key={String(s.id)} className="api-preamble" style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div>
                <span style={{ fontWeight: 500, fontSize: 13 }}>{String(s.name)}</span>
                <span style={{ color: 'var(--text-secondary)', fontSize: 11, marginLeft: 8 }}>{String(s.email)}</span>
              </div>
              <span className={`db-status-badge db-status-badge--${String(s.status) === 'active' || String(s.status) === 'accepted' ? 'approved' : String(s.status) === 'rejected' ? 'rejected' : String(s.status) === 'completed' ? 'approved' : 'pending'}`}>
                {String(s.status)}
              </span>
            </div>
            <div className="db-meta-grid">
              <div><div className="db-meta-label">Referral code</div><div className="db-meta-value" style={{ fontFamily: 'Share Tech Mono, monospace' }}>{String(s.referral_code)}</div></div>
              <div><div className="db-meta-label">Hours</div><div className="db-meta-value">{String(s.hours_collected ?? 0)}</div></div>
              <div><div className="db-meta-label">Earnings</div><div className="db-meta-value">{formatUsd((s.earnings_cents as number) ?? 0)}</div></div>
              <div><div className="db-meta-label">Last activity</div><div className="db-meta-value">{s.last_activity_at ? new Date(String(s.last_activity_at)).toLocaleDateString() : '—'}</div></div>
            </div>
            {String(s.status) === 'submitted' && (
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button className="db-filter-pill" style={{ fontSize: 9, padding: '5px 16px', cursor: 'pointer', background: '#1a1a1a', color: '#f5f2ed', border: '1px solid #1a1a1a' }}
                  disabled={actionLoading === String(s.id)}
                  onClick={() => handleStatusChange(String(s.id), 'accepted')}>
                  {actionLoading === String(s.id) ? '...' : 'Accept'}
                </button>
                <button className="db-filter-pill" style={{ fontSize: 9, padding: '5px 16px', cursor: 'pointer', color: '#c53030', borderColor: '#c53030' }}
                  disabled={actionLoading === String(s.id)}
                  onClick={() => handleStatusChange(String(s.id), 'rejected')}>
                  Reject
                </button>
              </div>
            )}
          </div>
        ))
      }
    </div>
  );
}

function CreateProgramForm({ onCreated }: { onCreated: () => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [requirements, setRequirements] = useState('');
  const [compensation, setCompensation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!title || !description) { setError('Title and description are required'); return; }
    setSubmitting(true);
    setError('');
    try {
      await api.post('/provider/collection-programs', {
        title,
        description,
        requirements: requirements || undefined,
        compensation_description: compensation || undefined,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create program');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="db-create-form" style={{ marginBottom: 20 }}>
      {error && <div className="db-form-error">{error}</div>}

      <div className="db-form-field">
        <label className="db-meta-label">Title</label>
        <input className="db-form-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="Kitchen Activity Recording" />
      </div>
      <div className="db-form-field">
        <label className="db-meta-label">Description</label>
        <textarea className="db-form-textarea" rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="What data are you looking for?" />
      </div>
      <div className="db-form-row">
        <div className="db-form-field" style={{ flex: 1 }}>
          <label className="db-meta-label">Requirements</label>
          <input className="db-form-input" value={requirements} onChange={e => setRequirements(e.target.value)} placeholder="Smartphone with 4K camera" />
        </div>
        <div className="db-form-field" style={{ flex: 1 }}>
          <label className="db-meta-label">Compensation</label>
          <input className="db-form-input" value={compensation} onChange={e => setCompensation(e.target.value)} placeholder="$20/hr for approved footage" />
        </div>
      </div>
      <button className="db-add-cart-btn" style={{ marginTop: 8 }} onClick={handleSubmit} disabled={submitting}>
        {submitting ? 'Creating...' : 'Create Program'}
      </button>
    </div>
  );
}

function ProviderAnalytics() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('all');

  useEffect(() => {
    setLoading(true);
    api.get<{ data: Record<string, unknown> }>(`/provider/analytics?period=${period}`)
      .then(r => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [period]);

  const periods = ['7d', '30d', '90d', 'all'];
  const formatUsd = (cents: number) => `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

  if (loading) return <div className="db-loading">Loading analytics...</div>;

  const revenue = (data?.revenue_cents as number) ?? 0;
  const txns = (data?.transaction_count as number) ?? 0;
  const buyers = (data?.unique_buyers as number) ?? 0;
  const collectors = (data?.collector_count as number) ?? 0;
  const topListings = (data?.top_listings as Array<Record<string, unknown>>) ?? [];

  // Revenue timeline from real transaction dates, padded to fill the chart
  const rawTimeline = (data?.revenue_timeline as Array<{ date: string; revenue_cents: number }>) ?? [];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const periodDays: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90, 'all': 90 };
  const spanDays = periodDays[period] ?? 90;
  const now = new Date();

  // Build a map of date -> revenue, then fill in missing days with 0
  const revenueMap = new Map<string, number>();
  for (const t of rawTimeline) revenueMap.set(t.date, t.revenue_cents);

  const filledTimeline: { label: string; value: number }[] = [];
  const step = spanDays <= 7 ? 1 : spanDays <= 30 ? 3 : 7;
  for (let i = spanDays - 1; i >= 0; i -= step) {
    const d = new Date(now.getTime() - i * 86400000);
    const key = d.toISOString().slice(0, 10);
    // Sum revenue for all days in this bucket
    let bucketRevenue = 0;
    for (let j = 0; j < step; j++) {
      const bk = new Date(now.getTime() - (i + j) * 86400000).toISOString().slice(0, 10);
      bucketRevenue += revenueMap.get(bk) ?? 0;
    }
    filledTimeline.push({
      label: `${monthNames[d.getMonth()]} ${d.getDate()}`,
      value: Math.round(bucketRevenue / 100),
    });
  }
  const revenueChartData = filledTimeline.length > 1 ? filledTimeline : [{ label: '', value: 0 }, ...filledTimeline, { label: '', value: 0 }];

  // Build bar chart data from top_listings (real per-listing data)
  const listingBarData = topListings.map(l => ({
    label: String(l.title ?? '').slice(0, 20) + (String(l.title ?? '').length > 20 ? '...' : ''),
    value: Math.round((l.revenue_cents as number) / 100),
  }));

  // Donut: breakdown by modality from top listings
  const modalityMap = new Map<string, number>();
  for (const l of topListings) {
    const mod = String((l as Record<string, unknown>).modality ?? 'other');
    modalityMap.set(mod, (modalityMap.get(mod) ?? 0) + (l.hours as number));
  }
  const donutColors = ['#1a1a1a', '#8a8580', '#c5c0b8', '#e0ddd8', '#a0a0a0'];
  const donutSegments = [...modalityMap.entries()].map(([name, value], i) => ({
    name: name.replace(/_/g, ' ').toUpperCase(),
    value,
    color: donutColors[i % donutColors.length],
  }));
  const finalDonut = donutSegments.length > 0 ? donutSegments : [
    { name: 'No data', value: 0, color: '#e0ddd8' },
  ];

  return (
    <div>
      <div className="db-filter-bar" style={{ marginBottom: 20 }}>
        {periods.map(p => (
          <button key={p} className={`db-filter-pill${period === p ? ' db-filter-pill--active' : ''}`}
            onClick={() => setPeriod(p)}>{p === 'all' ? 'All time' : p}</button>
        ))}
      </div>

      <div className="db-analytics-grid">
        <div className="db-analytics-card">
          <div className="db-analytics-card__value">{formatUsd(revenue)}</div>
          <div className="db-meta-label">Revenue (after fees)</div>
        </div>
        <div className="db-analytics-card">
          <div className="db-analytics-card__value">{txns}</div>
          <div className="db-meta-label">Transactions</div>
        </div>
        <div className="db-analytics-card">
          <div className="db-analytics-card__value">{buyers}</div>
          <div className="db-meta-label">Unique buyers</div>
        </div>
        <div className="db-analytics-card">
          <div className="db-analytics-card__value">{collectors}</div>
          <div className="db-meta-label">Data collectors</div>
        </div>
      </div>

      <AreaChart data={revenueChartData} label="Revenue over time" />

      <div className="db-chart-row">
        {listingBarData.length > 0 ? (
          <VerticalBarChart data={listingBarData} label="Revenue by listing ($)" />
        ) : (
          <div className="db-chart-wrap"><div className="db-meta-label">Revenue by listing ($)</div></div>
        )}
        <DonutChart segments={finalDonut} label="Hours by modality" />
      </div>

      <HoursBarChart listings={topListings} />
    </div>
  );
}

function StripeStatus() {
  const [status, setStatus] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [provSettings, setProvSettings] = useState<{ provisioning_api_url: string | null; provisioning_api_key_masked: string | null; has_api_key: boolean; callback_url: string } | null>(null);
  const [apiUrl, setApiUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get<{ data: Record<string, unknown> }>('/auth/provider/onboarding-status').then(r => setStatus(r.data)).catch(console.error),
      api.get<{ data: typeof provSettings }>('/provider/settings').then(r => {
        setProvSettings(r.data);
        setApiUrl(r.data?.provisioning_api_url ?? '');
      }).catch(console.error),
    ]).finally(() => setLoading(false));
  }, []);

  const handleConnect = async () => {
    try {
      const r = await api.post<{ data: { stripe_onboarding_url: string } }>('/auth/provider/refresh-onboarding');
      window.location.href = r.data.stripe_onboarding_url;
    } catch (err) { console.error(err); }
  };

  const saveProvSettings = async () => {
    setSaving(true);
    setSaveMsg('');
    try {
      const updates: Record<string, unknown> = { provisioning_api_url: apiUrl || null };
      if (apiKey) updates.provisioning_api_key = apiKey;
      await api.patch('/provider/settings', updates);
      setSaveMsg('Saved');
      setApiKey('');
      // Refresh settings
      const r = await api.get<{ data: typeof provSettings }>('/provider/settings');
      setProvSettings(r.data);
      setTimeout(() => setSaveMsg(''), 2000);
    } catch (err) {
      setSaveMsg(err instanceof Error ? err.message : 'Failed to save');
    }
    setSaving(false);
  };

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const r = await api.post<{ data: { success: boolean; message: string } }>('/provider/test-provisioning');
      setTestResult(r.data);
    } catch (err) {
      setTestResult({ success: false, message: err instanceof Error ? err.message : 'Test failed' });
    }
    setTesting(false);
  };

  if (loading) return <div className="db-loading">Loading settings...</div>;

  const isComplete = status?.stripe_onboarding_complete;

  return (
    <div>
      {/* Stripe */}
      <div className="api-preamble" style={{ marginTop: 16 }}>
        <div className="db-meta-label" style={{ marginBottom: 16 }}>Stripe</div>
        {isComplete ? (
          <div>
            <div className="db-stripe-status">
              <span className={`db-status-badge db-status-badge--approved`}>Connected</span>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginLeft: 8 }}>Payouts enabled</span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 12 }}>
              Payments from OEM buyers are deposited directly to your connected Stripe account
            </p>
          </div>
        ) : (
          <div>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 16 }}>
              Connect your Stripe account to receive payments from data buyers
            </p>
            <button className="db-add-cart-btn" style={{ maxWidth: 280 }} onClick={handleConnect}>
              Complete Stripe Setup
            </button>
          </div>
        )}
      </div>

      {/* Provisioning API */}
      <div className="api-preamble" style={{ marginTop: 16 }}>
        <div className="db-meta-label" style={{ marginBottom: 8 }}>Provisioning API</div>
        <p style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 16 }}>
          Optional - configure your API to automatically deliver data access to buyers after purchase
        </p>

        <div className="db-form-field">
          <label className="db-meta-label">API endpoint URL</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="db-form-input" type="url" placeholder="https://api.yourcompany.com/atlas/provision"
              value={apiUrl} onChange={e => setApiUrl(e.target.value)} style={{ flex: 1 }} />
            <button className="db-regen-btn" onClick={testConnection} disabled={testing || !apiUrl}
              style={{ margin: 0, whiteSpace: 'nowrap' }}>
              {testing ? 'Testing...' : 'Test'}
            </button>
          </div>
          {testResult && (
            <div style={{ fontSize: 10, marginTop: 6, fontFamily: 'Share Tech Mono, monospace',
              color: testResult.success ? 'var(--green)' : 'var(--red)' }}>
              {testResult.message}
            </div>
          )}
        </div>

        <div className="db-form-field">
          <label className="db-meta-label">API key {provSettings?.has_api_key ? '(configured)' : ''}</label>
          <input className="db-form-input" type="password" placeholder={provSettings?.has_api_key ? provSettings.provisioning_api_key_masked ?? '••••••••' : 'Enter API key'}
            value={apiKey} onChange={e => setApiKey(e.target.value)} />
        </div>

        <div className="db-form-field">
          <label className="db-meta-label">Callback URL (read-only)</label>
          <input className="db-form-input" type="text" readOnly value={provSettings?.callback_url ?? ''} style={{ cursor: 'default' }} />
          <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 4, fontFamily: 'Share Tech Mono, monospace' }}>
            Your API can POST to this URL for async provisioning callbacks
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="db-add-cart-btn" style={{ maxWidth: 160 }} onClick={saveProvSettings} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </button>
          {saveMsg && <span style={{ fontSize: 10, fontFamily: 'Share Tech Mono, monospace', color: saveMsg === 'Saved' ? 'var(--green)' : 'var(--red)' }}>{saveMsg}</span>}
        </div>

        <button className="db-back-btn" style={{ marginTop: 16, marginBottom: 0 }} onClick={() => setShowGuide(!showGuide)}>
          {showGuide ? 'Hide integration guide' : 'View integration guide'}
        </button>

        {showGuide && <ProvisioningGuide callbackUrl={provSettings?.callback_url ?? ''} />}
      </div>

    </div>
  );
}

function CopyableCodeBlock({ code, label }: { code: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <div style={{ position: 'relative' }}>
      <div className="db-meta-label" style={{ marginBottom: 8 }}>{label}</div>
      <button
        onClick={handleCopy}
        style={{
          position: 'absolute', top: 28, right: 8,
          background: copied ? 'var(--green)' : 'var(--bg-primary)',
          color: copied ? '#fff' : 'var(--text-secondary)',
          border: '1px solid var(--border)',
          borderRadius: 3, padding: '3px 8px',
          fontSize: 9, fontFamily: 'Share Tech Mono, monospace',
          textTransform: 'uppercase', letterSpacing: '0.5px',
          cursor: 'pointer',
        }}
      >{copied ? 'Copied' : 'Copy'}</button>
      <pre className="db-code-block">{code}</pre>
    </div>
  );
}

function ProvisioningGuide({ callbackUrl }: { callbackUrl: string }) {
  return (
    <div style={{ marginTop: 16 }}>
      <div className="db-meta-label" style={{ marginBottom: 12 }}>Integration guide</div>

      <p style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 16 }}>
        When a buyer completes a purchase, Atlas sends a POST request to your API endpoint.
        You can respond synchronously with access details, or asynchronously via the callback URL.
      </p>

      <CopyableCodeBlock label="Request format (sent by Atlas)" code={`POST your-api-endpoint
Authorization: Bearer your-api-key
Content-Type: application/json

{
  "atlas_transaction_id": "txn_abc123",
  "buyer_email": "buyer@company.com",
  "buyer_company": "Acme Robotics",
  "items": [
    {
      "listing_id": "lst_xyz",
      "listing_title": "Indoor Navigation Dataset",
      "hours": 50,
      "license_type": "commercial"
    }
  ],
  "callback_url": "${callbackUrl}"
}`} />

      <div style={{ marginTop: 16 }} />
      <CopyableCodeBlock label="Response - Synchronous (instant access)" code={`{
  "status": "ready",
  "access_url": "https://your-storage.com/download/xyz",
  "instructions": "Download all files from the link above"
}`} />

      <div style={{ marginTop: 16 }} />
      <CopyableCodeBlock label="Response - Asynchronous (processing needed)" code={`{
  "status": "processing"
}`} />

      <div style={{ marginTop: 16 }} />
      <CopyableCodeBlock label="Callback (when async processing is done)" code={`POST ${callbackUrl}
Content-Type: application/json

{
  "transaction_id": "txn_abc123",
  "status": "ready",
  "access_url": "https://your-storage.com/download/xyz",
  "instructions": "Download all files from the link above"
}`} />

      <div style={{ marginTop: 24, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
        <div className="db-meta-label" style={{ marginBottom: 12 }}>Collector events</div>
        <p style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 16 }}>
          When you accept a collector from the Programs tab, Atlas sends a notification to the same endpoint so you can sync them to your own database.
        </p>
        <CopyableCodeBlock label="Event: collector_accepted" code={`POST your-api-endpoint
Authorization: Bearer your-api-key
Content-Type: application/json

{
  "event": "collector_accepted",
  "collector": {
    "name": "Eve Torres",
    "email": "eve@example.com",
    "referral_code": "ATL-377DKM"
  },
  "program": {
    "id": "program-uuid",
    "title": "Kitchen Activity Capture"
  }
}`} />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// COLLECT DATA
// ═══════════════════════════════════════════════════════════

function CollectData({ viewCount: _viewCount }: { viewCount: number | null }) {
  const [programs, setPrograms] = useState<CollectionProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [applyingTo, setApplyingTo] = useState<CollectionProgram | null>(null);

  useEffect(() => {
    api.get<{ data: CollectionProgram[] }>('/collection-programs')
      .then(r => setPrograms(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="api-docs">
      <div className="api-docs-header">
        <div><h2 className="api-docs-title">Collect Data</h2>
        <p className="api-docs-desc">Get paid to collect robot training data</p></div>
      </div>

      {/* Context section */}
      <div className="db-collect-context">
        <div className="db-collect-context__left">
          <div className="db-collect-context__body">
            Data providers need people to record real-world activities - cooking, cleaning,
            factory work, navigation. Browse active programs, apply, and start earning.
          </div>
        </div>
        <div className="db-collect-context__stats">
          <div className="db-collect-context__stat">
            <div className="db-collect-context__stat-value">{programs.length}</div>
            <div className="db-meta-label">Active programs</div>
          </div>
          <div className="db-collect-context__stat">
            <div className="db-collect-context__stat-value">$12-25</div>
            <div className="db-meta-label">Per hour range</div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="db-loading">Loading programs...</div>
      ) : programs.length === 0 ? (
        <div className="db-collect-empty">
          <div className="db-collect-empty__title">No programs available right now</div>
          <div className="db-collect-empty__body">
            Data providers create collection programs when they need training data gathered.
            New programs are added regularly as providers onboard to the marketplace.
          </div>
        </div>
      ) : (
        <div className="db-program-grid">
          {programs.map(p => (
            <div key={p.id} className="db-program-card">
              <div className="db-program-card__header">
                <div>
                  <div className="db-program-card__provider">{p.providers?.name ?? 'Unknown Provider'}</div>
                  <div className="db-program-card__title">{p.title}</div>
                </div>
                {p.providers?.website_url && (
                  <a href={p.providers.website_url} target="_blank" rel="noopener noreferrer" className="db-program-card__link" onClick={e => e.stopPropagation()}>
                    Visit site
                  </a>
                )}
              </div>

              <div className="db-program-card__desc">{p.description}</div>

              <div className="db-program-card__details">
                {p.compensation_description && (
                  <div className="db-program-card__detail-row">
                    <div className="db-meta-label">Compensation</div>
                    <div className="db-program-card__detail-value db-program-card__detail-value--pay">{p.compensation_description}</div>
                  </div>
                )}
                {p.requirements && (
                  <div className="db-program-card__detail-row">
                    <div className="db-meta-label">Requirements</div>
                    <div className="db-program-card__detail-value">{p.requirements}</div>
                  </div>
                )}
                <div className="db-program-card__detail-row">
                  <div className="db-meta-label">Apply via</div>
                  <div className="db-program-card__detail-value">{p.signup_type === 'external_link' ? 'Provider platform' : 'Atlas'}</div>
                </div>
              </div>

              <button className="db-program-apply-btn" onClick={() => {
                if (p.signup_type === 'external_link' && p.external_url) {
                  window.open(p.external_url, '_blank');
                } else {
                  setApplyingTo(p);
                }
              }}>
                {p.signup_type === 'external_link' ? 'Apply on Provider Site' : 'Apply Now'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Cross-link CTA */}
      <div className="db-collect-cta">
        <div className="db-collect-cta__text">
          <div className="db-meta-label">For data providers</div>
          <div className="db-collect-cta__body">Have a data collection operation? List your program and source collectors through Atlas</div>
        </div>
        <a href="/data/sell" className="db-program-apply-btn" style={{ flexShrink: 0 }}>Become a Provider</a>
      </div>

      {applyingTo && <CollectorModal program={applyingTo} onClose={() => setApplyingTo(null)} />}
    </div>
  );
}

function CollectorModal({ program, onClose }: { program: CollectionProgram; onClose: () => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [location, setLocation] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const handleSubmit = async () => {
    if (!name || !email) { setError('Name and email are required'); return; }
    setError('');
    try {
      const res = await api.post<{ data: { referral_code: string; redirect_url?: string } }>(`/collection-programs/${program.id}/signup`, {
        name, email, form_data: { location },
      });
      setReferralCode(res.data.referral_code);
      setSubmitted(true);
      if (res.data.redirect_url) {
        window.open(res.data.redirect_url, '_blank');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed');
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(referralCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(console.error);
  };

  return (
    <div className="db-modal-overlay" onClick={onClose}>
      <div className="db-modal" onClick={e => e.stopPropagation()}>
        <div className="db-modal-header">
          <div>
            <div className="db-modal-title">{program.title}</div>
            <div className="db-modal-subtitle">by {program.providers?.name}</div>
          </div>
          <button className="db-modal-close" onClick={onClose}>&times;</button>
        </div>

        {submitted ? (
          <div className="db-modal-success">
            <div className="db-modal-success__title">Application submitted</div>
            <div className="db-modal-success__code-wrap">
              <div className="db-meta-label">Your referral code</div>
              <div className="db-modal-success__code" onClick={copyCode}>
                <span>{referralCode}</span>
                <span className="db-modal-success__copy">{copied ? 'COPIED' : 'COPY'}</span>
              </div>
            </div>
            <div className="db-modal-success__note">
              The provider will review your application. Save your referral code to track your status and earnings.
            </div>
            <button className="db-add-cart-btn" onClick={onClose}>Done</button>
          </div>
        ) : (
          <>
            {error && <div className="db-form-error">{error}</div>}
            <div className="db-form-field">
              <label className="db-meta-label">Name</label>
              <input className="db-form-input" value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" />
            </div>
            <div className="db-form-field">
              <label className="db-meta-label">Email</label>
              <input className="db-form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <div className="db-form-field">
              <label className="db-meta-label">Location</label>
              <input className="db-form-input" value={location} onChange={e => setLocation(e.target.value)} placeholder="City, Country" />
            </div>
            {program.compensation_description && (
              <div className="db-modal-compensation">
                <div className="db-meta-label">Compensation</div>
                <div style={{ fontSize: 13, fontWeight: 500, marginTop: 4 }}>{program.compensation_description}</div>
              </div>
            )}
            <button className="db-add-cart-btn" onClick={handleSubmit}>Submit Application</button>
          </>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// CUSTOM REQUEST MODAL
// ═══════════════════════════════════════════════════════════

function CustomRequestModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ contact_name: '', contact_email: '', company_name: '', modality: '', description: '', hours_needed: '', budget_range: '', timeline: '' });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const set = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }));

  const handleSubmit = async () => {
    if (!form.contact_name || !form.contact_email || !form.description) {
      setError('Name, email, and description are required');
      return;
    }
    setError('');
    try {
      await api.post('/custom-requests', {
        ...form,
        hours_needed: form.hours_needed ? parseInt(form.hours_needed) : null,
      });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit request');
    }
  };

  return (
    <div className="db-modal-overlay" onClick={onClose}>
      <div className="db-modal db-modal--wide" onClick={e => e.stopPropagation()}>
        <div className="db-modal-header">
          <div>
            <div className="db-modal-title">Request Custom Dataset</div>
            <div className="db-modal-subtitle">Describe what you need and we'll connect you with providers</div>
          </div>
          <button className="db-modal-close" onClick={onClose}>&times;</button>
        </div>

        {submitted ? (
          <div className="db-modal-success">
            <div className="db-modal-success__title">Request submitted</div>
            <div className="db-modal-success__note">
              We'll review your request and reach out to matching data providers. You'll hear back at {form.contact_email}.
            </div>
            <button className="db-add-cart-btn" onClick={onClose}>Done</button>
          </div>
        ) : (
          <>
            {error && <div className="db-form-error">{error}</div>}
            <div className="db-form-row">
              <div className="db-form-field">
                <label className="db-meta-label">Name *</label>
                <input className="db-form-input" value={form.contact_name} onChange={e => set('contact_name', e.target.value)} placeholder="Your name" />
              </div>
              <div className="db-form-field">
                <label className="db-meta-label">Email *</label>
                <input className="db-form-input" type="email" value={form.contact_email} onChange={e => set('contact_email', e.target.value)} placeholder="you@company.com" />
              </div>
            </div>
            <div className="db-form-row">
              <div className="db-form-field">
                <label className="db-meta-label">Company</label>
                <input className="db-form-input" value={form.company_name} onChange={e => set('company_name', e.target.value)} placeholder="Company name" />
              </div>
              <div className="db-form-field">
                <label className="db-meta-label">Modality</label>
                <select className="db-form-input" value={form.modality} onChange={e => set('modality', e.target.value)}>
                  <option value="">Select modality</option>
                  <option value="video">Video</option>
                  <option value="teleoperation">Teleoperation</option>
                  <option value="tactile">Tactile</option>
                  <option value="motion_capture">Motion Capture</option>
                  <option value="lidar">LiDAR</option>
                  <option value="multimodal">Multimodal</option>
                </select>
              </div>
            </div>
            <div className="db-form-field">
              <label className="db-meta-label">Description *</label>
              <textarea className="db-form-input db-form-textarea" value={form.description} onChange={e => set('description', e.target.value)}
                placeholder="Describe the data you need - environment, activities, quality requirements, etc" rows={4} />
            </div>
            <div className="db-form-row">
              <div className="db-form-field">
                <label className="db-meta-label">Hours needed</label>
                <input className="db-form-input" type="text" inputMode="numeric" value={form.hours_needed} onChange={e => set('hours_needed', e.target.value.replace(/[^0-9]/g, ''))} placeholder="500" />
              </div>
              <div className="db-form-field">
                <label className="db-meta-label">Budget range</label>
                <input className="db-form-input" value={form.budget_range} onChange={e => set('budget_range', e.target.value)} placeholder="$10,000 - $50,000" />
              </div>
              <div className="db-form-field">
                <label className="db-meta-label">Timeline</label>
                <input className="db-form-input" value={form.timeline} onChange={e => set('timeline', e.target.value)} placeholder="3 months" />
              </div>
            </div>
            <button className="db-add-cart-btn" style={{ marginTop: 4 }} onClick={handleSubmit}>Submit Request</button>
          </>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// ACCOUNT PAGE
// ═══════════════════════════════════════════════════════════

function AccountPage() {
  const clerk = CLERK_AVAILABLE ? useClerk() : null;

  return (
    <div className="api-docs">
      <div className="api-docs-header">
        <div><h2 className="api-docs-title">Account</h2></div>
      </div>
      <div className="api-preamble" style={{ marginTop: 16 }}>
        {clerk ? (
          <button className="db-signout-btn" onClick={() => clerk.signOut()}>Sign out</button>
        ) : (
          <p style={{ fontSize: 12, color: 'var(--text-dim)' }}>Not signed in</p>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

export default function DataBrokerage({ activeSubTab, viewCount }: { activeSubTab: string; viewCount: number | null }) {
  const { isSignedIn, getToken } = useClerkAuth();

  // Wire Clerk token into the API client
  useEffect(() => {
    setTokenGetter(getToken);
  }, [getToken]);

  // Expose auth state to App.tsx for conditional tab rendering
  useEffect(() => {
    (window as unknown as Record<string, unknown>).__clerk_signed_in = isSignedIn;
    window.dispatchEvent(new CustomEvent('clerk-auth-change', { detail: { isSignedIn } }));
  }, [isSignedIn]);

  return (
    <>
      {activeSubTab === 'buy_data' && <BuyData />}
      {activeSubTab === 'sell_data' && <SellData viewCount={viewCount} />}
      {activeSubTab === 'collect_data' && <CollectData viewCount={viewCount} />}
      {activeSubTab === 'account' && <AccountPage />}
    </>
  );
}
