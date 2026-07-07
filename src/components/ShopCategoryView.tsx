import {
  categoryBySlug,
  productsByCategory,
  productBySlug,
} from '../data/shopCatalog';
import ProductDetail from './ProductDetail';
import ShopGrid from './ShopGrid';

interface Props {
  categorySlug: string;
  productSlug: string | null;
}

// Category view resolution:
//  - explicit product slug in the URL  -> that product's detail page
//  - category with exactly 1 product   -> that product's detail page (no grid)
//  - category with >1 product          -> filterable card grid
export default function ShopCategoryView({ categorySlug, productSlug }: Props) {
  const category = categoryBySlug(categorySlug);
  if (!category) {
    return <div className="shop-coming-soon">CATEGORY NOT FOUND</div>;
  }

  const products = productsByCategory(category.id);
  if (products.length === 0) {
    return <div className="shop-coming-soon">COMING SOON</div>;
  }

  if (productSlug) {
    const product = productBySlug(category.id, productSlug);
    if (product) return <ProductDetail product={product} />;
    // Unknown product slug -> fall through to the category view.
  }

  if (products.length === 1) {
    return <ProductDetail product={products[0]} />;
  }

  return <ShopGrid categoryLabel={category.label} products={products} />;
}
