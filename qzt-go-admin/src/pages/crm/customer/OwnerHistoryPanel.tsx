import { useEffect, useState } from 'react'
import { Table, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { getCustomerOwnerHistory } from '../../../services/crm'
import { useUserStore } from '../../../stores/users'
import type { CrmOwnerHistory } from '../../../types/crm'

const ACTION_MAP: Record<string, { text: string; color: string }> = {
  TAKE: { text: '领取', color: 'green' },
  RELEASE: { text: '退回', color: 'orange' },
  TRANSFER: { text: '转移', color: 'blue' },
  RECYCLE: { text: '回收', color: 'red' },
}

/** 客户详情 - 归属历史面板 */
export default function OwnerHistoryPanel({ customerId }: { customerId: number }) {
  const nickname = useUserStore((s) => s.nickname)
  const [list, setList] = useState<CrmOwnerHistory[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        setList((await getCustomerOwnerHistory(customerId)) || [])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [customerId])

  const columns: ColumnsType<CrmOwnerHistory> = [
    { title: '时间', dataIndex: 'created_at', width: 170 },
    {
      title: '动作',
      dataIndex: 'action',
      width: 90,
      render: (v: string) => {
        const item = ACTION_MAP[v]
        return item ? <Tag color={item.color}>{item.text}</Tag> : <Tag>{v}</Tag>
      },
    },
    {
      title: '新负责人',
      dataIndex: 'owner_id',
      width: 110,
      render: (v: number | null) => nickname(v),
    },
    {
      title: '操作人',
      dataIndex: 'operator_id',
      width: 110,
      render: (v: number) => nickname(v),
    },
    { title: '原因', dataIndex: 'reason', render: (v: string) => v || '-' },
  ]

  return (
    <Table<CrmOwnerHistory>
      rowKey="id"
      size="small"
      loading={loading}
      columns={columns}
      dataSource={list}
      pagination={false}
    />
  )
}
