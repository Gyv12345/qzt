import { useEffect, useRef, useState } from 'react'
import { Button, Card, Input, Popconfirm, Space, Tooltip } from 'antd'
import { ClearOutlined, RobotOutlined, SendOutlined } from '@ant-design/icons'
import { aiChat, type AiChatMessage } from '../../../services/ai'

/** 单条气泡。sending=等待回复的占位,error=业务错误(开关关闭/模型未配置等),以错误样式呈现 */
interface Bubble extends AiChatMessage {
  sending?: boolean
  error?: boolean
  /** 知识库召回来源文档标题(RAG 命中时后端随回复返回) */
  sources?: string[]
}

/**
 * AI 对话页(P26,admin 内置 AI 助手前台包装)。
 * 历史仅组件 state,刷新即清(不落库,符合前台包装定位);
 * 开关关闭/模型未配置等业务错误(code≠0)直接在气泡内呈现文案。
 */
export default function AiChatPage() {
  const [bubbles, setBubbles] = useState<Bubble[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

  // 新消息后滚到底部
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [bubbles, sending])

  const send = async () => {
    const text = input.trim()
    if (!text || sending) return
    // 错误气泡不进入上下文,避免把失败提示当历史发给模型
    const history: Bubble[] = [...bubbles.filter((b) => !b.error), { role: 'user', content: text }]
    setBubbles([...history, { role: 'assistant', content: '', sending: true }])
    setInput('')
    setSending(true)
    try {
      const { reply, sources } = await aiChat(history.map(({ role, content }) => ({ role, content })))
      // 末位气泡固定是 sending 占位,替换之
      setBubbles((prev) => [...prev.slice(0, -1), { role: 'assistant', content: reply, sources }])
    } catch (err) {
      const msg = err instanceof Error ? err.message : '请求失败,请稍后重试'
      setBubbles((prev) => [...prev.slice(0, -1), { role: 'assistant', content: msg, error: true }])
    } finally {
      setSending(false)
    }
  }

  const clear = () => {
    setBubbles([])
    setInput('')
  }

  const renderBubble = (b: Bubble, i: number) => {
    const isUser = b.role === 'user'
    return (
      <div key={i} style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', marginBottom: 12 }}>
        {!isUser && <RobotOutlined style={{ color: '#1677ff', marginRight: 8, marginTop: 8, flexShrink: 0 }} />}
        <div
          style={{
            maxWidth: '72%',
            padding: '8px 12px',
            borderRadius: 8,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            background: isUser ? '#1677ff' : b.error ? '#fff2f0' : '#ffffff',
            color: isUser ? '#fff' : b.error ? '#cf1322' : 'rgba(0,0,0,0.88)',
            border: isUser ? 'none' : '1px solid #f0f0f0',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
          }}
        >
          {b.content || (b.sending ? '思考中…' : '')}
          {/* 知识库召回来源(RAG 命中时展示,便于核对出处) */}
          {!isUser && !b.sending && b.sources && b.sources.length > 0 && (
            <div style={{ marginTop: 8, paddingTop: 6, borderTop: '1px dashed #f0f0f0', fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>
              来源:{b.sources.join('、')}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <Card
      title={
        <Space>
          <RobotOutlined />
          AI 助手
        </Space>
      }
      extra={
        <Popconfirm title="确定清空当前对话?" onConfirm={clear} disabled={bubbles.length === 0}>
          <Tooltip title="清空对话(刷新页面同样会清空)">
            <Button icon={<ClearOutlined />} disabled={bubbles.length === 0}>
              清空对话
            </Button>
          </Tooltip>
        </Popconfirm>
      }
      styles={{ body: { padding: 16, height: 'calc(100vh - 190px)', display: 'flex', flexDirection: 'column' } }}
    >
      <div ref={listRef} style={{ flex: 1, overflowY: 'auto', paddingRight: 4 }}>
        {bubbles.length === 0 && (
          <div style={{ color: 'rgba(0,0,0,0.45)', textAlign: 'center', marginTop: 80 }}>
            <RobotOutlined style={{ fontSize: 40, display: 'block', marginBottom: 12 }} />
            你好,我是行简 AI 助手,有什么可以帮你?
            <div style={{ fontSize: 12, marginTop: 8 }}>
              我无法直接查询企业业务数据,涉及业务数据的问题请使用系统对应模块。
            </div>
          </div>
        )}
        {bubbles.map(renderBubble)}
      </div>
      <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 12, marginTop: 8 }}>
        <Space.Compact style={{ width: '100%' }}>
          <Input.TextArea
            placeholder="输入消息,Enter 发送,Shift+Enter 换行"
            autoSize={{ minRows: 1, maxRows: 4 }}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onPressEnter={(e) => {
              if (!e.shiftKey) {
                e.preventDefault()
                send()
              }
            }}
            disabled={sending}
          />
          <Button type="primary" icon={<SendOutlined />} loading={sending} onClick={send} disabled={!input.trim()}>
            发送
          </Button>
        </Space.Compact>
      </div>
    </Card>
  )
}
