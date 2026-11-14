"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { Dict } from "@/i18n";
import { useCart } from "@/hooks/useCart";
import { useCurrency } from "@/hooks/useCurrency";
import type { StorefrontProduct } from "@/lib/cross/api";
import { createPayPalCheckout, requestCheckout } from "@/lib/cross/checkout";
import { QtyStepper } from "./QtyStepper";

/**
 * 购物车视图(client): 商品名/价在挂载后经 /prod-api 反代拉目录解析
 * (cart 项只存 ID, 见 useCart 注释)。金额按用户选择的结算币种客户端换算
 * (useCurrency, 汇率来自 public/config 的 rates 表)。
 *
 * 结账双通道(均整页跳转外部收银台):
 * - Stripe: POST /storefront/public/checkout(带 currency), 跳 checkout_url;
 * - PayPal(public/config 返回 paypal_enabled=true 时显示次按钮):
 *   POST /storefront/public/paypal/create → 跳 approve_url, PayPal 审批后
 *   回跳成功页由 CheckoutSuccess 凭 token 调 capture 确认扣款。
 */
export function CartView({ locale, dict }: { locale: string; dict: Dict }) {
  const { items, updateQty, remove, clear } = useCart();
  const { currency, convert, format } = useCurrency();
  const [products, setProducts] = useState<StorefrontProduct[] | null>(null);
  const [checking, setChecking] = useState(false);
  const [payingPal, setPayingPal] = useState(false);
  const [paypalEnabled, setPaypalEnabled] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const searchParams = useSearchParams();
  const canceled = searchParams.get("canceled") === "1";

  useEffect(() => {
    let alive = true;
    fetch(`/prod-api/storefront/public/products?locale=${encodeURIComponent(locale)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((body: { code: number; data?: StorefrontProduct[] }) => {
        if (alive) setProducts(body && body.code === 0 ? body.data ?? [] : []);
      })
      .catch(() => {
        if (alive) setProducts([]); // 后端不可达 → 空目录, 行保留但名称占位
      });
    // PayPal 通道开关: public/config 的 paypal_enabled(未配置凭据时后端返回 false)
    fetch("/prod-api/storefront/public/config")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((body: { code: number; data?: { paypal_enabled?: boolean } }) => {
        if (alive) setPaypalEnabled(body && body.code === 0 && body.data?.paypal_enabled === true);
      })
      .catch(() => {
        if (alive) setPaypalEnabled(false);
      });
    return () => {
      alive = false;
    };
  }, [locale]);

  const byId = useMemo(
    () => new Map((products ?? []).map((p) => [p.storefront_product_id, p])),
    [products],
  );

  const rows = items.map((item) => ({ item, product: byId.get(item.storefront_product_id) }));
  // 合计: 各行原币种金额换算到用户结算币种后 ×数量 累加(price_source=none 无价跳过)
  const total = rows.reduce((sum, r) => {
    if (!r.product || r.product.price_source === "none") return sum;
    return sum + convert(r.product.price, r.product.currency || "USD") * r.item.qty;
  }, 0);
  // 结账条目: 需经目录解析出 CRM 商品 ID(product_id); price_source=none 无价不可购
  const checkoutItems = rows
    .filter((r) => r.product && r.product.price_source !== "none")
    .map((r) => ({
      product_id: (r.product as StorefrontProduct).product_id,
      quantity: r.item.qty,
    }));
  // 任一项解析不出 product_id(目录拉取失败/已下架)时不允许结账
  const canCheckout = checkoutItems.length > 0 && checkoutItems.length === rows.length;

  const handleCheckout = async () => {
    if (!canCheckout || checking) return;
    setChecking(true);
    setCheckoutError("");
    try {
      const { checkout_url } = await requestCheckout(
        checkoutItems,
        locale,
        currency,
        dict.cart.checkoutFailed,
      );
      // 整页跳转 Stripe 托管收银台(外部域名, 不用 next/link)
      window.location.href = checkout_url;
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : dict.cart.checkoutFailed);
      setChecking(false);
    }
  };

  /** PayPal 下单: 拿到 approve_url 后整页跳转 PayPal 审批页。 */
  const handlePayPal = async () => {
    if (!canCheckout || payingPal) return;
    setPayingPal(true);
    setCheckoutError("");
    try {
      const { approve_url } = await createPayPalCheckout(
        checkoutItems,
        locale,
        currency,
        dict.cart.paypalFailed,
      );
      window.location.href = approve_url;
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : dict.cart.paypalFailed);
      setPayingPal(false);
    }
  };

  const canceledAlert = canceled ? (
    <div
      className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800"
      role="status"
    >
      {dict.cart.paymentCanceled}
    </div>
  ) : null;

  if (items.length === 0) {
    return (
      <div className="space-y-6">
        {canceledAlert}
        <div className="grid place-items-center py-24 text-center">
          <p className="text-lg text-muted">{dict.cart.empty}</p>
          <Link href={`/${locale}/products`} className="btn-primary mt-6">
            {dict.cart.emptyCta}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {canceledAlert}
      <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-card">
        {rows.map(({ item, product }) => (
          <div
            key={`${item.storefront_product_id}-${item.sku_id}`}
            className="flex flex-wrap items-center gap-4 border-b border-line p-4 last:border-b-0"
          >
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-alt">
              {product?.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
              ) : null}
            </div>
            <div className="min-w-40 flex-1">
              <Link
                href={product ? `/${locale}/products/${encodeURIComponent(product.slug)}` : "#"}
                className="text-sm font-semibold text-strong no-underline hover:text-brand-700"
              >
                {product?.name ?? `#${item.storefront_product_id}`}
              </Link>
              <p className="mt-1 text-xs text-faint">
                {dict.cart.skuLabel} #{item.sku_id}
              </p>
            </div>
            <div className="text-sm text-muted">
              {product && product.price_source !== "none"
                ? format(product.price, product.currency || "USD")
                : dict.product.quoteOnly}
            </div>
            <QtyStepper
              value={item.qty}
              onChange={(v) => updateQty(item.storefront_product_id, item.sku_id, v)}
              label={dict.cart.qty}
            />
            <div className="w-20 text-right text-sm font-semibold text-strong">
              {product && product.price_source !== "none"
                ? format(Number(product.price ?? 0) * item.qty, product.currency || "USD")
                : "—"}
            </div>
            <button
              type="button"
              onClick={() => remove(item.storefront_product_id, item.sku_id)}
              className="text-xs text-faint underline transition hover:text-normal"
            >
              {dict.cart.remove}
            </button>
          </div>
        ))}
      </div>
      {checkoutError && (
        <p className="text-sm font-medium text-red-600" role="alert">
          {checkoutError}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={clear}
          className="text-sm text-faint underline transition hover:text-normal"
        >
          {dict.cart.clear}
        </button>
        <div className="ml-auto text-right">
          <p className="text-sm text-muted">
            {dict.cart.total}
            <span className="ml-2 font-display text-xl font-bold text-accent-dark">
              {format(total, currency)}
            </span>
          </p>
          <p className="mt-1 text-xs text-faint">{dict.cart.note}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <button
            type="button"
            onClick={handleCheckout}
            disabled={!canCheckout || checking}
            className="btn-primary min-w-36 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {checking ? dict.cart.processing : dict.cart.checkout}
          </button>
          {paypalEnabled && (
            <button
              type="button"
              onClick={handlePayPal}
              disabled={!canCheckout || checking || payingPal}
              className="btn-outline min-w-36 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {payingPal ? dict.cart.processing : dict.cart.paypal}
            </button>
          )}
          <Link
            href={`/${locale}/inquiry?products=${encodeURIComponent(
              items.map((i) => i.storefront_product_id).join(","),
            )}`}
            className="text-xs text-faint underline transition hover:text-normal"
          >
            {dict.cart.requestQuote}
          </Link>
        </div>
      </div>
    </div>
  );
}
