import { useEffect, useState } from 'react'
import { Descriptions, Drawer, Table, Tabs, type TableProps } from 'antd'
import { DictTag } from '../../../components/DictSelect'
import { getOpportunity, getOpportunityStageHistory } from '../../../services/crm'
import { useUserStore } from '../../../stores/users'
import type { CrmOpportunity, CrmStageRecord } from '../../../types/crm'

interface DetailDrawerProps {
  /** 商机 ID,null 表示关闭 */
  opportunityId: number | null
  /** 客户名称(外部传入,避免重复请求;不传则显示 #id) */
  customerName?: string
  open: boolean
  onClose: () => void
}

/** 商机详情抽屉:基本信息 + 阶段历史 */
export default function DetailDrawer({ opportunityId, customerName, open, onClose }: DetailDrawerProps) {
  const nickname = useUserStore((s) => s.nickname)
  const [detail, setDetail] = useState<CrmOpportunity | null>(null)
  const [history, setHistory] = useState<CrmStageRecord[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  useEffect(() => {
    if (!open || !opportunityId) {
      setDetail(null)
      setHistory([])
      return
    }
    getOpportunity(opportunityId)
      .then(setDetail)
      .catch(() => {})
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
      render: (v: string) => (v ? <DictTag code="OPPORTUNITY_STAGE" value={v} /> : '新建'),
    },
    {
      title: '新阶段',
      dataIndex: 'to_stage',
      render: (v: string) => <DictTag code="OPPORTUNITY_STAGE" value={v} />,
    },
    {
      title: '操作人',
      dataIndex: 'operator_id',
      render: (v: number) => nickname(v),
    },
    { title: '原因', dataIndex: 'reason', render: (v: string) => v || '-' },
  ]

  return (
    <Drawer
      title={o ? `商机详情:${o.name}` : '商机详情'}
      width={640}
      open={open}
      onClose={onClose}
      destroyOnHidden
    >
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
                      children: customerName ?? `#${o.customer_id}`,
                    },
                    {
                      key: 'amount',
                      label: '预期金额',
                      children: o.expected_amount ? `¥${o.expected_amount}` : '-',
                    },
                    {
                      key: 'stage',
                      label: '阶段',
                      children: <DictTag code="OPPORTUNITY_STAGE" value={o.stage} />,
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
              key: 'history',
              label: '阶段历史',
              children: (
                <Table<CrmStageRecord>
                  rowKey="id"
                  size="small"
                  loading={historyLoading}
                  dataSource={history}
                  columns={historyColumns}
                  pagination={false}
                />
              ),
            },
          ]}
        />
      )}
    </Drawer>
  )
}
