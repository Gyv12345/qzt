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
  /** 定时发布时间(RFC3339 或空) */
  publish_at?: string
  /** 内容有效期至(RFC3339 或空) */
  expire_at?: string
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

/** 文章版本快照(P20 修订版本) */
export interface CmsArticleVersion {
  id: number
  article_id: number
  version_no: number
  title: string
  summary: string
  content: string
  cover_url: string
  editor_id: number
  editor_name: string
  created_at: string
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
  /** 定时发布时间(空=立即;"YYYY-MM-DD HH:mm:ss") */
  publish_at?: string
  /** 内容有效期至(空=永久;"YYYY-MM-DD HH:mm:ss") */
  expire_at?: string
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

// ---------- 搜索引擎推送 ----------

/** 推送通道: baidu=百度主动推送 indexnow=IndexNow */
export type CmsPushChannel = 'baidu' | 'indexnow'

/** 一次推送操作的结果汇总 */
export interface CmsPushResult {
  channel: CmsPushChannel
  total: number
  success: number
  /** 24h 内已推送过 / 配额耗尽未推 */
  skipped: number
  failed: number
  /** 百度当日剩余配额(仅 baidu 通道有值) */
  remain: number
  message?: string
}

/** 推送日志 */
export interface CmsPushLog {
  id: number
  channel: CmsPushChannel
  url: string
  ref_type: string
  ref_id: number
  /** success / failed / skipped */
  status: string
  http_code: number
  resp_body: string
  error: string
  batch_id: string
  created_at: string
}
