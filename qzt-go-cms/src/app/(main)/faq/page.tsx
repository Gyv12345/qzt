import type { Metadata } from "next";
import { getSiteConfig } from "@/lib/api";
import { parseFaq } from "@/lib/markdown";
import { SITE } from "@/lib/site";
import { PageHeader } from "@/components/PageHeader";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

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
 * - 折叠用 shadcn Accordion 渲染(Content forceMount: 问答全文仍在静态 HTML 里, 爬虫可见)
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
            <Accordion type="single" collapsible defaultValue="faq-0" className="flex flex-col gap-3">
              {faqs.map((f, i) => (
                <AccordionItem key={i} value={`faq-${i}`}>
                  <AccordionTrigger>{f.q}</AccordionTrigger>
                  <AccordionContent className="whitespace-pre-line">{f.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </div>
      </section>
    </>
  );
}
