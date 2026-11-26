import request from '../utils/request'
import type {
  AiFollowupDraftPayload,
  AiFollowupDraftResult,
  AiFollowupTemplate,
  AiScenario,
  AiSceneResult,
  AiModelsStatus,
  AiToolTrace,
} from '../types/ai'

// AI 助手对话页服务(P26):走后端统一 LLM 网关 /api/ai/chat,仅 JWT 鉴权,
// 成本由 sys_config ai.chat_enabled 开关控制(关闭时后端返回 code≠0,由页面气泡内呈现)。

export interface AiChatMessage {
  role: 'user' | 'assistant'
  content: string
}

/** 一次对话的响应:助手回复 + 命中的知识库文档标题(sources 空则未召回)+ 工具调用过程(P34) */
export interface AiChatResult {
  reply: string
  sources?: string[]
  tool_trace?: AiToolTrace[]
  /** 思考过程文本(think=true 且模型支持时返回) */
  reasoning?: string
}

/** 对话超时:模型生成耗时明显长于普通接口,默认 15s 不够,与 AI 场景同标准放宽 */
const AI_CHAT_TIMEOUT = 120000

/**
 * 发送一次对话,返回助手回复、知识库来源与工具调用过程。
 * model 为悬浮球(P34)/对话页选择的模型标识(POST body.model),不传走后端默认档案。
 * 静默模式:业务错误(开关关闭/模型未配置等)由调用方 catch 呈现
 * (P26 对话页仅在气泡内呈现;P34 悬浮球自行追加 message.error)。
 */
export const aiChat = (
  messages: AiChatMessage[],
  model?: string,
  opts?: { use_kb?: boolean; enable_search?: boolean; think?: boolean; think_effort?: string },
): Promise<AiChatResult> =>
  request.post<unknown, AiChatResult>(
    '/api/ai/chat',
    {
      messages,
      ...(model ? { model } : {}),
      ...(opts?.use_kb === false ? { use_kb: false } : {}),
      ...(opts?.enable_search ? { enable_search: true } : {}),
      ...(opts?.think ? { think: true, ...(opts.think_effort ? { think_effort: opts.think_effort } : {}) } : {}),
    },
    { silent: true, timeout: AI_CHAT_TIMEOUT },
  )

/** AI 能力状态与模型列表(GET /api/ai/models,P34 悬浮球)。静默调用:后端未上线该接口时球不渲染且不弹错 */
export const aiGetModels = (): Promise<AiModelsStatus> =>
  request.get<unknown, AiModelsStatus>('/api/ai/models', { silent: true })

// AI 场景(P30):POST /api/ai/agents/:scenario/run。经营洞察/审批摘要/日报无 body,
// 场景只分析当前登录人自己的数据;入口内嵌在各业务页面(工作台/审批待办/工作日志),无独立场景页。
// 模型生成耗时明显长于普通接口,单独放宽超时(默认 15s 不够)。

/** AI 场景请求超时(毫秒) */
const AI_SCENE_TIMEOUT = 120000

/**
 * 运行一次 AI 场景,返回 markdown 结果;没有可分析的数据时 empty=true、output 是一句说明。
 * 开关关闭/模型未配置等业务错误(code≠0)由调用方 catch 后在入口内呈现(silent,不弹全局提示)。
 */
export const runAiScene = (scenario: AiScenario): Promise<AiSceneResult> =>
  request.post<unknown, AiSceneResult>(`/api/ai/agents/${scenario}/run`, undefined, {
    silent: true,
    timeout: AI_SCENE_TIMEOUT,
  })

/** 跟进草稿模板目录(GET /api/ai/agents/followup-draft/templates) */
export const listAiFollowupTemplates = (): Promise<AiFollowupTemplate[]> =>
  request.get<unknown, AiFollowupTemplate[]>('/api/ai/agents/followup-draft/templates', { silent: true })

/**
 * 生成跟进草稿:只产出文本,由销售本人修改后再提交跟进记录。
 * 权限不足/开关关闭/限流等业务错误由调用方 catch 后在弹窗内呈现。
 */
export const runAiFollowupDraft = (payload: AiFollowupDraftPayload): Promise<AiFollowupDraftResult> =>
  request.post<unknown, AiFollowupDraftResult>('/api/ai/agents/followup-draft/run', payload, {
    silent: true,
    timeout: AI_SCENE_TIMEOUT,
  })
