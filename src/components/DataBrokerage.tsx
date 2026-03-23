import { useState, useEffect, useCallback } from 'react';
import { useAuth, SignInButton } from '@clerk/clerk-react';
import { api } from '../lib/brokerage-api';
import { useCart } from '../hooks/useCart';

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
  return <SignInButton>{children}</SignInButton>;
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

function BuyData() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [filters, setFilters] = useState({ modality: '', environment: '', q: '' });
  const [facets, setFacets] = useState<{ modalities: string[]; environments: string[] }>({ modalities: [], environments: [] });
  const cart = useCart();

  const fetchListings = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.modality) params.set('modality', filters.modality);
    if (filters.environment) params.set('environment', filters.environment);
    if (filters.q) params.set('q', filters.q);
    api.get<{ data: Listing[] }>(`/catalog?${params}`).then(r => setListings(r.data)).catch(console.error).finally(() => setLoading(false));
  }, [filters]);

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
          <div className="db-video-section">
            <video className="db-video-player" controls src={l.samples[0].url} />
            <div className="db-thumb-strip">
              {l.samples.map((s, i) => (
                <div key={s.id} className="db-thumb" onClick={() => {
                  const video = document.querySelector('.db-video-player') as HTMLVideoElement;
                  if (video) video.src = s.url;
                }}>{i + 1}</div>
              ))}
            </div>
          </div>
        )}

        <div className="api-preamble" style={{ marginTop: 16 }}>
          <div className="db-meta-grid">
            <div><div className="db-meta-label">Modality</div><div className="db-meta-value">{l.modality}</div></div>
            <div><div className="db-meta-label">Environment</div><div className="db-meta-value">{l.environment}</div></div>
            <div><div className="db-meta-label">Format</div><div className="db-meta-value">{l.format ?? '—'}</div></div>
            <div><div className="db-meta-label">Hours Available</div><div className="db-meta-value">{l.total_hours?.toLocaleString() ?? '—'}</div></div>
            <div><div className="db-meta-label">Price</div><div className="db-meta-value" style={{ color: 'var(--green)' }}>${l.price_per_hour}/hr</div></div>
            <div><div className="db-meta-label">Min Purchase</div><div className="db-meta-value">{l.minimum_hours} hrs</div></div>
            <div><div className="db-meta-label">License</div><div className="db-meta-value">{l.license_type.replace(/_/g, ' ')}</div></div>
          </div>
        </div>

        <div className="db-detail-description">{l.description}</div>
        {l.license_terms && <div className="db-license-terms"><strong>License terms:</strong> {l.license_terms}</div>}

        <button className="db-add-cart-btn" onClick={() => {
          cart.addItem({
            listing_id: l.id, title: l.title, provider_name: prov?.name ?? '', provider_id: prov?.id ?? '',
            modality: l.modality, price_per_hour: l.price_per_hour, hours: l.minimum_hours,
          });
          setCartOpen(true);
        }}>{cart.isInCart(l.id) ? 'IN CART' : 'ADD TO CART'}</button>

        {cartOpen && <CartDrawer cart={cart} onClose={() => setCartOpen(false)} formatUsd={formatUsd} />}
      </div>
    );
  }

  return (
    <div className="api-docs">
      <div className="api-docs-header">
        <div className="api-docs-header-top">
          <div>
            <h2 className="api-docs-title">Buy Data</h2>
            <p className="api-docs-desc">Browse and purchase training datasets for humanoid robots.</p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {cart.totalItems > 0 && (
              <button className="db-cart-btn" onClick={() => setCartOpen(!cartOpen)}>
                Cart ({cart.totalItems})
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="db-filter-bar">
        {facets.modalities.map(m => (
          <button key={m} className={`db-filter-pill${filters.modality === m ? ' db-filter-pill--active' : ''}`}
            onClick={() => setFilters(f => ({ ...f, modality: f.modality === m ? '' : m }))}>
            {m.replace(/_/g, ' ')}
          </button>
        ))}
        {facets.environments.map(e => (
          <button key={e} className={`db-filter-pill${filters.environment === e ? ' db-filter-pill--active' : ''}`}
            onClick={() => setFilters(f => ({ ...f, environment: f.environment === e ? '' : e }))}>
            {e}
          </button>
        ))}
        <input className="db-search" placeholder="Search datasets..." value={filters.q}
          onChange={e => setFilters(f => ({ ...f, q: e.target.value }))} />
      </div>

      {loading ? (
        <div className="db-loading">Loading datasets...</div>
      ) : listings.length === 0 ? (
        <div className="db-empty">No datasets found. Try adjusting your filters.</div>
      ) : (
        <div className="db-grid">
          {listings.map(l => (
            <div key={l.id} className="db-card" onClick={() => selectListing(l.slug)}>
              <div className="db-card__thumb">
                {l.thumbnail_url ? <img src={l.thumbnail_url} alt="" /> : <div className="db-card__thumb-placeholder" />}
              </div>
              <div className="db-card__info">
                <div className="db-card__title">{l.title}</div>
                <div className="db-card__provider">{l.providers?.name ?? ''}</div>
                <div className="db-card__meta">
                  <span className="db-badge db-badge--sm">{l.modality.replace(/_/g, ' ')}</span>
                  <span className="db-card__price">${l.price_per_hour}/hr</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <button className="api-md-btn" style={{ marginTop: 24 }}
        onClick={() => {/* TODO: custom request modal */}}>
        Request Custom Dataset
      </button>

      {cartOpen && <CartDrawer cart={cart} onClose={() => setCartOpen(false)} formatUsd={formatUsd} />}
    </div>
  );
}

function CartDrawer({ cart, onClose, formatUsd }: { cart: ReturnType<typeof useCart>; onClose: () => void; formatUsd: (c: number) => string }) {
  return (
    <div className="db-cart-overlay" onClick={onClose}>
      <div className="db-cart-drawer" onClick={e => e.stopPropagation()}>
        <div className="db-cart-header">
          <span className="db-cart-title">CART</span>
          <button className="db-cart-close" onClick={onClose}>✕</button>
        </div>
        {cart.totalItems === 0 ? (
          <div className="db-empty" style={{ padding: 32 }}>Cart is empty</div>
        ) : (
          <>
            {Object.entries(cart.byProvider).map(([provId, group]) => (
              <div key={provId} className="db-cart-group">
                <div className="db-cart-provider">{group.provider_name}</div>
                {group.items.map(item => (
                  <div key={item.listing_id} className="db-cart-item">
                    <div className="db-cart-item__info">
                      <div className="db-cart-item__title">{item.title}</div>
                      <div className="db-cart-item__detail">
                        <input type="number" className="db-cart-hours" value={item.hours} min={1}
                          onChange={e => cart.updateHours(item.listing_id, parseInt(e.target.value) || 1)} /> hrs × ${item.price_per_hour}/hr
                      </div>
                    </div>
                    <div className="db-cart-item__right">
                      <div className="db-cart-item__subtotal">{formatUsd(Math.round(item.price_per_hour * item.hours * 100))}</div>
                      <button className="db-cart-item__remove" onClick={() => cart.removeItem(item.listing_id)}>✕</button>
                    </div>
                  </div>
                ))}
                <div className="db-cart-group__subtotal">Subtotal: {formatUsd(group.subtotal_cents)}</div>
              </div>
            ))}
            <div className="db-cart-total">
              <span>Total</span>
              <span>{formatUsd(cart.subtotalCents)}</span>
            </div>
            <button className="db-checkout-btn">Checkout</button>
          </>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SELL DATA
// ═══════════════════════════════════════════════════════════

function SellData() {
  const { isSignedIn } = useClerkAuth();

  if (!isSignedIn) {
    return (
      <div className="api-docs">
        <div className="api-docs-header">
          <div><h2 className="api-docs-title">Sell Data</h2>
          <p className="api-docs-desc">List your datasets on Atlas Data Brokerage.</p></div>
        </div>
        <div className="api-preamble" style={{ textAlign: 'center', padding: 40 }}>
          <h3 style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 16, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>Sell Your Training Data</h3>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 24, maxWidth: 400, margin: '0 auto 24px' }}>
            <p>· Reach OEM buyers already on humanoids.fyi</p>
            <p>· Set your own prices per hour</p>
            <p>· Get paid directly via Stripe</p>
            <p>· 15% platform fee, no upfront costs</p>
            <p>· Opt into data collection programs</p>
          </div>
          <ClerkSignInBtn><button className="db-add-cart-btn">Sign Up as Provider</button></ClerkSignInBtn>
        </div>
      </div>
    );
  }

  return (
    <div className="api-docs">
      <div className="api-docs-header">
        <div><h2 className="api-docs-title">Sell Data</h2>
        <p className="api-docs-desc">Manage your listings and track sales.</p></div>
      </div>
      <ProviderDashboard />
    </div>
  );
}

function ProviderDashboard() {
  const [activeTab, setActiveTab] = useState('listings');
  const [listings, setListings] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ data: Record<string, unknown>[] }>('/provider/listings')
      .then(r => setListings(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const tabs = [
    { id: 'listings', label: 'My Listings' },
    { id: 'create', label: 'Create Listing' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'stripe', label: 'Stripe' },
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
        listings.length === 0 ? <div className="db-empty">No listings yet. Create your first listing.</div> :
        <div>
          {listings.map(l => (
            <div key={String(l.id)} className="db-listing-row">
              <div className="db-listing-row__info">
                <div className="db-listing-row__title">{String(l.title)}</div>
                <div className="db-listing-row__meta">{String(l.modality)} · ${String(l.price_per_hour)}/hr</div>
              </div>
              <span className={`db-status-badge db-status-badge--${String(l.review_status)}`}>{String(l.review_status).replace(/_/g, ' ')}</span>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'create' && (
        <div className="api-preamble" style={{ marginTop: 16 }}>
          <div className="db-meta-label" style={{ marginBottom: 16 }}>Create a new dataset listing</div>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            Listing creation form coming soon. Your listing will be reviewed before going live.
          </p>
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="api-preamble" style={{ marginTop: 16 }}>
          <div className="db-meta-label" style={{ marginBottom: 16 }}>Provider Analytics</div>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Analytics dashboard coming soon.</p>
        </div>
      )}

      {activeTab === 'stripe' && (
        <div className="api-preamble" style={{ marginTop: 16 }}>
          <div className="db-meta-label" style={{ marginBottom: 16 }}>Stripe Connect</div>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Stripe onboarding and payout management coming soon.</p>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// COLLECT DATA
// ═══════════════════════════════════════════════════════════

function CollectData() {
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
        <p className="api-docs-desc">Join collection programs and earn by gathering training data.</p></div>
      </div>

      {loading ? (
        <div className="db-loading">Loading programs...</div>
      ) : programs.length === 0 ? (
        <div className="db-empty">No collection programs available yet. Check back soon.</div>
      ) : (
        <div className="db-program-grid">
          {programs.map(p => (
            <div key={p.id} className="db-program-card">
              <div className="db-program-card__provider">{p.providers?.name ?? 'Unknown Provider'}</div>
              <div className="db-program-card__title">{p.title}</div>
              <div className="db-program-card__desc">{p.description}</div>
              {p.requirements && (
                <div className="db-program-card__reqs">
                  <div className="db-meta-label">Requirements</div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>{p.requirements}</div>
                </div>
              )}
              {p.compensation_description && (
                <div style={{ fontSize: 12, color: 'var(--green)', marginTop: 8 }}>{p.compensation_description}</div>
              )}
              <button className="db-program-apply-btn" onClick={() => {
                if (p.signup_type === 'external_link' && p.external_url) {
                  window.open(p.external_url, '_blank');
                } else {
                  setApplyingTo(p);
                }
              }}>
                {p.signup_type === 'external_link' ? 'Apply on Provider Site →' : 'Apply'}
              </button>
            </div>
          ))}
        </div>
      )}

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

  const handleSubmit = async () => {
    if (!name || !email) { setError('Name and email are required'); return; }
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

  return (
    <div className="db-modal-overlay" onClick={onClose}>
      <div className="db-modal" onClick={e => e.stopPropagation()}>
        <div className="db-modal-title">Apply to: {program.title}</div>
        <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 16 }}>by {program.providers?.name}</div>

        {submitted ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 13, marginBottom: 8 }}>Application submitted!</div>
            <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 16, margin: '16px 0' }}>{referralCode}</div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Save this referral code for tracking.</div>
            <button className="db-add-cart-btn" style={{ marginTop: 16 }} onClick={onClose}>Close</button>
          </div>
        ) : (
          <>
            {error && <div style={{ color: 'var(--red)', fontSize: 12, marginBottom: 8 }}>{error}</div>}
            <div className="db-form-field">
              <label className="db-meta-label">Name</label>
              <input className="db-search" style={{ width: '100%' }} value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="db-form-field">
              <label className="db-meta-label">Email</label>
              <input className="db-search" style={{ width: '100%' }} type="email" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div className="db-form-field">
              <label className="db-meta-label">Location</label>
              <input className="db-search" style={{ width: '100%' }} value={location} onChange={e => setLocation(e.target.value)} placeholder="City, Country" />
            </div>
            <button className="db-add-cart-btn" onClick={handleSubmit}>Submit Application</button>
          </>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

export default function DataBrokerage({ activeSubTab }: { activeSubTab: string }) {
  return (
    <>
      {activeSubTab === 'buy_data' && <BuyData />}
      {activeSubTab === 'sell_data' && <SellData />}
      {activeSubTab === 'collect_data' && <CollectData />}
    </>
  );
}
