import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { HeroSection } from "@/components/sections/hero";
import { FeaturesSection } from "@/components/sections/features";
import { StatsSection } from "@/components/sections/stats";
import { CtaSection } from "@/components/sections/cta";
import { getPageBySlug, getPageElement } from "@/lib/api";

// 首页 Hero 内容的 slug（兼容旧的 PAGE_ELEMENT 方式）
const HERO_SLUG = "homepage-hero";

// 首页页面 slug（新的页面管理方式）
const HOMEPAGE_SLUG = "homepage";

export default async function HomePage() {
  // 尝试从新的页面管理系统获取首页配置
  const pageData = await getPageBySlug(HOMEPAGE_SLUG);

  // 如果新系统没有配置，回退到旧的 PAGE_ELEMENT 方式
  const heroContent = !pageData ? await getPageElement(HERO_SLUG) : null;

  return (
    <>
      <Header />
      <main>
        <HeroSection cmsContent={heroContent} pageData={pageData} />
        <StatsSection pageData={pageData} />
        <FeaturesSection pageData={pageData} />
        <CtaSection pageData={pageData} />
      </main>
      <Footer />
    </>
  );
}
