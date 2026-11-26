/**
 * 把 AI 日报(markdown,固定「## 今日完成」「## 明日计划建议」两段)拆成工作日志的两个字段。
 * 去掉标题行与列表符号,保留条目文本;其他段落忽略。拆不出内容时返回空串,由表单保持原样。
 */
export function splitDailyReport(markdown: string): { content: string; plan: string } {
  const content: string[] = []
  const plan: string[] = []
  let target: string[] | null = null

  for (const raw of markdown.split('\n')) {
    const line = raw.trim()
    if (line.startsWith('#')) {
      if (line.includes('今日完成')) target = content
      else if (line.includes('明日计划')) target = plan
      else target = null
      continue
    }
    if (!line || !target) continue
    target.push(line.replace(/^(?:[-*+]|\d+[.、)])\s*/, ''))
  }
  return { content: content.join('\n'), plan: plan.join('\n') }
}
