import { useEffect, useState } from 'react'
import { App, Button, Input, Select, Space, Timeline } from 'antd'
import { SendOutlined } from '@ant-design/icons'
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

/** 客户详情 - 跟进记录面板(顶部快速写跟进 + 下方时间线列表) */
export default function FollowPanel({ customerId }: { customerId: number }) {
  const { message } = App.useApp()
  const nickname = useUserStore((s) => s.nickname)
  const [records, setRecords] = useState<CrmFollowRecord[]>([])
  const [content, setContent] = useState('')
  const [followType, setFollowType] = useState('WECHAT')
  const [submitting, setSubmitting] = useState(false)

  const load = async () => {
    const res = (await getFollowTimeline('customer_id', customerId)) || []
    setRecords([...res].sort((a, b) => b.follow_time.localeCompare(a.follow_time)))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId])

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
        follow_time: new Date().toISOString().replace('T', ' ').slice(0, 19),
        customer_id: customerId,
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
          <span style={{ fontSize: 12, color: '#999' }}>Ctrl+Enter 快捷提交</span>
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
                  <span style={{ color: '#999', fontSize: 12 }}>
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
        <div style={{ color: '#999', textAlign: 'center', padding: 32 }}>暂无跟进记录</div>
      )}
    </div>
  )
}
