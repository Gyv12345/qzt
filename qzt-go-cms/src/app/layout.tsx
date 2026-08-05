import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Noto_Sans_SC } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
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
  try {
    const cfg = await getSiteConfig();
    if (cfg.site_name) siteName = cfg.site_name;
    if (cfg.logo_url) logoUrl = cfg.logo_url;
  } catch {
    // 回退到环境变量
  }

  return {
    title: {
      default: `${siteName} - ${SITE.description}`,
      template: `%s | ${siteName}`,
    },
    description: SITE.description,
    metadataBase: new URL(SITE.url),
    alternates: { canonical: "/" },
    icons: logoUrl ? { icon: logoUrl, apple: logoUrl } : undefined,
    openGraph: {
      title: siteName,
      description: SITE.description,
      url: SITE.url,
      siteName,
      locale: "zh_CN",
      type: "website",
    },
    robots: { index: true, follow: true },
  };
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" className={`${displayFont.variable} ${sansFont.variable}`}>
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
      </body>
    </html>
  );
}
