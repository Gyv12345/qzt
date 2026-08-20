import type {
  ApiResponse,
  Article,
  Category,
  CmsPage,
  HomepageConfig,
  PageData,
  Partner,
  Product,
  ProductDetail,
  SiteConfig,
  SiteInfo,
  TeamMember,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:9000";

/** ISR 重新验证周期(秒), 与各页面导出的 revalidate = 300 保持一致。 */
const REVALIDATE_SECONDS = 300;

/**
 * 调用后端公开接口并解包响应信封。
 * 后端约定: code===0 表示成功, data 为业务数据。
 * 失败时抛出 Error, 调用方(页面)可捕获并渲染降级 UI。
 */
async function request<T>(path: string, search?: Record<string, string | number | undefined>): Promise<T> {
  const url = new URL(API_BASE + path);
  if (search) {
    for (const [k, v] of Object.entries(search)) {
      if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
    }
  }

  const res = await fetch(url.toString(), {
    // 走 Next fetch Data Cache(ISR), 300s 后台重新验证, 与页面 revalidate 一致;
    // 产品/合作方/文章等公开内容低频变更, 300s 延迟可接受。
    next: { revalidate: REVALIDATE_SECONDS },
  });
  if (!res.ok) {
    throw new Error(`请求失败: ${res.status} ${url.pathname}`);
  }
  const body = (await res.json()) as ApiResponse<T>;
  if (body.code !== 0) {
    throw new Error(body.msg || `接口返回错误码: ${body.code}`);
  }
  return body.data;
}

// ── 产品 ──
export function getProducts(params?: {
  page?: number;
  page_size?: number;
  keyword?: string;
  category?: string;
}): Promise<PageData<Product>> {
  return request<PageData<Product>>("/crm/public/products", params);
}

export function getProduct(id: number | string): Promise<ProductDetail> {
  return request<ProductDetail>(`/crm/public/products/${id}`);
}

// ── 合作方 ──
export function getPartners(params?: {
  page?: number;
  page_size?: number;
  keyword?: string;
  industry?: string;
}): Promise<PageData<Partner>> {
  return request<PageData<Partner>>("/crm/public/partners", params);
}

// ── 团队 ──
export function getTeam(params?: { page?: number; page_size?: number }): Promise<PageData<TeamMember>> {
  return request<PageData<TeamMember>>("/system/public/team", params);
}

// ── CMS ──
export function getArticles(params?: {
  page?: number;
  page_size?: number;
  keyword?: string;
  category_id?: number;
}): Promise<PageData<Article>> {
  return request<PageData<Article>>("/cms/public/articles", params);
}

export function getArticleBySlug(slug: string): Promise<Article> {
  return request<Article>(`/cms/public/articles/slug/${encodeURIComponent(slug)}`);
}

export function getCategories(): Promise<Category[]> {
  return request<Category[]>("/cms/public/categories");
}

export function getPage(slug: string): Promise<CmsPage> {
  return request<CmsPage>(`/cms/public/pages/${encodeURIComponent(slug)}`);
}

/** 获取所有启用的单页(导航渲染用,含外链类型) */
export async function getPages(): Promise<CmsPage[]> {
  try {
    const res = await request<CmsPage[]>("/cms/public/pages");
    return res || [];
  } catch {
    return [];
  }
}

// ── 首页板块配置(公开, 免鉴权) ──
// 走 ISR(300s 重新验证), 与页面 revalidate 一致; admin 改完精选/开关后
// 最迟 5 分钟内生效, 官网低频变更场景可接受。
export async function getHomepageConfig(): Promise<HomepageConfig> {
  const url = new URL(API_BASE + "/system/public/homepage-config");
  const res = await fetch(url.toString(), { next: { revalidate: REVALIDATE_SECONDS } });
  if (!res.ok) throw new Error(`首页配置请求失败: ${res.status}`);
  const body = (await res.json()) as ApiResponse<HomepageConfig>;
  if (body.code !== 0) throw new Error(body.msg || "首页配置错误");
  return body.data;
}

// ── 站点配置 ──
export function getPublicConfig(): Promise<SiteConfig> {
  return request<SiteConfig>("/api/configs/public");
}

/** 站点完整配置(logo/ICP/联系方式等,公开免鉴权)。走 ISR(300s),低频变更足够。 */
export async function getSiteConfig(): Promise<SiteInfo> {
  const url = new URL(API_BASE + "/system/site-config");
  const res = await fetch(url.toString(), { next: { revalidate: REVALIDATE_SECONDS } });
  if (!res.ok) throw new Error(`站点配置请求失败: ${res.status}`);
  const body = (await res.json()) as ApiResponse<SiteInfo>;
  if (body.code !== 0) throw new Error(body.msg || "站点配置错误");
  return body.data;
}

export const apiBase = API_BASE;

// ── 官网留言 → CRM 线索 ──

export interface ContactPayload {
  name: string;
  phone: string;
  email?: string;
  company?: string;
  message: string;
}

/**
 * 提交官网留言(公开接口,无需鉴权)。
 * 后端自动创建 CRM 线索到公海池并通知管理员。
 * 浏览器走同源 /api/contact(Next 服务端代理):API_BASE 是服务器内网地址,
 * 构建期内联进浏览器包后访客根本访问不到(曾经导致生产留言全部失败)。
 */
export async function submitContact(data: ContactPayload): Promise<{ lead_no: string }> {
  const res = await fetch("/api/contact", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  // 网关/后端异常时可能返回非 JSON(如 502 HTML),先校验状态与内容类型,
  // 避免抛出 "Unexpected token '<' ..." 这类不可读错误。
  if (!res.ok) {
    throw new Error("服务暂时不可用,请稍后重试");
  }
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new Error("服务暂时不可用,请稍后重试");
  }

  let body: ApiResponse<{ lead_no: string }>;
  try {
    body = (await res.json()) as ApiResponse<{ lead_no: string }>;
  } catch {
    throw new Error("服务暂时不可用,请稍后重试");
  }
  if (body.code !== 0) {
    throw new Error(body.msg || "提交失败");
  }
  return body.data;
}
