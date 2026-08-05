import Link from "next/link";
import { NAV, SITE } from "@/lib/site";
import { getSiteConfig } from "@/lib/api";

/** 顶部导航。Server Component, 随页面一起 SSR 输出, 利于 SEO。
 *  站点名称和 logo 从后端站点配置动态获取。 */
export async function Header() {
  let siteName = SITE.name;
  let logoUrl = "";
  try {
    const cfg = await getSiteConfig();
    if (cfg.site_name) siteName = cfg.site_name;
    if (cfg.logo_url) logoUrl = cfg.logo_url;
  } catch {
    // 后端不可用时回退到环境变量
  }

  return (
    <header className="sticky top-0 z-50 border-b border-ink-100 bg-white/80 backdrop-blur-lg">
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-brand-200 to-transparent" />
      <div className="container flex h-16 items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2.5 font-display text-lg font-bold text-ink-900 no-underline"
        >
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={siteName} className="h-9 w-auto max-w-[180px] object-contain" />
          ) : (
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-brand-600 to-brand-800 font-display text-sm font-bold text-white shadow-card">
              {siteName.slice(0, 1)}
            </span>
          )}
          <span className="line-clamp-1">{siteName}</span>
        </Link>
        <nav className="flex items-center gap-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-ink-600 no-underline transition-colors hover:bg-brand-50 hover:text-brand-700"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
