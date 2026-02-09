import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { HeroSection } from "@/components/sections/hero";
import { FeaturesSection } from "@/components/sections/features";
import { StatsSection } from "@/components/sections/stats";
import { CtaSection } from "@/components/sections/cta";
import { getPageElement } from "@/lib/api";

// 首页 Hero 内容的 slug
const HERO_SLUG = "homepage-hero";

export default async function HomePage() {
  // 获取首页 Hero 内容（如果 CMS 中没有配置，使用默认值）
  const heroContent = await getPageElement(HERO_SLUG);

  return (
    <>
      <Header />
      <main>
        <HeroSection cmsContent={heroContent} />
        <StatsSection />
        <FeaturesSection />
        <CtaSection />
      </main>
      <Footer />
    </>
  );
}
