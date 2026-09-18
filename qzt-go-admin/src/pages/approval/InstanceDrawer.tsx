import { useEffect, useState, type ReactNode } from 'react'
import { Descriptions, Drawer, Empty, Spin, Table, Tag, Timeline, Typography } from 'antd'
import { getApprovalInstance, getInstanceResource } from '../../services/approval'
import { useDictStore } from '../../stores/dict'
import type { ApprovalInstanceDetail, ResourceSummary } from '../../types/approval'

interface InstanceDrawerProps {
  instanceId: number | null
  open: boolean
  onClose: () => void
}

const STATUS_TAG: Record<string, { color: string; text: string }> = {
  PENDING: { color: 'processing', text: '审批中' },
  APPROVING: { color: 'processing', text: '审批中' },
  APPROVED: { color: 'success', text: '已通过' },
  REJECTED: { color: 'error', text: '已驳回' },
  UNAPPROVED: { color: 'error', text: '已驳回' },
  REVOKED: { color: 'default', text: '已撤回' },
}

const RESULT_TAG: Record<string, { color: string; text: string }> = {
  APPROVE: { color: 'success', text: '通过' },
  REJECT: { color: 'error', text: '驳回' },
  AUTO_PASS: { color: 'default', text: '自动通过' },
}

/** 字典值 → 中文(dict store 已在应用启动时预载) */
function dictLabel(code?: string, value?: string) {
  if (!code || value === undefined || value === '') return value
  return useDictStore.getState().label(code, value)
}

/** 原单摘要:字段键值 + 可选明细表 */
function ResourceSummarySection({ summary }: { summary: ResourceSummary | null }) {
  if (!summary) return null
  if (!summary.found) {
    return (
      <>
        <Typography.Title level={5} style={{ marginTop: 24 }}>
          原单内容
        </Typography.Title>
        <Typography.Text type="secondary">原单不存在或已删除</Typography.Text>
      </>
    )
  }
  return (
    <>
      <Typography.Title level={5} style={{ marginTop: 24 }}>
        原单内容
      </Typography.Title>
      <Descriptions column={1} bordered size="small">
        {summary.fields.map((f) => (
          <Descriptions.Item key={f.label} label={f.label}>
            {dictLabel(f.dict, f.value) || '-'}
          </Descriptions.Item>
        ))}
      </Descriptions>
      {summary.items && summary.items.rows.length > 0 && (
        <Table
          style={{ marginTop: 12 }}
          size="small"
          pagination={false}
          dataSource={summary.items.rows.map((row, i) => ({ key: i, ...row }))}
          columns={summary.items.columns.map((c) => ({
            title: c.label,
            dataIndex: c.key,
            render: (v: string) => dictLabel(c.dict, v) || '-',
          }))}
        />
      )}
    </>
  )
}

/** 审批实例详情抽屉(只读):基本信息 + 原单摘要 + 审批记录时间线 */
export default function InstanceDrawer({ instanceId, open, onClose }: InstanceDrawerProps) {
  const [loading, setLoading] = useState(false)
  const [detail, setDetail] = useState<ApprovalInstanceDetail | null>(null)
  const [summary, setSummary] = useState<ResourceSummary | null>(null)

  useEffect(() => {
    if (!open || !instanceId) return
    setLoading(true)
    setDetail(null)
    setSummary(null)
    Promise.all([
      getApprovalInstance(instanceId).catch(() => null),
      getInstanceResource(instanceId).catch(() => null),
    ]).then(([d, s]) => {
      setDetail(d)
      setSummary(s)
      setLoading(false)
    })
  }, [open, instanceId])

  const status = detail?.approval_status
  const statusTag = status ? STATUS_TAG[status] : undefined

  // 审批记录时间线:以「提交审批」为起点,追加每条审批操作(通过/驳回)。
  // 避免审批中的实例因暂无操作记录而显示「暂无审批记录」,看起来像异常。
  const recordItems: { color: string; children: ReactNode }[] = []
  if (detail?.submit_time) {
    recordItems.push({
      color: 'blue',
      children: (
        <>
          <div>提交审批</div>
          <Typography.Text type="secondary">{detail.submit_time}</Typography.Text>
        </>
      ),
    })
  }
  ;(detail?.records || []).forEach((r) => {
    const tag = RESULT_TAG[r.result]
    recordItems.push({
      color: r.result === 'REJECT' ? 'red' : 'green',
      children: (
        <>
          <div>
            第 {r.node_round} 轮审批{' '}
            {tag ? <Tag color={tag.color}>{tag.text}</Tag> : <Tag>{r.result}</Tag>}
          </div>
          {r.comment ? <div>意见:{r.comment}</div> : null}
          <Typography.Text type="secondary">{r.created_at}</Typography.Text>
        </>
      ),
    })
  })

  return (
    <Drawer title="审批详情" width={520} open={open} onClose={onClose} destroyOnHidden>
      <Spin spinning={loading}>
        {detail ? (
          <>
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="类型">{detail.form_type_label || detail.type || '-'}</Descriptions.Item>
              <Descriptions.Item label="标题">{detail.resource_title || '-'}</Descriptions.Item>
              <Descriptions.Item label="状态">
                {statusTag ? <Tag color={statusTag.color}>{statusTag.text}</Tag> : status || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="提交时间">{detail.submit_time || '-'}</Descriptions.Item>
              <Descriptions.Item label="完成时间">{detail.approval_time || '-'}</Descriptions.Item>
              <Descriptions.Item label="备注">{detail.comment || '-'}</Descriptions.Item>
            </Descriptions>
            <ResourceSummarySection summary={summary} />
            <Typography.Title level={5} style={{ marginTop: 24 }}>
              审批记录
            </Typography.Title>
            {recordItems.length > 0 ? (
              <Timeline items={recordItems} />
            ) : (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无审批记录" />
            )}
          </>
        ) : null}
      </Spin>
    </Drawer>
  )
}
