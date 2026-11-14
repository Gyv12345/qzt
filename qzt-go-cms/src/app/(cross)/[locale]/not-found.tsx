"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { defaultLocale, getDictionary, isLocale } from "@/i18n";

/**
 * 404 页: not-found.tsx 拿不到路由 params, 用 usePathname 反解 locale 取字典。
 */
export default function NotFound() {
  const pathname = usePathname() || "/";
  const seg = pathname.split("/")[1];
  const locale = isLocale(seg) ? seg : defaultLocale;
  const dict = getDictionary(locale);

  return (
    <section className="grid place-items-center py-32 text-center">
      <div className="container">
        <p className="font-display text-7xl font-extrabold text-brand-600 sm:text-8xl">
          404
        </p>
        <h1 className="mt-4 font-display text-2xl font-semibold text-strong">
          {dict.notFound.title}
        </h1>
        <p className="mt-2 text-muted">{dict.notFound.desc}</p>
        <Link href={`/${locale}`} className="btn-primary mt-8">
          {dict.notFound.back}
        </Link>
      </div>
    </section>
  );
}
