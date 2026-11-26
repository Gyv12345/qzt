import { useEffect, useState } from 'react'
import { Button, Descriptions, Drawer, Spin, Table, Tabs, Tag, type TableProps } from 'antd'
import AttachmentsPanel from '../../../components/AttachmentsPanel'
import { DictTag } from '../../../components/DictSelect'
import FollowPanel from '../customer/FollowPanel'
import { getOpportunity, getOpportunityStageHistory } from '../../../services/crm'
import { useUserStore } from '../../../stores/users'
import type { CrmOpportunity, CrmStageRecord } from '../../../types/crm'
import { formatMoney } from '../../../utils/format'

interface DetailDrawerProps {
  /** 商机 ID,null 表示关闭 */
  opportunityId: number | null
  /** 客户名称(外部传入,避免重复请求;不传则显示 #id) */
  customerName?: string
  open: boolean
  onClose: () => void
}

/**
 * 商机详情抽屉:基本信息 + 跟进记录 + 阶段历史 + 附件。
 * 客户字段可点击,在新标签页打开客户列表页(避免与客户抽屉形成循环嵌套:
 * 客户→商机是抽屉内单向下钻,商机→客户走整页,拓扑保持 DAG)。
 */
export default function DetailDrawer({ opportunityId, customerName, open, onClose }: DetailDrawerProps) {
  const nickname = useUserStore((s) => s.nickname)
  const [detail, setDetail] = useState<CrmOpportunity | null>(null)
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState<CrmStageRecord[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  useEffect(() => {
    if (!open || !opportunityId) {
      setDetail(null)
      setHistory([])
      return
    }
    setLoading(true)
    getOpportunity(opportunityId)
      .then(setDetail)
      .catch(() => setDetail(null))
      .finally(() => setLoading(false))
    setHistoryLoading(true)
    getOpportunityStageHistory(opportunityId)
      .then((res) => setHistory(res ?? []))
      .catch(() => setHistory([]))
      .finally(() => setHistoryLoading(false))
  }, [open, opportunityId])

  const o = detail

  const historyColumns: TableProps<CrmStageRecord>['columns'] = [
    {
      title: '原阶段',
      dataIndex: 'from_stage',
      width: 110,
      render: (v: string) => (v ? <DictTag code="OPPORTUNITY_STAGE" value={v} /> : '新建'),
    },
    {
      title: '新阶段',
      dataIndex: 'to_stage',
      width: 110,
      render: (v: string) => <DictTag code="OPPORTUNITY_STAGE" value={v} />,
    },
    {
      title: '操作人',
      dataIndex: 'operator_id',
      width: 100,
      render: (v: number) => nickname(v),
    },
    { title: '原因', dataIndex: 'reason', width: 160, render: (v: string) => v || '-' },
    {
      title: '输单原因',
      dataIndex: 'lost_reason',
      width: 130,
      render: (v: string) => <DictTag code="OPPORTUNITY_LOST_REASON" value={v} />,
    },
    {
      title: '流转时间',
      dataIndex: 'created_at',
      width: 170,
      render: (v: string | null) => v || '-',
    },
  ]

  return (
    <Drawer
      title={o ? `商机详情:${o.name}` : '商机详情'}
      width={640}
      open={open}
      onClose={onClose}
      destroyOnHidden
    >
      <Spin spinning={loading && !o}>
        {o && (
          <Tabs
            items={[
              {
                key: 'info',
                label: '基本信息',
                children: (
                  <Descriptions
                    bordered
                    size="small"
                    column={2}
                    items={[
                      { key: 'no', label: '商机编号', children: o.opportunity_no || '-' },
                      { key: 'name', label: '商机名称', children: o.name },
                      {
                        key: 'customer',
                        label: '客户',
                        children: (
                          <Button
                            type="link"
                            size="small"
                            style={{ padding: 0 }}
                            onClick={() =>
                              window.open(`/crm/customer?customer_id=${o.customer_id}`, '_blank')
                            }
                          >
                            {customerName ?? `#${o.customer_id}`}
                          </Button>
                        ),
                      },
                      {
                        key: 'amount',
                        label: '预期金额',
                        children: o.expected_amount ? formatMoney(o.expected_amount) : '-',
                      },
                      {
                        key: 'stage',
                        label: '阶段',
                        children: <DictTag code="OPPORTUNITY_STAGE" value={o.stage} />,
                      },
                      {
                        key: 'days_in_stage',
                        label: '停留天数',
                        children:
                          o.days_in_stage === null || o.days_in_stage === undefined
                            ? '未记录'
                            : `${o.days_in_stage} 天`,
                      },
                      {
                        key: 'is_stagnant',
                        label: '阶段状态',
                        children: o.is_stagnant ? <Tag color="warning">停滞</Tag> : '-',
                      },
                      {
                        key: 'probability',
                        label: '成交概率',
                        children:
                          o.probability !== null && o.probability !== undefined
                            ? `${o.probability}%`
                            : '-',
                      },
                      {
                        key: 'close_date',
                        label: '预计成交日',
                        children: o.expected_close_date ?? '-',
                      },
                      { key: 'owner', label: '负责人', children: nickname(o.owner_id) },
                      {
                        key: 'description',
                        label: '描述',
                        span: 2,
                        children: o.description || '-',
                      },
                      { key: 'created_at', label: '创建时间', children: o.created_at },
                      { key: 'updated_at', label: '更新时间', children: o.updated_at },
                    ]}
                  />
                ),
              },
              {
                key: 'follow',
                label: '跟进',
                children: <FollowPanel opportunityId={o.id} customerId={o.customer_id} />,
              },
              {
                key: 'history',
                label: '阶段历史',
                children: (
                  <Table<CrmStageRecord>
                    rowKey="id"
                    size="small"
                    loading={historyLoading}
                    dataSource={history}
                    columns={historyColumns}
                    scroll={{ x: 780 }}
                    pagination={false}
                  />
                ),
              },
              {
                key: 'attachments',
                label: '附件',
                children: (
                  <AttachmentsPanel
                    bizType="OPPORTUNITY"
                    resourceId={o.id}
                    uploadPerm="crm:opportunity:edit"
                    deletePerm="crm:opportunity:edit"
                  />
                ),
              },
            ]}
          />
        )}
      </Spin>
    </Drawer>
  )
}
