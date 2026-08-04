import Link from "next/link";
import { NAV, SITE } from "@/lib/site";

/** 顶部导航。Server Component, 随页面一起 SSR 输出, 利于 SEO。
 *  不引入 usePathname (会让组件变 Client Component), 保持 SSR 纯净。 */
export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-ink-100 bg-white/80 backdrop-blur-lg">
      {/* 底部渐变细线, 取代生硬边框 */}
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-brand-200 to-transparent" />
      <div className="container flex h-16 items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2.5 font-display text-lg font-bold text-ink-900 no-underline"
        >
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-brand-600 to-brand-800 font-display text-sm font-bold text-white shadow-card">
            {SITE.name.slice(0, 1)}
          </span>
          <span>{SITE.name}</span>
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
