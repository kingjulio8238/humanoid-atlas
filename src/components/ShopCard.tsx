import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  type ShopProduct,
  categoryById,
  formatPrice,
} from '../data/shopCatalog';

function isVideo(url?: string): boolean {
  return !!url && /\.(mp4|webm|mov)$/i.test(url);
}

// Card media: a mini-carousel over the product's gallery. Single-image products
// render one slide; video products (e.g. Xsens) show their still poster on the card.
function CardMedia({ product }: { product: ShopProduct }) {
  const categoryLabel = (categoryById(product.category)?.label ?? product.category).toUpperCase();
  // cardImages (photos) take precedence and fill the card (cover); gallery
  // renders (usually transparent) float (contain).
  const cardImages = product.cardImages && product.cardImages.length > 0 ? product.cardImages : null;
  const gallerySrc = product.gallery && product.gallery.length > 0 ? product.gallery : null;
  const images = cardImages ?? gallerySrc;
  const cover = !!cardImages;
  const single = product.posterUrl || product.imageUrl;
  const [i, setI] = useState(0);

  // Single-slide fallbacks (no carousel controls).
  if (!images) {
    return (
      <div className="shop-card__media">
        {isVideo(single) && !product.posterUrl ? (
          <video
            src={single}
            muted
            loop
            playsInline
            poster={product.posterUrl}
            onError={(e) => hideAndFallback(e.currentTarget)}
          />
        ) : single ? (
          <img
            src={product.posterUrl || single}
            alt={product.name}
            loading="lazy"
            className={product.posterUrl ? 'is-cover' : undefined}
            onError={(e) => hideAndFallback(e.currentTarget)}
          />
        ) : null}
        <div className="shop-card__media-fallback" style={{ display: single ? 'none' : 'flex' }}>
          {categoryLabel}
        </div>
      </div>
    );
  }

  const n = images.length;
  const go = (d: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setI((c) => (c + d + n) % n);
  };
  const dotTo = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setI(idx);
  };

  return (
    <div className="shop-card__media">
      <div className="shop-card-carousel">
        {images.map((src, idx) => (
          <img
            key={src}
            src={src}
            alt={`${product.name} view ${idx + 1}`}
            loading={idx === 0 ? 'eager' : 'lazy'}
            className={`shop-card-carousel__img ${idx === i ? 'is-active' : ''} ${cover ? 'is-cover' : ''}`}
          />
        ))}

        {n > 1 && (
          <>
            <button
              type="button"
              className="shop-card-carousel__nav shop-card-carousel__nav--prev"
              onClick={(e) => go(-1, e)}
              aria-label="Previous image"
              tabIndex={-1}
            >
              ‹
            </button>
            <button
              type="button"
              className="shop-card-carousel__nav shop-card-carousel__nav--next"
              onClick={(e) => go(1, e)}
              aria-label="Next image"
              tabIndex={-1}
            >
              ›
            </button>
            <div className="shop-card-carousel__dots">
              {images.map((src, idx) => (
                <button
                  type="button"
                  key={src}
                  className={`shop-card-carousel__dot ${idx === i ? 'is-active' : ''}`}
                  onClick={(e) => dotTo(idx, e)}
                  aria-label={`Go to image ${idx + 1}`}
                  aria-current={idx === i}
                  tabIndex={-1}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function hideAndFallback(el: HTMLElement) {
  el.style.display = 'none';
  const sib = el.nextElementSibling as HTMLElement | null;
  if (sib) sib.style.display = 'flex';
}

export default function ShopCard({ product }: { product: ShopProduct }) {
  const navigate = useNavigate();
  const category = categoryById(product.category);
  const detailPath = `/shop/${category?.slug ?? product.category}/${product.slug}`;
  const goToDetail = () => navigate(detailPath);

  return (
    <article
      className="shop-card"
      onClick={goToDetail}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          goToDetail();
        }
      }}
    >
      <CardMedia product={product} />

      <div className="shop-card__body">
        <div className="shop-card__vendor">{product.vendor}</div>
        <h3 className="shop-card__name">{product.name}</h3>
        <div className="shop-card__sub-row">
          <span className="shop-card__origin">{product.vendorOriginLabel}</span>
          <span className="shop-card__price">
            {product.series
              ? `From ${formatPrice(product.series.fromPrice, product.series.currency)}`
              : formatPrice(product.listPrice, product.currency)}
          </span>
        </div>
        <button
          className="shop-card__cta"
          onClick={(e) => {
            e.stopPropagation();
            goToDetail();
          }}
        >
          Place Request
        </button>
      </div>
    </article>
  );
}
