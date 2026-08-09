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
