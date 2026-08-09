/** 知识库分类 */
export interface KbCategory {
  id: number
  parent_id: number
  name: string
  sort: number
  status: number
  creator_id: number
  created_at: string
  children?: KbCategory[]
}

/** 知识库文档 */
export interface KbDocument {
  id: number
  category_id: number
  title: string
  content: string
  status: string
  creator_id: number
  last_editor_id: number | null
  view_count: number
  created_at: string
  updated_at: string
}

/** 文档版本 */
export interface KbVersion {
  id: number
  document_id: number
  content: string
  editor_id: number
  version_note: string
  version_number: number
  created_at: string
}
