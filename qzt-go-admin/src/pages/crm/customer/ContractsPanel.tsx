import { useEffect, useState } from 'react'
import { Empty, Spin, Table, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { listContracts } from '../../../services/crm'
import { useUserStore } from '../../../stores/users'
import type { CrmContract } from '../../../types/crm'

const stageColor: Record<string, string> = {
  DRAFT: 'default',
  APPROVAL: 'processing',
  SIGNED: 'blue',
  EXECUTING: 'gold',
  COMPLETED: 'success',
  TERMINATED: 'error',
}

const stageLabel: Record<string, string> = {
  DRAFT: '草稿',
  APPROVAL: '审批中',
  SIGNED: '已签订',
  EXECUTING: '执行中',
  COMPLETED: '已完成',
  TERMINATED: '已终止',
}

/** 客户详情 - 合同面板(只读,要新增去合同页) */
export default function ContractsPanel({ customerId }: { customerId: number }) {
  const nickname = useUserStore((s) => s.nickname)
  const [list, setList] = useState<CrmContract[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    listContracts({ customer_id: customerId, page: 1, page_size: 50 })
      .then((res) => setList(res.list ?? []))
      .catch(() => setList([]))
      .finally(() => setLoading(false))
  }, [customerId])

  const columns: ColumnsType<CrmContract> = [
    { title: '合同编号', dataIndex: 'contract_no', width: 150, render: (v: string) => v || '-' },
    { title: '合同名称', dataIndex: 'name', ellipsis: true },
    {
      title: '阶段',
      dataIndex: 'stage',
      width: 90,
      render: (v: string) => <Tag color={stageColor[v] || 'default'}>{stageLabel[v] || v || '-'}</Tag>,
    },
    {
      title: '合同金额',
      dataIndex: 'total_amount',
      width: 120,
      align: 'right',
      render: (v: string) => `¥${Number(v).toLocaleString()}`,
    },
    {
      title: '已回款',
      dataIndex: 'received_amount',
      width: 120,
      align: 'right',
      render: (v: string) => (
        <span style={{ color: '#52c41a' }}>¥{Number(v).toLocaleString()}</span>
      ),
    },
    {
      title: '负责人',
      dataIndex: 'owner_id',
      width: 90,
      render: (v: number | null) => (v ? nickname(v) : '-'),
    },
  ]

  return (
    <Spin spinning={loading}>
      <Table<CrmContract>
        rowKey="id"
        size="small"
        columns={columns}
        dataSource={list}
        pagination={list.length > 10 ? { pageSize: 10, size: 'small' } : false}
        locale={{ emptyText: <Empty description="暂无合同" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
      />
    </Spin>
  )
}
