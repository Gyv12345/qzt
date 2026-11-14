import type { Metadata } from "next";
import Link from "next/link";
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
    title: dict.home.hero.title,
    alternates: {
      canonical: `/${loc}`,
      languages: { en: "/en", zh: "/zh" },
    },
  };
}

/** 首页: hero + 精选产品(fetchFail 降级空态) + 价值主张 + 询盘 CTA。 */
export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  const loc = isLocale(locale) ? locale : defaultLocale;
  const dict = getDictionary(loc);

  // 后端不可达 → 空数组 → 精选区块渲染空态文案, 不炸整页
  const products = await safe(getStorefrontProducts(loc), []);
  const featured = products.filter((p) => p.featured);
  const shown = (featured.length > 0 ? featured : products).slice(0, 8);

  return (
    <>
      {/* hero */}
      <section className="border-b border-line bg-alt">
        <div className="container py-20 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-700">
            {dict.home.hero.badge}
          </p>
          <h1 className="mx-auto mt-4 max-w-2xl font-display text-4xl font-bold leading-tight text-strong sm:text-5xl">
            {dict.home.hero.title}
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted">
            {dict.home.hero.subtitle}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href={`/${loc}/products`} className="btn-primary">
              {dict.home.hero.ctaPrimary}
            </Link>
            <Link href={`/${loc}/inquiry`} className="btn-outline">
              {dict.home.hero.ctaSecondary}
            </Link>
          </div>
        </div>
      </section>
      {/* 精选产品 */}
      <section className="container py-16">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold text-strong">
              {dict.home.featured.title}
            </h2>
            <p className="mt-1 text-sm text-muted">{dict.home.featured.subtitle}</p>
          </div>
          <Link
            href={`/${loc}/products`}
            className="hidden text-sm font-medium text-brand-700 no-underline hover:underline sm:block"
          >
            {dict.home.featured.viewAll} →
          </Link>
        </div>

        {shown.length === 0 ? (
          <p className="mt-10 rounded-xl border border-line bg-alt p-10 text-center text-sm text-muted">
            {dict.home.featured.empty}
          </p>
        ) : (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {shown.map((p) => (
              <ProductCard key={p.storefront_product_id} product={p} locale={loc} dict={dict} />
            ))}
          </div>
        )}
      </section>
      {/* 价值主张 */}
      <section className="bg-alt py-16">
        <div className="container">
          <h2 className="text-center font-display text-2xl font-bold text-strong">
            {dict.home.values.title}
          </h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {dict.home.values.items.map((v) => (
              <div
                key={v.title}
                className="rounded-xl border border-line bg-surface p-6 shadow-card"
              >
                <h3 className="font-display text-base font-bold text-strong">{v.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 询盘 CTA */}
      <section className="container py-16 text-center">
        <h2 className="font-display text-2xl font-bold text-strong">
          {dict.home.cta.title}
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-muted">
          {dict.home.cta.desc}
        </p>
        <Link href={`/${loc}/inquiry`} className="btn-primary mt-8">
          {dict.home.cta.button}
        </Link>
      </section>
    </>
  );
}
