import type { Metadata } from "next";
import { Suspense } from "react";
import { CheckoutSuccess } from "@/components/cross/CheckoutSuccess";
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
    title: dict.checkout.successTitle,
    // 回跳页不进索引(一次性的支付结果页)
    robots: { index: false, follow: false },
    alternates: {
      canonical: `/${loc}/checkout/success`,
      languages: {
        en: "/en/checkout/success",
        zh: "/zh/checkout/success",
      },
    },
  };
}

/**
 * Stripe 支付成功回跳页(/checkout/success?session_id=...)。
 * 纯静态导出: 无服务端 API/middleware 依赖, session_id 由客户端
 * useSearchParams 读取(必须包 Suspense 边界, 见 CheckoutSuccess 注释)。
 */
export default async function CheckoutSuccessPage({ params }: Props) {
  const { locale } = await params;
  const loc = isLocale(locale) ? locale : defaultLocale;
  const dict = getDictionary(loc);

  return (
    <section className="container py-14">
      <Suspense
        fallback={
          <div className="py-16 text-center text-sm text-muted">
            {dict.checkout.loading}
          </div>
        }
      >
        <CheckoutSuccess locale={loc} dict={dict} />
      </Suspense>
    </section>
  );
}
