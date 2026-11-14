import type { Metadata } from "next";
import { InquiryPreselect } from "@/components/cross/InquiryPreselect";
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
    title: dict.inquiry.title,
    alternates: {
      canonical: `/${loc}/inquiry`,
      languages: { en: "/en/inquiry", zh: "/zh/inquiry" },
    },
  };
}

/**
 * 询盘页: 静态导出后服务端不可读 searchParams, ?product/?products 预选解析
 * 全部移到客户端(InquiryPreselect, useSearchParams + Suspense 边界)。
 */
export default async function InquiryPage({ params }: Props) {
  const { locale } = await params;
  const loc = isLocale(locale) ? locale : defaultLocale;
  const dict = getDictionary(loc);

  return (
    <section className="container max-w-2xl py-14">
      <h1 className="font-display text-3xl font-bold text-strong">
        {dict.inquiry.title}
      </h1>
      <p className="mb-8 mt-2 text-sm text-muted">{dict.inquiry.subtitle}</p>
      <InquiryPreselect locale={loc} dict={dict} />
    </section>
  );
}
