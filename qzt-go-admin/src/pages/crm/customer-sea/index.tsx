import { useEffect, useRef, useState } from 'react'
import { App, Button, Card, Select, Space } from 'antd'
import { ProTable, type ActionType, type ProColumns } from '@ant-design/pro-components'
import Auth from '../../../components/Auth'
import { listCustomers, listCustomerPools, pickCustomer } from '../../../services/crm'
import type { CrmCustomer, CrmCustomerPool } from '../../../types/crm'
import { useUserStore } from '../../../stores/users'

/**
 * 客户公海:列出公海中的客户(in_pool=public),支持按公海池筛选,可领取到自己名下。
 * 公海池配置(建池/规则/容量)在「CRM 配置 → 公海池」。
 */
export default function CustomerSeaPage() {
  const { message } = App.useApp()
  const actionRef = useRef<ActionType>(null)
  const nickname = useUserStore((s) => s.nickname)
  const [pools, setPools] = useState<CrmCustomerPool[]>([])
  const [poolId, setPoolId] = useState<number | undefined>(undefined)

  useEffect(() => {
    listCustomerPools()
      .then(setPools)
      .catch(() => {})
  }, [])

  const handlePick = async (id: number) => {
    await pickCustomer(id)
    message.success('已领取到我的客户')
    actionRef.current?.reload()
  }

  const columns: ProColumns<CrmCustomer>[] = [
    { title: '客户名称', dataIndex: 'name', width: 220 },
    { title: '客户编号', dataIndex: 'customer_no', width: 140 },
    { title: '级别', dataIndex: 'level', width: 80 },
    { title: '来源', dataIndex: 'source', width: 100 },
    {
      title: '原负责人',
      dataIndex: 'owner_id',
      width: 110,
      render: (_, r) => (r.owner_id ? nickname(r.owner_id) : '-'),
    },
    {
      title: '操作',
      valueType: 'option',
      width: 100,
      render: (_, r) => (
        <Auth perm="crm:customer:pick">
          <Button type="link" size="small" onClick={() => handlePick(r.id)}>
            领取
          </Button>
        </Auth>
      ),
    },
  ]

  return (
    <>
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space>
          <span>所属公海池:</span>
          <Select
            style={{ width: 240 }}
            allowClear
            placeholder="全部公海池"
            value={poolId}
            onChange={(v) => {
              setPoolId(v)
              actionRef.current?.reload()
            }}
            options={pools.map((p) => ({ label: p.name, value: p.id }))}
          />
        </Space>
      </Card>
      <ProTable<CrmCustomer>
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        scroll={{ x: 'max-content' }}
        search={false}
        request={async ({ current, pageSize }) => {
          const res = await listCustomers({
            page: current,
            page_size: pageSize,
            pool_filter: 'PUBLIC',
            pool_id: poolId,
          })
          return { data: res.list, total: res.total, success: true }
        }}
        pagination={{ defaultPageSize: 10, showSizeChanger: true }}
        headerTitle="客户公海"
        options={false}
      />
    </>
  )
}
