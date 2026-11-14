/**
 * 浏览器侧 checkout 接口封装(与 InquiryForm 同模式: 同源相对路径 /prod-api,
 * 生产 nginx 反代到后端 9000 去前缀; 本地 dev 由 next.config rewrites 转发)。
 *
 * 契约(已锁定):
 * - POST /storefront/public/checkout (Stripe)
 *     body  {"items":[{"product_id":123,"quantity":1}],"locale":"en","currency":"USD"}
 *     data  {"checkout_url":"https://checkout.stripe.com/...","order_no":"SF..."}
 *   currency 可选(用户在站点选择的结算币种, 后端按该币种快照价格并以此币种收银);
 *   缺省/空串时不下发, 后端默认 USD。
 * - POST /storefront/public/paypal/create (PayPal)
 *     body  {"items":[...],"locale":"en","currency":"USD"}
 *     data  {"order_no":"SF...","paypal_order_id":"...","approve_url":"https://www.paypal.com/..."}
 *   调用方拿到 approve_url 后整页跳转; PayPal 审批后回跳成功页并携带
 *   token=<paypal_order_id>, 由成功页调 capture 确认扣款。
 * - POST /storefront/public/paypal/capture
 *     body  {"paypal_order_id":"..."}
 *     data  {"order_no":"SF...","status":"paid"}
 *
 * product_id 为后端目录接口返回的 CRM 商品 ID(StorefrontProduct.product_id)。
 */

export interface CheckoutItem {
  product_id: number;
  quantity: number;
}

export interface CheckoutResult {
  checkout_url: string;
  order_no: string;
}

export interface PayPalCheckoutResult {
  order_no: string;
  paypal_order_id: string;
  approve_url: string;
}

export interface PayPalCaptureResult {
  order_no: string;
  status: string;
}

/** 信封形状(三个接口一致), 供解包函数复用。 */
interface Envelope<T> {
  code: number;
  msg?: string;
  data?: T;
}

/**
 * 解包 POST 响应信封: 网关异常时可能是 502 HTML, 先验 content-type 再 parse;
 * code!==0 抛 Error, message 优先取后端信封 msg(如「支付通道未配置」
 * 「不支持的结算币种: X」), 否则回落到调用方传入的通用文案。
 */
async function postEnvelope<T>(
  path: string,
  payload: Record<string, unknown>,
  okData: (data: T) => boolean,
  fallbackError: string,
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error(fallbackError);
  }
  if (!res.ok) {
    throw new Error(fallbackError);
  }
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new Error(fallbackError);
  }
  const body = (await res.json()) as Envelope<T>;
  if (body.code !== 0 || !body.data || !okData(body.data)) {
    throw new Error(body.msg || fallbackError);
  }
  return body.data;
}

/**
 * 发起 Stripe 托管收银台结账。成功返回 checkout_url(由调用方 window.location
 * 跳转); 失败抛 Error, message 优先取后端信封 msg, 否则回落到调用方传入的
 * 通用文案。currency 为用户选择的结算币种(空串=不下发, 后端默认 USD)。
 */
export async function requestCheckout(
  items: CheckoutItem[],
  locale: string,
  currency: string,
  fallbackError: string,
): Promise<CheckoutResult> {
  const data = await postEnvelope<CheckoutResult>(
    "/prod-api/storefront/public/checkout",
    { items, locale, currency: currency || undefined },
    (d) => Boolean(d.checkout_url),
    fallbackError,
  );
  return {
    checkout_url: data.checkout_url,
    order_no: data.order_no ?? "",
  };
}

/**
 * 发起 PayPal 订单并返回 approve_url(由调用方 window.location 整页跳转,
 * PayPal 审批完成后回跳成功页并携带 token=<paypal_order_id>)。
 */
export async function createPayPalCheckout(
  items: CheckoutItem[],
  locale: string,
  currency: string,
  fallbackError: string,
): Promise<PayPalCheckoutResult> {
  return postEnvelope<PayPalCheckoutResult>(
    "/prod-api/storefront/public/paypal/create",
    { items, locale, currency: currency || undefined },
    (d) => Boolean(d.approve_url) && Boolean(d.paypal_order_id),
    fallbackError,
  );
}

/**
 * 确认 PayPal 扣款(成功页回跳后凭 token 调用; 后端落单并回传订单号)。
 * 失败抛 Error(message 优先取后端信封 msg, 如「订单状态不允许支付确认」)。
 */
export async function capturePayPal(
  paypalOrderId: string,
  fallbackError: string,
): Promise<PayPalCaptureResult> {
  return postEnvelope<PayPalCaptureResult>(
    "/prod-api/storefront/public/paypal/capture",
    { paypal_order_id: paypalOrderId },
    (d) => Boolean(d.order_no),
    fallbackError,
  );
}
