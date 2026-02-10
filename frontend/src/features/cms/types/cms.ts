/**
 * CMS 内容类型
 */

export type ContentType =
  | "ARTICLE"
  | "CASE_STUDY"
  | "PRODUCT_SHOWCASE"
  | "PROFILE"
  | "PAGE_ELEMENT";

export type ContentStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export interface CmsTag {
  id: string;
  name: string;
  slug: string;
  color?: string;
  sortOrder: number;
  contentCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CmsContent {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  coverImage?: string;
  status: ContentStatus;
  contentType: ContentType;
  authorId: string;
  productId?: string;
  userId?: string;
  metaTitle?: string;
  metaDesc?: string;
  keywords?: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  // 关联数据
  author?: {
    id: string;
    name: string;
    email?: string;
  };
  product?: {
    id: string;
    name: string;
    code: string;
    description?: string;
    price?: number;
  };
  userProfile?: {
    id: string;
    name: string;
    avatar?: string;
    email?: string;
    phone?: string;
  };
  tags: CmsTag[];
}

export interface CmsContentFormData {
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  coverImage?: string;
  status?: ContentStatus;
  contentType: ContentType;
  productId?: string;
  userId?: string;
  metaTitle?: string;
  metaDesc?: string;
  keywords?: string;
  tagIds?: string[];
}

export interface CmsContentQuery {
  page?: number;
  pageSize?: number;
  keyword?: string;
  contentType?: ContentType;
  status?: ContentStatus;
  tagId?: string;
  authorId?: string;
}

export interface CmsContentsResponse {
  total: number;
  data: CmsContent[];
  page: number;
  pageSize: number;
  totalPages: number;
}

// 内容类型配置
export const CONTENT_TYPE_CONFIG: Record<
  ContentType,
  { label: string; icon: string; description: string }
> = {
  ARTICLE: {
    label: "文章",
    icon: "FileText",
    description: "公司动态、行业资讯",
  },
  CASE_STUDY: {
    label: "案例",
    icon: "Briefcase",
    description: "客户成功案例、项目展示",
  },
  PRODUCT_SHOWCASE: {
    label: "产品展示",
    icon: "Package",
    description: "产品详细介绍",
  },
  PROFILE: { label: "人员介绍", icon: "Users", description: "团队成员介绍" },
  PAGE_ELEMENT: {
    label: "页面元素",
    icon: "Layout",
    description: "网站页面可编辑元素",
  },
};

export const CONTENT_STATUS_CONFIG: Record<
  ContentStatus,
  { label: string; color: string }
> = {
  DRAFT: { label: "草稿", color: "default" },
  PUBLISHED: { label: "已发布", color: "success" },
  ARCHIVED: { label: "已归档", color: "secondary" },
};
