// API 基础地址
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:7890";

// CMS 内容类型（与后端保持一致）
export type CmsContentType =
  | "ARTICLE"
  | "CASE_STUDY"
  | "PRODUCT_SHOWCASE"
  | "PROFILE"
  | "PAGE_ELEMENT";

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

  // === 关联数据 ===
  // 产品展示关联的 CRM 产品
  product?: {
    id: string;
    name: string;
    code: string;
    description?: string;
    price?: number;
  };

  // 人员介绍关联的用户信息
  userProfile?: {
    id: string;
    name: string;
    avatar?: string;
    email?: string;
    phone?: string;
  };

  // 案例关联合同信息
  contract?: {
    id: string;
    contractNo: string;
    totalAmount?: number;
    customer?: {
      id: string;
      name: string;
      shortName?: string;
    };
  };
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
  try {
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
  } catch {
    // 构建时后端可能不可用，返回空数据
    return { data: [], total: 0, page: 1, pageSize: 10, totalPages: 0 };
  }
}

// 根据 slug 获取内容详情
export async function getContentBySlug(slug: string): Promise<CmsContent> {
  try {
    const res = await fetch(`${API_BASE_URL}/public/cms/contents/${slug}`, {
      next: { revalidate: 3600 },
    });

    if (!res.ok) throw new Error("Content not found");
    return res.json();
  } catch {
    // 构建时后端可能不可用，抛出错误让页面处理
    throw new Error("Content not found");
  }
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

// 便捷函数：获取页面元素
export async function getPageElements(params?: {
  page?: number;
  pageSize?: number;
}) {
  return getPublishedContents({ ...params, contentType: "PAGE_ELEMENT" });
}

// 根据 slug 获取页面元素
export async function getPageElement(slug: string): Promise<CmsContent | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/public/cms/page-elements/${slug}`, {
      next: { revalidate: 3600 },
    });

    if (!res.ok) return null; // 允许返回 null，组件可以处理
    return res.json();
  } catch {
    // 构建时后端可能不可用，返回 null 让组件使用默认内容
    return null;
  }
}

// 获取所有标签
export async function getTags(): Promise<
  Array<{ id: string; name: string; color?: string }>
> {
  try {
    const res = await fetch(`${API_BASE_URL}/public/cms/tags`, {
      next: { revalidate: 86400 }, // 标签变更较少，缓存 24 小时
    });

    if (!res.ok) throw new Error("Failed to fetch tags");
    return res.json();
  } catch {
    // 构建时后端可能不可用，返回空数组
    return [];
  }
}

// ==================== 页面管理 API ====================

// 页面元素接口
export interface CmsPageElement {
  id: string;
  sectionType: "HERO" | "STATS" | "FEATURES" | "CTA" | "TESTIMONIALS" | "PARTNERS" | "CONTACT";
  elementType: "heading" | "text" | "button" | "image" | "card" | "list" | "statistic" | "testimonial";
  sortOrder: number;
  content?: string;
  styleConfig?: string;
  visible: boolean;
}

// CMS 页面接口
export interface CmsPage {
  id: string;
  name: string;
  title: string;
  slug: string;
  description?: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  elements: CmsPageElement[];
}

// 根据 slug 获取页面
export async function getPageBySlug(slug: string): Promise<CmsPage | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/public/cms/pages/${slug}`, {
      next: { revalidate: 3600 },
    });

    if (!res.ok) return null;

    const json = await res.json();
    // 后端响应格式：{ success, data }
    return json.data || null;
  } catch {
    // 构建时后端可能不可用，返回 null 让组件使用默认内容
    return null;
  }
}

// ==================== 产品 API ====================

// 产品定价类型
export type PricingType = "FIXED" | "TIER_AMOUNT" | "TIER_COUNT" | "ZERO_DECLARATION";

// 定价规则
export interface PricingRule {
  id: string;
  minQuantity: number;
  maxQuantity: number | null;
  price: number;
}

// 产品接口
export interface Product {
  id: string;
  name: string;
  code: string;
  description?: string;
  price: number;
  pricingType: PricingType;
  status: "ACTIVE" | "INACTIVE";
  timeline?: string; // JSON 字符串
  createdAt: string;
  updatedAt: string;
  // 关联数据
  image?: {
    id: string;
    url: string;
    filename: string;
  };
  pricingRules?: PricingRule[];
}

// 获取 CRM 产品列表（与 CMS 产品展示内容区分）
export async function getCrProducts(params?: {
  page?: number;
  pageSize?: number;
  keyword?: string;
}): Promise<PaginatedResponse<Product>> {
  try {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.set("page", params.page.toString());
    if (params?.pageSize) queryParams.set("pageSize", params.pageSize.toString());
    if (params?.keyword) queryParams.set("keyword", params.keyword);

    const res = await fetch(
      `${API_BASE_URL}/public/products?${queryParams}`,
      { next: { revalidate: 7200 } } // 产品缓存 2 小时
    );

    if (!res.ok) throw new Error("Failed to fetch products");
    return res.json();
  } catch {
    // 构建时后端可能不可用，返回空数据
    return { data: [], total: 0, page: 1, pageSize: 10, totalPages: 0 };
  }
}

// 根据 code 获取产品详情
export async function getProductByCode(code: string): Promise<Product> {
  try {
    const res = await fetch(`${API_BASE_URL}/public/products/${code}`, {
      next: { revalidate: 7200 },
    });

    if (!res.ok) throw new Error("Product not found");
    return res.json();
  } catch {
    // 构建时后端可能不可用，抛出错误让页面处理
    throw new Error("Product not found");
  }
}
