"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * 语言切换: 保持当前路径, 仅替换首段 locale。
 * 依赖 usePathname(client), 服务端拿不到当前路径。
 */
export function LocaleSwitcher({ locale }: { locale: string }) {
  const pathname = usePathname() || "/";
  const other = locale === "en" ? "zh" : "en";

  // 去掉首段 locale 前缀后重挂目标前缀; 无前缀路径(理论上 middleware 已兜)退回根
  const rest = pathname.split("/").slice(2).join("/");
  const href = rest ? `/${other}/${rest}` : `/${other}`;

  return (
    <Link
      href={href}
      className="rounded-md border border-line px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-muted transition hover:border-brand-500 hover:text-brand-700"
      aria-label={`Switch to ${other}`}
    >
      {other}
    </Link>
  );
}
