"use client";

import { useEffect } from "react";

/**
 * 第三方统计脚本注入(站点配置 analytics_code,后台「站点设置-统计代码」维护)。
 *
 * React 的 dangerouslySetInnerHTML / insertAdjacentHTML 里的 <script> 不会执行,
 * 必须手动重建 script 节点;非 script 片段(如百度统计的 <noscript>)原样搬入 body。
 */
export function Analytics({ code }: { code: string }) {
  useEffect(() => {
    if (!code) return;
    const holder = document.createElement("div");
    holder.innerHTML = code;
    for (const old of Array.from(holder.querySelectorAll("script"))) {
      const s = document.createElement("script");
      for (const attr of Array.from(old.attributes)) s.setAttribute(attr.name, attr.value);
      s.text = old.textContent || "";
      document.body.appendChild(s);
    }
    while (holder.firstChild) document.body.appendChild(holder.firstChild);
  }, [code]);

  return null;
}
