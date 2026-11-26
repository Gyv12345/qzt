import { useEffect, useRef, useState } from 'react'
import { Button, Input, message, Popconfirm, Select, Switch, Tag, Tooltip, theme as antdTheme } from 'antd'
import {
  ClearOutlined,
  CloseOutlined,
  RobotOutlined,
  SendOutlined,
  ToolOutlined,
} from '@ant-design/icons'
import { aiChat, aiGetModels, type AiChatMessage } from '../../services/ai'
import type { AiModelsStatus, AiToolTrace } from '../../types/ai'
import Chart, { barOption, lineOption, pieOption } from '../../components/Chart'
import type { EChartsOption } from 'echarts'
import './index.css'

/**
 * Generative UI:AI 按工具模式 system prompt 的图表协议,在回复文本中输出
 * chart 围栏块(严格 JSON),前端解析后用 ECharts 渲染。反引号用 \x60 转义书写
 * (匹配三连围栏),解析用 matchAll。
 */

/** chart 围栏块正则(反引号以 \x60 转义书写,匹配三连围栏) */
const CHART_FENCE_RE = /\x60\x60\x60chart\s*([\s\S]*?)\x60\x60\x60/g

/** AI 输出的图表规格(chart 围栏块 JSON,与后端 aiChatToolSystemPrompt 协议对齐) */
interface AiChartSpec {
  type: 'bar' | 'line' | 'pie'
  title?: string
  categories?: string[]
  series?: { name?: string; data: number[] }[]
}

type ContentPart = { kind: 'text'; text: string } | { kind: 'chart'; spec: AiChartSpec }

/** 把 reply 切分为 文本段 + chart 块序列;非法 JSON 降级为原文文本 */
function parseChartBlocks(text: string): ContentPart[] {
  const parts: ContentPart[] = []
  let last = 0
  for (const m of text.matchAll(CHART_FENCE_RE)) {
    if (m.index === undefined) continue
    if (m.index > last) parts.push({ kind: 'text', text: text.slice(last, m.index) })
    let spec: AiChartSpec | null = null
    try {
      const parsed = JSON.parse(m[1]) as AiChartSpec
      if (parsed && (parsed.type === 'bar' || parsed.type === 'line' || parsed.type === 'pie') && Array.isArray(parsed.series)) {
        spec = parsed
      }
    } catch {
      /* 非法 JSON:整块按原文展示 */
    }
    if (spec) {
      parts.push({ kind: 'chart', spec })
    } else {
      parts.push({ kind: 'text', text: m[0] })
    }
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push({ kind: 'text', text: text.slice(last) })
  return parts.filter((p) => p.kind === 'chart' || p.text.trim())
}

/** chart 块 → ECharts option(复用全局 Chart.tsx 工厂与统一配色) */
function AiChartBlock({ spec }: { spec: AiChartSpec }) {
  const cats = spec.categories || []
  const series = (spec.series || []).map((s) => ({ name: s.name || '数值', data: (s.data || []).map((n) => Number(n) || 0) }))
  let option: EChartsOption
  if (spec.type === 'pie') {
    const data = cats.map((c, idx) => ({ name: c, value: series[0]?.data[idx] ?? 0 }))
    option = pieOption(spec.title || '', data)
  } else if (spec.type === 'line') {
    option = lineOption(spec.title || '', cats, series)
  } else {
    option = barOption(spec.title || '', cats, series)
  }
  return (
    <div style={{ margin: '6px 0 2px', width: '100%' }}>
      <Chart option={option} height={220} />
    </div>
  )
}

/**
 * 全局 AI 悬浮球对话(P34):BasicLayout 内挂载一处,登录后所有页面可见。
 * - 挂载时轻量请求 GET /api/ai/models 决定球是否渲染(ai.enabled=0 或接口不可用则不渲染);
 *   该响应同时带模型列表,面板展开直接复用,不重复发请求(仅挂载请求失败时展开补拉)。
 * - 会话仅组件 state,收起面板不清空,「清空」重置;消息为纯文本渲染(与 /ai/chat 页同款,不新增依赖)。
 */

/** 单条气泡。sending=等待回复占位,error=请求失败(拦截器已弹全局提示,气泡内呈错误占位) */
interface Bubble extends AiChatMessage {
  sending?: boolean
  error?: boolean
  sources?: string[]
  tool_trace?: AiToolTrace[]
  /** 思考过程文本(think=true 且模型支持) */
  reasoning?: string
  /** 本轮耗时毫秒(本地计时,展示"工作时间") */
  elapsed_ms?: number
}

/** 工具过程条:每条一行「🔧 {tool} · {ms}ms」,点击展开入参/结果摘要 */
function TraceBlock({ trace }: { trace: AiToolTrace[] }) {
  const [expanded, setExpanded] = useState<number | null>(null)
  return (
    <div className="ai-float-trace">
      {trace.map((t, i) => (
        <div key={i}>
          <div
            className="ai-float-trace-item"
            onClick={() => setExpanded(expanded === i ? null : i)}
          >
            <ToolOutlined /> {t.tool}
            {typeof t.ms === 'number' ? ` · ${t.ms}ms` : ''}
            {t.ok === false ? ' · 失败' : ''}
          </div>
          {expanded === i && (
            <div className="ai-float-trace-detail">
              {t.args_summary ? `入参:${t.args_summary}` : ''}
              {t.args_summary && t.result_summary ? '\n' : ''}
              {t.result_summary ? `结果:${t.result_summary}` : ''}
              {!t.args_summary && !t.result_summary ? '无入参/结果摘要' : ''}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export default function AiFloatChat() {
  const { token } = antdTheme.useToken()
  /** GET /api/ai/models 结果:null=未取到(球不渲染) */
  const [models, setModels] = useState<AiModelsStatus | null>(null)
  /** 当前选中模型(POST /api/ai/chat 的 model),undefined=后端默认档案;切换后下一轮生效 */
  const [selectedModel, setSelectedModel] = useState<string | undefined>(undefined)
  /** 知识库 RAG 注入开关(默认开);关闭后纯模型回答 */
  const [useKB, setUseKB] = useState(true)
  /** 联网搜索开关(默认关);依赖通义系模型 enable_search 服务端搜索,其他模型可能报错 */
  const [enableSearch, setEnableSearch] = useState(false)
  /** 思考模式开关(默认关);推理模型 reasoning_content,后端内部流式聚合 */
  const [think, setThink] = useState(false)
  /** 思考强度(low|medium|high),仅思考开启时可用 */
  const [thinkEffort, setThinkEffort] = useState<'low' | 'medium' | 'high'>('medium')
  const [open, setOpen] = useState(false)
  /** 收起动画播放中(200ms 后卸载面板) */
  const [closing, setClosing] = useState(false)
  const [bubbles, setBubbles] = useState<Bubble[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const closeTimerRef = useRef<number | null>(null)

  const loadModels = () => {
    aiGetModels()
      .then((d) => {
        setModels(d)
        // 默认选 is_default=1 的模型;此后端不下发时保持 undefined(走默认档案)
        const def = d.models?.find((m) => m.is_default)
        if (def) setSelectedModel((cur) => cur ?? def.model)
      })
      .catch(() => {})
  }

  // 挂载即请求一次能力开关:决定悬浮球是否渲染(静默,失败不弹提示)
  useEffect(() => {
    loadModels()
    return () => {
      if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current)
    }
  }, [])

  // 新消息后滚到底部
  useEffect(() => {
    if (open) listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [bubbles, sending, open])

  const openPanel = () => {
    setClosing(false)
    setOpen(true)
    // models 挂载时已取;仅当未取到(挂载请求失败)时补拉一次
    if (!models) loadModels()
  }

  const closePanel = () => {
    if (!open || closing) return
    setClosing(true)
    // 与收起动画时长一致,播放完再卸载
    closeTimerRef.current = window.setTimeout(() => {
      setOpen(false)
      setClosing(false)
    }, 200)
  }

  const togglePanel = () => (open ? closePanel() : openPanel())

  const send = async () => {
    const text = input.trim()
    if (!text || sending) return
    // 错误气泡不进入上下文,避免把失败提示当历史发给模型
    const history: Bubble[] = [...bubbles.filter((b) => !b.error), { role: 'user', content: text }]
    setBubbles([...history, { role: 'assistant', content: '', sending: true }])
    setInput('')
    setSending(true)
    const startedAt = Date.now()
    try {
      const { reply, sources, tool_trace, reasoning } = await aiChat(
        history.map(({ role, content }) => ({ role, content })),
        selectedModel,
        { use_kb: useKB, enable_search: enableSearch, think, think_effort: think ? thinkEffort : undefined },
      )
      // 末位气泡固定是 sending 占位,替换之;elapsed=本地计时展示"工作时间"
      setBubbles((prev) => [
        ...prev.slice(0, -1),
        { role: 'assistant', content: reply, sources, tool_trace, reasoning, elapsed_ms: Date.now() - startedAt },
      ])
    } catch (err) {
      // aiChat 为静默调用,此处显式 message.error + 气泡内错误占位
      const msg = err instanceof Error ? err.message : '请求失败,请稍后重试'
      message.error(msg)
      setBubbles((prev) => [...prev.slice(0, -1), { role: 'assistant', content: msg, error: true }])
    } finally {
      setSending(false)
    }
  }

  const clear = () => {
    setBubbles([])
    setInput('')
  }

  // AI 关闭时不渲染(接口不可用同样视为关闭,避免旧后端 404 静默失败)
  if (!models || !models.enabled) return null

  const currentModelName = models.models?.find((m) => m.model === selectedModel)?.name

  const renderBubble = (b: Bubble, i: number) => {
    const isUser = b.role === 'user'
    return (
      <div
        key={i}
        className={`ai-float-msg ${isUser ? 'user' : `ai${b.error ? ' error' : ''}`}`}
      >
        {!isUser && (
          <RobotOutlined
            style={{ color: token.colorPrimary, marginRight: 8, marginTop: 8, flexShrink: 0 }}
          />
        )}
        <div>
          {/* 工具调用过程条:在 AI 气泡上方逐条展示 */}
          {!isUser && !b.sending && b.tool_trace && b.tool_trace.length > 0 && (
            <TraceBlock trace={b.tool_trace} />
          )}
          {/* 思考过程折叠块(think=true 时展示) */}
          {!isUser && !b.sending && b.reasoning && (
            <details className="ai-float-thinking">
              <summary>思考过程</summary>
              <div className="ai-float-thinking-body">{b.reasoning}</div>
            </details>
          )}
          <div className="ai-float-bubble">
            {b.sending ? (
              <span className="ai-float-dots">
                <i />
                <i />
                <i />
              </span>
            ) : isUser ? (
              b.content
            ) : (
              parseChartBlocks(b.content).map((part, pi) =>
                part.kind === 'chart' ? (
                  <AiChartBlock key={pi} spec={part.spec} />
                ) : (
                  <span key={pi} style={{ whiteSpace: 'pre-wrap' }}>
                    {part.text}
                  </span>
                ),
              )
            )}
            {!isUser && !b.sending && b.elapsed_ms != null && (
              <div className="ai-float-elapsed">耗时 {(b.elapsed_ms / 1000).toFixed(1)}s</div>
            )}
            {!isUser && !b.sending && b.sources && b.sources.length > 0 && (
              <div className="ai-float-sources">来源:{b.sources.join(' / ')}</div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      {open && (
        <div className={`ai-float-panel${closing ? ' closing' : ' open'}`}>
          {/* 头部:标题+当前模型 | 模型切换/清空/收起 */}
          <div className="ai-float-header">
            <RobotOutlined style={{ color: token.colorPrimary }} />
            <span className="ai-float-title">AI 助手</span>
            <Tag style={{ marginInlineEnd: 0 }} color="blue">
              {currentModelName || '默认模型'}
            </Tag>
            <div style={{ flex: 1 }} />
            <Select
              size="small"
              style={{ width: 120 }}
              placeholder="默认模型"
              value={selectedModel}
              onChange={(v) => setSelectedModel(v)}
              options={(models.models ?? []).map((m) => ({ value: m.model, label: m.name }))}
              getPopupContainer={(node) => node.parentElement || document.body}
            />
            <Popconfirm title="确定清空当前对话?" onConfirm={clear} disabled={bubbles.length === 0}>
              <Tooltip title="清空会话">
                <Button size="small" type="text" icon={<ClearOutlined />} disabled={bubbles.length === 0} />
              </Tooltip>
            </Popconfirm>
            <Tooltip title="收起">
              <Button size="small" type="text" icon={<CloseOutlined />} onClick={closePanel} />
            </Tooltip>
          </div>

          {/* 设置行:知识库 RAG / 联网搜索 开关 */}
          <div className="ai-float-settings">
            <Tooltip title="开启后回答会参考知识库文档(来源标注在气泡底部);关闭则纯模型回答">
              <span className="ai-float-setting">
                <Switch size="small" checked={useKB} onChange={setUseKB} />
                知识库
              </span>
            </Tooltip>
            <Tooltip title="联网搜索依赖通义系模型的服务端搜索能力(enable_search);其他模型开启后可能报错">
              <span className="ai-float-setting">
                <Switch size="small" checked={enableSearch} onChange={setEnableSearch} />
                联网
              </span>
            </Tooltip>
            <Tooltip title="思考模式:推理模型先思考再回答(返回 reasoning_content);仅支持的模型生效,开启后响应变慢">
              <span className="ai-float-setting">
                <Switch size="small" checked={think} onChange={setThink} />
                思考
              </span>
            </Tooltip>
            {think && (
              <Select
                size="small"
                style={{ width: 76 }}
                value={thinkEffort}
                onChange={(v) => setThinkEffort(v)}
                getPopupContainer={(node) => node.parentElement || document.body}
                options={[
                  { value: 'low', label: '低' },
                  { value: 'medium', label: '中' },
                  { value: 'high', label: '高' },
                ]}
              />
            )}
          </div>

          {/* 消息区 */}
          <div ref={listRef} className="ai-float-messages">
            {bubbles.length === 0 && (
              <div className="ai-float-empty">
                <RobotOutlined style={{ fontSize: 32, display: 'block', marginBottom: 8 }} />
                你好,我是行简 AI 助手,有什么可以帮你?
                <div style={{ fontSize: 12, marginTop: 8 }}>
                  可以直接问我业务数据,比如「现在有多少个客户」「本月回款多少」,我会调用系统工具查询后作答。
                </div>
              </div>
            )}
            {bubbles.map(renderBubble)}
          </div>

          {/* 输入区 */}
          <div className="ai-float-input">
            {/* 不用 Space.Compact:antd 5 的 Compact 不支持 TextArea,会丢 width:100% 让输入框塌陷 */}
            <div className="ai-float-input-row">
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
              <Button
                type="primary"
                icon={<SendOutlined />}
                loading={sending}
                onClick={send}
                disabled={!input.trim()}
                style={{ flexShrink: 0, alignSelf: 'flex-end' }}
              />
            </div>
          </div>
        </div>
      )}
      <button
        type="button"
        className="ai-float-ball"
        style={{ background: token.colorPrimary }}
        aria-label="AI 助手"
        onClick={togglePanel}
      >
        <RobotOutlined style={{ fontSize: 24 }} />
      </button>
    </>
  )
}
