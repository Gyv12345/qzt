import Link from "next/link";
import { NAV, SITE } from "@/lib/site";

/** 底部页脚。深色块收束页面, 文字反白, 营造层级感。 */
export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-20 bg-ink-900 text-ink-300">
      <div className="container grid gap-8 py-14 sm:grid-cols-2 md:grid-cols-4">
        <div className="sm:col-span-2 md:col-span-1">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 font-display text-sm font-bold text-white">
              {SITE.name.slice(0, 1)}
            </span>
            <p className="font-display text-lg font-bold text-white">{SITE.name}</p>
          </div>
          <p className="mt-3 max-w-xs text-sm leading-6 text-ink-400">{SITE.description}</p>
        </div>
        <nav className="flex flex-col gap-2.5">
          <p className="font-display text-sm font-semibold text-white">导航</p>
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm text-ink-400 no-underline transition-colors hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div>
          <p className="font-display text-sm font-semibold text-white">联系方式</p>
          <p className="mt-3 text-sm leading-6 text-ink-400">商务合作 / 售后咨询</p>
          <p className="text-sm leading-6 text-ink-400">请通过官网留言或来电</p>
        </div>
        <div>
          <p className="font-display text-sm font-semibold text-white">关于</p>
          <p className="mt-3 text-sm leading-6 text-ink-400">企业级业务管理平台</p>
          <p className="text-sm leading-6 text-ink-400">私有化部署 · 模块自由组合</p>
        </div>
      </div>
      <div className="border-t border-white/10 py-5">
        <p className="container text-center text-xs text-ink-500">
          © {year} {SITE.name}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
