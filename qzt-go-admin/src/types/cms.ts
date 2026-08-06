// CMS 模块类型,与 qzt-go-server cms 模块模型保持一致

export interface CmsCategory {
  id: number
  /** 0=根 */
  parent_id: number
  name: string
  slug: string
  sort: number
  /** 1启用 0禁用 */
  status: number
  remark: string
  children?: CmsCategory[]
  created_at?: string
  updated_at?: string
}

export interface CmsTag {
  id: number
  name: string
  slug: string
  sort: number
  status: number
  created_at?: string
  updated_at?: string
}

/** 文章状态: 0草稿 1已发布 */
export interface CmsArticle {
  id: number
  title: string
  slug: string
  summary: string
  content: string
  cover_url: string
  category_id: number
  author_id: number
  author_name: string
  status: number
  is_top: number
  is_hot: number
  view_count: number
  sort: number
  category?: CmsCategory
  tags?: CmsTag[]
  created_at: string
  updated_at: string
}

export interface CmsPage {
  id: number
  title: string
  slug: string
  /** page内部页 link外部链接 */
  link_type: string
  external_url: string
  content: string
  /** 1启用 0禁用 */
  status: number
  sort: number
  created_at: string
  updated_at: string
}

// ---------- 请求体 ----------

export interface CmsArticlePayload {
  title: string
  slug?: string
  summary?: string
  content?: string
  cover_url?: string
  category_id?: number
  status?: number
  is_top?: number
  is_hot?: number
  sort?: number
  tag_ids?: number[]
}

export interface CmsCategoryPayload {
  name: string
  slug?: string
  parent_id?: number
  sort?: number
  status?: number
  remark?: string
}

export interface CmsPagePayload {
  title: string
  slug: string
  link_type?: string
  external_url?: string
  content?: string
  status?: number
  sort?: number
}

export interface CmsTagPayload {
  name: string
  slug?: string
  sort?: number
  status?: number
}
