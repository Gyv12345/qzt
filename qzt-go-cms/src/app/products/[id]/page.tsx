import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
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
      <nav className="mb-6 text-sm text-faint">
        <Link href="/products" className="no-underline hover:text-brandtext">
          产品
        </Link>
        <span className="mx-2">/</span>
        <span className="text-normal">{product.name}</span>
      </nav>

      <article>
        <header className="mb-6">
          <div className="flex items-center gap-3">
            <span className="rounded-md bg-brand-500/10 px-2.5 py-1 text-xs font-medium text-brandtext">
              {product.category || "产品"}
            </span>
            {product.product_no && <span className="text-sm text-faint">编号: {product.product_no}</span>}
          </div>
          <h1 className="mt-3 font-display text-3xl font-bold text-strong sm:text-4xl">{product.name}</h1>
          {Number(product.standard_price) > 0 && (
            <p className="mt-3 font-display text-2xl font-bold text-accent-dark">
              ¥ {product.standard_price} <span className="text-base font-normal text-faint">/ {product.unit || "件"}</span>
            </p>
          )}
        </header>

        {product.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image_url}
            alt={product.name}
            className="mb-8 aspect-video w-full rounded-xl border border-line object-cover shadow-card"
          />
        )}

        {product.description && (
          <div className="prose-content max-w-none">
            <h2>产品介绍</h2>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{product.description}</ReactMarkdown>
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
