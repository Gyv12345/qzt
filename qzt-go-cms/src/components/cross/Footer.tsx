import Link from "next/link";
import type { Dict, Locale } from "@/i18n";
import { BRAND } from "@/lib/cross/site";

/** 深色收束页脚: 品牌 + 站点导航 + 版权(出海站, 不放备案类字段)。 */
export function Footer({ locale, dict }: { locale: Locale; dict: Dict }) {
  const year = new Date().getFullYear();
  const links = [
    { href: `/${locale}`, label: dict.nav.home },
    { href: `/${locale}/products`, label: dict.nav.products },
    { href: `/${locale}/cart`, label: dict.nav.cart },
    { href: `/${locale}/inquiry`, label: dict.inquiry.title },
    { href: `/${locale}/about`, label: dict.nav.about },
  ];

  return (
    <footer className="mt-20 bg-deep text-slate-300">
      <div className="container grid gap-10 py-14 sm:grid-cols-3">
        <div>
          <p className="font-display text-lg font-bold tracking-tight text-white">
            {BRAND}
          </p>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-slate-400">
            {dict.footer.tagline}
          </p>
        </div>
        <nav className="flex flex-col gap-2" aria-label="Footer">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm text-slate-300 no-underline transition hover:text-white"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="text-sm text-slate-400">
          <p className="font-medium text-slate-200">{dict.footer.company}</p>
        </div>
      </div>
      <div className="border-t border-white/10">
        <p className="container py-5 text-xs text-slate-500">
          © {year} {BRAND}. {dict.footer.rights}
        </p>
      </div>
    </footer>
  );
}
