import type { Metadata } from "next";
import { defaultLocale, getDictionary, isLocale } from "@/i18n";
import { BRAND, SITE } from "@/lib/cross/site";

export const revalidate = 300;

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const loc = isLocale(locale) ? locale : defaultLocale;
  const dict = getDictionary(loc);
  return {
    title: dict.about.title,
    alternates: {
      canonical: `/${loc}/about`,
      languages: { en: "/en/about", zh: "/zh/about" },
    },
  };
}

/** 关于页: 静态 i18n 文案, 服务端注入 Organization 级 JSON-LD。 */
export default async function AboutPage({ params }: Props) {
  const { locale } = await params;
  const loc = isLocale(locale) ? locale : defaultLocale;
  const dict = getDictionary(loc);

  const org = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: BRAND,
    url: `${SITE.url}/${loc}/about`,
    description: dict.about.paragraphs[0],
  };

  return (
    <section className="container max-w-3xl py-14">
      <h1 className="font-display text-3xl font-bold text-strong">
        {dict.about.title}
      </h1>
      <p className="mt-2 text-sm text-muted">{dict.about.subtitle}</p>
      <div className="mt-8 space-y-5 text-sm leading-relaxed text-normal">
        {dict.about.paragraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(org) }}
      />
    </section>
  );
}
