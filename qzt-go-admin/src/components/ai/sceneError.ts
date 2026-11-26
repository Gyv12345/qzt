import { isAxiosError } from 'axios'

/** 把 AI 场景的请求异常转成用户可读文案:业务错误信封(HTTP 错误体)取 msg,网关 5xx/超时/网络错误给专门提示 */
export function sceneErrMsg(e: unknown): string {
  if (isAxiosError(e)) {
    const bodyMsg = (e.response?.data as { msg?: string } | undefined)?.msg
    if (bodyMsg) return bodyMsg
    if (e.response && e.response.status >= 500) return 'AI 服务响应超时或异常,请稍后重试'
    if (e.code === 'ECONNABORTED' || /timeout/i.test(e.message)) return '生成超时,请稍后重试'
    if (!e.response) return '网络异常,请检查网络后重试'
  }
  if (e instanceof Error && e.message) return e.message
  return '生成失败,请稍后重试'
}
