import request from '../utils/request'

export interface AiReportResult {
  /** 生成的报告 Markdown 文本 */
  content: string
  /** 中文周期标签,如 今日/本周/本月 */
  period: string
  agent: string
}

/** AI 工作报告(POST /ai/chat/report; period=day/week/month) */
export const generateReport = (data: {
  period: 'day' | 'week' | 'month'
  start_date?: string
  end_date?: string
}) => request.post<unknown, AiReportResult>('/ai/chat/report', data)
