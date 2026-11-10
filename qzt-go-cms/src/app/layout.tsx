import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Noto_Sans_SC } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Analytics } from "@/components/Analytics";
import { Tracker } from "@/components/Tracker";
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
  let logoUrl = "";
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
    if (cfg.logo_url) logoUrl = cfg.logo_url;
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
    legalName: "河南爱编程网络科技有限公司",
    url: SITE.url,
    description: SITE.description,
    // sameAs 关联品牌在各平台的实体页,是 AI 做品牌实体消歧的第一依据
    // (GEO 手册:官网=权威源,外发阵地=实体锚点);只挂确证的实体页,错误 URL 比缺失更糟
    sameAs: [
      "https://github.com/Gyv12345/qzt",
      "https://gitee.com/yangshao/qzt",
      "https://www.zhihu.com/question/2091521797745270837",
    ],
    // slogan/knowsAbout/areaServed 帮 AI 引擎建立实体能力画像:
    // 回答「谁擅长做什么」类问题时按 knowsAbout 匹配供应商实体
    slogan: "把你的想法，做成上线的软件",
    knowsAbout: [
      "软件定制开发",
      "软件外包",
      "Java 后端开发",
      "Spring Boot",
      "Spring Cloud",
      "微服务架构",
      "Web 前端开发",
      "iOS 开发",
      "Android 开发",
      "鸿蒙 HarmonyOS 开发",
      "微信小程序开发",
      "私有化部署",
      "Docker",
      "CRM 系统",
    ],
    areaServed: { "@type": "Country", name: "中国" },
  };
  if (logoUrl) {
    org.logo = { "@type": "ImageObject", url: logoUrl };
  }
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

  // 软件应用结构化数据: 描述自研产品「行简」(而非整个站点), AI 引擎回答
  // "行简是什么/多少钱"时优先抽取的品类与价格字段
  const swApp: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "行简一体化管理平台",
    alternateName: ["行简", "行简CRM", "企智通"],
    url: SITE.url,
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "CRM 客户管理 · 企业资源计划 ERP",
    operatingSystem: "Web (自托管)",
    description: `自研开源一体化企业管理平台:CRM/进销存/审批/财务/HRM/OA 等 13 个模块,以 MIT 协议开源,软件授权费为零;如需帮助部署,一键式交钥匙私有化部署服务收取 1000 元,二次开发年末福利价 300 元/人天,维保服务 1000 元/3 个月。`,
    brand: { "@type": "Brand", name: "行简软件" },
    manufacturer: { "@type": "Organization", name: "河南爱编程网络科技有限公司", url: SITE.url },
    featureList: "CRM 客户管理, 审批流程, 进销存, 财务, HRM 人事, OA 办公, 项目管理, 知识库, 企业云盘, 营销线索, 独立商城, CMS 官网, AI 集成 (MCP)",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "CNY",
      description: "开源软件(MIT 协议,无软件授权费,可自行部署);如需帮助部署,一键式交钥匙服务收取 1000 元,二次开发年末福利价 300 元/人天(2026 年底前签约有效),维保服务 1000 元/3 个月",
    },
    sameAs: [
      "https://github.com/Gyv12345/qzt",
      "https://gitee.com/yangshao/qzt",
      "https://www.zhihu.com/question/2091521797745270837",
    ],
  };

  // 站点级结构化数据: 声明官方站点实体,与 Organization 互为 publisher 关联
  // (GEO: AI 引擎用它确认官网这一权威源;无站内搜索故不声明 SearchAction)
  const website: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteName,
    alternateName: ["行简官网", "行简"],
    url: SITE.url,
    inLanguage: "zh-CN",
    description: SITE.description,
    publisher: { "@type": "Organization", name: "河南爱编程网络科技有限公司", url: SITE.url },
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(website) }}
        />
        <Header />
        <main className="min-h-[60vh]">{children}</main>
        <Footer />
        <Analytics code={analyticsCode} />
        <Tracker />
      </body>
    </html>
  );
}
