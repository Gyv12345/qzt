import { useState } from 'react'
import { App, Button, Card, Space } from 'antd'
import { CopyOutlined, RedoOutlined, ThunderboltOutlined } from '@ant-design/icons'
import { runAiScene } from '../../services/ai'
import { copyToClipboard } from '../../utils/clipboard'
import AiSceneResult from './AiSceneResult'
import { sceneErrMsg } from './sceneError'

/**
 * AI 经营洞察卡片:内嵌在工作台指标区下方,看完数字直接读分析。
 * 基于全公司经营数据(客户/商机/合同/近 30 天回款)生成概况、亮点、风险与建议。
 */
export default function AiInsightCard() {
  const { message } = App.useApp()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>()
  const [output, setOutput] = useState<string>()
  const [empty, setEmpty] = useState(false)

  const run = async () => {
    setLoading(true)
    setError(undefined)
    try {
      const res = await runAiScene('insight')
      setOutput(res.output)
      setEmpty(!!res.empty)
    } catch (err) {
      setError(sceneErrMsg(err))
    } finally {
      setLoading(false)
    }
  }

  const copy = async () => {
    if (!output) return
    const ok = await copyToClipboard(output)
    if (ok) message.success('已复制到剪贴板')
    else message.error('复制失败,请手动选择文本复制')
  }

  // 没有可分析的数据时 output 只是一句提示,不算结果:不给复制,按钮仍是「生成」
  const hasResult = !!output && !empty

  return (
    <Card
      title={
        <Space size={8}>
          <ThunderboltOutlined style={{ color: 'var(--ant-color-primary)' }} />
          AI 经营洞察
        </Space>
      }
      extra={
        <Space>
          {hasResult && !loading && <Button size="small" icon={<CopyOutlined />} onClick={copy}>复制</Button>}
          <Button
            size="small"
            type="primary"
            icon={hasResult ? <RedoOutlined /> : <ThunderboltOutlined />}
            loading={loading}
            onClick={run}
          >
            {hasResult ? '重新生成' : '生成'}
          </Button>
        </Space>
      }
    >
      <AiSceneResult
        loading={loading}
        error={error}
        output={output}
        empty={empty}
        idle="基于全公司经营数据生成经营概况、亮点、风险与建议"
      />
    </Card>
  )
}
