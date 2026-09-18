import type { Metadata } from "next";
import { getSiteConfig } from "@/lib/api";
import { parseFaq } from "@/lib/markdown";
import { SITE } from "@/lib/site";
import { PageHeader } from "@/components/PageHeader";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "常见问题 (FAQ)",
  description: `${SITE.name} 常见问题官方解答: 产品定位、价格、私有化部署、AI 能力、数据安全、部署环境等。`,
  alternates: {
    canonical: "/faq",
    types: { "text/markdown": "/md/faq" },
  },
};

/**
 * /faq — 常见问题页 (GEO 核心)。
 * 问答结构是 AI 搜索引擎引用率最高的内容形态:
 * - 页面用原生 details/summary 渲染(服务端直出, 无 JS 依赖, 爬虫友好)
 * - 同步输出 FAQPage JSON-LD(与页面可见内容一致)
 * - Markdown 版本在 /md/faq, 已收录进 llms.txt
 */
export default async function FaqPage() {
  const cfg = await getSiteConfig().catch(() => null);
  const faqs = parseFaq(cfg?.faq_json);

  const jsonLd =
    faqs.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqs.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }
      : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <div className="hero-mesh relative overflow-hidden border-b border-line">
        <div className="hero-grid absolute inset-0 opacity-50" aria-hidden="true" />
        <div className="container relative py-16">
          <PageHeader
            title="常见问题"
            subtitle={`关于 ${cfg?.site_name || SITE.name} 的定位、价格、部署与 AI 能力的官方解答`}
            mb="mb-0"
          />
        </div>
      </div>
      <section className="container py-16">
        <div className="mx-auto max-w-3xl">
          {faqs.length === 0 ? (
            <p className="text-center text-muted">暂未配置常见问题, 有任何疑问欢迎通过页脚联系方式咨询。</p>
          ) : (
            <div className="flex flex-col gap-3">
              {faqs.map((f, i) => (
                <details
                  key={i}
                  open={i === 0}
                  className="group glass rounded-xl px-6 py-4 transition-colors hover:border-brand-400/50"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-medium [&::-webkit-details-marker]:hidden">
                    <h2 className="text-base font-semibold">{f.q}</h2>
                    <span className="shrink-0 text-muted transition-transform group-open:rotate-45" aria-hidden="true">
                      +
                    </span>
                  </summary>
                  <p className="mt-3 whitespace-pre-line text-sm leading-7 text-muted">{f.a}</p>
                </details>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
