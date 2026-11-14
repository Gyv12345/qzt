/** 网盘文件 */
export interface CloudFile {
  id: number
  parent_id: number
  name: string
  /** 0=文件 1=文件夹 */
  is_dir: number
  object_key: string
  url: string
  size: number
  content_type: string
  /** personal/dept/public */
  scope: string
  owner_id: number | null
  dept_id: number | null
  creator_id: number
  status: number
  created_at: string
  updated_at: string
}

/** 创建分享返回 */
export interface CloudShareCreated {
  token: string
  /** 空串表示无提取码 */
  extract_code: string
  expire_at: string
}

/** 我的分享列表项 */
export interface CloudShare {
  id: number
  file_name: string
  size: number
  download_count: number
  expire_at: string
  /** true=已取消 */
  disabled: boolean
  token: string
}

/** 公开分享元信息(免登录) */
export interface CloudShareMeta {
  file_name: string
  size: number
  expire_at: string
  /** true=需要提取码 */
  has_code: boolean
  download_count: number
}
