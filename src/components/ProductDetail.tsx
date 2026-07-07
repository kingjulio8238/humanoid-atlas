import { useState } from 'react';
import {
  type ShopProduct,
  categoryById,
  formatPrice,
} from '../data/shopCatalog';
import { api } from '../lib/brokerage-api';

const TIMELINE_OPTIONS = ['Immediate', '1–3 months', '3–6 months', '6+ months'];

function isVideo(url?: string): boolean {
  return !!url && /\.(mp4|webm|mov)$/i.test(url);
}

export default function ProductDetail({ product }: { product: ShopProduct }) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="equipment-page">
      <Hero product={product} onRequest={() => setModalOpen(true)} />
      <SpecsStrip product={product} />
      {product.bundles && product.bundles.length > 0 && <Bundles product={product} />}
      {product.customers && product.customers.length > 0 && <UsedBy product={product} />}
      <FooterCTA product={product} onRequest={() => setModalOpen(true)} />

      {modalOpen && (
        <ProductRequestModal product={product} onClose={() => setModalOpen(false)} />
      )}
    </div>
  );
}

// ---------------- Hero ----------------

function Hero({ product, onRequest }: { product: ShopProduct; onRequest: () => void }) {
  const heroMedia = product.heroVideoUrl || product.imageUrl;
  return (
    <section className="eq-hero">
      <div className="eq-hero__media">
        {isVideo(heroMedia) ? (
          <video
            className="eq-hero__video"
            src={heroMedia}
            autoPlay
            loop
            muted
            playsInline
          />
        ) : heroMedia ? (
          <img className="eq-hero__video" src={heroMedia} alt={product.name} />
        ) : (
          <div className="eq-hero__placeholder">MEDIA</div>
        )}
      </div>
      <div className="eq-hero__copy">
        <h1 className="eq-hero__title">{product.name}</h1>
        <p className="eq-hero__tagline">{product.tagline}</p>
        <p className="eq-hero__description">{product.description}</p>

        <dl className="eq-hero__meta">
          <div>
            <dt>Vendor</dt>
            <dd>
              <a href={product.vendorUrl} target="_blank" rel="noopener noreferrer">
                {product.vendor}
              </a>
            </dd>
          </div>
          <div>
            <dt>Origin</dt>
            <dd>{product.vendorOriginLabel}</dd>
          </div>
          <div>
            <dt>Price</dt>
            <dd>{formatPrice(product.listPrice, product.currency)}</dd>
          </div>
        </dl>

        <button className="eq-cta" onClick={onRequest}>
          Place Request
        </button>
        <div className="eq-hero__pricing-note">
          {product.listPrice != null
            ? 'Atlas brokers the introduction and finalizes pricing with the supplier.'
            : 'Pricing provided after request.'}
        </div>
      </div>
    </section>
  );
}

// ---------------- Specs ----------------

function SpecsStrip({ product }: { product: ShopProduct }) {
  if (product.specs.length === 0) return null;
  return (
    <section className="eq-section">
      <h2 className="eq-section__heading">SPECS</h2>
      <div className="eq-specs-grid">
        {product.specs.map((s) => (
          <div key={s.label} className="eq-spec">
            <div className="eq-spec__label">{s.label}</div>
            <div className="eq-spec__value">{s.value}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ---------------- Bundles ----------------

function Bundles({ product }: { product: ShopProduct }) {
  return (
    <section className="eq-section">
      <h2 className="eq-section__heading">BUNDLES</h2>
      <ul className="eq-bundles">
        {product.bundles!.map((b) => (
          <li key={b.id} className="eq-bundle">
            <div className="eq-bundle__label">{b.label}</div>
            {b.description && <div className="eq-bundle__desc">{b.description}</div>}
          </li>
        ))}
      </ul>
    </section>
  );
}

// ---------------- Used By ----------------

function UsedBy({ product }: { product: ShopProduct }) {
  const customers = product.customers!;
  return (
    <section className="eq-section">
      <h2 className="eq-section__heading">USED BY</h2>
      <div className="eq-customers">
        {customers.map((c, i) => (
          <span key={c} className="eq-customer">
            {c}
            {i < customers.length - 1 && <span className="eq-customer__sep">·</span>}
          </span>
        ))}
      </div>

      {product.secondaryVideoUrl && (
        <div className="eq-secondary-video">
          <video
            className="eq-secondary-video__player"
            src={product.secondaryVideoUrl}
            controls
            preload="metadata"
          />
          {product.secondaryVideoCaption && (
            <div className="eq-secondary-video__caption">{product.secondaryVideoCaption}</div>
          )}
        </div>
      )}
    </section>
  );
}

// ---------------- Footer CTA ----------------

function FooterCTA({ product, onRequest }: { product: ShopProduct; onRequest: () => void }) {
  const categoryLabel = categoryById(product.category)?.label ?? 'these components';
  return (
    <section className="eq-footer-cta">
      <div className="eq-footer-cta__copy">
        Ready to source {categoryLabel.toLowerCase()} for your humanoid program?
      </div>
      <button className="eq-cta" onClick={onRequest}>
        Place Request
      </button>
    </section>
  );
}

// ---------------- Request Modal ----------------

function ProductRequestModal({
  product,
  onClose,
}: {
  product: ShopProduct;
  onClose: () => void;
}) {
  const hasBundles = !!product.bundles && product.bundles.length > 0;
  const defaultBundleId = product.bundles?.[0]?.id ?? '';
  const categoryLabel = categoryById(product.category)?.label ?? product.category;
  const vendorFirst = product.vendor.split(' ')[0];

  const [form, setForm] = useState({
    contact_name: '',
    contact_email: '',
    company_name: '',
    bundle: defaultBundleId,
    quantity: '1',
    timeline: TIMELINE_OPTIONS[0],
    notes: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const set = (field: keyof typeof form, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async () => {
    if (!form.contact_name.trim() || !form.contact_email.trim() || !form.company_name.trim()) {
      setError('Name, email, and company are required.');
      return;
    }
    const qty = parseInt(form.quantity, 10);
    if (!Number.isFinite(qty) || qty < 1) {
      setError('Quantity must be at least 1.');
      return;
    }
    setError('');
    setSubmitting(true);

    const bundle = product.bundles?.find((b) => b.id === form.bundle);
    const description =
      `[SHOP REQUEST] ${product.name} — ${categoryLabel}\n` +
      `Vendor: ${product.vendor} (${product.vendorOriginLabel})\n` +
      (hasBundles ? `Bundle: ${bundle?.label ?? '(unspecified)'}\n` : '') +
      `Quantity: ${qty}\n` +
      `Timeline: ${form.timeline}\n\n` +
      `Use case / notes:\n${form.notes.trim() || '(none)'}`;

    try {
      await api.post('/custom-requests', {
        request_type: 'equipment',
        component_category: product.category,
        product_slug: product.slug,
        quantity: qty,
        contact_name: form.contact_name.trim(),
        contact_email: form.contact_email.trim(),
        company_name: form.company_name.trim(),
        description,
        hours_needed: 0,
        budget_range: '',
        timeline: form.timeline,
      });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="db-modal-overlay" onClick={onClose}>
      <div className="db-modal db-modal--wide" onClick={(e) => e.stopPropagation()}>
        <div className="db-modal-header">
          <div>
            <div className="db-modal-title">Request {product.name}</div>
            <div className="db-modal-subtitle">
              Atlas brokers introductions with {vendorFirst} for pricing and procurement.
            </div>
          </div>
          <button className="db-modal-close" onClick={onClose}>
            &times;
          </button>
        </div>

        {submitted ? (
          <div className="db-modal-success">
            <div className="db-modal-success__title">Request submitted</div>
            <div className="db-modal-success__note">
              We'll review and reach out at {form.contact_email} to broker the introduction
              with {vendorFirst}.
            </div>
            <button className="db-add-cart-btn" onClick={onClose}>
              Done
            </button>
          </div>
        ) : (
          <>
            {error && <div className="db-form-error">{error}</div>}

            <div className="db-form-row">
              <div className="db-form-field">
                <label className="db-meta-label">Name *</label>
                <input
                  className="db-form-input"
                  value={form.contact_name}
                  onChange={(e) => set('contact_name', e.target.value)}
                  placeholder="Your name"
                />
              </div>
              <div className="db-form-field">
                <label className="db-meta-label">Email *</label>
                <input
                  className="db-form-input"
                  type="email"
                  value={form.contact_email}
                  onChange={(e) => set('contact_email', e.target.value)}
                  placeholder="you@company.com"
                />
              </div>
            </div>

            <div className="db-form-field">
              <label className="db-meta-label">Company *</label>
              <input
                className="db-form-input"
                value={form.company_name}
                onChange={(e) => set('company_name', e.target.value)}
                placeholder="Defense startup, lab, or integrator"
              />
            </div>

            {hasBundles && (
              <div className="db-form-field">
                <label className="db-meta-label">Bundle</label>
                <div className="eq-bundle-options" role="radiogroup" aria-label="Bundle">
                  {product.bundles!.map((b) => (
                    <button
                      type="button"
                      key={b.id}
                      role="radio"
                      aria-checked={form.bundle === b.id}
                      className={`eq-bundle-option ${form.bundle === b.id ? 'eq-bundle-option--active' : ''}`}
                      onClick={() => set('bundle', b.id)}
                    >
                      <span className="eq-bundle-option__label">{b.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="db-form-row">
              <div className="db-form-field">
                <label className="db-meta-label">Quantity</label>
                <input
                  className="db-form-input"
                  type="number"
                  min="1"
                  value={form.quantity}
                  onChange={(e) => set('quantity', e.target.value)}
                />
              </div>
              <div className="db-form-field">
                <label className="db-meta-label">Timeline</label>
                <select
                  className="db-form-input"
                  value={form.timeline}
                  onChange={(e) => set('timeline', e.target.value)}
                >
                  {TIMELINE_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="db-form-field">
              <label className="db-meta-label">Use case / notes</label>
              <textarea
                className="db-form-input db-form-input--textarea"
                rows={4}
                value={form.notes}
                onChange={(e) => set('notes', e.target.value)}
                placeholder={`Which humanoid platform? How will you use the ${categoryLabel.toLowerCase()}? Any timing or compliance constraints we should flag to ${vendorFirst}?`}
              />
            </div>

            <button className="db-add-cart-btn" onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit Request →'}
            </button>

            <div className="eq-modal-footnote">
              Atlas reviews your request and emails an introduction to {vendorFirst}.
              They will follow up directly with pricing and next steps.
            </div>
          </>
        )}
      </div>
    </div>
  );
}
