/** GEO 监测看板类型契约(与后端 internal/model/geo 对齐) */

export type GeoPromptGroup = 'brand' | 'category' | 'scenario'

export interface GeoPrompt {
  id: number
  question: string
  group_type: GeoPromptGroup
  enabled: boolean
  sort: number
  remark: string
  created_at: string
  updated_at: string
}

export interface GeoPromptPayload {
  question: string
  group_type: GeoPromptGroup
  enabled: boolean
  sort: number
  remark: string
}

export interface GeoPlatform {
  id: number
  name: string
  base_url: string
  model: string
  enabled: boolean
  remark: string
  api_key_set: boolean
  api_key_mask: string
  created_at: string
  updated_at: string
}

/** api_key 留空表示保留原值(编辑时) */
export interface GeoPlatformPayload {
  name: string
  base_url: string
  api_key: string
  model: string
  enabled: boolean
  remark: string
}

export interface GeoRun {
  id: number
  trigger: 'manual' | 'schedule'
  status: 'running' | 'done' | 'failed'
  total_results: number
  error_count: number
  mentioned_count: number
  with_link_count: number
  total_score: number
  max_score: number
  /** 0-1 小数 */
  recommend_rate: number
  /** 0-1 小数 */
  own_cite_rate: number
  error_msg: string
  started_at: string
  finished_at: string | null
}

export interface GeoResultRow {
  id: number
  prompt_id: number
  platform_id: number
  prompt_text: string
  platform_name: string
  /** 0 未提及 / 1 提及行简 / 2 提及且带官网链接 */
  score: number
  mention_brand: boolean
  has_own_link: boolean
  own_cite: boolean
  /** JSON 数组字符串 */
  cited_urls: string
  competitors: string
  latency_ms: number
  status: string
  error_msg: string
  answer: string
  created_at: string
}

export interface RunStartResult {
  run: GeoRun
  prompt_count: number
  platform_count: number
}

// ---------- 信源产线 ----------

export type GeoTopicOrigin = 'matrix' | 'ai' | 'manual'
export type GeoTopicStatus = 'pending' | 'approved' | 'rejected' | 'used'

export interface GeoTopic {
  id: number
  question: string
  origin: GeoTopicOrigin
  status: GeoTopicStatus
  reason: string
  source_run_id: number
  prompt_id: number
  created_at: string
  updated_at: string
}

export interface GeoTopicPayload {
  question: string
  reason: string
}

export type GeoSourceContentType = 'article' | 'video' | 'video_script'
export type GeoSourcePlatform = 'wechat_mp' | 'douyin' | 'xhs' | 'zhihu' | 'csdn' | 'toutiao'
export type GeoSourceStatus = 'generated' | 'pushed' | 'published' | 'failed' | 'skipped'

export interface GeoSource {
  id: number
  topic_id: number
  content_type: GeoSourceContentType
  platform: GeoSourcePlatform
  genre: string
  title: string
  digest: string
  content_md: string
  video_url: string
  video_task_id: string
  status: GeoSourceStatus
  media_id: string
  publish_id: string
  publish_url: string
  variant_of: number
  trigger: 'manual' | 'schedule'
  error: string
  /** P18 AI 质检状态：none 未质检 / pass 通过 / warn 通过但有建议 / blocked 阻断 */
  qc_status: 'none' | 'pass' | 'warn' | 'blocked'
  /** P18 AI 质检结果 JSON 字符串（分维度得分/原文定位/修改建议） */
  qc_result: string
  created_at: string
  updated_at: string
  /** 列表接口拼回的选题问题 */
  topic_question?: string
}

export interface GeoSourcePayload {
  topic_id: number
  content_type: GeoSourceContentType
  platform: GeoSourcePlatform
  genre: string
  title: string
  digest: string
  content_md: string
}

export interface GeoDouyinAccount {
  id: number
  open_id: string
  nickname: string
  expires_at: string
  enabled: boolean
}

export interface GeoPipelineResult {
  topics_generated: number
  article_id: number
  article_title: string
  article_pushed: boolean
  video_id: number
  video_rendered: boolean
  notes: string
}
