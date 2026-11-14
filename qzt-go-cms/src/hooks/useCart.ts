"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * 轻量购物车(无 zustand/无后端): localStorage 数组 + 事件同步。
 * - 跨标签页: 原生 `storage` 事件(其他标签页写入时触发)
 * - 同标签页跨组件: 写入时派发自定义事件(导航角标等即时刷新)
 * 购物车项只存 ID 契约字段 {storefront_product_id, sku_id, qty},
 * 名称/价格由购物车页按需拉取产品目录解析。
 */
export interface CartItem {
  storefront_product_id: number;
  sku_id: number;
  qty: number;
}

const CART_KEY = "qzt-go-storefront:cart";
const CART_EVENT = "qzt-storefront-cart";

function readCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CART_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (i): i is CartItem =>
        !!i &&
        typeof i === "object" &&
        typeof (i as CartItem).storefront_product_id === "number" &&
        typeof (i as CartItem).sku_id === "number" &&
        typeof (i as CartItem).qty === "number",
    );
  } catch {
    return [];
  }
}

function writeCart(items: CartItem[]) {
  window.localStorage.setItem(CART_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent(CART_EVENT));
}
export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    setItems(readCart());
    const sync = () => setItems(readCart());
    window.addEventListener("storage", sync);
    window.addEventListener(CART_EVENT, sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(CART_EVENT, sync);
    };
  }, []);

  const add = useCallback(
    (item: { storefront_product_id: number; sku_id: number; qty?: number }) => {
      const list = readCart();
      const qty = Math.max(1, item.qty ?? 1);
      const hit = list.find(
        (l) =>
          l.storefront_product_id === item.storefront_product_id &&
          l.sku_id === item.sku_id,
      );
      if (hit) hit.qty += qty;
      else list.push({ storefront_product_id: item.storefront_product_id, sku_id: item.sku_id, qty });
      writeCart(list);
    },
    [],
  );

  /** qty<=0 视为移除该项。 */
  const updateQty = useCallback(
    (storefront_product_id: number, sku_id: number, qty: number) => {
      let list = readCart();
      if (qty <= 0) {
        list = list.filter(
          (l) => !(l.storefront_product_id === storefront_product_id && l.sku_id === sku_id),
        );
      } else {
        list = list.map((l) =>
          l.storefront_product_id === storefront_product_id && l.sku_id === sku_id
            ? { ...l, qty }
            : l,
        );
      }
      writeCart(list);
    },
    [],
  );

  const remove = useCallback(
    (storefront_product_id: number, sku_id: number) => {
      updateQty(storefront_product_id, sku_id, 0);
    },
    [updateQty],
  );

  const clear = useCallback(() => writeCart([]), []);

  const count = items.reduce((sum, i) => sum + i.qty, 0);

  return { items, count, add, updateQty, remove, clear };
}
