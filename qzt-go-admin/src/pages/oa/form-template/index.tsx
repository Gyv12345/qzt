import { useRef, useState } from 'react'
import { App, Button, Drawer, Popconfirm, Space, Tag } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { ProTable, type ActionType, type ProColumns } from '@ant-design/pro-components'
import Auth from '../../../components/Auth'
import { deleteFormTemplate, listFormTemplates, toggleFormTemplate } from '../../../services/oa'
import type { OaFormTemplate } from '../../../types/oa'
import FormTemplateEditModal from './Designer'
import ApprovalFlowSetup from '../../../components/ApprovalFlowSetup'

export default function FormTemplatePage() {
  const { message } = App.useApp()
  const actionRef = useRef<ActionType>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)

  const handleDelete = async (id: number) => {
    await deleteFormTemplate(id)
    message.success('已删除')
    actionRef.current?.reload()
  }

  const handleToggle = async (id: number) => {
    await toggleFormTemplate(id)
    message.success('已切换')
    actionRef.current?.reload()
  }

  const columns: ProColumns<OaFormTemplate>[] = [
    { title: '编号', valueType: 'indexBorder', width: 60 },
    { title: '标识', dataIndex: 'form_key', width: 150, search: false },
    { title: '名称', dataIndex: 'name', width: 180 },
    {
      title: '分类',
      dataIndex: 'category',
      width: 120,
      valueType: 'select',
      valueEnum: {
        'business': { text: '业务审批' },
        'non-business': { text: '非业务审批' },
      },
      render: (_, r) => (
        <Tag color={r.category === 'business' ? 'blue' : 'orange'}>
          {r.category === 'business' ? '业务审批' : '非业务审批'}
        </Tag>
      ),
    },
    { title: '描述', dataIndex: 'description', width: 250, ellipsis: true, search: false },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      valueType: 'select',
      valueEnum: {
        0: { text: '停用' },
        1: { text: '启用' },
      },
      render: (_, r) => <Tag color={r.status === 1 ? 'success' : 'default'}>{r.status === 1 ? '启用' : '停用'}</Tag>,
    },
    {
      title: '操作',
      valueType: 'option',
      width: 180,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Auth perm="oa:form:edit">
            <Button type="link" size="small" onClick={() => { setEditingId(record.id); setEditOpen(true) }}>设计</Button>
          </Auth>
          <Auth perm="oa:form:edit">
            <Button type="link" size="small" onClick={() => handleToggle(record.id)}>
              {record.status === 1 ? '停用' : '启用'}
            </Button>
          </Auth>
          <Auth perm="oa:form:delete">
            <Popconfirm title="确认删除?" okText="删除" okButtonProps={{ danger: true }} cancelText="取消" onConfirm={() => handleDelete(record.id)}>
              <Button type="link" size="small" danger>删除</Button>
            </Popconfirm>
          </Auth>
        </Space>
      ),
    },
  ]

  return (
    <>
      <ProTable<OaFormTemplate>
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        scroll={{ x: 'max-content' }}
        request={async (params) => {
          const { current, pageSize, ...rest } = params
          const data = await listFormTemplates({ page: current || 1, page_size: pageSize || 10, ...rest })
          return { data: data.list, total: data.total, success: true }
        }}
        toolBarRender={() => [
          <Auth perm="oa:form:add" key="add">
            <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingId(null); setEditOpen(true) }}>新建表单</Button>
          </Auth>,
        ]}
        headerTitle={
          <Space align="center">
            <span>表单管理</span>
            <ApprovalFlowSetup formType="OA_CUSTOM" label="自定义表单审批" />
          </Space>
        }
      />
      <Drawer
        title={editingId ? '编辑表单模板' : '新建表单模板'}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        width="100%"
        styles={{ body: { padding: 0, overflow: 'auto' } }}
        destroyOnHidden
      >
        <FormTemplateEditModal
          open={editOpen}
          editingId={editingId}
          onClose={() => setEditOpen(false)}
          onSuccess={() => {
            setEditOpen(false)
            actionRef.current?.reload()
          }}
        />
      </Drawer>
    </>
  )
}
