import { useEffect, useState } from 'react'
import { App, Button, Input, Select, Space, Timeline } from 'antd'
import { SendOutlined, ThunderboltOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import AiFollowupDraftModal from '../../../components/ai/AiFollowupDraftModal'
import { useAiEnabled } from '../../../components/ai/useAiEnabled'
import { DictTag } from '../../../components/DictSelect'
import { createFollowRecord, getFollowTimeline } from '../../../services/crm'
import { useUserStore } from '../../../stores/users'
import type { CrmFollowRecord } from '../../../types/crm'

const FOLLOW_TYPE_OPTIONS = [
  { label: '微信', value: 'WECHAT' },
  { label: '电话', value: 'PHONE' },
  { label: '拜访', value: 'VISIT' },
  { label: '邮件', value: 'EMAIL' },
  { label: '其他', value: 'OTHER' },
]

interface FollowPanelProps {
  /** 关联客户(与 leadId、opportunityId 三选一;商机场景可同时传入用于 AI 上下文) */
  customerId?: number
  /** 关联线索(与 customerId、opportunityId 三选一) */
  leadId?: number
  /** 关联商机(与 customerId、leadId 三选一) */
  opportunityId?: number
}

/**
 * 跟进记录面板(顶部快速写跟进 + 下方时间线列表)。
 * 客户/线索/商机共用,分别传 customerId、leadId、opportunityId。
 */
export default function FollowPanel({ customerId, leadId, opportunityId }: FollowPanelProps) {
  const { message } = App.useApp()
  const nickname = useUserStore((s) => s.nickname)
  const [records, setRecords] = useState<CrmFollowRecord[]>([])
  const [content, setContent] = useState('')
  const [followType, setFollowType] = useState('WECHAT')
  const [submitting, setSubmitting] = useState(false)
  const [draftOpen, setDraftOpen] = useState(false)
  const aiEnabled = useAiEnabled()

  // AI 草稿填回输入框;模板建议的跟进类型在可选项内时一并切换
  const handleApplyDraft = (draft: string, followType: string) => {
    setContent(draft)
    if (FOLLOW_TYPE_OPTIONS.some((o) => o.value === followType)) setFollowType(followType)
    setDraftOpen(false)
  }

  // 关联字段与 ID:客户用 customer_id,线索用 lead_id,商机用 opportunity_id
  const linkField = opportunityId ? 'opportunity_id' : leadId ? 'lead_id' : 'customer_id'
  const linkId = opportunityId ?? leadId ?? customerId ?? 0

  const load = async () => {
    if (!linkId) return
    const res = (await getFollowTimeline(linkField, linkId)) || []
    setRecords([...res].sort((a, b) => b.follow_time.localeCompare(a.follow_time)))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkField, linkId])

  const handleSubmit = async () => {
    if (!content.trim()) {
      message.warning('请输入跟进内容')
      return
    }
    setSubmitting(true)
    try {
      await createFollowRecord({
        type: followType,
        content: content.trim(),
        follow_time: dayjs().format('YYYY-MM-DD HH:mm:ss'),
        ...(opportunityId
          ? { opportunity_id: opportunityId }
          : leadId
            ? { lead_id: leadId }
            : { customer_id: customerId }),
      })
      message.success('跟进记录已添加')
      setContent('')
      load()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      {/* 快速写跟进 */}
      <div
        style={{
          marginBottom: 24,
          padding: 16,
          borderRadius: 10,
          border: '1px solid #e8e8e8',
          background: '#fafafa',
        }}
      >
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <Select
            value={followType}
            onChange={setFollowType}
            options={FOLLOW_TYPE_OPTIONS}
            style={{ width: 110, flexShrink: 0 }}
            size="large"
          />
          <div style={{ flex: 1 }}>
            <Input.TextArea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="记录本次跟进要点..."
              autoSize={{ minRows: 3, maxRows: 6 }}
              onPressEnter={(e) => {
                if (e.ctrlKey || e.metaKey) handleSubmit()
              }}
              style={{ border: 'none', background: 'transparent', resize: 'none' }}
              size="large"
            />
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingLeft: 122 }}>
          <Space size={8}>
            {aiEnabled && linkId > 0 && Boolean(customerId || leadId) && (
              <Button size="small" icon={<ThunderboltOutlined />} onClick={() => setDraftOpen(true)}>
                AI 起草
              </Button>
            )}
            <span style={{ fontSize: 12, color: 'var(--ant-color-text-tertiary)' }}>Ctrl+Enter 快捷提交</span>
          </Space>
          <Button
            type="primary"
            icon={<SendOutlined />}
            loading={submitting}
            onClick={handleSubmit}
            disabled={!content.trim()}
            size="middle"
          >
            提交跟进
          </Button>
        </div>
      </div>

      {/* 跟进记录时间线 */}
      {records.length ? (
        <Timeline
          items={records.map((r) => ({
            color: 'blue',
            children: (
              <div>
                <Space size={8} style={{ marginBottom: 4 }}>
                  <DictTag code="FOLLOW_UP_TYPE" value={r.type} />
                  <span style={{ color: 'var(--ant-color-text-tertiary)', fontSize: 12 }}>
                    {nickname(r.owner_id)} · {r.follow_time}
                  </span>
                </Space>
                <div style={{ fontSize: 14, lineHeight: 1.7, color: '#333', whiteSpace: 'pre-wrap' }}>
                  {r.content}
                </div>
              </div>
            ),
          }))}
        />
      ) : (
        <div style={{ color: 'var(--ant-color-text-tertiary)', textAlign: 'center', padding: 32 }}>暂无跟进记录</div>
      )}

      <AiFollowupDraftModal
        open={draftOpen}
        onClose={() => setDraftOpen(false)}
        subject={leadId ? { leadId } : { customerId }}
        onApply={handleApplyDraft}
      />
    </div>
  )
}
