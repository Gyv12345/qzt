/**
 * 营销模块 API 契约类型。
 * 与后端 internal/model/marketing/ + internal/module/marketing/service/ 对齐。
 */

/** 渠道账号(巨量引擎)。token 字段后端脱敏不返回 */
export interface MarketingAccount {
  id: number
  /** 账号备注名 */
  name: string
  /** 渠道(当前仅 oceanengine 巨量引擎) */
  channel: string
  /** 开放平台应用 ID */
  app_id: string
  /** 已授权广告主 ID(逗号分隔) */
  advertiser_ids: string
  /** 授权状态:0 待授权 1 已授权 2 授权失效 */
  status: 0 | 1 | 2
  /** 1 启用 0 停用(停用后定时任务跳过) */
  enabled: number
  token_expires_at?: string | null
  refresh_expires_at?: string | null
  /** 上次线索同步游标时间 */
  last_sync_at?: string | null
  created_at?: string
  updated_at?: string
}

/** 新增/编辑账号。app_secret 编辑时留空 = 不修改 */
export interface MarketingAccountPayload {
  name: string
  app_id: string
  app_secret?: string
  enabled?: number
}

/** 线索同步日志 */
export interface MarketingLeadLog {
  id: number
  account_id: number
  /** 外部线索 ID(飞鱼 clue_id) */
  external_id: string
  /** 入库后的 crm_lead.id(重复/失败为 null) */
  lead_id?: number | null
  name: string
  phone: string
  company: string
  /** 广告计划名称 */
  campaign_name: string
  /** 广告名称 */
  ad_name: string
  /** 留资时间 */
  lead_create_time?: string | null
  /** 1 已入库 2 重复跳过 3 失败 */
  status: 1 | 2 | 3
  /** 说明(重复/失败原因) */
  detail: string
  created_at?: string
}

/** 手动同步返回的统计 */
export interface MarketingSyncResult {
  inserted: number
  skipped: number
  failed: number
}
