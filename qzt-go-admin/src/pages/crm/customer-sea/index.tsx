import { useEffect, useRef, useState } from 'react'
import { App, Button, Select } from 'antd'
import { ProTable, type ActionType, type ProColumns } from '@ant-design/pro-components'
import Auth from '../../../components/Auth'
import DictSelect, { DictTag } from '../../../components/DictSelect'
import { listCustomers, listCustomerPools, pickCustomer, type CustomerQuery } from '../../../services/crm'
import type { CrmCustomer, CrmCustomerPool } from '../../../types/crm'
import { useUserStore } from '../../../stores/users'

/**
 * 客户公海:列出公海中的客户(in_pool=public),支持按公海池/名称/级别/来源/行业筛选,可领取到自己名下。
 * 公海池配置(建池/规则/容量)在「CRM 配置 → 公海池」。
 */
export default function CustomerSeaPage() {
  const { message } = App.useApp()
  const actionRef = useRef<ActionType>(null)
  const nickname = useUserStore((s) => s.nickname)
  const [pools, setPools] = useState<CrmCustomerPool[]>([])

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
    // ---- 搜索列(表格内不展示) ----
    {
      title: '所属公海池',
      dataIndex: 'pool_id',
      hideInTable: true,
      renderFormItem: () => (
        <Select
          showSearch
          optionFilterProp="label"
          allowClear
          placeholder="全部公海池"
          options={pools.map((p) => ({ label: p.name, value: p.id }))}
        />
      ),
    },
    { title: '客户名称', dataIndex: 'keyword', hideInTable: true },
    {
      title: '级别',
      dataIndex: 'level',
      hideInTable: true,
      renderFormItem: () => <DictSelect code="CUSTOMER_LEVEL" />,
    },
    {
      title: '来源',
      dataIndex: 'source',
      hideInTable: true,
      renderFormItem: () => <DictSelect code="CUSTOMER_SOURCE" />,
    },
    {
      title: '行业',
      dataIndex: 'industry',
      hideInTable: true,
      renderFormItem: () => <DictSelect code="INDUSTRY" />,
    },
    // ---- 展示列(不参与搜索) ----
    { title: '客户名称', dataIndex: 'name', width: 220, search: false },
    { title: '客户编号', dataIndex: 'customer_no', width: 140, search: false },
    {
      title: '级别',
      dataIndex: 'level',
      width: 90,
      search: false,
      render: (_, r) => <DictTag code="CUSTOMER_LEVEL" value={r.level} />,
    },
    {
      title: '来源',
      dataIndex: 'source',
      width: 100,
      search: false,
      render: (_, r) => <DictTag code="CUSTOMER_SOURCE" value={r.source} />,
    },
    {
      title: '行业',
      dataIndex: 'industry',
      width: 110,
      search: false,
      render: (_, r) => <DictTag code="INDUSTRY" value={r.industry} />,
    },
    {
      title: '原负责人',
      dataIndex: 'owner_id',
      width: 110,
      search: false,
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
    <ProTable<CrmCustomer>
      rowKey="id"
      actionRef={actionRef}
      columns={columns}
      scroll={{ x: 'max-content' }}
      request={async (params) => {
        const { current, pageSize, ...rest } = params
        const res = await listCustomers({
          page: current,
          page_size: pageSize,
          pool_filter: 'PUBLIC',
          ...(rest as CustomerQuery),
        })
        return { data: res.list, total: res.total, success: true }
      }}
      pagination={{ defaultPageSize: 10, showSizeChanger: true }}
      headerTitle="客户公海"
      options={false}
    />
  )
}
