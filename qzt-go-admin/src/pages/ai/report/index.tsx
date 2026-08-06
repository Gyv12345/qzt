import { useState } from 'react'
import { App, Button, Card, Segmented, Space, Spin } from 'antd'
import { CopyOutlined, ThunderboltOutlined } from '@ant-design/icons'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import Auth from '../../../components/Auth'
import { generateReport } from '../../../services/ai'
import type { ReportResult } from '../../../types/ai'

type Period = 'day' | 'week' | 'month'

const PERIOD_OPTIONS = [
  { label: '今日', value: 'day' },
  { label: '本周', value: 'week' },
  { label: '本月', value: 'month' },
]

export default function ReportPage() {
  const { message } = App.useApp()
  const [period, setPeriod] = useState<Period>('day')
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState<ReportResult | null>(null)

  const handleGenerate = async () => {
    setLoading(true)
    try {
      const res = await generateReport({ period })
      setReport(res)
      message.success('报告生成成功')
    } catch (e) {
      message.error(e instanceof Error ? e.message : '生成失败,请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    if (!report?.content) return
    try {
      await navigator.clipboard.writeText(report.content)
      message.success('已复制到剪贴板')
    } catch {
      message.error('复制失败,请手动选择文本复制')
    }
  }

  return (
    <Auth perm="ai:report:generate">
      <Card
        title={
          <Space size={12} wrap>
            <span>日报周报</span>
            <Segmented
              value={period}
              onChange={(v) => setPeriod(v as Period)}
              options={PERIOD_OPTIONS}
              disabled={loading}
            />
          </Space>
        }
        extra={
          <Button
            type="primary"
            icon={<ThunderboltOutlined />}
            loading={loading}
            onClick={handleGenerate}
          >
            生成报告
          </Button>
        }
      >
        {loading ? (
          <div style={{ padding: '64px 0', textAlign: 'center' }}>
            <Spin tip="报告生成中,请稍候..." size="large" />
          </div>
        ) : report?.content ? (
          <>
            <div className="prose-content" style={{ fontSize: 14, lineHeight: 1.8, color: '#222' }}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{report.content}</ReactMarkdown>
            </div>
            <div style={{ marginTop: 16, textAlign: 'right' }}>
              <Button icon={<CopyOutlined />} onClick={handleCopy}>
                复制
              </Button>
            </div>
          </>
        ) : (
          <div style={{ padding: '64px 0', textAlign: 'center', color: '#8c8c8c' }}>
            选择周期并点击「生成报告」
          </div>
        )}
      </Card>
    </Auth>
  )
}
