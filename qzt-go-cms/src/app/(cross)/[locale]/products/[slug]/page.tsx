import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Description } from "@/components/cross/Description";
import { ProductActions } from "@/components/cross/ProductActions";
import { defaultLocale, getDictionary, isLocale } from "@/i18n";
import {
  getStorefrontProduct,
  getStorefrontProducts,
  safe,
  type StorefrontProduct,
} from "@/lib/cross/api";
import { BRAND, SITE } from "@/lib/cross/site";

export const revalidate = 300;

interface Props {
  params: Promise<{ locale: string; slug: string }>;
}

/**
 * 预生成已知 slug 的静态页。
 * ⚠️ Next 15 硬约束: output:export 下 generateStaticParams 解析为空数组会直接
 * 构建报错(无法软降级), 空目录时抛出可读错误: 构建需先启动后端(make run)。
 */
export async function generateStaticParams() {
  const products = await safe(getStorefrontProducts("en"), []);
  if (products.length === 0) {
    throw new Error(
      "静态导出失败: 构建期拉取不到产品目录(NEXT_PUBLIC_API_BASE 后端不可达或目录为空)。请先启动 qzt-go-server(make run)再构建。",
    );
  }
  return products.map((p) => ({ slug: encodeURIComponent(p.slug) }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const loc = isLocale(locale) ? locale : defaultLocale;
  const dict = getDictionary(loc);
  let p: StorefrontProduct | null = null;
  try {
    p = await getStorefrontProduct(decodeURIComponent(slug), loc);
  } catch {
    p = null;
  }
  if (!p) return { title: dict.products.title };
  return {
    title: p.name,
    description: p.mysummary || p.summary || undefined,
    alternates: {
      canonical: `/${loc}/products/${encodeURIComponent(p.slug)}`,
      // GEO: 给 AI 搜索引擎的 Markdown 镜像入口
      types: { "text/markdown": `/md/products/${encodeURIComponent(p.slug)}` },
      languages: {
        en: `/en/products/${encodeURIComponent(p.slug)}`,
        zh: `/zh/products/${encodeURIComponent(p.slug)}`,
      },
    },
    openGraph: {
      title: p.name,
      images: p.image_url ? [p.image_url] : undefined,
    },
  };
}
export default async function ProductDetailPage({ params }: Props) {
  const { locale, slug } = await params;
  const loc = isLocale(locale) ? locale : defaultLocale;
  const dict = getDictionary(loc);

  let product: StorefrontProduct;
  try {
    product = await getStorefrontProduct(decodeURIComponent(slug), loc);
  } catch {
    notFound(); // 详情拉不到 → 404(由 [locale]/not-found 兜底)
  }

  const firstSku = product.skus?.[0];
  const detailUrl = `${SITE.url}/${loc}/products/${encodeURIComponent(product.slug)}`;
  const blurb =
    product.mysummary ||
    product.summary ||
    product.description?.split(/\n{2,}/)[0] ||
    product.name;

  return (
    <section className="container py-12">
      <nav className="mb-8 text-sm text-faint" aria-label="Breadcrumb">
        <Link href={`/${loc}/products`} className="no-underline hover:text-brand-700">
          {dict.product.back}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-normal">{product.name}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2">
        <div className="overflow-hidden rounded-xl border border-line bg-alt">
          {product.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.image_url}
              alt={product.name}
              className="aspect-square w-full object-cover"
            />
          ) : (
            <div className="grid aspect-square w-full place-items-center font-display text-6xl font-bold text-faint">
              X
            </div>
          )}
        </div>
        <div>
          <h1 className="font-display text-3xl font-bold leading-tight text-strong">
            {product.name}
          </h1>
          {(product.mysummary || product.summary) && (
            <p className="mt-3 text-sm leading-relaxed text-muted">
              {product.mysummary || product.summary}
            </p>
          )}
          <div className="mt-6">
            <ProductActions product={product} locale={loc} dict={dict} />
          </div>
        </div>
      </div>
      {/* SKU 明细表(有规格时展示, 同时给搜索引擎可抓取的规格文本) */}
      {product.skus && product.skus.length > 0 && (
        <div className="mt-12">
          <h2 className="mb-4 font-display text-xl font-bold text-strong">
            {dict.product.selectSku}
          </h2>
          <div className="overflow-hidden rounded-xl border border-line">
            <table className="w-full text-sm">
              <tbody>
                {product.skus.map((s, i) => (
                  <tr key={s.id} className={i % 2 ? "bg-alt" : ""}>
                    <td className="px-4 py-2.5 font-medium text-strong">{s.spec}</td>
                    <td className="px-4 py-2.5 text-muted">{s.sku_no || `#${s.id}`}</td>
                    <td className="px-4 py-2.5 text-right">
                      {s.in_stock ? (
                        <span className="text-brand-700">{dict.product.inStock}</span>
                      ) : (
                        <span className="text-faint">{dict.product.outOfStock}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {product.description && (
        <div className="mt-12 max-w-3xl">
          <h2 className="mb-4 font-display text-xl font-bold text-strong">
            {dict.product.description}
          </h2>
          <Description text={product.description} />
        </div>
      )}
      {/* Product JSON-LD: sku 取首规格 sku_no; offers.priceCurrency 用商品
          currency 字段(非硬编码); price_source=none 时不输出 offers(不虚构价格) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: product.name,
            description: blurb,
            ...(firstSku?.sku_no ? { sku: firstSku.sku_no } : {}),
            brand: { "@type": "Brand", name: BRAND },
            ...(product.image_url ? { image: [product.image_url] } : {}),
            ...(product.price_source !== "none" && product.price != null
              ? {
                  offers: {
                    "@type": "Offer",
                    price: String(product.price),
                    priceCurrency: product.currency || "USD",
                    availability: product.in_stock
                      ? "https://schema.org/InStock"
                      : "https://schema.org/OutOfStock",
                    url: detailUrl,
                  },
                }
              : {}),
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: dict.nav.home,
                item: `${SITE.url}/${loc}`,
              },
              {
                "@type": "ListItem",
                position: 2,
                name: dict.nav.products,
                item: `${SITE.url}/${loc}/products`,
              },
              {
                "@type": "ListItem",
                position: 3,
                name: product.name,
                item: detailUrl,
              },
            ],
          }),
        }}
      />
    </section>
  );
}
