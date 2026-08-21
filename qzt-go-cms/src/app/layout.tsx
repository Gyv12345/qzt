import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Noto_Sans_SC } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Analytics } from "@/components/Analytics";
import { SITE } from "@/lib/site";
import { getSiteConfig } from "@/lib/api";

// 标题字体: 几何感无衬线, 有个性且专业 (非烂大街的 Inter/Roboto)
const displayFont = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

// 正文字体: 中文优化, 可读性好
const sansFont = Noto_Sans_SC({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-sans",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  let siteName = SITE.name;
  let logoUrl = "";
  let description = SITE.description;
  let keywords: string | undefined;
  let icon = "";
  try {
    const cfg = await getSiteConfig();
    if (cfg.site_name) siteName = cfg.site_name;
    if (cfg.logo_url) logoUrl = cfg.logo_url;
    if (cfg.description) description = cfg.description;
    if (cfg.keywords) keywords = cfg.keywords;
    // 浏览器标签页图标:优先站点配置的网站图标,留空回退 Logo
    icon = cfg.favicon_url || cfg.logo_url;
  } catch {
    // 回退到环境变量
  }

  return {
    title: {
      default: `${siteName} - ${SITE.description}`,
      template: `%s | ${siteName}`,
    },
    description,
    keywords,
    metadataBase: new URL(SITE.url),
    alternates: { canonical: "/" },
    icons: icon ? { icon, apple: icon } : undefined,
    openGraph: {
      title: siteName,
      description,
      url: SITE.url,
      siteName,
      locale: "zh_CN",
      type: "website",
    },
    robots: { index: true, follow: true },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  let analyticsCode = "";
  let theme = "dark-tech";
  try {
    const cfg = await getSiteConfig();
    analyticsCode = cfg.analytics_code || "";
    // 主题包白名单校验: 非法值回退默认, 防止旧数据/手滑输入
    if (cfg.theme === "dark-tech" || cfg.theme === "light-clean") theme = cfg.theme;
  } catch {
    // 后端不可用时用默认主题, 不注入统计
  }

  return (
    <html lang="zh-CN" data-theme={theme} className={`${displayFont.variable} ${sansFont.variable}`}>
      <body className="font-sans">
        {/* 组织级结构化数据,提升搜索引擎理解 */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: SITE.name,
              url: SITE.url,
              description: SITE.description,
            }),
          }}
        />
        <Header />
        <main className="min-h-[60vh]">{children}</main>
        <Footer />
        <Analytics code={analyticsCode} />
      </body>
    </html>
  );
}
