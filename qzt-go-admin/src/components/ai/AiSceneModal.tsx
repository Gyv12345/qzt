import { useEffect, useState, type ReactNode } from 'react'
import { App, Button, Modal, Space, Typography } from 'antd'
import { CopyOutlined, RedoOutlined } from '@ant-design/icons'
import { runAiScene } from '../../services/ai'
import { copyToClipboard } from '../../utils/clipboard'
import type { AiScenario } from '../../types/ai'
import AiSceneResult from './AiSceneResult'
import { sceneErrMsg } from './sceneError'

interface AiSceneModalProps {
  open: boolean
  onClose: () => void
  scenario: AiScenario
  title: string
  /** 结果上方的口径说明,如数据取自哪里 */
  description?: string
  /** 拿到结果后出现的附加动作,如「填入新建日志」;没有可分析的数据时不出现 */
  renderActions?: (output: string) => ReactNode
}

/**
 * AI 场景结果弹窗:打开即生成,展示 markdown 结果,可复制。
 * 供各业务页面内嵌 AI 入口(审批摘要 / 日报生成),不再有独立的场景页。
 * 没有可分析的数据时只显示一句提示和「关闭」,不给复制/填入等没有意义的操作。
 */
export default function AiSceneModal({
  open,
  onClose,
  scenario,
  title,
  description,
  renderActions,
}: AiSceneModalProps) {
  const { message } = App.useApp()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>()
  const [output, setOutput] = useState<string>()
  const [empty, setEmpty] = useState(false)

  const run = async () => {
    setLoading(true)
    setError(undefined)
    try {
      const res = await runAiScene(scenario)
      setOutput(res.output)
      setEmpty(!!res.empty)
    } catch (err) {
      setError(sceneErrMsg(err))
    } finally {
      setLoading(false)
    }
  }

  // 每次打开都重新生成:数据随时间变化,上一次的结果没有复用价值
  useEffect(() => {
    if (!open) return
    setOutput(undefined)
    setEmpty(false)
    setError(undefined)
    run()
    // 只在打开与切换场景时触发
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, scenario])

  const copy = async () => {
    if (!output) return
    const ok = await copyToClipboard(output)
    if (ok) message.success('已复制到剪贴板')
    else message.error('复制失败,请手动选择文本复制')
  }

  const hasResult = !!output && !empty

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      title={title}
      width={720}
      destroyOnHidden
    >
      {description && (
        <Typography.Paragraph type="secondary" style={{ fontSize: 13, marginBottom: 12 }}>
          {description}
        </Typography.Paragraph>
      )}
      <AiSceneResult loading={loading} error={error} output={output} empty={empty} />
      {!loading && (output || error) && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
          <Space wrap>
            {hasResult && renderActions?.(output ?? '')}
            {hasResult && <Button icon={<CopyOutlined />} onClick={copy}>复制</Button>}
            {hasResult && <Button icon={<RedoOutlined />} onClick={run}>重新生成</Button>}
            {error && <Button icon={<RedoOutlined />} onClick={run}>重试</Button>}
          </Space>
          <Button onClick={onClose}>{empty ? '关闭' : '取消'}</Button>
        </div>
      )}
    </Modal>
  )
}
