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
  /** true=没有可分析的数据:output 只是一句说明而不是结果,前端据此隐藏复制/填入等操作 */
  empty?: boolean
}

/** 跟进草稿模板(GET /api/ai/agents/followup-draft/templates) */
export interface AiFollowupTemplate {
  key: string
  label: string
  desc: string
  /** 默认语气:gentle 温和 / concise 简洁 / formal 正式 */
  default_tone: string
  /** 建议的跟进类型(WECHAT/PHONE/VISIT/EMAIL/OTHER) */
  follow_type: string
}

/** 跟进草稿入参(POST /api/ai/agents/followup-draft/run):customer_id / lead_id 二选一 */
export interface AiFollowupDraftPayload {
  customer_id?: number
  lead_id?: number
  /** 可选:把该条待办计划作为本次要执行的动作 */
  plan_id?: number
  template: string
  /** 留空用模板默认语气 */
  tone?: string
}

/** 跟进草稿结果:只是初稿,由销售本人修改后再提交跟进记录 */
export interface AiFollowupDraftResult {
  /** 草稿正文(纯文本) */
  output: string
  /** 发送前核对提示(极限词/交期承诺/具体金额),空表示未命中 */
  warnings: string[]
}

/**
 * 全局 AI 悬浮球契约(P34)。
 * GET /api/ai/models 返回 AI 能力总开关与可用模型列表(与 /system/ai/models 管理端字段不同,勿混用)。
 */
export interface AiModelsStatus {
  /** true=AI 对话总开关开启(悬浮球据此决定是否渲染) */
  enabled: boolean
  /** true=工具调用能力开启(tool_trace 才可能有值) */
  tools_enabled: boolean
  models: AiChatModelOption[]
}

/** GET /api/ai/models 列表项(悬浮球模型切换 Select 用) */
export interface AiChatModelOption {
  id: number
  name: string
  /** 模型标识,如 deepseek-chat,POST /api/ai/chat 的 model 参数取该值 */
  model: string
  /** 1=默认模型 */
  is_default: number
}

/** 工具调用过程明细(AI 气泡上方过程条逐条展示) */
export interface AiToolTrace {
  tool: string
  args_summary?: string
  result_summary?: string
  ok?: boolean
  ms?: number
}
