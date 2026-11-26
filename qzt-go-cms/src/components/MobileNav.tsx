"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";

export type MobileNavItem = { href: string; label: string; external?: boolean };

/** 移动端汉堡菜单: shadcn Sheet 抽屉(Radix Dialog 底座, 自带焦点陷阱/ESC/滚动锁定/portal)。
 *  PC 端由 Header 的 xl:flex 导航接管, 本组件 xl 以下才渲染按钮;
 *  路由变化自动收起(保留原行为)。 */
export function MobileNav({ items }: { items: MobileNavItem[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // 路由变化时自动收起抽屉
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="xl:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <button
          type="button"
          aria-label="打开菜单"
          onClick={() => setOpen(true)}
          className="grid h-10 w-10 place-items-center rounded-lg border border-line bg-raised text-normal transition-colors hover:text-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/40"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>
        <SheetContent>
          <nav className="container flex flex-col gap-1 overflow-y-auto py-6">
            {items.map((item) =>
              item.external ? (
                <a
                  key={item.href}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg px-4 py-3.5 font-display text-lg font-medium text-normal no-underline transition-colors hover:bg-raised hover:text-strong"
                >
                  {item.label}
                </a>
              ) : (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-lg px-4 py-3.5 font-display text-lg font-medium no-underline transition-colors hover:bg-raised hover:text-strong ${
                    pathname === item.href ? "bg-raised text-brandtext" : "text-normal"
                  }`}
                >
                  {item.label}
                </Link>
              )
            )}
          </nav>
        </SheetContent>
      </Sheet>
    </div>
  );
}
