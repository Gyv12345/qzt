// CMS 资讯类型(移动端子集),与 qzt-go-server cms 模型对齐

export interface CmsArticle {
  id: number
  title: string
  slug: string
  summary: string
  content: string
  cover_url: string
  category_id: number
  author_name: string
  /** 0草稿 1已发布 */
  status: number
  is_top: number
  is_hot: number
  view_count: number
  sort: number
  created_at: string
  updated_at: string
}
