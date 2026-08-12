import { useState } from 'react'
import { Button, Card, ErrorBlock, NavBar, Selector, SpinLoading, Toast } from 'antd-mobile'
import { useNavigate } from 'react-router-dom'
import { marked } from 'marked'
import { generateReport, type AiReportResult } from '../../services/ai'

const PERIOD_OPTIONS = [
  { label: '日报', value: 'day' },
  { label: '周报', value: 'week' },
  { label: '月报', value: 'month' },
]

export default function AiReportPage() {
  const navigate = useNavigate()
  const [period, setPeriod] = useState<string>('day')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AiReportResult | null>(null)
  const [failed, setFailed] = useState(false)

  const onGenerate = () => {
    setLoading(true)
    setFailed(false)
    setResult(null)
    generateReport({ period: period as 'day' | 'week' | 'month' })
      .then((res) => setResult(res))
      .catch(() => setFailed(true))
      .finally(() => setLoading(false))
  }

  const onCopy = async () => {
    if (!result?.content) return
    try {
      await navigator.clipboard.writeText(result.content)
      Toast.show({ icon: 'success', content: '已复制' })
    } catch {
      Toast.show({ content: '复制失败,请手动选择' })
    }
  }

  const html = result?.content ? (marked.parse(result.content, { async: false }) as string) : ''

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%', paddingBottom: 24 }}>
      <NavBar onBack={() => navigate(-1)}>AI 工作报告</NavBar>

      <Card title="生成报告" style={{ margin: 8 }}>
        <div style={{ marginBottom: 12, color: 'var(--text-tertiary)', fontSize: 13 }}>
          选择周期,基于你的客户/线索/商机/跟进数据自动生成报告
        </div>
        <Selector
          options={PERIOD_OPTIONS}
          value={[period]}
          onChange={(arr) => arr[0] && setPeriod(arr[0] as string)}
          columns={3}
        />
        <Button
          block
          color="primary"
          size="large"
          loading={loading}
          onClick={onGenerate}
          style={{ marginTop: 12 }}
        >
          {loading ? '生成中...' : '生成报告'}
        </Button>
      </Card>

      {loading && (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <SpinLoading style={{ '--size': '32px' }} />
          <div style={{ color: 'var(--text-tertiary)', fontSize: 13, marginTop: 8 }}>
            正在汇总数据并生成,请稍候
          </div>
        </div>
      )}

      {failed && (
        <div style={{ paddingTop: 20 }}>
          <ErrorBlock status="default" title="生成失败" description="请稍后重试" />
        </div>
      )}

      {result && !loading && (
        <Card
          title={<span>{result.period}工作报告</span>}
          style={{ margin: 8 }}
          extra={
            <a style={{ fontSize: 12, color: 'var(--brand)' }} onClick={onCopy}>
              复制
            </a>
          }
        >
          <div
            className="markdown-body"
            style={{ fontSize: 14, lineHeight: 1.8 }}
            dangerouslySetInnerHTML={{ __html: html || '<p style="color:#999">无内容</p>' }}
          />
        </Card>
      )}
    </div>
  )
}
