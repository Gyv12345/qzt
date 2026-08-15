import DOMPurify from 'dompurify'

/**
 * 富文本 HTML 消毒。
 *
 * 渲染后端返回的富文本(news/kb 详情等)前必须经过此函数,
 * 防止存储型 XSS(script/事件处理器/javascript: 协议等会被 DOMPurify 剥离)。
 */
export function sanitizeHtml(html: string | null | undefined): string {
  if (!html) return ''
  return DOMPurify.sanitize(html)
}
