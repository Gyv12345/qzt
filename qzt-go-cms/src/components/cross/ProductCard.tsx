import Link from "next/link";
import type { Dict } from "@/i18n";
import type { StorefrontProduct } from "@/lib/cross/api";
import { PriceTag } from "./PriceTag";

/** 产品卡片(列表/首页精选共用): 图 + 名 + 价 + 库存徽章。 */
export function ProductCard({
  product,
  locale,
  dict,
}: {
  product: StorefrontProduct;
  locale: string;
  dict: Dict;
}) {
  return (
    <Link
      href={`/${locale}/products/${encodeURIComponent(product.slug)}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-card transition hover:-translate-y-0.5 hover:shadow-card-hover"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-alt">
        {product.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image_url}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition group-hover:scale-[1.03]"
          />
        ) : (
          <div className="grid h-full w-full place-items-center font-display text-4xl font-bold text-faint">
            X
          </div>
        )}
        {product.featured && (
          <span className="absolute left-3 top-3 rounded-md bg-brand-600 px-2 py-0.5 text-xs font-semibold text-white">
            {dict.products.featured}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-2 text-sm font-semibold text-strong group-hover:text-brand-700">
          {product.name}
        </h3>
        <p className="line-clamp-2 text-xs text-muted">
          {product.mysummary || product.summary}
        </p>
        <div className="mt-auto flex items-center justify-between pt-1">
          <PriceTag product={product} dict={dict} />
          <span
            className={`text-xs ${product.in_stock ? "text-brand-700" : "text-faint"}`}
          >
            {product.in_stock ? dict.products.inStock : dict.products.outOfStock}
          </span>
        </div>
      </div>
    </Link>
  );
}
