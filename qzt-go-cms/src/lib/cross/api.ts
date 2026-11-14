/**
 * 服务端 fetch 包装(qzt-go-cms 同款模式)。
 * ⚠️ NEXT_PUBLIC_API_BASE 仅允许在服务端代码(SSR/RSC/Route Handler)引用:
 * 该值生产环境是服务器内网地址, 浏览器侧一律走同源 /api/storefront 代理。
 */

/** ISR 重新验证周期(秒), 与各页面导出的 revalidate = 300 保持一致。 */
const REVALIDATE_SECONDS = 300;

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://127.0.0.1:9000";

// ── 契约类型(后端 /storefront/public/* 并行开发中, 以此为准) ──

export interface StorefrontSku {
  id: number;
  spec: string;
  detail_SPEC?: string;
  sku_no?: string;
  price?: number | null;
  image_url?: string;
  in_stock: boolean;
}

export interface StorefrontProduct {
  storefront_product_id: number;
  product_id: number;
  slug: string;
  name: string;
  /** 一句话摘要(运营维护) */
  mysummary?: string;
  /** 自动/导入摘要 */
  summary?: string;
  /** 详情正文(纯文本约定, 前端按段落渲染, 不解析 markdown) */
  description?: string;
  price?: number | null;
  currency?: string;
  /** direct=原价 / converted=按 locale 汇率换算 / none=无价(展示 Get a quote) */
  price_source: "direct" | "converted" | "none";
  image_url?: string;
  in_stock: boolean;
  featured?: boolean;
  /** 仅详情接口返回 */
  skus?: StorefrontSku[];
}

export interface StorefrontConfig {
  locales: string[];
  /** 币种汇率表, 如 { USD: 7.2 } */
  rates: Record<string, number>;
  /** PayPal 支付通道是否启用(后端 PayPal 凭据未配置时为 false, 前端据此隐藏 PayPal 按钮) */
  paypal_enabled?: boolean;
}

interface ApiEnvelope<T> {
  code: number;
  msg?: string;
  data?: T;
}
// ── 请求核心 ──

/**
 * 调用后端公开接口并解包响应信封 {code, msg, data}, code===0 为成功。
 * 失败时抛出 Error, 由调用方(页面)捕获并渲染降级 UI(空态), 不炸整页。
 */
async function request<T>(
  path: string,
  search?: Record<string, string | number | undefined>,
): Promise<T> {
  const url = new URL(API_BASE + path);
  if (search) {
    for (const [k, v] of Object.entries(search)) {
      if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
    }
  }

  const res = await fetch(url.toString(), {
    // Next fetch Data Cache(ISR): 300s 后台重新验证, 产品目录低频变更可接受。
    next: { revalidate: REVALIDATE_SECONDS },
  });
  if (!res.ok) {
    throw new Error(`storefront api ${res.status}: ${url.pathname}`);
  }
  const body = (await res.json()) as ApiEnvelope<T>;
  if (body.code !== 0) {
    throw new Error(body.msg || `storefront api code=${body.code}`);
  }
  return body.data as T;
}

// ── 业务接口 ──

export function getStorefrontProducts(
  locale: string,
): Promise<StorefrontProduct[]> {
  return request<StorefrontProduct[]>("/storefront/public/products", { locale });
}

export function getStorefrontProduct(
  slug: string,
  locale: string,
): Promise<StorefrontProduct> {
  return request<StorefrontProduct>(
    `/storefront/public/products/${encodeURIComponent(slug)}`,
    { locale },
  );
}

export function getStorefrontConfig(): Promise<StorefrontConfig> {
  return request<StorefrontConfig>("/storefront/public/config");
}

/**
 * 兜底包装: fetch 失败(后端不可达/超时)时返回 fallback, 页面渲染空态而非 500。
 */
export async function safe<T>(p: Promise<T>, fallback: T): Promise<T> {
  try {
    return await p;
  } catch {
    return fallback;
  }
}
