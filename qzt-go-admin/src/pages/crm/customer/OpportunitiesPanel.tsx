import { useEffect, useState } from 'react'
import { Button, Empty, Spin, Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { DictTag } from '../../../components/DictSelect'
import { listOpportunities } from '../../../services/crm'
import { useUserStore } from '../../../stores/users'
import type { CrmOpportunity } from '../../../types/crm'
import { formatMoney } from '../../../utils/format'
import OpportunityDetailDrawer from '../opportunity/DetailDrawer'

/** 客户详情 - 商机面板:点击商机名可打开商机详情抽屉(嵌套一层) */
export default function OpportunitiesPanel({ customerId }: { customerId: number }) {
  const nickname = useUserStore((s) => s.nickname)
  const [list, setList] = useState<CrmOpportunity[]>([])
  const [loading, setLoading] = useState(false)
  const [viewId, setViewId] = useState<number | null>(null)

  useEffect(() => {
    setLoading(true)
    listOpportunities({ customer_id: customerId, page: 1, page_size: 50 })
      .then((res) => setList(res.list ?? []))
      .catch(() => setList([]))
      .finally(() => setLoading(false))
  }, [customerId])

  const columns: ColumnsType<CrmOpportunity> = [
    {
      title: '商机名称',
      dataIndex: 'name',
      ellipsis: true,
      render: (v: string, r) => (
        <Button type="link" size="small" style={{ padding: 0 }} onClick={() => setViewId(r.id)}>
          {v}
        </Button>
      ),
    },
    {
      title: '阶段',
      dataIndex: 'stage',
      width: 100,
      render: (v: string) => <DictTag code="OPPORTUNITY_STAGE" value={v} />,
    },
    {
      title: '预计金额',
      dataIndex: 'expected_amount',
      width: 120,
      align: 'right',
      render: (v: string) => (Number(v) > 0 ? formatMoney(v) : '-'),
    },
    {
      title: '预计成交',
      dataIndex: 'expected_close_date',
      width: 120,
      render: (v: string | null) => v || '-',
    },
    {
      title: '负责人',
      dataIndex: 'owner_id',
      width: 100,
      render: (v: number | null) => (v ? nickname(v) : '-'),
    },
  ]

  return (
    <Spin spinning={loading}>
      <Table<CrmOpportunity>
        rowKey="id"
        size="small"
        columns={columns}
        dataSource={list}
        pagination={list.length > 10 ? { pageSize: 10, size: 'small' } : false}
        locale={{ emptyText: <Empty description="暂无商机" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
      />
      {/* 商机详情子抽屉(嵌套一层,内部不再下钻) */}
      <OpportunityDetailDrawer
        opportunityId={viewId}
        customerName={list.find((o) => o.id === viewId)?.name}
        open={viewId !== null}
        onClose={() => setViewId(null)}
      />
    </Spin>
  )
}
