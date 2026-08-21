"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";

export type MobileNavItem = { href: string; label: string; external?: boolean };

/** 移动端汉堡菜单: 全屏深色抽屉。PC 端由 Header 的 md:flex 导航接管, 本组件 md 以下才渲染按钮。
 *  抽屉通过 portal 挂到 body: header 的 backdrop-blur 会把 fixed 后代「捕获」成相对自身定位。 */
export function MobileNav({ items }: { items: MobileNavItem[] }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => setMounted(true), []);

  // 路由变化时自动收起抽屉
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // 抽屉打开时锁死背景滚动
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const drawer = (
    <div className="fixed inset-0 top-16 z-[60] flex flex-col bg-night-950/95 backdrop-blur-xl md:hidden">
      <nav className="container flex flex-col gap-1 overflow-y-auto py-6">
        {items.map((item) =>
          item.external ? (
            <a
              key={item.href}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg px-4 py-3.5 font-display text-lg font-medium text-slate-200 no-underline transition-colors hover:bg-white/5 hover:text-white"
            >
              {item.label}
            </a>
          ) : (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-lg px-4 py-3.5 font-display text-lg font-medium no-underline transition-colors hover:bg-white/5 hover:text-white ${
                pathname === item.href ? "bg-white/5 text-brand-300" : "text-slate-200"
              }`}
            >
              {item.label}
            </Link>
          )
        )}
      </nav>
    </div>
  );

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-label={open ? "关闭菜单" : "打开菜单"}
        onClick={() => setOpen((v) => !v)}
        className="grid h-10 w-10 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-slate-200"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          {open ? (
            <>
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </>
          ) : (
            <>
              <path d="M4 7h16" />
              <path d="M4 12h16" />
              <path d="M4 17h16" />
            </>
          )}
        </svg>
      </button>

      {mounted && open && createPortal(drawer, document.body)}
    </div>
  );
}
