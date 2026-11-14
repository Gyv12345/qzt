"use client";

import type { Dict } from "@/i18n";
import { useCurrency } from "@/hooks/useCurrency";

/**
 * 结算币种切换器(client): 按钮组展示站点支持的币种(来自后端 config.rates keys),
 * 点击写入 localStorage 并派发事件, 全页价格(PriceTag/购物车)即时换算。
 * 样式对齐 LocaleSwitcher; 选中态 aria-pressed + 高亮。
 */
export function CurrencySwitcher({
  currencies,
  dict,
}: {
  currencies: string[];
  dict: Dict;
}) {
  const { currency, setCurrency } = useCurrency();

  if (!currencies || currencies.length === 0) return null;

  return (
    <div className="flex items-center gap-1" role="group" aria-label={dict.nav.currencyLabel}>
      {currencies.map((c) => {
        const active = currency === c;
        return (
          <button
            key={c}
            type="button"
            aria-pressed={active}
            aria-label={active ? undefined : `${dict.nav.currencyLabel}: ${c}`}
            onClick={() => setCurrency(c)}
            className={`rounded-md border px-2.5 py-1 text-xs font-semibold uppercase tracking-wide transition ${
              active
                ? "border-brand-600 bg-brand-50 text-brand-700"
                : "border-line text-muted hover:border-brand-500 hover:text-brand-700"
            }`}
          >
            {c}
          </button>
        );
      })}
    </div>
  );
}
