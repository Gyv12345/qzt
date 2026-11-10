import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { SERVICES, getService } from "@/lib/services";
import { SITE } from "@/lib/site";
import { PageHeader } from "@/components/PageHeader";

interface Props {
  params: Promise<{ slug: string }>;
}

/** 预生成全部服务详情页。 */
export function generateStaticParams() {
  return SERVICES.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const service = getService(slug);
  if (!service) return { title: "服务详情" };
  return {
    title: service.title,
    description: service.description,
    alternates: { canonical: `/services/${slug}` },
    openGraph: { title: service.title, description: service.description, type: "article" },
  };
}

/** /services/[slug] — 服务落地页 (GEO): 问题式分节 + Service/FAQPage/BreadcrumbList 结构化数据。 */
export default async function ServicePage({ params }: Props) {
  const { slug } = await params;
  const service = getService(slug);
  if (!service) notFound();

  const provider = {
    "@type": "Organization",
    name: "河南爱编程网络科技有限公司",
    url: SITE.url,
  };

  const serviceLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: service.serviceType,
    description: service.description,
    serviceType: service.serviceType,
    provider,
    areaServed: { "@type": "Country", name: "中国" },
    offers: {
      "@type": "Offer",
      priceCurrency: "CNY",
      description:
        "年末福利价 300 元/人天 (2026 年底前签约有效), 需求沟通与技术方案评估免费; 行简交钥匙部署 1000 元, 维保服务 1000 元/3 个月",
    },
  };

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: service.faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "首页", item: SITE.url },
      { "@type": "ListItem", position: 2, name: "软件开发服务", item: `${SITE.url}/services` },
      { "@type": "ListItem", position: 3, name: service.title },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />

      <div className="hero-mesh relative overflow-hidden border-b border-line">
        <div className="hero-grid absolute inset-0 opacity-50" aria-hidden="true" />
        <div className="container relative py-16">
          <nav className="mb-4 text-sm text-faint">
            <Link href="/services" className="no-underline hover:text-brandtext">
              软件开发服务
            </Link>
            <span className="mx-2">/</span>
            <span className="text-normal">{service.serviceType}</span>
          </nav>
          <PageHeader title={service.title} mb="mb-0" />
        </div>
      </div>

      <section className="container py-16">
        <div className="mx-auto max-w-3xl">
          {/* 导语: 答句先行, 一段给出核心答案 (AI 引擎优先摘引位置) */}
          <p className="text-lg leading-8 text-normal">{service.lede}</p>

          {service.sections.map((sec) => (
            <div key={sec.h2} className="prose-content mt-10">
              <h2>{sec.h2}</h2>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{sec.body}</ReactMarkdown>
            </div>
          ))}

          <h2 className="mt-12 text-xl font-bold text-strong">常见问题</h2>
          <div className="mt-4 flex flex-col gap-3">
            {service.faqs.map((f) => (
              <details key={f.q} className="group glass rounded-xl px-6 py-4 transition-colors hover:border-brand-400/50">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-medium [&::-webkit-details-marker]:hidden">
                  <h3 className="text-base font-semibold">{f.q}</h3>
                  <span className="shrink-0 text-muted transition-transform group-open:rotate-45" aria-hidden="true">
                    +
                  </span>
                </summary>
                <p className="mt-3 whitespace-pre-line text-sm leading-7 text-muted">{f.a}</p>
              </details>
            ))}
          </div>

          <div className="glass mt-10 rounded-xl px-6 py-5">
            <p className="text-sm leading-7 text-muted">
              有具体需求？需求沟通与技术方案评估免费,{" "}
              <Link href="/contact" className="text-brandtext underline">
                描述需求后当天给出技术选型与报价
              </Link>
              。更多官方解答见{" "}
              <Link href="/faq" className="text-brandtext underline">
                常见问题
              </Link>{" "}
              与{" "}
              <Link href="/products" className="text-brandtext underline">
                交付案例
              </Link>
              。
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
