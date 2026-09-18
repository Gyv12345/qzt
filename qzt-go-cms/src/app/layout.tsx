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
  // 地理 SEO 标签(geo.region/geo.placename/geo.position/ICBM),后台站点设置可配
  const geoTags: Record<string, string> = {};
  try {
    const cfg = await getSiteConfig();
    if (cfg.site_name) siteName = cfg.site_name;
    if (cfg.logo_url) logoUrl = cfg.logo_url;
    if (cfg.description) description = cfg.description;
    if (cfg.keywords) keywords = cfg.keywords;
    // 浏览器标签页图标:优先站点配置的网站图标,留空回退 Logo
    icon = cfg.favicon_url || cfg.logo_url;
    if (cfg.geo_region) geoTags["geo.region"] = cfg.geo_region;
    if (cfg.geo_placename) geoTags["geo.placename"] = cfg.geo_placename;
    if (cfg.geo_position) {
      geoTags["geo.position"] = cfg.geo_position;
      // ICBM 与 geo.position 同源,格式为 纬度, 经度
      geoTags["ICBM"] = cfg.geo_position.replace(";", ", ");
    }
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
    other: Object.keys(geoTags).length > 0 ? geoTags : undefined,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  let analyticsCode = "";
  let theme = "dark-tech";
  let siteName = SITE.name;
  let contactPhone = "";
  let contactEmail = "";
  let contactAddress = "";
  let geoPlacename = "";
  let geoPosition = "";
  try {
    const cfg = await getSiteConfig();
    analyticsCode = cfg.analytics_code || "";
    // 主题包白名单校验: 非法值回退默认, 防止旧数据/手滑输入
    if (cfg.theme === "dark-tech" || cfg.theme === "light-clean") theme = cfg.theme;
    if (cfg.site_name) siteName = cfg.site_name;
    contactPhone = cfg.contact_phone || "";
    contactEmail = cfg.contact_email || "";
    contactAddress = cfg.contact_address || "";
    geoPlacename = cfg.geo_placename || "";
    geoPosition = cfg.geo_position || "";
  } catch {
    // 后端不可用时用默认主题, 不注入统计
  }

  // 组织级结构化数据: 地址/坐标/联系方式帮助搜索引擎做本地化识别
  const org: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteName,
    url: SITE.url,
    description: SITE.description,
  };
  if (contactAddress || geoPlacename) {
    org.address = {
      "@type": "PostalAddress",
      ...(contactAddress ? { streetAddress: contactAddress } : {}),
      ...(geoPlacename ? { addressLocality: geoPlacename } : {}),
    };
  }
  if (geoPosition) {
    const [lat, lng] = geoPosition.split(";").map((v) => v.trim());
    if (lat && lng) {
      org.geo = { "@type": "GeoCoordinates", latitude: lat, longitude: lng };
    }
  }
  if (contactPhone) org.telephone = contactPhone;
  if (contactEmail) org.email = contactEmail;

  // 软件应用结构化数据: AI 引擎回答"是什么/多少钱"时优先抽取的品类与价格字段
  const swApp: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: siteName,
    url: SITE.url,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web (自托管)",
    description: SITE.description,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "CNY",
      description: "软件开源免费(MIT);交钥匙部署服务 1000 元,二次开发 500 元/人天",
    },
    sameAs: ["https://github.com/Gyv12345/qzt"],
  };

  return (
    <html lang="zh-CN" data-theme={theme} className={`${displayFont.variable} ${sansFont.variable}`}>
      <body className="font-sans">
        {/* 组织级结构化数据,提升搜索引擎理解 */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(org) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(swApp) }}
        />
        <Header />
        <main className="min-h-[60vh]">{children}</main>
        <Footer />
        <Analytics code={analyticsCode} />
      </body>
    </html>
  );
}
