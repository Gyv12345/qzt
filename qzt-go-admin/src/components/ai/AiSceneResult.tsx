import { Alert, Spin } from 'antd'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface AiSceneResultProps {
  loading: boolean
  error?: string
  output?: string
  /** true=没有可分析的数据:output 只是一句说明,按提示样式展示而不是当作结果 */
  empty?: boolean
  /** 尚未生成时的占位说明 */
  idle?: string
}

/**
 * AI 场景结果的统一呈现:加载中 / 错误 / 无数据提示 / markdown 结果。
 * 只负责展示,状态由调用方持有——场景结果弹窗与工作台内嵌卡片共用。
 * 取色一律走 antd CSS 变量,兼容暗色模式。
 */
export default function AiSceneResult({ loading, error, output, empty, idle }: AiSceneResultProps) {
  if (loading) {
    return (
      <div style={{ padding: '32px 0', textAlign: 'center' }}>
        <Spin />
        <div style={{ color: 'var(--ant-color-text-tertiary)', fontSize: 13, marginTop: 12 }}>
          AI 正在分析,请稍候…
        </div>
      </div>
    )
  }
  if (error) return <Alert type="error" showIcon message={error} />
  if (!output) {
    return idle ? (
      <div style={{ color: 'var(--ant-color-text-tertiary)', fontSize: 13, padding: '8px 0' }}>{idle}</div>
    ) : null
  }
  if (empty) return <Alert type="info" showIcon message={output} />
  return (
    <div
      style={{
        maxHeight: 420,
        overflowY: 'auto',
        border: '1px solid var(--ant-color-border-secondary)',
        borderRadius: 8,
        padding: '12px 16px',
        fontSize: 13,
        lineHeight: 1.7,
        wordBreak: 'break-word',
        background: 'var(--ant-color-fill-quaternary)',
      }}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{output}</ReactMarkdown>
    </div>
  )
}
