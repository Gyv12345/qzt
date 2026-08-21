import Link from "next/link";
import { NAV, SITE } from "@/lib/site";
import { getSiteConfig, getPages } from "@/lib/api";
import type { CmsPage } from "@/lib/types";
import { MobileNav, type MobileNavItem } from "./MobileNav";

/** 顶部导航。Server Component, 随页面一起 SSR 输出, 利于 SEO。
 *  站点名称和 logo 从后端站点配置动态获取。
 *  导航项: 固定导航(NAV) + 后端动态单页(含外链)。 */
export async function Header() {
  let siteName = SITE.name;
  let logoUrl = "";
  let pages: CmsPage[] = [];
  try {
    const [cfg, pageList] = await Promise.all([getSiteConfig(), getPages()]);
    if (cfg.site_name) siteName = cfg.site_name;
    if (cfg.logo_url) logoUrl = cfg.logo_url;
    pages = pageList;
  } catch {
    // 后端不可用时回退到环境变量
  }

  const navItemClass =
    "rounded-md px-3 py-2 text-sm font-medium text-slate-400 no-underline transition-colors hover:bg-white/5 hover:text-white";

  // 移动端抽屉所需的扁平导航数据(固定导航 + 动态单页合并)
  const mobileItems: MobileNavItem[] = [
    ...NAV.map((item) => ({ href: item.href, label: item.label })),
    ...pages.map((page) =>
      page.link_type === "link" && page.external_url
        ? { href: page.external_url, label: page.title, external: true }
        : { href: `/p/${page.slug}`, label: page.title }
    ),
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-night-950/75 backdrop-blur-xl">
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-brand-400/30 to-transparent" />
      <div className="container flex h-16 items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2.5 font-display text-lg font-bold text-white no-underline"
        >
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={siteName} className="h-9 w-auto max-w-[180px] object-contain" />
          ) : (
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-800 font-display text-sm font-bold text-white shadow-glow-sm">
              {siteName.slice(0, 1)}
            </span>
          )}
          <span className="line-clamp-1">{siteName}</span>
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className={navItemClass}>
              {item.label}
            </Link>
          ))}
          {pages.map((page) =>
            page.link_type === "link" && page.external_url ? (
              <a
                key={page.id}
                href={page.external_url}
                target="_blank"
                rel="noopener noreferrer"
                className={navItemClass}
              >
                {page.title}
              </a>
            ) : (
              <Link key={page.id} href={`/p/${page.slug}`} className={navItemClass}>
                {page.title}
              </Link>
            )
          )}
        </nav>
        <MobileNav items={mobileItems} />
      </div>
    </header>
  );
}
