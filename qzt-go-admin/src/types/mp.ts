// 公众号运营中心(mp)模块类型,与 qzt-go-server mp 模块模型保持一致

export interface MpAccount {
  id: number
  name: string
  /** sub=订阅号 srv=服务号 */
  account_type: 'sub' | 'srv'
  app_id: string
  /** 后端已脱敏返回,形如 ****xxxx,不回显明文 */
  app_secret: string
  /** 1启用 0禁用 */
  enabled: number
  created_at: string
  updated_at: string
}

/** 文章状态: draft=草稿 pushed=已推草稿箱 failed=推送失败 */
export interface MpArticle {
  id: number
  account_id: number
  account_name?: string
  title: string
  digest: string
  author: string
  cover_url: string
  /** AI 生成要围绕的主题 */
  theme: string
  /** AI 生成要点,换行分隔 */
  points: string
  /** 正文 Markdown */
  content_md: string
  /** 推送草稿箱后微信侧的素材 ID */
  wx_media_id: string
  status: 'draft' | 'pushed' | 'failed'
  /** 推送失败原因 */
  error_msg: string
  pushed_at: string | null
  created_at: string
  updated_at: string
}

/** 公众号菜单项(与微信 openapi buttons 结构对齐) */
export interface MpMenuItem {
  name: string
  /** view=跳转网页 */
  type: string
  url?: string
  sub_button?: MpMenuItem[]
}

/** 公众号菜单状态(GET /mp/accounts/:id/menu 响应) */
export interface MpMenuState {
  is_menu_open: boolean
  buttons: MpMenuItem[]
}
