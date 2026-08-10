import { useEffect, useState } from 'react'
import { Descriptions, Drawer, Empty, Spin, Tag, Timeline, Typography } from 'antd'
import { getApprovalInstance } from '../../services/approval'
import type { ApprovalInstanceDetail } from '../../types/approval'

interface InstanceDrawerProps {
  instanceId: number | null
  open: boolean
  onClose: () => void
}

const STATUS_TAG: Record<string, { color: string; text: string }> = {
  PENDING: { color: 'processing', text: '审批中' },
  APPROVED: { color: 'success', text: '已通过' },
  REJECTED: { color: 'error', text: '已驳回' },
  REVOKED: { color: 'default', text: '已撤回' },
}

const RESULT_TAG: Record<string, { color: string; text: string }> = {
  APPROVE: { color: 'success', text: '通过' },
  REJECT: { color: 'error', text: '驳回' },
}

/** 审批实例详情抽屉(只读):基本信息 + 审批记录时间线 */
export default function InstanceDrawer({ instanceId, open, onClose }: InstanceDrawerProps) {
  const [loading, setLoading] = useState(false)
  const [detail, setDetail] = useState<ApprovalInstanceDetail | null>(null)

  useEffect(() => {
    if (!open || !instanceId) return
    setLoading(true)
    setDetail(null)
    getApprovalInstance(instanceId)
      .then((res) => setDetail(res))
      .finally(() => setLoading(false))
  }, [open, instanceId])

  const status = detail?.approval_status
  const statusTag = status ? STATUS_TAG[status] : undefined

  return (
    <Drawer title="审批详情" width={520} open={open} onClose={onClose} destroyOnHidden>
      <Spin spinning={loading}>
        {detail ? (
          <>
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="实例 ID">{detail.id}</Descriptions.Item>
              <Descriptions.Item label="类型">{detail.form_type_label || detail.type || '-'}</Descriptions.Item>
              <Descriptions.Item label="标题">{detail.resource_title || `#${detail.resource_id}`}</Descriptions.Item>
              <Descriptions.Item label="状态">
                {statusTag ? <Tag color={statusTag.color}>{statusTag.text}</Tag> : status || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="提交时间">{detail.submit_time || '-'}</Descriptions.Item>
              <Descriptions.Item label="完成时间">{detail.approval_time || '-'}</Descriptions.Item>
              <Descriptions.Item label="备注">{detail.comment || '-'}</Descriptions.Item>
            </Descriptions>
            <Typography.Title level={5} style={{ marginTop: 24 }}>
              审批记录
            </Typography.Title>
            {detail.records && detail.records.length > 0 ? (
              <Timeline
                items={detail.records.map((r) => {
                  const tag = RESULT_TAG[r.result]
                  return {
                    color: r.result === 'REJECT' ? 'red' : 'green',
                    children: (
                      <>
                        <div>
                          节点 {r.node_id}(第 {r.node_round} 轮){' '}
                          {tag ? <Tag color={tag.color}>{tag.text}</Tag> : <Tag>{r.result}</Tag>}
                        </div>
                        {r.comment ? <div>意见:{r.comment}</div> : null}
                        <Typography.Text type="secondary">{r.created_at}</Typography.Text>
                      </>
                    ),
                  }
                })}
              />
            ) : (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无审批记录" />
            )}
          </>
        ) : null}
      </Spin>
    </Drawer>
  )
}
