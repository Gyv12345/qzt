/**
 * AI 模型档案与 AI 场景契约(P30,与 qzt-go-server swagger 保持一致)。
 */

/** 场景标识(POST /api/ai/agents/:scenario/run) */
export type AiScenario = 'insight' | 'approval-summary' | 'daily-report'

/**
 * AI 模型档案(GET /system/ai/models 列表项)。
 * api_key 后端已脱敏返回,形如 ****abcd,不回显明文。
 */
export interface AiModel {
  id: number
  name: string
  /** OpenAI 兼容端点,如 https://api.deepseek.com/v1 */
  base_url: string
  /** 模型标识,如 deepseek-chat / qwen-plus */
  model: string
  /** 脱敏密钥,形如 ****abcd */
  api_key: string
  /** 1=默认(生效)档案;默认档案不可删除 */
  is_default: number
  /** 1=启用(0=停用档案不可激活) */
  enabled: number
  remark?: string
  created_at?: string
  updated_at?: string
}

/** 新建/更新模型档案。更新时 api_key 传 **** 开头(即原脱敏值)表示不修改 */
export interface AiModelPayload {
  name: string
  base_url: string
  model: string
  api_key?: string
  remark?: string
}

/** 当前生效模型(GET /system/ai/models/current)。source=env 表示仍走环境变量配置 */
export interface AiCurrentModel {
  source: 'db' | 'env'
  /** db 来源的档案 ID;env 来源为 0 */
  id?: number
  name?: string
  base_url?: string
  /** 脱敏密钥(****abcd);环境变量未配置时为空串 */
  api_key?: string
  model?: string
}

/** 场景运行结果(POST /api/ai/agents/:scenario/run) */
export interface AiSceneResult {
  /** markdown 格式的分析结果 */
  output: string
}
