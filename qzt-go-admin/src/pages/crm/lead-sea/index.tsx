import { useEffect, useRef, useState } from 'react'
import { App, Button, Card, Select, Space } from 'antd'
import { ProTable, type ActionType, type ProColumns } from '@ant-design/pro-components'
import Auth from '../../../components/Auth'
import { listLeadPools, listLeads, pickLead } from '../../../services/lead'
import type { CrmLead, CrmLeadPool } from '../../../types/lead'
import { useUserStore } from '../../../stores/users'

/**
 * 线索公海:列出公海中的线索(in_pool=public),支持按线索池筛选,可领取到自己名下。
 * 线索池配置(建池/规则/容量)在「CRM 配置 → 线索池」。
 */
export default function LeadSeaPage() {
  const { message } = App.useApp()
  const actionRef = useRef<ActionType>(null)
  const nickname = useUserStore((s) => s.nickname)
  const [pools, setPools] = useState<CrmLeadPool[]>([])
  const [poolId, setPoolId] = useState<number | undefined>(undefined)

  useEffect(() => {
    listLeadPools()
      .then(setPools)
      .catch(() => {})
  }, [])

  const handlePick = async (id: number) => {
    await pickLead(id)
    message.success('已领取到我的线索')
    actionRef.current?.reload()
  }

  const columns: ProColumns<CrmLead>[] = [
    { title: '线索名称', dataIndex: 'name', width: 200 },
    { title: '联系人', dataIndex: 'contact_name', width: 110 },
    { title: '电话', dataIndex: 'phone', width: 130 },
    { title: '级别', dataIndex: 'level', width: 80 },
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
        <Auth perm="crm:lead:pick">
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
          <span>所属线索池:</span>
          <Select
            style={{ width: 240 }}
            allowClear
            placeholder="全部线索池"
            value={poolId}
            onChange={(v) => {
              setPoolId(v)
              actionRef.current?.reload()
            }}
            options={pools.map((p) => ({ label: p.name, value: p.id }))}
          />
        </Space>
      </Card>
      <ProTable<CrmLead>
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        scroll={{ x: 'max-content' }}
        search={false}
        request={async ({ current, pageSize }) => {
          const res = await listLeads({
            page: current,
            page_size: pageSize,
            pool_filter: 'PUBLIC',
            pool_id: poolId,
          })
          return { data: res.list, total: res.total, success: true }
        }}
        pagination={{ defaultPageSize: 10, showSizeChanger: true }}
        headerTitle="线索公海"
        options={false}
      />
    </>
  )
}
