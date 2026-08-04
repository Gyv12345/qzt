import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProducts, getProduct } from "@/lib/api";

export const revalidate = 300;

interface Props {
  params: Promise<{ id: string }>;
}

/** 预生成常见产品详情静态页, 其余按需 ISR。 */
export async function generateStaticParams() {
  try {
    const { list } = await getProducts({ page_size: 50 });
    return list.map((p) => ({ id: String(p.id) }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const p = await getProduct(id);
    return {
      title: p.name,
      description: p.description || p.name,
      alternates: {
        canonical: `/products/${id}`,
        types: { "text/markdown": `/md/products/${id}` },
      },
      openGraph: { title: p.name, description: p.description || p.name, type: "article" },
    };
  } catch {
    return { title: "产品详情" };
  }
}

export default async function ProductDetailPage({ params }: Props) {
  const { id } = await params;
  let product;
  try {
    product = await getProduct(id);
  } catch {
    notFound();
  }

  return (
    <section className="container py-16">
      <nav className="mb-6 text-sm text-ink-400">
        <Link href="/products" className="no-underline hover:text-brand-700">
          产品
        </Link>
        <span className="mx-2">/</span>
        <span className="text-ink-600">{product.name}</span>
      </nav>

      <article>
        <header className="mb-6">
          <div className="flex items-center gap-3">
            <span className="rounded-md bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700">
              {product.category || "产品"}
            </span>
            {product.product_no && <span className="text-sm text-ink-400">编号: {product.product_no}</span>}
          </div>
          <h1 className="mt-3 font-display text-3xl font-bold text-ink-900 sm:text-4xl">{product.name}</h1>
          {Number(product.standard_price) > 0 && (
            <p className="mt-3 font-display text-2xl font-bold text-accent-dark">
              ¥ {product.standard_price} <span className="text-base font-normal text-ink-400">/ {product.unit || "件"}</span>
            </p>
          )}
        </header>

        {product.description && (
          <div className="prose-content max-w-none">
            <h2>产品介绍</h2>
            <p>{product.description}</p>
          </div>
        )}

        {product.prices && product.prices.length > 0 && (
          <div className="mt-10">
            <h2 className="mb-4 font-display text-xl font-bold text-ink-900">价格方案</h2>
            <div className="overflow-hidden rounded-xl border border-ink-100 shadow-card">
              <table className="w-full text-sm">
                <thead className="bg-ink-50 text-left text-ink-600">
                  <tr>
                    <th className="px-4 py-3 font-medium">价格类型</th>
                    <th className="px-4 py-3 font-medium">价格</th>
                    <th className="px-4 py-3 font-medium">起购数量</th>
                    <th className="px-4 py-3 font-medium">备注</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {product.prices.map((pr) => (
                    <tr key={pr.id} className="transition-colors hover:bg-brand-50/40">
                      <td className="px-4 py-3 font-medium text-ink-900">{pr.price_type}</td>
                      <td className="px-4 py-3 font-semibold text-accent-dark">¥ {pr.price}</td>
                      <td className="px-4 py-3 text-ink-500">{pr.min_quantity ?? "—"}</td>
                      <td className="px-4 py-3 text-ink-500">{pr.remark || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </article>

      {/* 产品结构化数据, 利于搜索引擎富结果 */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: product.name,
            description: product.description,
            sku: product.product_no,
            category: product.category,
            ...(Number(product.standard_price) > 0 && {
              offers: {
                "@type": "Offer",
                price: product.standard_price,
                priceCurrency: "CNY",
              },
            }),
          }),
        }}
      />
    </section>
  );
}
