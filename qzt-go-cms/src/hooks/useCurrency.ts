"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * 结算币种 hook(与 useCart 同模式, 无 zustand/无全局 store):
 * localStorage 单值 + 事件同步。
 * - 跨标签页: 原生 `storage` 事件(其他标签页写入时触发)
 * - 同标签页跨组件: 写入时派发自定义事件(价格标签/购物车/切换器即时刷新)
 *
 * 静态导出约束: 页面是构建期产物, 服务端无法按用户选择渲染币种,
 * 因此换算完全在客户端进行——SSR 首帧为默认 USD 形态, hydrate 后按用户选择换算。
 *
 * 汇率来源: 首次使用时拉取 /prod-api/storefront/public/config 的 rates 表,
 * 模块级缓存整页共享(PriceTag/购物车/切换器等多个实例只发一次请求);
 * 拉取失败回落默认汇率 {USD:7.2, EUR:7.8, GBP:8.8}。CNY 为基准币(=1)。
 * 换算公式: display = amount × rate(from) ÷ rate(to), from==to 时原值。
 */

export type CurrencyRates = Record<string, number>;

const CURRENCY_KEY = "qzt-go-storefront:currency";
const CURRENCY_EVENT = "qzt-storefront-currency";

/** 汇率兜底(与 (cross)/[locale]/layout.tsx 的 safe 兜底保持一致)。 */
const DEFAULT_RATES: CurrencyRates = { USD: 7.2, EUR: 7.8, GBP: 8.8 };

// 模块级汇率缓存 + 去重 inflight: 多组件实例共享同一次请求
let ratesCache: CurrencyRates | null = null;
let ratesInflight: Promise<CurrencyRates> | null = null;

/** 过滤非法汇率项并与默认表合并(服务端缺某币种时回落默认值, 避免除零/NaN)。 */
function sanitizeRates(raw: CurrencyRates | undefined): CurrencyRates {
  const server: CurrencyRates = {};
  if (raw) {
    for (const [k, v] of Object.entries(raw)) {
      const n = Number(v);
      if (k && Number.isFinite(n) && n > 0) server[k] = n;
    }
  }
  return { ...DEFAULT_RATES, ...server };
}

async function fetchRates(): Promise<CurrencyRates> {
  if (ratesCache) return ratesCache;
  if (!ratesInflight) {
    ratesInflight = fetch("/prod-api/storefront/public/config")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((body: { code: number; data?: { rates?: CurrencyRates } }) => {
        const merged = sanitizeRates(body && body.code === 0 ? body.data?.rates : undefined);
        ratesCache = merged;
        return merged;
      })
      .catch(() => {
        // 失败不写缓存: 清掉 inflight 让后续实例重试, 本次先回落默认表
        ratesInflight = null;
        return DEFAULT_RATES;
      });
  }
  return ratesInflight;
}

/** 取某币种的基准汇率(每单位外币 ≈ 多少 CNY); CNY 本身视为 1。 */
function rateOf(rates: CurrencyRates, code: string): number {
  const c = (code || "USD").toUpperCase();
  if (c === "CNY") return 1;
  const v = rates[c];
  return typeof v === "number" && Number.isFinite(v) && v > 0 ? v : DEFAULT_RATES[c] ?? 1;
}

function readStoredCurrency(): string {
  if (typeof window === "undefined") return "USD";
  try {
    const v = window.localStorage.getItem(CURRENCY_KEY);
    return v && /^[A-Za-z]{3}$/.test(v) ? v.toUpperCase() : "USD";
  } catch {
    return "USD";
  }
}

/** 与 PriceTag.formatPrice 同一格式化规则(独立实现, 避免 hook→组件循环依赖)。 */
function formatMoney(n: number, currency: string): string {
  const fixed = n.toFixed(2);
  return currency === "USD" ? `$${fixed}` : `${currency} ${fixed}`;
}

export function useCurrency() {
  const [currency, setCurrencyState] = useState("USD");
  const [rates, setRates] = useState<CurrencyRates>(DEFAULT_RATES);

  useEffect(() => {
    setCurrencyState(readStoredCurrency());
    const sync = () => setCurrencyState(readStoredCurrency());
    window.addEventListener("storage", sync);
    window.addEventListener(CURRENCY_EVENT, sync);
    let alive = true;
    fetchRates().then((r) => {
      if (alive) setRates(r);
    });
    return () => {
      alive = false;
      window.removeEventListener("storage", sync);
      window.removeEventListener(CURRENCY_EVENT, sync);
    };
  }, []);

  /** 写入 localStorage 并派发事件, 全页价格标签/购物车即时换算。 */
  const setCurrency = useCallback((next: string) => {
    const c = (next || "USD").toUpperCase();
    try {
      window.localStorage.setItem(CURRENCY_KEY, c);
    } catch {
      // localStorage 不可用(隐私模式等)时仅本次会话内生效(事件仍会驱动当前页刷新)
    }
    window.dispatchEvent(new CustomEvent(CURRENCY_EVENT));
  }, []);

  /** 金额换算: from 币种金额 → 当前结算币种数值。非法输入返回 0。 */
  const convert = useCallback(
    (amount: number | string | null | undefined, from?: string): number => {
      const n = Number(amount);
      if (!Number.isFinite(n)) return 0;
      const src = rateOf(rates, from || "USD");
      const dst = rateOf(rates, currency);
      return (n * src) / dst;
    },
    [rates, currency],
  );

  /** 金额换算 + 格式化(USD `$xx.xx`, 其余 `XXX xx.xx`, 与 formatPrice 一致)。 */
  const format = useCallback(
    (amount: number | string | null | undefined, from?: string): string => {
      const n = Number(amount);
      if (!Number.isFinite(n)) return "";
      return formatMoney(convert(n, from), currency);
    },
    [convert, currency],
  );

  return { currency, rates, setCurrency, convert, format };
}
