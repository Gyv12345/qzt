import Link from "next/link";
import type { Dict, Locale } from "@/i18n";
import { CartBadge } from "./CartBadge";
import { CurrencySwitcher } from "./CurrencySwitcher";
import { LocaleSwitcher } from "./LocaleSwitcher";

/** 吸顶导航: 品牌 + 锚点 + 询盘 CTA + 购物车 + 语言切换 + 结算币种切换。 */
export function Nav({
  locale,
  dict,
  currencies,
}: {
  locale: Locale;
  dict: Dict;
  /** 站点支持的结算币种(后端 config.rates 的 keys) */
  currencies: string[];
}) {
  const links = [
    { href: `/${locale}`, label: dict.nav.home },
    { href: `/${locale}/products`, label: dict.nav.products },
    { href: `/${locale}/about`, label: dict.nav.about },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas/90 backdrop-blur">
      <nav className="container flex h-14 items-center gap-6">
        <Link
          href={`/${locale}`}
          className="font-display text-lg font-bold tracking-tight text-strong no-underline"
        >
          XINGJIAN
        </Link>

        <div className="hidden items-center gap-5 sm:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-muted no-underline transition hover:text-strong"
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-3">
          <Link
            href={`/${locale}/cart`}
            className="inline-flex items-center text-sm font-medium text-muted no-underline transition hover:text-strong"
          >
            {dict.nav.cart}
            <CartBadge />
          </Link>
          <Link href={`/${locale}/inquiry`} className="btn-primary !px-4 !py-1.5">
            {dict.nav.inquiryCta}
          </Link>
          <LocaleSwitcher locale={locale} />
          <CurrencySwitcher currencies={currencies} dict={dict} />
        </div>
      </nav>
    </header>
  );
}
