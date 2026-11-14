"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Dict } from "@/i18n";
import { useCart } from "@/hooks/useCart";
import { useCurrency } from "@/hooks/useCurrency";
import type { StorefrontProduct, StorefrontSku } from "@/lib/cross/api";
import { requestCheckout } from "@/lib/cross/checkout";
import { PriceTag } from "./PriceTag";
import { QtyStepper } from "./QtyStepper";

/**
 * 详情页交互区(client): SKU 选择(单规格隐藏) + 数量步进 + 加入购物车 +
 * 立即购买 + 询盘。立即购买以当前商品单件直调 checkout 接口(不写购物车,
 * 带用户选择的结算币种), 成功整页跳转 Stripe 托管收银台。
 * price_source=none 的商品无价可购, 只保留 Get a quote / Inquire。
 */
export function ProductActions({
  product,
  locale,
  dict,
}: {
  product: StorefrontProduct;
  locale: string;
  dict: Dict;
}) {
  const { add } = useCart();
  const { currency } = useCurrency();
  const skus = useMemo(() => product.skus ?? [], [product.skus]);
  const multiSku = skus.length > 1;

  const [selected, setSelected] = useState<StorefrontSku | null>(
    skus.length > 0 ? skus[0] : null,
  );
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [buying, setBuying] = useState(false);
  const [buyError, setBuyError] = useState("");

  useEffect(() => {
    if (!added) return;
    const t = setTimeout(() => setAdded(false), 2500);
    return () => clearTimeout(t);
  }, [added]);

  const skuSelectable = (s: StorefrontSku) => s.in_stock && product.in_stock;
  const canBuy =
    product.price_source !== "none" &&
    product.in_stock &&
    (!multiSku || (selected != null && selected.in_stock));

  const handleAdd = () => {
    if (!canBuy) return;
    add({
      storefront_product_id: product.storefront_product_id,
      sku_id: selected ? selected.id : 0, // 无 SKU 商品用 0 占位
      qty,
    });
    setAdded(true);
  };
  /** 立即购买: 当前商品单件直调 checkout, 成功跳 Stripe 托管收银台。 */
  const handleBuyNow = async () => {
    if (!canBuy || buying) return;
    setBuying(true);
    setBuyError("");
    try {
      const { checkout_url } = await requestCheckout(
        [{ product_id: product.product_id, quantity: qty }],
        locale,
        currency,
        dict.product.buyFailed,
      );
      window.location.href = checkout_url;
    } catch (err) {
      setBuyError(err instanceof Error ? err.message : dict.product.buyFailed);
      setBuying(false);
    }
  };
  const inquireHref = `/${locale}/inquiry?product=${product.storefront_product_id}`;

  return (
    <div className="space-y-5">
      <div className="flex items-baseline gap-3">
        <PriceTag product={product} sku={selected} dict={dict} className="font-display text-2xl" />
        {!product.in_stock && (
          <span className="rounded-md bg-raised px-2 py-0.5 text-xs text-faint">
            {dict.product.outOfStock}
          </span>
        )}
      </div>

      {multiSku && (
        <div>
          <p className="mb-2 text-sm font-medium text-strong">{dict.product.selectSku}</p>
          <div className="flex flex-wrap gap-2">
            {skus.map((s) => (
              <button
                key={s.id}
                type="button"
                disabled={!skuSelectable(s)}
                onClick={() => setSelected(s)}
                className={`rounded-lg border px-3 py-1.5 text-sm transition ${
                  selected?.id === s.id
                    ? "border-brand-600 bg-brand-50 font-semibold text-brand-700"
                    : "border-line bg-surface text-normal hover:border-brand-500"
                } disabled:cursor-not-allowed disabled:opacity-40 disabled:line-through`}
              >
                {s.spec}
              </button>
            ))}
          </div>
        </div>
      )}
      {product.price_source === "none" ? (
        <div className="flex flex-wrap gap-3">
          <Link href={inquireHref} className="btn-primary">
            {dict.product.getQuote}
          </Link>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <QtyStepper value={qty} onChange={setQty} label={dict.product.qty} />
          <button
            type="button"
            onClick={handleAdd}
            disabled={!canBuy}
            className="btn-primary min-w-36"
          >
            {dict.product.addToCart}
          </button>
          <button
            type="button"
            onClick={handleBuyNow}
            disabled={!canBuy || buying}
            className="btn-outline min-w-36 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {buying ? dict.cart.processing : dict.product.buyNow}
          </button>
          <Link href={inquireHref} className="btn-outline">
            {dict.product.inquire}
          </Link>
        </div>
      )}

      {buyError && (
        <p className="text-sm font-medium text-red-600" role="alert">
          {buyError}
        </p>
      )}

      {added && (
        <p className="text-sm font-medium text-brand-700" role="status">
          {dict.product.added} ·{" "}
          <Link href={`/${locale}/cart`} className="underline hover:text-brand-600">
            {dict.nav.cart}
          </Link>
        </p>
      )}
    </div>
  );
}
