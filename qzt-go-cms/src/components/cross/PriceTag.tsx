"use client";

import type { Dict } from "@/i18n";
import { useCurrency } from "@/hooks/useCurrency";
import type { StorefrontProduct, StorefrontSku } from "@/lib/cross/api";

/**
 * 金额格式化: USD 用 $ 前缀, 其余币种用 ISO 代码前缀(极简, 不引 i18n 数字库)。
 * 纯函数保留导出(CartView 等直接换算场景仍在用)。
 */
export function formatPrice(
  amount: number | string | null | undefined,
  currency = "USD",
): string {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "";
  const fixed = n.toFixed(2);
  return currency === "USD" ? `$${fixed}` : `${currency} ${fixed}`;
}

/**
 * 价格展示: price_source=none → "Get a quote"(链接 inquiry 由外层决定);
 * 否则取 SKU 价, 回落商品价, 币种用商品 currency 字段。
 *
 * 本组件为 client 组件: 静态导出(output:export)下页面是构建期产物,
 * SSR/预渲染首帧按默认 USD 形态输出, hydrate 后由 useCurrency 按用户
 * 选择的结算币种实时换算显示(汇率经模块级缓存共享, 见 useCurrency 注释)。
 */
export function PriceTag({
  product,
  sku,
  dict,
  className = "",
}: {
  product: StorefrontProduct;
  sku?: StorefrontSku | null;
  dict: Dict;
  className?: string;
}) {
  // hook 必须无条件调用(price_source=none 分支也要先取)
  const { format } = useCurrency();

  if (product.price_source === "none") {
    return (
      <span className={`text-sm font-semibold text-brand-700 ${className}`}>
        {dict.product.quoteOnly}
      </span>
    );
  }
  const amount = sku && sku.price != null ? sku.price : product.price;
  // 用户结算币种换算展示(from=商品/币种原值币种, 缺省按 USD); 非法金额回落 Get a quote
  const text = format(amount, product.currency || "USD");
  return (
    <span className={`font-semibold text-accent-dark ${className}`}>
      {text || dict.product.getQuote}
    </span>
  );
}
