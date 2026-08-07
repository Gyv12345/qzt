import { useEffect, useState } from 'react'
import { Button, Empty, Spin, Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { DictTag } from '../../../components/DictSelect'
import { listContracts } from '../../../services/crm'
import { useUserStore } from '../../../stores/users'
import type { CrmContract } from '../../../types/crm'
import { formatMoney } from '../../../utils/format'

/** 客户详情 - 合同面板:点击合同编号在新标签页打开合同列表页(合同详情信息量大,用整页展示) */
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
    {
      title: '合同编号',
      dataIndex: 'contract_no',
      width: 150,
      render: (v: string) =>
        v ? (
          <Button
            type="link"
            size="small"
            style={{ padding: 0 }}
            onClick={() => window.open(`/crm/contract?contract_no=${encodeURIComponent(v)}`)}
          >
            {v}
          </Button>
        ) : (
          '-'
        ),
    },
    { title: '合同名称', dataIndex: 'name', ellipsis: true },
    {
      title: '阶段',
      dataIndex: 'stage',
      width: 90,
      render: (v: string) => <DictTag code="CONTRACT_STAGE" value={v} />,
    },
    {
      title: '合同金额',
      dataIndex: 'total_amount',
      width: 120,
      align: 'right',
      render: (v: string) => formatMoney(v),
    },
    {
      title: '已回款',
      dataIndex: 'received_amount',
      width: 120,
      align: 'right',
      render: (v: string) => <span style={{ color: '#52c41a' }}>{formatMoney(v)}</span>,
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
