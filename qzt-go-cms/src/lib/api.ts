import type {
  ApiResponse,
  Article,
  Category,
  CmsPage,
  PageData,
  Partner,
  Product,
  ProductDetail,
  SiteConfig,
  SiteInfo,
  TeamMember,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

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
    // 服务端渲染时禁用缓存重验证由各调用方通过 next.revalidate 控制,
    // 此处默认让 fetch 遵循 Next 的缓存语义。
    next: { revalidate: 300 },
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

// ── 站点配置 ──
export function getPublicConfig(): Promise<SiteConfig> {
  return request<SiteConfig>("/api/configs/public");
}

/** 站点完整配置(logo/ICP/联系方式等,公开免鉴权)。不走缓存,确保修改后即时生效。 */
export async function getSiteConfig(): Promise<SiteInfo> {
  const url = new URL(API_BASE + "/system/site-config");
  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) throw new Error(`站点配置请求失败: ${res.status}`);
  const body = (await res.json()) as ApiResponse<SiteInfo>;
  if (body.code !== 0) throw new Error(body.msg || "站点配置错误");
  return body.data;
}

export const apiBase = API_BASE;
