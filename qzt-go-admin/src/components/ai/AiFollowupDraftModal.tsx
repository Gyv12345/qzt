import { useEffect, useState } from 'react'
import { Alert, App, Button, Col, Input, Modal, Row, Segmented, Space, Spin, Tag, Typography } from 'antd'
import { CopyOutlined, ThunderboltOutlined } from '@ant-design/icons'
import { listAiFollowupTemplates, runAiFollowupDraft } from '../../services/ai'
import { copyToClipboard } from '../../utils/clipboard'
import type { AiFollowupTemplate } from '../../types/ai'
import { sceneErrMsg } from './sceneError'

interface AiFollowupDraftModalProps {
  open: boolean
  onClose: () => void
  /** 起草对象:客户 / 线索二选一;planId 可选,把该条待办计划作为本次要执行的动作 */
  subject: { customerId?: number; leadId?: number; planId?: number }
  /** 把草稿填回业务表单;followType 为模板建议的跟进类型 */
  onApply: (draft: string, followType: string) => void
}

const TONE_LABELS: Record<string, string> = { gentle: '温和', concise: '简洁', formal: '正式' }

// 模板目录在模块级缓存:目录是静态配置,不必每次打开弹窗都拉一次
let templateCache: AiFollowupTemplate[] | null = null

/**
 * AI 跟进草稿弹窗:选跟进场景(模板卡)→ 选语气 → 生成 → 就地修改 → 填入跟进内容。
 * 系统只起草不发送:草稿填回表单后仍由销售本人修改、确认后才提交。
 * 入口在客户/线索详情的「快速写跟进」与跟进计划的「转跟进记录」表单里。
 */
export default function AiFollowupDraftModal({ open, onClose, subject, onApply }: AiFollowupDraftModalProps) {
  const { message } = App.useApp()
  const [templates, setTemplates] = useState<AiFollowupTemplate[]>(templateCache ?? [])
  const [tplError, setTplError] = useState<string>()
  const [selectedKey, setSelectedKey] = useState<string>()
  // tone 留空 = 用所选模板的默认语气
  const [tone, setTone] = useState<string>()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>()
  const [draft, setDraft] = useState('')
  const [warnings, setWarnings] = useState<string[]>([])

  const loadTemplates = async () => {
    setTplError(undefined)
    try {
      const list = await listAiFollowupTemplates()
      templateCache = list
      setTemplates(list)
    } catch (err) {
      setTplError(sceneErrMsg(err))
    }
  }

  // 每次打开都清空上一次的草稿;模板目录还没拿到时拉一次
  useEffect(() => {
    if (!open) return
    setDraft('')
    setWarnings([])
    setError(undefined)
    if (!templateCache) loadTemplates()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const selected = templates.find((t) => t.key === selectedKey)
  const toneKey = tone ?? selected?.default_tone ?? 'gentle'

  const selectTemplate = (key: string) => {
    setSelectedKey(key)
    setTone(undefined)
  }

  const generate = async () => {
    if (!selected) {
      message.warning('请先选择一个跟进场景')
      return
    }
    setLoading(true)
    setError(undefined)
    try {
      const res = await runAiFollowupDraft({
        ...(subject.customerId ? { customer_id: subject.customerId } : {}),
        ...(subject.leadId ? { lead_id: subject.leadId } : {}),
        ...(subject.planId ? { plan_id: subject.planId } : {}),
        template: selected.key,
        tone: toneKey,
      })
      setDraft(res.output)
      setWarnings(res.warnings ?? [])
    } catch (err) {
      setError(sceneErrMsg(err))
    } finally {
      setLoading(false)
    }
  }

  const copy = async () => {
    if (!draft) return
    const ok = await copyToClipboard(draft)
    if (ok) message.success('已复制到剪贴板')
    else message.error('复制失败,请手动选择文本复制')
  }

  const hasDraft = !!draft.trim()

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title="AI 起草跟进内容"
      width={760}
      destroyOnHidden
      footer={
        <Space>
          <Button onClick={onClose}>取消</Button>
          {hasDraft && <Button icon={<CopyOutlined />} onClick={copy}>复制</Button>}
          <Button
            type={hasDraft ? 'default' : 'primary'}
            icon={<ThunderboltOutlined />}
            loading={loading}
            disabled={!selected}
            onClick={generate}
          >
            {hasDraft ? '重新生成' : '生成草稿'}
          </Button>
          <Button type={hasDraft ? 'primary' : 'default'} disabled={!hasDraft} onClick={() => onApply(draft.trim(), selected?.follow_type ?? '')}>
            填入跟进内容
          </Button>
        </Space>
      }
    >
      {tplError ? (
        <Alert
          type="error"
          showIcon
          message={tplError}
          action={
            <Button size="small" onClick={loadTemplates}>
              重试
            </Button>
          }
        />
      ) : (
        <>
          <Typography.Paragraph type="secondary" style={{ fontSize: 13 }}>
            选一个跟进场景,生成后填入跟进内容,改好再提交。草稿只是初稿,不会自动发送。
          </Typography.Paragraph>

          <Row gutter={[8, 8]}>
            {templates.map((t) => {
              const active = t.key === selectedKey
              return (
                <Col xs={24} sm={12} md={8} key={t.key}>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => selectTemplate(t.key)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') selectTemplate(t.key)
                    }}
                    style={{
                      height: '100%',
                      padding: '10px 12px',
                      borderRadius: 8,
                      cursor: 'pointer',
                      border: `1px solid ${active ? 'var(--ant-color-primary)' : 'var(--ant-color-border-secondary)'}`,
                      background: active ? 'var(--ant-color-primary-bg)' : 'transparent',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 600 }}>{t.label}</span>
                      <Tag style={{ marginRight: 0 }}>{TONE_LABELS[t.default_tone] ?? t.default_tone}</Tag>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--ant-color-text-secondary)', lineHeight: 1.6, marginTop: 6 }}>
                      {t.desc}
                    </div>
                  </div>
                </Col>
              )
            })}
          </Row>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16 }}>
            <Typography.Text style={{ fontSize: 13 }}>语气</Typography.Text>
            <Segmented
              value={toneKey}
              onChange={(v) => setTone(v as string)}
              options={Object.entries(TONE_LABELS).map(([value, label]) => ({ value, label }))}
            />
          </div>

          {loading && (
            <div style={{ padding: '28px 0', textAlign: 'center' }}>
              <Spin />
              <div style={{ color: 'var(--ant-color-text-tertiary)', fontSize: 13, marginTop: 12 }}>正在起草,请稍候…</div>
            </div>
          )}
          {error && <Alert type="error" showIcon message={error} style={{ marginTop: 16 }} />}

          {!loading && !error && draft && (
            <>
              <Input.TextArea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                autoSize={{ minRows: 6, maxRows: 12 }}
                style={{ marginTop: 16 }}
              />
              {warnings.length > 0 && (
                <Alert
                  type="warning"
                  showIcon
                  style={{ marginTop: 12 }}
                  message="发送前请核对"
                  description={
                    <ul style={{ margin: 0, paddingLeft: 18 }}>
                      {warnings.map((w) => (
                        <li key={w}>{w}</li>
                      ))}
                    </ul>
                  }
                />
              )}
              <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 8 }}>
                价格、交期、认证等信息请自行确认后填写,资料里没有的内容以【待补充】标出。
              </Typography.Text>
            </>
          )}
        </>
      )}
    </Modal>
  )
}
