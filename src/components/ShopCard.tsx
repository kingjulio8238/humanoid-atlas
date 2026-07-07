import { useNavigate } from 'react-router-dom';
import {
  type ShopProduct,
  categoryById,
  formatPrice,
} from '../data/shopCatalog';

function isVideo(url?: string): boolean {
  return !!url && /\.(mp4|webm|mov)$/i.test(url);
}

export default function ShopCard({ product }: { product: ShopProduct }) {
  const navigate = useNavigate();
  const category = categoryById(product.category);
  const detailPath = `/shop/${category?.slug ?? product.category}/${product.slug}`;
  const goToDetail = () => navigate(detailPath);
  const media = product.imageUrl;

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
      <div className="shop-card__media">
        {isVideo(media) ? (
          <video
            src={media}
            muted
            loop
            playsInline
            onError={(e) => {
              (e.currentTarget as HTMLVideoElement).style.display = 'none';
              const sib = e.currentTarget.nextElementSibling as HTMLElement | null;
              if (sib) sib.style.display = 'flex';
            }}
          />
        ) : media ? (
          <img
            src={media}
            alt={product.name}
            loading="lazy"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
              const sib = e.currentTarget.nextElementSibling as HTMLElement | null;
              if (sib) sib.style.display = 'flex';
            }}
          />
        ) : null}
        <div
          className="shop-card__media-fallback"
          style={{ display: media && !isVideo(media) ? 'none' : media ? 'none' : 'flex' }}
        >
          {(category?.label ?? product.category).toUpperCase()}
        </div>
      </div>

      <div className="shop-card__body">
        <div className="shop-card__vendor">{product.vendor}</div>
        <h3 className="shop-card__name">{product.name}</h3>
        <div className="shop-card__sub-row">
          <span className="shop-card__origin">{product.vendorOriginLabel}</span>
          <span className="shop-card__price">
            {formatPrice(product.listPrice, product.currency)}
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
