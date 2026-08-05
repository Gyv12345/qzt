import { useEffect, useState } from 'react'
import { Empty, Spin, Table, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { listOpportunities } from '../../../services/crm'
import { useUserStore } from '../../../stores/users'
import type { CrmOpportunity } from '../../../types/crm'

const stageColor: Record<string, string> = {
  INITIAL: 'default',
  QUALIFIED: 'blue',
  PROPOSAL: 'gold',
  NEGOTIATION: 'orange',
  WON: 'success',
  LOST: 'error',
}

const stageLabel: Record<string, string> = {
  INITIAL: '初步接触',
  QUALIFIED: '需求确认',
  PROPOSAL: '方案报价',
  NEGOTIATION: '谈判',
  WON: '赢单',
  LOST: '输单',
}

/** 客户详情 - 商机面板(只读,要新增去商机页) */
export default function OpportunitiesPanel({ customerId }: { customerId: number }) {
  const nickname = useUserStore((s) => s.nickname)
  const [list, setList] = useState<CrmOpportunity[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    listOpportunities({ customer_id: customerId, page: 1, page_size: 50 })
      .then((res) => setList(res.list ?? []))
      .catch(() => setList([]))
      .finally(() => setLoading(false))
  }, [customerId])

  const columns: ColumnsType<CrmOpportunity> = [
    { title: '商机名称', dataIndex: 'name', ellipsis: true },
    {
      title: '阶段',
      dataIndex: 'stage',
      width: 100,
      render: (v: string) => <Tag color={stageColor[v] || 'default'}>{stageLabel[v] || v || '-'}</Tag>,
    },
    {
      title: '预计金额',
      dataIndex: 'expected_amount',
      width: 120,
      align: 'right',
      render: (v: string) => (Number(v) > 0 ? `¥${Number(v).toLocaleString()}` : '-'),
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
    </Spin>
  )
}
