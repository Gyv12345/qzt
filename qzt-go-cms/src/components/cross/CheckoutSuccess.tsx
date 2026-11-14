"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Dict } from "@/i18n";
import { capturePayPal } from "@/lib/cross/checkout";

/**
 * 支付结果页视图(client), 双通道回跳共用:
 * - Stripe: /{locale}/checkout/success?session_id=... — session_id 仅作展示参考
 *   (支付真实性以后端 webhook 落单为准), 不做二次校验, 逻辑保持不变。
 * - PayPal: 审批完成后 PayPal 重定向回本页并自动携带 token=<PayPal订单ID>,
 *   前端凭 token 调 POST /storefront/public/paypal/capture 确认扣款:
 *   进行中 → 文案 + loading(两个跳转按钮禁用); 成功 → 成功态 + PayPal 订单号;
 *   失败 → 红底错误文案, 两个跳转按钮可点(回购物车重试)。
 *
 * capture 仅自动执行一次: ref 防重(React StrictMode 开发期 effect 双跑 /
 * 依赖变化都不会重复扣款确认)。useSearchParams 在静态导出下必须由页面级
 * Suspense 包裹(见 page.tsx)。
 */
type PayPalPhase = "idle" | "processing" | "done" | "failed";

export function CheckoutSuccess({ locale, dict }: { locale: string; dict: Dict }) {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id") ?? "";
  // PayPal 回跳约定: approve 后重定向回本页, query 带 token=<paypal_order_id>
  const ppToken = searchParams.get("token") ?? "";

  const [ppPhase, setPpPhase] = useState<PayPalPhase>("idle");
  const [ppOrderNo, setPpOrderNo] = useState("");
  const [ppError, setPpError] = useState("");
  const captureStartedRef = useRef(false);

  useEffect(() => {
    if (!ppToken || captureStartedRef.current) return;
    captureStartedRef.current = true;
    setPpPhase("processing");
    capturePayPal(ppToken, dict.checkout.ppFailed)
      .then((r) => {
        setPpOrderNo(r.order_no);
        setPpPhase("done");
      })
      .catch((err) => {
        setPpError(err instanceof Error ? err.message : dict.checkout.ppFailed);
        setPpPhase("failed");
      });
  }, [ppToken, dict.checkout.ppFailed]);

  const ppActive = ppToken !== "";
  // idle(首帧, effect 未跑)与 processing 同视: 避免 PayPal 回跳先闪一帧成功态
  const processing = ppActive && (ppPhase === "processing" || ppPhase === "idle");
  const failed = ppActive && ppPhase === "failed";
  const done = ppActive && ppPhase === "done";
  // 进行中禁用两个跳转按钮(Link 用 pointer-events + aria-disabled 表达禁用)
  const navDisabledCls = processing ? "pointer-events-none opacity-50" : "";

  return (
    <div className="mx-auto max-w-xl rounded-xl border border-line bg-surface p-10 text-center shadow-card">
      <div
        className={`mx-auto grid h-16 w-16 place-items-center rounded-full text-3xl ${
          failed ? "bg-red-50 text-red-600" : "bg-brand-50"
        } ${processing ? "animate-pulse" : ""}`}
      >
        <span aria-hidden>{failed ? "✕" : processing ? "…" : "✓"}</span>
      </div>

      {failed ? (
        <>
          <h1 className="mt-6 font-display text-2xl font-bold text-strong">
            {dict.checkout.ppFailed}
          </h1>
          <p
            className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
            role="alert"
          >
            {ppError || dict.checkout.ppFailed}
          </p>
        </>
      ) : processing ? (
        <h1 className="mt-6 font-display text-2xl font-bold text-strong">
          {dict.checkout.ppProcessing}
        </h1>
      ) : (
        <>
          <h1 className="mt-6 font-display text-2xl font-bold text-strong">
            {dict.checkout.successTitle}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            {dict.checkout.successDesc}
          </p>
        </>
      )}

      {done && ppOrderNo && (
        <p className="mt-4 text-xs text-faint">
          {dict.checkout.paypalOrderLabel}
          <span className="ml-2 break-all font-mono font-medium text-brand-700">
            {ppOrderNo}
          </span>
        </p>
      )}
      {!ppActive && sessionId && (
        <p className="mt-4 text-xs text-faint">
          {dict.checkout.sessionLabel}
          <span className="ml-2 break-all font-mono font-medium text-brand-700">
            {sessionId}
          </span>
        </p>
      )}

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href={`/${locale}`}
          className={`btn-primary min-w-36 ${navDisabledCls}`}
          aria-disabled={processing}
        >
          {dict.checkout.backHome}
        </Link>
        <Link
          href={`/${locale}/products`}
          className={`btn-outline min-w-36 ${navDisabledCls}`}
          aria-disabled={processing}
        >
          {dict.checkout.continueShopping}
        </Link>
      </div>
    </div>
  );
}
