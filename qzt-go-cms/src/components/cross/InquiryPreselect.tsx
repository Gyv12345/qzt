"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import type { Dict } from "@/i18n";
import type { StorefrontProduct } from "@/lib/cross/api";
import { InquiryForm, type PreselectedProduct } from "./InquiryForm";

/**
 * 询盘预选包装(client): 静态导出后服务端拿不到 ?product/?products 查询串,
 * 改在浏览器挂载后解析参数, 并经 /prod-api 反代拉目录映射商品名(后端不可达
 * 时名称退化为 #id, 表单仍可用)。
 * useSearchParams 必须包 Suspense 边界, 静态预渲染时先出 fallback。
 */
function InquiryPreselectInner({ locale, dict }: { locale: string; dict: Dict }) {
  const sp = useSearchParams();
  const [ready, setReady] = useState(false);
  const [preselected, setPreselected] = useState<PreselectedProduct[]>([]);
  const [message, setMessage] = useState("");
  const [singleProductId, setSingleProductId] = useState<number | undefined>(undefined);

  useEffect(() => {
    const ids = new Set<number>();
    let single: number | undefined;
    const one = sp.get("product");
    if (one && /^\d+$/.test(one)) {
      single = Number(one);
      ids.add(single);
    }
    const multi = sp.get("products");
    if (multi) {
      for (const part of multi.split(",")) {
        const t = part.trim();
        if (/^\d+$/.test(t)) ids.add(Number(t));
      }
    }
    setSingleProductId(single);
    const list = [...ids];
    if (list.length === 0) {
      setReady(true);
      return;
    }

    let alive = true;
    const fallbackSel = list.map((id) => ({ id, name: `#${id}` }));
    fetch(`/prod-api/storefront/public/products?locale=${encodeURIComponent(locale)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((body: { code: number; data?: StorefrontProduct[] }) => {
        if (!alive) return;
        const catalog = body && body.code === 0 ? body.data ?? [] : [];
        const sel = list.map((id) => ({
          id,
          name: catalog.find((p) => p.storefront_product_id === id)?.name ?? `#${id}`,
        }));
        setPreselected(sel);
        setMessage(`${dict.inquiry.products}: ${sel.map((p) => p.name).join(", ")}\n\n`);
        setReady(true);
      })
      .catch(() => {
        // 目录拉不到 → 名称占位 #id, 预填清单与提交仍可用
        if (!alive) return;
        setPreselected(fallbackSel);
        setMessage(
          `${dict.inquiry.products}: ${fallbackSel.map((p) => p.name).join(", ")}\n\n`,
        );
        setReady(true);
      });
    return () => {
      alive = false;
    };
  }, [sp, locale, dict]);

  // 挂载解析完成前不渲染表单, 避免预填内容闪改
  if (!ready) return null;
  return (
    <InquiryForm
      locale={locale}
      dict={dict}
      preselected={preselected}
      initialMessage={message}
      singleProductId={singleProductId}
    />
  );
}

export function InquiryPreselect(props: { locale: string; dict: Dict }) {
  return (
    <Suspense fallback={null}>
      <InquiryPreselectInner {...props} />
    </Suspense>
  );
}
