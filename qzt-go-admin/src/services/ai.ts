import request from '../utils/request'

// AI 助手对话页服务(P26):走后端统一 LLM 网关 /api/ai/chat,仅 JWT 鉴权,
// 成本由 sys_config ai.chat_enabled 开关控制(关闭时后端返回 code≠0,由页面气泡内呈现)。

export interface AiChatMessage {
  role: 'user' | 'assistant'
  content: string
}

/** 发送一次对话,返回助手回复文本;业务错误(开关关闭/模型未配置等)由调用方 catch 呈现 */
export const aiChat = (messages: AiChatMessage[]): Promise<string> =>
  request
    .post<unknown, { reply: string }>('/api/ai/chat', { messages }, { silent: true })
    .then((data) => data.reply)
