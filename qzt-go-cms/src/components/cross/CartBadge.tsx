"use client";

import { useCart } from "@/hooks/useCart";

/** 导航购物车角标: 有商品时显示数量, 无商品不渲染。 */
export function CartBadge() {
  const { count } = useCart();
  if (count <= 0) return null;
  return (
    <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1 text-xs font-bold text-white">
      {count > 99 ? "99+" : count}
    </span>
  );
}
