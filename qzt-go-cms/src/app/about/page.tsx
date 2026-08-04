import type { Metadata } from "next";
import { getPage } from "@/lib/api";
import { SITE } from "@/lib/site";
import { PageHeader } from "@/components/PageHeader";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "关于我们",
  description: `了解 ${SITE.name} 的定位、产品与服务。`,
  alternates: {
    canonical: "/about",
    types: { "text/markdown": "/md/about" },
  },
};

export default async function AboutPage() {
  // 从 CMS 单页 slug=about 拉取内容; 接口未配置时降级为默认文案。
  let title = "关于我们";
  let html = "";
  try {
    const page = await getPage("about");
    if (page.title) title = page.title;
    if (page.content) html = page.content;
  } catch {
    html = `<p>${SITE.name} 是一套基于 Go 的企业级业务管理平台, 提供私有化部署的 CRM、CMS、进销存、HRM 等模块化能力。</p>
            <p>数据归企业所有, 模块自由组合, 支持行业定制。</p>`;
  }

  return (
    <>
      <div className="hero-mesh relative overflow-hidden border-b border-ink-100">
        <div className="hero-grid absolute inset-0 opacity-50" aria-hidden="true" />
        <div className="container relative py-16">
          <PageHeader title={title} mb="mb-0" />
        </div>
      </div>
      <section className="container py-16">
        <article className="prose-content mx-auto max-w-3xl">
          <div dangerouslySetInnerHTML={{ __html: html }} />
        </article>
      </section>
    </>
  );
}
