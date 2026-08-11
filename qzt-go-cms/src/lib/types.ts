// qzt-go-cms 公共数据类型, 对应 qzt-go-server 的公开接口返回结构。

/** 后端统一响应信封 {code, msg, data, timestamp} */
export interface ApiResponse<T = unknown> {
  code: number;
  msg: string;
  data: T;
  timestamp?: number;
}

/** 分页列表返回结构 {list, total} */
export interface PageData<T> {
  list: T[];
  total: number;
}

// ── 产品 ──
export interface ProductPrice {
  id: number;
  product_id: number;
  price_type: string;
  price: string;
  min_quantity?: number | null;
  remark?: string;
}

export interface Product {
  id: number;
  name: string;
  product_no: string;
  category: string;
  unit: string;
  standard_price: string;
  status: number;
  image_url: string;
  description: string;
}

export interface ProductDetail extends Product {
  prices: ProductPrice[];
}

// ── 合作方 / 客户 ──
export interface Partner {
  id: number;
  name: string;
  level: string;
  industry: string;
  source: string;
}

// ── 团队成员 ──
export interface TeamMember {
  id: number;
  nickname: string;
  avatar: string;
  position: string;
}

// ── CMS ──
export interface Article {
  id: number;
  title: string;
  slug: string;
  summary: string;
  content?: string;
  cover_url?: string;
  category_id?: number;
  category?: { id: number; name: string; slug?: string } | null;
  tags?: { id: number; name: string }[];
  view_count?: number;
  is_top?: number;
  is_hot?: number;
  created_at?: string;
}

export interface Category {
  id: number;
  name: string;
  slug?: string;
  parent_id?: number;
  children?: Category[];
}

export interface CmsPage {
  id: number;
  title: string;
  slug: string;
  link_type: "page" | "link";
  external_url: string;
  content: string;
  status: number;
  sort: number;
}

/** 站点公共配置 key->value */
export type SiteConfig = Record<string, string>;

/** 站点完整配置(来自 /system/site-config) */
export interface SiteInfo {
  site_name: string;
  logo_url: string;
  slogan: string;
  description: string;
  contact_phone: string;
  contact_email: string;
  contact_address: string;
  work_hours: string;
  copyright: string;
  icp_beian: string;
  public_security_beian: string;
  public_security_beian_url: string;
  hero_badge?: string;
  hero_title?: string;
  hero_subtitle?: string;
  favicon_url?: string;
  keywords?: string;
}

// ── 首页板块配置(来自 /system/public/homepage-config) ──

export interface HomepageSectionItem {
  id: number;
  name: string;
  image_url?: string;
  description?: string;
  category?: string;
  level?: string;
  industry?: string;
  source?: string;
  avatar?: string;
  position?: string;
}

export interface HomepageSection {
  enabled: boolean;
  items: HomepageSectionItem[];
}

export interface HomepageConfig {
  product?: HomepageSection;
  partner?: HomepageSection;
  team?: HomepageSection;
}
