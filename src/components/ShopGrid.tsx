import { useMemo, useState } from 'react';
import { type ShopProduct } from '../data/shopCatalog';
import ShopCard from './ShopCard';

// 'featured' keeps taxonomy/insertion order. 'verified' from the design brief is
// deferred until products carry a verification flag; sort is structured so
// spec-based keys (e.g. torque range) can be added here later.
type SortKey = 'featured' | 'name' | 'country';

interface Props {
  categoryLabel: string;
  products: ShopProduct[];
}

export default function ShopGrid({ categoryLabel, products }: Props) {
  const [query, setQuery] = useState('');
  const [country, setCountry] = useState('all');
  const [sort, setSort] = useState<SortKey>('featured');

  const countries = useMemo(() => {
    const map = new Map<string, string>();
    products.forEach((p) => map.set(p.vendorOrigin, p.vendorOriginLabel));
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [products]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const out = products.filter((p) => {
      if (country !== 'all' && p.vendorOrigin !== country) return false;
      if (q) {
        const hay = `${p.name} ${p.vendor}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    if (sort === 'name') {
      out.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sort === 'country') {
      out.sort((a, b) => {
        const cmp = a.vendorOriginLabel.localeCompare(b.vendorOriginLabel);
        return cmp !== 0 ? cmp : a.name.localeCompare(b.name);
      });
    }
    return out;
  }, [products, query, country, sort]);

  const clearFilters = () => {
    setQuery('');
    setCountry('all');
    setSort('featured');
  };

  return (
    <div className="shop-grid-page">
      <header className="shop-grid-page__header">
        <h1 className="shop-grid-page__title">{categoryLabel}</h1>
      </header>

      <div className="shop-filter-row">
        <div className="shop-search-wrap">
          <svg className="shop-search-icon" viewBox="0 0 16 16" fill="none" aria-hidden>
            <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.4" />
            <path d="M10.5 10.5 14 14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          <input
            className="shop-search"
            type="search"
            placeholder="Search product or supplier"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <select
          className="shop-select"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          aria-label="Country"
        >
          <option value="all">All countries</option>
          {countries.map(([code, label]) => (
            <option key={code} value={code}>{label}</option>
          ))}
        </select>

        <select
          className="shop-select shop-select--sort"
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          aria-label="Sort"
        >
          <option value="featured">Sort: Featured</option>
          <option value="name">Sort: A → Z</option>
          <option value="country">Sort: Country</option>
        </select>
      </div>

      <div className="shop-result-count">
        Showing {filtered.length} of {products.length} products
      </div>

      {filtered.length === 0 ? (
        <div className="shop-empty">
          <p>No products match these filters.</p>
          <button className="shop-btn shop-btn--ghost" onClick={clearFilters}>
            Clear filters
          </button>
        </div>
      ) : (
        <div className="shop-card-grid">
          {filtered.map((p) => (
            <ShopCard key={p.slug} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
