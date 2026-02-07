// API 基础地址
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:7890";

// CMS 内容类型（与后端保持一致）
export type CmsContentType =
  | "ARTICLE"
  | "CASE_STUDY"
  | "PRODUCT_SHOWCASE"
  | "PROFILE";

// CMS 内容接口
export interface CmsContent {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  contentType: CmsContentType;
  coverImage?: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  metaTitle?: string;
  metaDesc?: string;
  keywords?: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  tags?: Array<{ id: string; name: string; color?: string }>;
  author?: { id: string; username: string; avatar?: string };
}

// 分页响应（与后端保持一致）
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// 通用内容获取函数（带 ISR 缓存）
export async function getPublishedContents(params?: {
  contentType?: CmsContentType;
  page?: number;
  pageSize?: number;
  keyword?: string;
  tagId?: string;
}): Promise<PaginatedResponse<CmsContent>> {
  const queryParams = new URLSearchParams();
  if (params?.contentType) queryParams.set("contentType", params.contentType);
  if (params?.page) queryParams.set("page", params.page.toString());
  if (params?.pageSize) queryParams.set("pageSize", params.pageSize.toString());
  if (params?.keyword) queryParams.set("keyword", params.keyword);
  if (params?.tagId) queryParams.set("tagId", params.tagId);

  const res = await fetch(
    `${API_BASE_URL}/public/cms/contents?${queryParams}`,
    {
      next: { revalidate: 3600 }, // ISR: 每小时重新生成
    }
  );

  if (!res.ok) throw new Error("Failed to fetch contents");
  return res.json();
}

// 根据 slug 获取内容详情
export async function getContentBySlug(slug: string): Promise<CmsContent> {
  const res = await fetch(`${API_BASE_URL}/public/cms/contents/${slug}`, {
    next: { revalidate: 3600 },
  });

  if (!res.ok) throw new Error("Content not found");
  return res.json();
}

// 便捷函数：获取文章
export async function getArticles(params?: {
  page?: number;
  pageSize?: number;
}) {
  return getPublishedContents({ ...params, contentType: "ARTICLE" });
}

// 便捷函数：获取案例
export async function getCases(params?: {
  page?: number;
  pageSize?: number;
}) {
  return getPublishedContents({ ...params, contentType: "CASE_STUDY" });
}

// 便捷函数：获取产品展示
export async function getProducts(params?: {
  page?: number;
  pageSize?: number;
}) {
  return getPublishedContents({
    ...params,
    contentType: "PRODUCT_SHOWCASE",
  });
}

// 便捷函数：获取人员介绍
export async function getProfiles(params?: {
  page?: number;
  pageSize?: number;
}) {
  return getPublishedContents({ ...params, contentType: "PROFILE" });
}

// 获取所有标签
export async function getTags(): Promise<
  Array<{ id: string; name: string; color?: string }>
> {
  const res = await fetch(`${API_BASE_URL}/public/cms/tags`, {
    next: { revalidate: 86400 }, // 标签变更较少，缓存 24 小时
  });

  if (!res.ok) throw new Error("Failed to fetch tags");
  return res.json();
}
