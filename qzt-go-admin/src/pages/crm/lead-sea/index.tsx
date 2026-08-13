import { useEffect, useRef, useState } from 'react'
import { App, Button, Select } from 'antd'
import { ProTable, type ActionType, type ProColumns } from '@ant-design/pro-components'
import Auth from '../../../components/Auth'
import DictSelect, { DictTag } from '../../../components/DictSelect'
import { listLeadPools, listLeads, pickLead, type LeadQuery } from '../../../services/lead'
import type { CrmLead, CrmLeadPool } from '../../../types/lead'
import { useUserStore } from '../../../stores/users'

/**
 * 线索公海:列出公海中的线索(in_pool=public),支持按线索池/名称/级别/来源/行业筛选,可领取到自己名下。
 * 线索池配置(建池/规则/容量)在「CRM 配置 → 线索池」。
 */
export default function LeadSeaPage() {
  const { message } = App.useApp()
  const actionRef = useRef<ActionType>(null)
  const nickname = useUserStore((s) => s.nickname)
  const [pools, setPools] = useState<CrmLeadPool[]>([])

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
    // ---- 搜索列(表格内不展示) ----
    {
      title: '所属线索池',
      dataIndex: 'pool_id',
      hideInTable: true,
      renderFormItem: () => (
        <Select
          showSearch
          optionFilterProp="label"
          allowClear
          placeholder="全部线索池"
          options={pools.map((p) => ({ label: p.name, value: p.id }))}
        />
      ),
    },
    { title: '线索名称', dataIndex: 'keyword', hideInTable: true },
    {
      title: '级别',
      dataIndex: 'level',
      hideInTable: true,
      renderFormItem: () => <DictSelect code="LEAD_LEVEL" />,
    },
    {
      title: '来源',
      dataIndex: 'source',
      hideInTable: true,
      renderFormItem: () => <DictSelect code="LEAD_SOURCE" />,
    },
    {
      title: '行业',
      dataIndex: 'industry',
      hideInTable: true,
      renderFormItem: () => <DictSelect code="INDUSTRY" />,
    },
    // ---- 展示列(不参与搜索) ----
    { title: '线索名称', dataIndex: 'name', width: 200, search: false },
    { title: '联系人', dataIndex: 'contact_name', width: 110, search: false },
    { title: '电话', dataIndex: 'phone', width: 130, search: false },
    {
      title: '级别',
      dataIndex: 'level',
      width: 90,
      search: false,
      render: (_, r) => <DictTag code="LEAD_LEVEL" value={r.level} />,
    },
    {
      title: '来源',
      dataIndex: 'source',
      width: 100,
      search: false,
      render: (_, r) => <DictTag code="LEAD_SOURCE" value={r.source} />,
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
        <Auth perm="crm:lead:pick">
          <Button type="link" size="small" onClick={() => handlePick(r.id)}>
            领取
          </Button>
        </Auth>
      ),
    },
  ]

  return (
    <ProTable<CrmLead>
      rowKey="id"
      actionRef={actionRef}
      columns={columns}
      scroll={{ x: 'max-content' }}
      request={async (params) => {
        const { current, pageSize, ...rest } = params
        const res = await listLeads({
          page: current,
          page_size: pageSize,
          pool_filter: 'PUBLIC',
          ...(rest as LeadQuery),
        })
        return { data: res.list, total: res.total, success: true }
      }}
      pagination={{ defaultPageSize: 10, showSizeChanger: true }}
      headerTitle="线索公海"
      options={false}
    />
  )
}
