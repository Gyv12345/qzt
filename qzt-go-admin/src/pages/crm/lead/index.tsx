import { useRef, useState } from 'react'
import { App, Button, Popconfirm, Space, Tag } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { ProTable, type ActionType, type ProColumns } from '@ant-design/pro-components'
import Auth from '../../../components/Auth'
import DictSelect, { DictTag } from '../../../components/DictSelect'
import ExportButtons from '../../../components/ExportButtons'
import { convertLead, deleteLead, listLeads, type LeadQuery } from '../../../services/lead'
import { useUserStore } from '../../../stores/users'
import type { CrmLead } from '../../../types/lead'
import LeadEditModal from './EditModal'
import LeadDetailDrawer from './DetailDrawer'
import ReleaseModal from './ReleaseModal'
import TransferModal from './TransferModal'
import OwnerHistoryModal from './OwnerHistoryModal'

export default function LeadPage() {
  const { message } = App.useApp()
  const actionRef = useRef<ActionType>(null)
  const nickname = useUserStore((s) => s.nickname)

  // 新增/编辑弹窗
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<CrmLead | null>(null)

  // 释放/转移/归属历史/详情
  const [releaseTarget, setReleaseTarget] = useState<CrmLead | null>(null)
  const [transferTarget, setTransferTarget] = useState<CrmLead | null>(null)
  const [historyTarget, setHistoryTarget] = useState<CrmLead | null>(null)
  const [detailTarget, setDetailTarget] = useState<CrmLead | null>(null)

  const openCreate = () => {
    setEditing(null)
    setModalOpen(true)
  }

  const openEdit = (record: CrmLead) => {
    setEditing(record)
    setModalOpen(true)
  }

  const handleDelete = async (record: CrmLead) => {
    await deleteLead(record.id)
    message.success('线索已删除')
    actionRef.current?.reload()
  }

  const handleConvert = async (record: CrmLead) => {
    const customer = await convertLead(record.id)
    message.success(`已转化,客户ID:${customer.id}`)
    actionRef.current?.reload()
  }

  const columns: ProColumns<CrmLead>[] = [
    { title: '编号', valueType: 'indexBorder', width: 70, search: false },
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
      title: '状态',
      dataIndex: 'status',
      hideInTable: true,
      valueType: 'select',
      valueEnum: {
        1: { text: '新建' },
        2: { text: '跟进中' },
        3: { text: '已转化' },
        4: { text: '无效' },
      },
    },
    {
      title: '行业',
      dataIndex: 'industry',
      hideInTable: true,
      renderFormItem: () => <DictSelect code="INDUSTRY" />,
    },
    // 可见列
    {
      title: '编号',
      dataIndex: 'lead_no',
      width: 140,
      search: false,
      render: (v, r) => (
        <Button type="link" size="small" style={{ padding: 0 }} onClick={() => setDetailTarget(r)}>
          {v || '-'}
        </Button>
      ),
    },
    {
      title: '线索名称',
      dataIndex: 'name',
      width: 200,
      search: false,
      render: (_, r) => (
        <Space size={4}>
          <Button type="link" size="small" style={{ padding: 0 }} onClick={() => setDetailTarget(r)}>
            {r.name}
          </Button>
          {r.status === 3 && <Tag color="green">已转化</Tag>}
        </Space>
      ),
    },
    { title: '联系人', dataIndex: 'contact_name', width: 100, search: false },
    { title: '电话', dataIndex: 'phone', width: 130, search: false },
    { title: '公司', dataIndex: 'company', width: 140, search: false, ellipsis: true },
    {
      title: '级别',
      dataIndex: 'level',
      search: false,
      width: 80,
      render: (_, r) => <DictTag code="LEAD_LEVEL" value={r.level} />,
    },
    {
      title: '来源',
      dataIndex: 'source',
      search: false,
      width: 90,
      render: (_, r) => <DictTag code="LEAD_SOURCE" value={r.source} />,
    },
    {
      title: '状态',
      dataIndex: 'status',
      search: false,
      width: 80,
      valueEnum: {
        1: { text: '新建', status: 'Processing' },
        2: { text: '跟进中', status: 'Warning' },
        3: { text: '已转化', status: 'Success' },
        4: { text: '无效', status: 'Default' },
      },
    },
    {
      title: '负责人',
      dataIndex: 'owner_id',
      search: false,
      width: 90,
      render: (_, r) => nickname(r.owner_id) || '-',
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      search: false,
      valueType: 'dateTime',
      width: 160,
    },
    {
      title: '操作',
      valueType: 'option',
      width: 280,
      fixed: 'right',
      render: (_, record) => (
        <Space size={0} wrap>
          <Button type="link" size="small" onClick={() => setHistoryTarget(record)}>
            记录
          </Button>
          <Auth perm="crm:lead:edit">
            <Button type="link" size="small" onClick={() => openEdit(record)}>
              编辑
            </Button>
          </Auth>
          <Auth perm="crm:lead:release">
            <Button type="link" size="small" onClick={() => setReleaseTarget(record)}>
              释放
            </Button>
          </Auth>
          <Auth perm="crm:lead:transfer">
            <Button type="link" size="small" onClick={() => setTransferTarget(record)}>
              转移
            </Button>
          </Auth>
          {record.converted_customer_id === null && record.status !== 3 && (
            <Auth perm="crm:lead:convert">
              <Popconfirm
                title="确认将该线索转化为客户?"
                okText="转化"
                cancelText="取消"
                onConfirm={() => handleConvert(record)}
              >
                <Button type="link" size="small">
                  转客户
                </Button>
              </Popconfirm>
            </Auth>
          )}
          <Auth perm="crm:lead:delete">
            <Popconfirm
              title="确认删除该线索?"
              okText="删除"
              okButtonProps={{ danger: true }}
              cancelText="取消"
              onConfirm={() => handleDelete(record)}
            >
              <Button type="link" size="small" danger>
                删除
              </Button>
            </Popconfirm>
          </Auth>
        </Space>
      ),
    },
  ]

  return (
    <>
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
            pool_filter: 'PRIVATE',
            ...(rest as LeadQuery),
          })
          return { data: res.list, total: res.total, success: true }
        }}
        pagination={{ defaultPageSize: 10, showSizeChanger: true }}
        toolBarRender={() => [
          <Auth perm="crm:lead:add" key="add">
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              新增线索
            </Button>
          </Auth>,
          <ExportButtons
            key="export"
            fileName="线索列表"
            columns={columns}
            fetchAll={async () => {
              const res = await listLeads({ page: 1, page_size: 1000, pool_filter: 'PRIVATE' })
              return res.list
            }}
          />,
        ]}
        headerTitle="线索列表"
      />

      {/* 新增/编辑线索 */}
      <LeadEditModal
        open={modalOpen}
        editing={editing}
        onOpenChange={setModalOpen}
        onSuccess={() => actionRef.current?.reload()}
      />

      {/* 释放到公海 */}
      <ReleaseModal
        target={releaseTarget}
        onClose={() => setReleaseTarget(null)}
        onSuccess={() => actionRef.current?.reload()}
      />

      {/* 转移线索 */}
      <TransferModal
        target={transferTarget}
        onClose={() => setTransferTarget(null)}
        onSuccess={() => actionRef.current?.reload()}
      />

      {/* 归属历史 */}
      <OwnerHistoryModal target={historyTarget} onClose={() => setHistoryTarget(null)} />

      {/* 线索详情抽屉 */}
      <LeadDetailDrawer
        lead={detailTarget}
        onClose={() => setDetailTarget(null)}
        onEdit={(lead) => {
          setDetailTarget(null)
          openEdit(lead)
        }}
      />
    </>
  )
}
