import type { Metadata } from "next";
import { ProductCard } from "@/components/cross/ProductCard";
import { defaultLocale, getDictionary, isLocale } from "@/i18n";
import { getStorefrontProducts, safe } from "@/lib/cross/api";

export const revalidate = 300;

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const loc = isLocale(locale) ? locale : defaultLocale;
  const dict = getDictionary(loc);
  return {
    title: dict.products.title,
    alternates: {
      canonical: `/${loc}/products`,
      languages: { en: "/en/products", zh: "/zh/products" },
    },
  };
}

/** 产品列表页: 服务端拉目录, fetchFail → 空态降级。 */
export default async function ProductsPage({ params }: Props) {
  const { locale } = await params;
  const loc = isLocale(locale) ? locale : defaultLocale;
  const dict = getDictionary(loc);

  const products = await safe(getStorefrontProducts(loc), []);
  // 精选置顶, 其余按目录顺序
  const sorted = [...products].sort(
    (a, b) => Number(b.featured ?? false) - Number(a.featured ?? false),
  );

  return (
    <section className="container py-14">
      <h1 className="font-display text-3xl font-bold text-strong">
        {dict.products.title}
      </h1>
      <p className="mt-2 text-sm text-muted">{dict.products.subtitle}</p>

      {sorted.length === 0 ? (
        <p className="mt-10 rounded-xl border border-line bg-alt p-12 text-center text-sm text-muted">
          {dict.products.empty}
        </p>
      ) : (
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {sorted.map((p) => (
            <ProductCard key={p.storefront_product_id} product={p} locale={loc} dict={dict} />
          ))}
        </div>
      )}
    </section>
  );
}
