import request from '../utils/request'
import type { AiScenario, AiSceneResult } from '../types/ai'

// AI 助手对话页服务(P26):走后端统一 LLM 网关 /api/ai/chat,仅 JWT 鉴权,
// 成本由 sys_config ai.chat_enabled 开关控制(关闭时后端返回 code≠0,由页面气泡内呈现)。

export interface AiChatMessage {
  role: 'user' | 'assistant'
  content: string
}

/** 一次对话的响应:助手回复 + 命中的知识库文档标题( sources 空则未召回) */
export interface AiChatResult {
  reply: string
  sources?: string[]
}

/** 发送一次对话,返回助手回复与知识库来源;业务错误(开关关闭/模型未配置等)由调用方 catch 呈现 */
export const aiChat = (messages: AiChatMessage[]): Promise<AiChatResult> =>
  request.post<unknown, AiChatResult>('/api/ai/chat', { messages }, { silent: true })

// AI 场景(P30):POST /api/ai/agents/:scenario/run,无 body,场景只分析当前登录人自己的数据。
// 模型生成耗时明显长于普通接口,单独放宽超时(默认 15s 不够)。

/** AI 场景请求超时(毫秒) */
const AI_SCENE_TIMEOUT = 120000

/**
 * 运行一次 AI 场景,返回 markdown 结果文本。
 * 开关关闭/模型未配置/暂无数据等业务错误(code≠0)由调用方 catch 后在卡片内呈现(silent,不弹全局提示)。
 */
export const runAiScene = (scenario: AiScenario): Promise<string> =>
  request
    .post<unknown, AiSceneResult>(`/api/ai/agents/${scenario}/run`, undefined, {
      silent: true,
      timeout: AI_SCENE_TIMEOUT,
    })
    .then((data) => data.output)
