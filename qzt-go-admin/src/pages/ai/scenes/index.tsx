import { useState } from 'react'
import { Alert, App, Button, Card, Col, Row, Spin, Typography } from 'antd'
import { CopyOutlined, RedoOutlined, ThunderboltOutlined } from '@ant-design/icons'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { isAxiosError } from 'axios'
import { runAiScene } from '../../../services/ai'
import { copyToClipboard } from '../../../utils/clipboard'
import type { AiScenario } from '../../../types/ai'

/** 场景卡片配置(说明文案与后端 ai_agent.go 各场景的实际取数口径对应) */
const SCENES: { key: AiScenario; icon: string; title: string; desc: string }[] = [
  {
    key: 'insight',
    icon: '📊',
    title: '经营洞察',
    desc: '基于全公司经营数据快照(客户总数、商机阶段分布、合同金额、近 30 天回款),输出经营概况、亮点、风险与建议。',
  },
  {
    key: 'approval-summary',
    icon: '✅',
    title: '审批助手',
    desc: '汇总你当前的待审批任务,给出待办概览、建议处理优先级与积压风险提示。',
  },
  {
    key: 'daily-report',
    icon: '📝',
    title: '日报生成',
    desc: '根据你今日的跟进记录、新建客户、新建合同与已办审批,生成包含今日完成与明日计划建议的工作日报。',
  },
]

/** 每张场景卡的独立状态:loading / 错误文案(后端透传) / markdown 结果 */
interface SceneState {
  loading: boolean
  error?: string
  output?: string
}

/** 把请求异常转成用户可读文案:业务错误信封(HTTP 错误体)取 msg,网关 5xx/超时/网络错误给专门提示 */
function sceneErrMsg(e: unknown): string {
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

/** AI 场景页(P30):经营洞察 / 审批助手 / 日报生成,一键生成 markdown 结果。仅分析当前登录人自己的数据。 */
export default function AiScenesPage() {
  const { message } = App.useApp()
  const [states, setStates] = useState<Partial<Record<AiScenario, SceneState>>>({})

  const patch = (key: AiScenario, s: SceneState) => setStates((prev) => ({ ...prev, [key]: s }))

  const run = async (key: AiScenario) => {
    patch(key, { loading: true })
    try {
      const output = await runAiScene(key)
      patch(key, { loading: false, output })
    } catch (err) {
      patch(key, { loading: false, error: sceneErrMsg(err) })
    }
  }

  const copy = async (output?: string) => {
    if (!output) return
    const ok = await copyToClipboard(output)
    if (ok) message.success('已复制到剪贴板')
    else message.error('复制失败,请手动选择文本复制')
  }

  const renderBody = (scene: (typeof SCENES)[number]) => {
    const s = states[scene.key]
    if (!s || (!s.loading && !s.error && !s.output)) {
      return (
        <div style={{ color: 'rgba(0,0,0,0.45)', fontSize: 13, padding: '24px 0', textAlign: 'center' }}>
          点击「生成」开始分析
        </div>
      )
    }
    if (s.loading) {
      return (
        <div style={{ padding: '32px 0', textAlign: 'center' }}>
          <Spin />
          <div style={{ color: 'rgba(0,0,0,0.45)', fontSize: 13, marginTop: 12 }}>
            AI 正在分析你的业务数据,请稍候…
          </div>
        </div>
      )
    }
    if (s.error) {
      return <Alert type="error" showIcon message={s.error} />
    }
    return (
      <div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 8,
          }}
        >
          <Typography.Text type="secondary" style={{ fontSize: 13 }}>
            生成结果(markdown)
          </Typography.Text>
          <Button size="small" icon={<CopyOutlined />} onClick={() => copy(s.output)}>
            复制
          </Button>
        </div>
        <div
          style={{
            maxHeight: 420,
            overflowY: 'auto',
            border: '1px solid #f0f0f0',
            borderRadius: 8,
            padding: '12px 16px',
            fontSize: 13,
            lineHeight: 1.7,
            wordBreak: 'break-word',
            background: '#fafafa',
          }}
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{s.output ?? ''}</ReactMarkdown>
        </div>
      </div>
    )
  }

  return (
    <div>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
        内置三个 AI 分析场景,一键生成、结果为 markdown 文本;经营洞察基于全公司经营数据,审批助手与日报生成仅分析当前登录账号自己的数据。
      </Typography.Paragraph>

      <Row gutter={[16, 16]}>
        {SCENES.map((scene) => {
          const s = states[scene.key]
          return (
            <Col key={scene.key} xs={24} xl={8}>
              <Card
                title={`${scene.icon} ${scene.title}`}
                styles={{ body: { display: 'flex', flexDirection: 'column', minHeight: 380 } }}
              >
                <Typography.Paragraph type="secondary" style={{ fontSize: 13, marginBottom: 12 }}>
                  {scene.desc}
                </Typography.Paragraph>
                <div style={{ marginBottom: 12 }}>
                  <Button
                    type="primary"
                    icon={s?.output ? <RedoOutlined /> : <ThunderboltOutlined />}
                    loading={s?.loading}
                    onClick={() => run(scene.key)}
                  >
                    {s?.output ? '重新生成' : '生成'}
                  </Button>
                </div>
                {renderBody(scene)}
              </Card>
            </Col>
          )
        })}
      </Row>
    </div>
  )
}
