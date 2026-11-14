import type { Metadata } from "next";
import React from "react";
// 跨境主题样式(全局 CSS 按「根布局树」隔离: 本文件只被 (cross) 树加载,
// 官网 globals.css 只被 (main) 树加载, 两套 CSS 变量互不覆盖)
import "../../cross/globals.css";
import { Footer } from "@/components/cross/Footer";
import { Nav } from "@/components/cross/Nav";
import { defaultLocale, getDictionary, isLocale, locales } from "@/i18n";
import { getStorefrontConfig, safe } from "@/lib/cross/api";
import { SITE } from "@/lib/cross/site";

export const revalidate = 300;

// 静态导出约束: 仅预生成 en/zh 两个 locale, 未知段直接 404
// (原 storefront 靠 middleware 保证前缀合法; 并入 cms 静态导出后无 middleware,
// 由 generateStaticParams + dynamicParams=false 达成同等约束)
export const dynamicParams = false;

/** 预生成两个 locale 的静态壳。 */
export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const loc = isLocale(locale) ? locale : defaultLocale;
  const dict = getDictionary(loc);
  return {
    title: {
      default: `${SITE.name} — ${dict.footer.tagline}`,
      template: `%s | ${SITE.name}`,
    },
    description: SITE.description,
    metadataBase: new URL(SITE.url),
    alternates: { canonical: `/${loc}` },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  // 本布局即 (cross) 树的根布局(多根布局: 官网树在 (main)/layout.tsx),
  // 仅 en/zh 会进入本段(dynamicParams=false); 防御未知值按 en 渲染
  // (不在此处 notFound: 无根级 not-found 边界, 会落不到任何布局)
  const loc = isLocale(locale) ? locale : defaultLocale;
  const dict = getDictionary(loc);

  // 结算币种切换器数据源: 取 config.rates 的 keys(与客户端 useCurrency 的
  // 默认兜底表一致)。构建期后端不可达时走 safe 兜底, 不炸 build。
  const cfg = await safe(getStorefrontConfig(), {
    locales: ["en", "zh"],
    rates: { USD: 7.2, EUR: 7.8, GBP: 8.8 },
    paypal_enabled: false,
  });
  const currencies = Object.keys(cfg.rates ?? {});

  return (
    <html lang={loc === "zh" ? "zh-CN" : "en"}>
      <body>
        <Nav locale={loc} dict={dict} currencies={currencies} />
        <main className="min-h-[60vh]">{children}</main>
        <Footer locale={loc} dict={dict} />
      </body>
    </html>
  );
}
