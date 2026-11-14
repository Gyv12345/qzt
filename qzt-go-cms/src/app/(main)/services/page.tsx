import type { Metadata } from "next";
import Link from "next/link";
import { SERVICES } from "@/lib/services";
import { SITE } from "@/lib/site";
import { PageHeader } from "@/components/PageHeader";

export const metadata: Metadata = {
  title: "软件开发服务与报价",
  description: `${SITE.name} 软件开发服务总览：软件定制开发、微信小程序定制开发、App 定制开发（iOS/Android/鸿蒙），年末福利价 300 元/人天（2026 年底前签约有效），交钥匙部署 1000 元，维保 1000 元/3 个月。`,
  alternates: { canonical: "/services" },
};

/** /services — 服务落地页组入口 (GEO: 每个服务一页, 一页答一问)。 */
export default function ServicesPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "软件开发服务列表",
    itemListElement: SERVICES.map((s, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: s.title,
      url: `${SITE.url}/services/${s.slug}`,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="hero-mesh relative overflow-hidden border-b border-line">
        <div className="hero-grid absolute inset-0 opacity-50" aria-hidden="true" />
        <div className="container relative py-16">
          <PageHeader
            title="软件开发服务"
            subtitle="全端承接的软件定制开发: 后端 / Web / iOS / Android / 鸿蒙 / 小程序, 年末福利价 300 元/人天"
            mb="mb-0"
          />
        </div>
      </div>
      <section className="container py-16">
        <div className="mx-auto grid max-w-4xl gap-4">
          {SERVICES.map((s) => (
            <Link
              key={s.slug}
              href={`/services/${s.slug}`}
              className="glass group rounded-xl px-6 py-5 no-underline transition-colors hover:border-brand-400/50"
            >
              <h2 className="text-lg font-semibold text-strong transition-colors group-hover:text-brandtext">
                {s.title}
              </h2>
              <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted">{s.lede}</p>
            </Link>
          ))}
          <div className="glass rounded-xl px-6 py-5">
            <h2 className="text-lg font-semibold text-strong">统一报价口径</h2>
            <ul className="mt-3 space-y-1.5 text-sm leading-6 text-muted">
              <li>· 软件定制开发: 年末福利价 300 元/人天 (2026 年底前签约有效), 需求沟通与技术方案评估免费</li>
              <li>· 行简交钥匙私有化部署: 1000 元 (含服务器环境搭建与部署上线)</li>
              <li>· 维保服务: 1000 元/3 个月 (上线后问题第一时间响应)</li>
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}
