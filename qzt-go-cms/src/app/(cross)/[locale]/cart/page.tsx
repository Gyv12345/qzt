import type { Metadata } from "next";
import { Suspense } from "react";
import { CartView } from "@/components/cross/CartView";
import { defaultLocale, getDictionary, isLocale } from "@/i18n";

export const revalidate = 300;

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const loc = isLocale(locale) ? locale : defaultLocale;
  const dict = getDictionary(loc);
  return {
    title: dict.cart.title,
    alternates: {
      canonical: `/${loc}/cart`,
      languages: { en: "/en/cart", zh: "/zh/cart" },
    },
  };
}

/**
 * 购物车页: 交互全部在 CartView(client), 本页只供字典与 locale。
 * CartView 内用 useSearchParams 读 ?canceled=1(支付取消回跳),
 * 静态导出下 useSearchParams 必须包 Suspense 边界。
 */
export default async function CartPage({ params }: Props) {
  const { locale } = await params;
  const loc = isLocale(locale) ? locale : defaultLocale;
  const dict = getDictionary(loc);

  return (
    <section className="container py-14">
      <h1 className="mb-8 font-display text-3xl font-bold text-strong">
        {dict.cart.title}
      </h1>
      <Suspense fallback={<div className="py-16 text-center text-sm text-muted">{dict.checkout.loading}</div>}>
        <CartView locale={loc} dict={dict} />
      </Suspense>
    </section>
  );
}
