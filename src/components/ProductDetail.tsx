import { Fragment, useMemo, useState } from 'react';
import {
  type ShopProduct,
  type ShopSeries,
  type ShopSeriesFrame,
  type ShopSeriesBuildPrice,
  type ShopVariantTable,
  type ShopVariantRow,
  categoryById,
  formatPrice,
} from '../data/shopCatalog';
import { api } from '../lib/brokerage-api';

const TIMELINE_OPTIONS = ['As soon as possible', '1-3 months', '3-6 months', '6+ months'];

function isVideo(url?: string): boolean {
  return !!url && /\.(mp4|webm|mov)$/i.test(url);
}

// Lowest per-unit price across every build variant + qty tier for a frame.
function frameFromPrice(frame: ShopSeriesFrame): number {
  const p = frame.price;
  return Math.min(...([p.seNb, p.seWb, p.deNb, p.deWb].flat()));
}

// min/max rated torque across a frame's ratio options.
function frameTorqueRange(frame: ShopSeriesFrame): [number, number] {
  const t = frame.ratios.map((r) => r.ratedTorqueNm);
  return [Math.min(...t), Math.max(...t)];
}

export default function ProductDetail({ product }: { product: ShopProduct }) {
  const [modalOpen, setModalOpen] = useState(false);
  const isSeries = !!product.series;
  const isVariant = !!product.variants;

  return (
    <div className="equipment-page">
      <Hero product={product} onRequest={() => setModalOpen(true)} />
      {isSeries ? (
        <SeriesSections series={product.series!} />
      ) : isVariant ? (
        <VariantSections variants={product.variants!} />
      ) : (
        <>
          <SpecsStrip product={product} />
          {product.modes && product.modes.length > 0 && <ControlModes product={product} />}
          {product.connector && <ConnectorSection product={product} />}
          {product.inBox && product.inBox.length > 0 && <InBox product={product} />}
          {product.bundles && product.bundles.length > 0 && <Bundles product={product} />}
          {product.photos && product.photos.length > 0 && <InUseGallery product={product} />}
          {product.customers && product.customers.length > 0 && <UsedBy product={product} />}
        </>
      )}
      <FooterCTA product={product} onRequest={() => setModalOpen(true)} />

      {modalOpen &&
        (isSeries ? (
          <SeriesRequestModal product={product} onClose={() => setModalOpen(false)} />
        ) : (
          <ProductRequestModal product={product} onClose={() => setModalOpen(false)} />
        ))}
    </div>
  );
}

// ---------------- Hero ----------------

function Hero({ product, onRequest }: { product: ShopProduct; onRequest: () => void }) {
  const heroMedia = product.heroVideoUrl || product.imageUrl;
  const gallery = product.gallery && product.gallery.length > 1 ? product.gallery : null;
  return (
    <section className="eq-hero">
      <div className="eq-hero__media">
        {gallery ? (
          <HeroCarousel images={gallery} alt={product.name} />
        ) : isVideo(heroMedia) ? (
          <video
            className="eq-hero__video"
            src={heroMedia}
            autoPlay
            loop
            muted
            playsInline
          />
        ) : heroMedia ? (
          <img className="eq-hero__img" src={heroMedia} alt={product.name} />
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
            <dt>Supplier</dt>
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
            <dd>
              {product.series
                ? `From ${formatPrice(product.series.fromPrice, product.series.currency)}`
                : product.variants && product.listPrice != null
                  ? `From ${formatPrice(product.listPrice, product.currency)}`
                  : formatPrice(product.listPrice, product.currency)}
              {product.shippingUsd != null && (
                <span className="eq-hero__ship">+ ${product.shippingUsd.toLocaleString('en-US')} shipping</span>
              )}
            </dd>
          </div>
          {product.leadTime && (
            <div>
              <dt>Lead time</dt>
              <dd>{product.leadTime}</dd>
            </div>
          )}
        </dl>

        <button className="eq-cta" onClick={onRequest}>
          Place Request
        </button>
        {!product.series && (
          <div className="eq-hero__pricing-note">
            {product.listPrice != null
              ? 'Atlas brokers the introduction and finalizes pricing with the supplier.'
              : product.leadTime
                ? 'Quote provided promptly after request. Product is made to order; see lead time above.'
                : 'Pricing provided after request.'}
          </div>
        )}
      </div>
    </section>
  );
}

// ---------------- Hero carousel ----------------

function HeroCarousel({ images, alt }: { images: string[]; alt: string }) {
  const [i, setI] = useState(0);
  const n = images.length;
  const go = (d: number) => setI((c) => (c + d + n) % n);

  return (
    <div className="eq-carousel">
      {images.map((src, idx) => (
        <img
          key={src}
          src={src}
          alt={`${alt} — view ${idx + 1}`}
          className={`eq-carousel__img ${idx === i ? 'is-active' : ''}`}
          loading={idx === 0 ? 'eager' : 'lazy'}
        />
      ))}

      <button
        type="button"
        className="eq-carousel__nav eq-carousel__nav--prev"
        onClick={() => go(-1)}
        aria-label="Previous image"
      >
        ‹
      </button>
      <button
        type="button"
        className="eq-carousel__nav eq-carousel__nav--next"
        onClick={() => go(1)}
        aria-label="Next image"
      >
        ›
      </button>

      <div className="eq-carousel__dots">
        {images.map((src, idx) => (
          <button
            type="button"
            key={src}
            className={`eq-carousel__dot ${idx === i ? 'is-active' : ''}`}
            onClick={() => setI(idx)}
            aria-label={`Go to image ${idx + 1}`}
            aria-current={idx === i}
          />
        ))}
      </div>
    </div>
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

// ---------------- Control modes ----------------

function ControlModes({ product }: { product: ShopProduct }) {
  return (
    <section className="eq-section">
      <h2 className="eq-section__heading">CONTROL MODES</h2>
      <div className="eq-modes">
        {product.modes!.map((m) => (
          <div key={m.name} className="eq-mode">
            <div className="eq-mode__name">{m.name}</div>
            <div className="eq-mode__desc">{m.description}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ---------------- Connector / interface ----------------

function ConnectorSection({ product }: { product: ShopProduct }) {
  const c = product.connector!;
  return (
    <section className="eq-section">
      <h2 className="eq-section__heading">CONNECTOR / INTERFACE</h2>
      <div className="eq-pinout">
        <table className="eq-pinout__table">
          <thead>
            <tr>
              <th>Pin</th>
              <th>Color</th>
              <th>Signal</th>
            </tr>
          </thead>
          <tbody>
            {c.pins.map((p) => (
              <tr key={p.pin}>
                <td>{p.pin}</td>
                <td>{p.color}</td>
                <td>{p.signal}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {c.note && <div className="eq-pinout__note">{c.note}</div>}
    </section>
  );
}

// ---------------- In the box ----------------

function InBox({ product }: { product: ShopProduct }) {
  return (
    <section className="eq-section">
      <h2 className="eq-section__heading">IN THE BOX</h2>
      <ul className="eq-inbox">
        {product.inBox!.map((item) => (
          <li key={item} className="eq-inbox__item">{item}</li>
        ))}
      </ul>
    </section>
  );
}

// ---------------- In use gallery ----------------

function InUseGallery({ product }: { product: ShopProduct }) {
  return (
    <section className="eq-section">
      <h2 className="eq-section__heading">IN USE</h2>
      <div className="eq-inuse">
        {product.photos!.map((src, i) => (
          <div key={src} className="eq-inuse__tile">
            <img src={src} alt={`${product.name} in use, view ${i + 1}`} loading="lazy" />
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
  const variantRows = product.variants?.rows ?? [];
  const hasVariants = variantRows.length > 0;
  const categoryLabel = categoryById(product.category)?.label ?? product.category;
  const vendorFirst = product.vendor.split(' ')[0];

  const [form, setForm] = useState({
    contact_name: '',
    contact_email: '',
    company_name: '',
    bundle: defaultBundleId,
    model: '',
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
      (hasVariants ? `Model: ${form.model || '(any)'}\n` : '') +
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

            {hasVariants && (
              <div className="db-form-field">
                <label className="db-meta-label">Model</label>
                <select
                  className="db-form-input"
                  value={form.model}
                  onChange={(e) => set('model', e.target.value)}
                >
                  <option value="">Not sure yet · discuss options</option>
                  {variantRows.map((r) => (
                    <option key={r.model} value={r.model}>
                      {r.label ? `${r.model} · ${r.label}` : r.model}
                    </option>
                  ))}
                </select>
              </div>
            )}

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
                <label className="db-meta-label">Requested timeline</label>
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

            {product.leadTime && (
              <div className="db-form-lead-note">
                Typical lead time {product.leadTime}. The timeline above is your target; we issue the
                quote promptly and confirm actual delivery then.
              </div>
            )}

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

// ================= VARIANT-TABLE PRODUCTS (RFQ family) =================

// Shared specs + a plain model-comparison table. Used for RFQ families of many
// closely-related SKUs (e.g. a gripper series scaling by stroke/force). No prices.
function VariantSections({ variants }: { variants: ShopVariantTable }) {
  const [openModel, setOpenModel] = useState<string | null>(null);
  const toggle = (model: string) => setOpenModel((c) => (c === model ? null : model));
  const colSpan = variants.columns.length + 2; // caret + model + value columns

  return (
    <>
      <section className="eq-section">
        <h2 className="eq-section__heading">SERIES SPECS</h2>
        <div className="eq-specs-grid">
          {variants.common.map((s) => (
            <div key={s.label} className="eq-spec">
              <div className="eq-spec__label">{s.label}</div>
              <div className="eq-spec__value">{s.value}</div>
            </div>
          ))}
        </div>
        {variants.customization && variants.customization.length > 0 && (
          <div className="hpjm-custom">
            <div className="hpjm-custom__label">HIGHLIGHTS</div>
            <div className="hpjm-custom__chips">
              {variants.customization.map((c) => (
                <span key={c} className="hpjm-custom__chip">{c}</span>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="eq-section">
        <h2 className="eq-section__heading">MODELS ({variants.rows.length})</h2>
        <div className="hpjm-table-wrap">
          <table className="hpjm-table ct-variant-table">
            <thead>
              <tr>
                <th aria-hidden />
                <th>Model</th>
                {variants.columns.map((c) => (
                  <th key={c.key}>{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {variants.rows.map((r) => {
                const hasDetail = !!r.detail && r.detail.length > 0;
                const open = openModel === r.model;
                return (
                  <Fragment key={r.model}>
                    <tr
                      className={`hpjm-table__row ${open ? 'is-open' : ''} ${hasDetail ? '' : 'ct-variant__row--static'}`}
                      onClick={hasDetail ? () => toggle(r.model) : undefined}
                      role={hasDetail ? 'button' : undefined}
                      tabIndex={hasDetail ? 0 : undefined}
                      aria-expanded={hasDetail ? open : undefined}
                      onKeyDown={
                        hasDetail
                          ? (e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                toggle(r.model);
                              }
                            }
                          : undefined
                      }
                    >
                      <td className="hpjm-table__caret">{hasDetail ? (open ? '▾' : '▸') : ''}</td>
                      <td className="hpjm-table__code">
                        <div className="ct-variant__id">
                          {r.imageUrl && (
                            <img className="ct-variant__thumb" src={r.imageUrl} alt={r.model} loading="lazy" />
                          )}
                          <div>
                            <div className="ct-variant__model">{r.model}</div>
                            {r.label && <div className="ct-variant__sub">{r.label}</div>}
                            {r.note && <div className="ct-variant__note">{r.note}</div>}
                          </div>
                        </div>
                      </td>
                      {variants.columns.map((c) => (
                        <td key={c.key}>{r.values[c.key] || ''}</td>
                      ))}
                    </tr>
                    {open && hasDetail && (
                      <tr className="hpjm-table__detail-row">
                        <td colSpan={colSpan}>
                          <VariantDetail row={r} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        {variants.note && <div className="hpjm-qc">{variants.note}</div>}
      </section>
    </>
  );
}

// Expanded per-model detail: larger image + full spec sheet.
function VariantDetail({ row }: { row: ShopVariantRow }) {
  return (
    <div className="hpjm-detail">
      {row.imageUrl && (
        <div className="hpjm-detail__media">
          <img src={row.imageUrl} alt={row.model} loading="lazy" />
        </div>
      )}
      <div className="hpjm-detail__body">
        <dl className="ct-detail__specs">
          {(row.detail ?? []).map((d) => (
            <div key={d.label} className="ct-detail__spec">
              <dt className="ct-detail__label">{d.label}</dt>
              <dd className="ct-detail__value">{d.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

// ================= SERIES PRODUCTS (variant matrix) =================

// ---------------- Series sections: specs + comparison table + downloads ----------------

type SeriesSortKey = 'size' | 'od' | 'length' | 'power' | 'torque' | 'price';

// Small always-visible sort toggle shown on every sortable column header.
function SortInd({ active, asc }: { active: boolean; asc: boolean }) {
  return (
    <span className={`hpjm-sort-ind ${active ? 'is-active' : ''}`} aria-hidden>
      {active ? (asc ? '▲' : '▼') : '↕'}
    </span>
  );
}

function SeriesSections({ series }: { series: ShopSeries }) {
  const [sortKey, setSortKey] = useState<SeriesSortKey>('size');
  const [asc, setAsc] = useState(true);
  const [openFrame, setOpenFrame] = useState<string | null>(null);
  const toggleFrame = (code: string) => setOpenFrame((c) => (c === code ? null : code));

  const rows = useMemo(() => {
    const derived = series.frames.map((f, idx) => ({
      frame: f,
      idx,
      od: f.odMm,
      length: f.lengthMm,
      power: f.ratedPowerW,
      torque: frameTorqueRange(f)[1],
      price: frameFromPrice(f),
    }));
    const dir = asc ? 1 : -1;
    const key = sortKey === 'size' ? 'idx' : sortKey;
    derived.sort((a, b) => ((a[key] as number) - (b[key] as number)) * dir);
    return derived;
  }, [series.frames, sortKey, asc]);

  const onSort = (k: SeriesSortKey) => {
    if (k === sortKey) setAsc((v) => !v);
    else {
      setSortKey(k);
      setAsc(true);
    }
  };

  return (
    <>
      <section className="eq-section">
        <h2 className="eq-section__heading">SERIES SPECS</h2>
        <div className="eq-specs-grid">
          {series.common.map((s) => (
            <div key={s.label} className="eq-spec">
              <div className="eq-spec__label">{s.label}</div>
              <div className="eq-spec__value">{s.value}</div>
            </div>
          ))}
        </div>
        {series.customization.length > 0 && (
          <div className="hpjm-custom">
            <div className="hpjm-custom__label">CUSTOMIZATION</div>
            <div className="hpjm-custom__chips">
              {series.customization.map((c) => (
                <span key={c} className="hpjm-custom__chip">{c}</span>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="eq-section">
        <h2 className="eq-section__heading">FRAME SIZES ({series.frames.length})</h2>
        <div className="hpjm-table-wrap">
          <table className="hpjm-table">
            <thead>
              <tr>
                <th aria-hidden />
                <th className="hpjm-th--sort" onClick={() => onSort('size')}>Frame<SortInd active={sortKey === 'size'} asc={asc} /></th>
                <th className="hpjm-th--sort" onClick={() => onSort('od')}>OD&nbsp;(mm)<SortInd active={sortKey === 'od'} asc={asc} /></th>
                <th className="hpjm-th--sort" onClick={() => onSort('length')}>Length&nbsp;(mm)<SortInd active={sortKey === 'length'} asc={asc} /></th>
                <th>Bore&nbsp;(mm)</th>
                <th className="hpjm-th--sort" onClick={() => onSort('power')}>Power&nbsp;(W)<SortInd active={sortKey === 'power'} asc={asc} /></th>
                <th className="hpjm-th--sort" onClick={() => onSort('torque')}>Rated&nbsp;torque&nbsp;(N·m)<SortInd active={sortKey === 'torque'} asc={asc} /></th>
                <th>Ratios</th>
                <th className="hpjm-th--sort" onClick={() => onSort('price')}>Price<SortInd active={sortKey === 'price'} asc={asc} /></th>
                <th>Docs</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ frame: f }) => {
                const [tMin, tMax] = frameTorqueRange(f);
                const open = openFrame === f.code;
                return (
                  <Fragment key={f.code}>
                    <tr
                      className={`hpjm-table__row ${open ? 'is-open' : ''}`}
                      onClick={() => toggleFrame(f.code)}
                      aria-expanded={open}
                    >
                      <td className="hpjm-table__caret">{open ? '▾' : '▸'}</td>
                      <td className="hpjm-table__code">{f.code}</td>
                      <td>{f.odMm}</td>
                      <td>{f.lengthMm}</td>
                      <td>{f.boreMm}</td>
                      <td>{f.ratedPowerW}</td>
                      <td>{tMin === tMax ? tMin : `${tMin}–${tMax}`}</td>
                      <td className="hpjm-table__ratios">{f.ratios.map((r) => r.ratio).join(' / ')}</td>
                      <td>{formatPrice(frameFromPrice(f), series.currency)}</td>
                      <td className="hpjm-table__docs" onClick={(e) => e.stopPropagation()}>
                        {f.drawingPdfUrl && (
                          <a href={f.drawingPdfUrl} target="_blank" rel="noopener noreferrer">PDF</a>
                        )}
                        {f.stepUrl && (
                          <a href={f.stepUrl} target="_blank" rel="noopener noreferrer">STEP</a>
                        )}
                      </td>
                    </tr>
                    {open && (
                      <tr className="hpjm-table__detail-row">
                        <td colSpan={10}>
                          <FrameDetail frame={f} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {series.leadTimes && series.leadTimes.length > 0 && (
        <section className="eq-section">
          <h2 className="eq-section__heading">DELIVERY</h2>
          <div className="hpjm-lead-grid">
            {series.leadTimes.map((lt) => (
              <div key={lt.qty} className="hpjm-lead">
                <div className="hpjm-lead__qty">{lt.qty}</div>
                <div className="hpjm-lead__time">{lt.time}</div>
              </div>
            ))}
          </div>
          {series.qc && <div className="hpjm-qc">{series.qc}</div>}
        </section>
      )}

      {series.ordering && (
        <section className="eq-section">
          <h2 className="eq-section__heading">ORDERING GUIDE</h2>
          <div className="hpjm-order__format">{series.ordering.format}</div>
          <dl className="hpjm-order__legend">
            {series.ordering.segments.map((s) => (
              <div key={s.code} className="hpjm-order__seg">
                <dt>{s.code}</dt>
                <dd>{s.meaning}</dd>
              </div>
            ))}
          </dl>
          {series.ordering.note && (
            <div className="hpjm-order__note">{series.ordering.note}</div>
          )}
        </section>
      )}
    </>
  );
}

// ---------------- Expanded frame detail (per-row) ----------------

function FrameDetail({ frame }: { frame: ShopSeriesFrame }) {
  const dims: { label: string; value: string }[] = [
    { label: 'Outer diameter', value: `${frame.odMm} mm` },
    { label: 'Pilot diameter', value: `${frame.pilotDiaMm} mm` },
    { label: 'Through-bore', value: `${frame.boreMm} mm` },
    { label: 'Overall length', value: `${frame.lengthMm} mm` },
    { label: 'Rated power', value: `${frame.ratedPowerW} W` },
    { label: 'Rated current', value: `${frame.ratedCurrentA} A` },
    { label: 'Max cont. current', value: `${frame.maxContCurrentA} A` },
    { label: 'Torque constant', value: `${frame.torqueConstant} N·m/A` },
    { label: 'Weight', value: frame.weightG != null ? `${frame.weightG} g` : 'On request' },
  ];

  const mount: { label: string; value: string }[] = [];
  if (frame.boltPattern) mount.push({ label: 'Output-flange bolts', value: frame.boltPattern });
  if (frame.motorPattern) mount.push({ label: 'Housing bolts', value: frame.motorPattern });
  if (frame.fit) mount.push({ label: 'Register fits', value: frame.fit });
  if (frame.connector) mount.push({ label: 'Electrical interface', value: frame.connector });

  return (
    <div className="hpjm-detail">
      <div className="hpjm-detail__media">
        {frame.imageUrl ? (
          <img src={frame.imageUrl} alt={`HPJM-${frame.code}`} loading="lazy" />
        ) : (
          <div className="hpjm-detail__media-fallback">{frame.code}</div>
        )}
        <div className="hpjm-detail__docs">
          {frame.drawingPdfUrl && (
            <a href={frame.drawingPdfUrl} target="_blank" rel="noopener noreferrer">Drawing PDF ↗</a>
          )}
          {frame.stepUrl && (
            <a href={frame.stepUrl} target="_blank" rel="noopener noreferrer">STEP model ↗</a>
          )}
        </div>
      </div>

      <div className="hpjm-detail__body">
        <div className="hpjm-detail__specs">
          {dims.map((d) => (
            <div key={d.label} className="hpjm-detail__spec">
              <span className="hpjm-detail__spec-label">{d.label}</span>
              <span className="hpjm-detail__spec-value">{d.value}</span>
            </div>
          ))}
        </div>

        {mount.length > 0 && (
          <div className="hpjm-detail__mount">
            {mount.map((m) => (
              <div key={m.label} className="hpjm-detail__mount-row">
                <span className="hpjm-detail__mount-label">{m.label}</span>
                <span className="hpjm-detail__mount-value">{m.value}</span>
              </div>
            ))}
          </div>
        )}

        <div className="hpjm-detail__ratios-wrap">
          <table className="hpjm-ratio-table">
            <thead>
              <tr>
                <th>Gear ratio</th>
                <th>Rated&nbsp;(N·m)</th>
                <th>Max&nbsp;(N·m)</th>
                <th>Impact&nbsp;(N·m)</th>
                <th>Rated&nbsp;(rpm)</th>
                <th>Peak&nbsp;(rpm)</th>
                <th>Backlash&nbsp;(″)</th>
              </tr>
            </thead>
            <tbody>
              {frame.ratios.map((r) => (
                <tr key={r.ratio}>
                  <td>1:{r.ratio}</td>
                  <td>{r.ratedTorqueNm}</td>
                  <td>{r.maxTorqueNm}</td>
                  <td>{r.impactTorqueNm}</td>
                  <td>{r.ratedSpeedRpm}</td>
                  <td>{r.peakSpeedRpm}</td>
                  <td>{r.backlashArcsec}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ---------------- Series request modal (configurator) ----------------

function buildPriceKey(enc: string, brake: string): keyof ShopSeriesBuildPrice {
  return `${enc === 'de' ? 'de' : 'se'}${brake === 'wb' ? 'Wb' : 'Nb'}` as keyof ShopSeriesBuildPrice;
}

function SeriesRequestModal({ product, onClose }: { product: ShopProduct; onClose: () => void }) {
  const series = product.series!;
  const vendorFirst = product.vendor.split(' ')[0];
  const categoryLabel = categoryById(product.category)?.label ?? product.category;

  const [form, setForm] = useState({
    contact_name: '',
    contact_email: '',
    company_name: '',
    frame: series.frames[0].code,
    ratio: String(series.frames[0].ratios[0].ratio),
    encoder: 'se',
    brake: 'nb',
    protocol: 'CAN',
    lowTemp: 'no',
    lh: 'no',
    quantity: '1',
    timeline: TIMELINE_OPTIONS[0],
    notes: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const set = (field: keyof typeof form, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  // Changing the frame resets the ratio to that frame's first option.
  const selectFrame = (code: string) => {
    const f = series.frames.find((x) => x.code === code) ?? series.frames[0];
    setForm((prev) => ({ ...prev, frame: code, ratio: String(f.ratios[0].ratio) }));
  };

  const frame = series.frames.find((f) => f.code === form.frame) ?? series.frames[0];
  const qtyNum = parseInt(form.quantity, 10);
  const validQty = Number.isFinite(qtyNum) && qtyNum >= 1;
  const tierIdx = validQty && qtyNum >= 100 ? 1 : 0;
  const unitPrice = frame.price[buildPriceKey(form.encoder, form.brake)][tierIdx];
  const totalPrice = validQty ? unitPrice * qtyNum : unitPrice;
  const encLabel = form.encoder === 'de' ? series.buildLabels.encoder.de : series.buildLabels.encoder.se;
  const brakeLabel = form.brake === 'wb' ? series.buildLabels.brake.wb : series.buildLabels.brake.nb;
  const tierLabel = tierIdx === 1 ? '100+ units' : '1–99 units';
  const skuBase = series.skuBase ? series.skuBase(frame.code, parseInt(form.ratio, 10)) : '';
  const leadTime =
    validQty && series.leadTimes
      ? series.leadTimes.find((lt) => lt.maxQty == null || qtyNum <= lt.maxQty)?.time ?? ''
      : '';
  const optionSummary = [
    encLabel,
    brakeLabel,
    `${form.protocol} bus`,
    form.lowTemp === 'yes' ? 'Low-temp (−40 °C)' : null,
    form.lh === 'yes' ? 'Left-hand (LH)' : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const handleSubmit = async () => {
    if (!form.contact_name.trim() || !form.contact_email.trim() || !form.company_name.trim()) {
      setError('Name, email, and company are required.');
      return;
    }
    if (!validQty) {
      setError('Quantity must be at least 1.');
      return;
    }
    setError('');
    setSubmitting(true);

    const description =
      `[SHOP REQUEST] ${product.name} — ${categoryLabel}\n` +
      `Vendor: ${product.vendor} (${product.vendorOriginLabel})\n` +
      `Base SKU: ${skuBase || '(confirm with vendor)'}\n` +
      `Configuration: Frame ${frame.code} · Gear ratio 1:${form.ratio} · ${optionSummary}\n` +
      `Quantity: ${qtyNum} (${tierLabel})\n` +
      `Indicative unit price: ${formatPrice(unitPrice, series.currency)}/unit · Est. total: ${formatPrice(totalPrice, series.currency)}\n` +
      (leadTime ? `Est. lead time: ${leadTime}\n` : '') +
      `Timeline: ${form.timeline}\n\n` +
      `Use case / notes:\n${form.notes.trim() || '(none)'}`;

    try {
      await api.post('/custom-requests', {
        request_type: 'equipment',
        component_category: product.category,
        product_slug: product.slug,
        quantity: qtyNum,
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
              Configure your joint motor. Atlas brokers the introduction with {vendorFirst}.
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
                placeholder="Robotics startup, lab, or integrator"
              />
            </div>

            <div className="db-form-row">
              <div className="db-form-field">
                <label className="db-meta-label">Frame size</label>
                <select
                  className="db-form-input"
                  value={form.frame}
                  onChange={(e) => selectFrame(e.target.value)}
                >
                  {series.frames.map((f) => (
                    <option key={f.code} value={f.code}>
                      {f.code} · OD {f.odMm} mm
                    </option>
                  ))}
                </select>
              </div>
              <div className="db-form-field">
                <label className="db-meta-label">Gear ratio</label>
                <select
                  className="db-form-input"
                  value={form.ratio}
                  onChange={(e) => set('ratio', e.target.value)}
                >
                  {frame.ratios.map((r) => (
                    <option key={r.ratio} value={String(r.ratio)}>
                      1:{r.ratio} · {r.ratedTorqueNm} N·m
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="db-form-row">
              <div className="db-form-field">
                <label className="db-meta-label">Encoder</label>
                <div className="eq-bundle-options" role="radiogroup" aria-label="Encoder">
                  {(['se', 'de'] as const).map((k) => (
                    <button
                      type="button"
                      key={k}
                      role="radio"
                      aria-checked={form.encoder === k}
                      className={`eq-bundle-option ${form.encoder === k ? 'eq-bundle-option--active' : ''}`}
                      onClick={() => set('encoder', k)}
                    >
                      <span className="eq-bundle-option__label">
                        {k === 'se' ? series.buildLabels.encoder.se : series.buildLabels.encoder.de}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="db-form-field">
                <label className="db-meta-label">Brake</label>
                <div className="eq-bundle-options" role="radiogroup" aria-label="Brake">
                  {(['nb', 'wb'] as const).map((k) => (
                    <button
                      type="button"
                      key={k}
                      role="radio"
                      aria-checked={form.brake === k}
                      className={`eq-bundle-option ${form.brake === k ? 'eq-bundle-option--active' : ''}`}
                      onClick={() => set('brake', k)}
                    >
                      <span className="eq-bundle-option__label">
                        {k === 'nb' ? series.buildLabels.brake.nb : series.buildLabels.brake.wb}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="db-form-row">
              <div className="db-form-field">
                <label className="db-meta-label">Protocol</label>
                <select
                  className="db-form-input"
                  value={form.protocol}
                  onChange={(e) => set('protocol', e.target.value)}
                >
                  <option value="CAN">CAN</option>
                  <option value="EtherCAT">EtherCAT</option>
                  <option value="CANopen">CANopen</option>
                </select>
              </div>
              <div className="db-form-field">
                <label className="db-meta-label">Options</label>
                <div className="eq-bundle-options" role="group" aria-label="Build options">
                  <button
                    type="button"
                    aria-pressed={form.lowTemp === 'yes'}
                    className={`eq-bundle-option ${form.lowTemp === 'yes' ? 'eq-bundle-option--active' : ''}`}
                    onClick={() => set('lowTemp', form.lowTemp === 'yes' ? 'no' : 'yes')}
                  >
                    <span className="eq-bundle-option__label">Low-temp (−40 °C)</span>
                  </button>
                  <button
                    type="button"
                    aria-pressed={form.lh === 'yes'}
                    className={`eq-bundle-option ${form.lh === 'yes' ? 'eq-bundle-option--active' : ''}`}
                    onClick={() => set('lh', form.lh === 'yes' ? 'no' : 'yes')}
                  >
                    <span className="eq-bundle-option__label">Left-hand (LH)</span>
                  </button>
                </div>
              </div>
            </div>

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
                <label className="db-meta-label">Requested timeline</label>
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

            <div className="hpjm-price-box">
              {skuBase && (
                <>
                  <div className="hpjm-price-box__row">
                    <span className="hpjm-price-box__label">Base SKU</span>
                    <span className="hpjm-price-box__sku">{skuBase}</span>
                  </div>
                  <div className="hpjm-price-box__divider" />
                </>
              )}
              <div className="hpjm-price-box__row">
                <span className="hpjm-price-box__label">
                  Unit price<em>{tierLabel}</em>
                </span>
                <span className="hpjm-price-box__unit">
                  {formatPrice(unitPrice, series.currency)}<span className="hpjm-price-box__per">/unit</span>
                </span>
              </div>
              <div className="hpjm-price-box__divider" />
              <div className="hpjm-price-box__row hpjm-price-box__row--total">
                <span className="hpjm-price-box__label">
                  Estimated total<em>{validQty ? qtyNum : 1} unit{validQty && qtyNum > 1 ? 's' : ''}</em>
                </span>
                <span className="hpjm-price-box__total">
                  {formatPrice(totalPrice, series.currency)}
                </span>
              </div>
              {leadTime && (
                <>
                  <div className="hpjm-price-box__divider" />
                  <div className="hpjm-price-box__row">
                    <span className="hpjm-price-box__label">Est. lead time</span>
                    <span className="hpjm-price-box__unit">{leadTime}</span>
                  </div>
                </>
              )}
            </div>

            <div className="db-form-field">
              <label className="db-meta-label">Use case / notes</label>
              <textarea
                className="db-form-input db-form-input--textarea"
                rows={4}
                value={form.notes}
                onChange={(e) => set('notes', e.target.value)}
                placeholder={`Which humanoid joint / platform? Any protocol (CAN/EtherCAT), low-temp, or left-hand build needs to flag to ${vendorFirst}?`}
              />
            </div>

            <button className="db-add-cart-btn" onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit Request →'}
            </button>

            <div className="eq-modal-footnote">
              Atlas will review your request and make the necessary introductions to the supplier.
            </div>
          </>
        )}
      </div>
    </div>
  );
}
