"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { flush, track } from "@/lib/track";

/**
 * 全站埋点组件(挂在根 layout,与 Analytics 并列):
 * - 路由切换上报 pageview(首屏由 App Router 首次 effect 触发)
 * - 文档级点击委托:按链接归类转化事件(在线体验/联系我们/产品/文章),业务组件零侵入
 */
export function Tracker() {
  const pathname = usePathname();

  useEffect(() => {
    track("pageview", undefined, { path: pathname });
  }, [pathname]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const anchor = target?.closest?.("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href") ?? "";
      const label = (anchor.textContent ?? "").trim().slice(0, 50);
      if (href.startsWith("/p/demo")) {
        track("click_demo", { label });
      } else if (href.startsWith("/contact")) {
        track("click_contact", { label });
      } else if (href.startsWith("/products/")) {
        track("click_product", { label });
      } else if (href.startsWith("/news/")) {
        track("click_article", { label });
      }
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  // 路由切换瞬间把上一页攒的事件带走,避免等到定时器
  useEffect(() => {
    return () => flush();
  }, [pathname]);

  return null;
}
