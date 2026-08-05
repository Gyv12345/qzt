import { useRef, useState } from 'react'
import { App, Button, Drawer, Form, Space } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import {
  ModalForm,
  ProFormSelect,
  ProFormText,
  ProTable,
  type ActionType,
  type ProColumns,
} from '@ant-design/pro-components'
import Auth from '../../../components/Auth'
import {
  createApprovalFlow,
  listApprovalFlows,
  setApprovalFlowEnable,
} from '../../../services/approval'
import type { ApprovalFlow } from '../../../types/approval'
import Designer from './Designer'

interface FlowFormValues {
  name: string
  form_type: string
  number?: string
}

const FORM_TYPE_OPTIONS = [
  { label: '合同(CONTRACT)', value: 'CONTRACT' },
  { label: '报价单(QUOTATION)', value: 'QUOTATION' },
  { label: '订单(ORDER)', value: 'ORDER' },
  { label: '发票(INVOICE)', value: 'INVOICE' },
]

export default function ApprovalFlowPage() {
  const { message } = App.useApp()
  const actionRef = useRef<ActionType>(null)
  const [form] = Form.useForm<FlowFormValues>()
  const [modalOpen, setModalOpen] = useState(false)
  const [designId, setDesignId] = useState<number | null>(null)

  const openCreate = () => {
    form.resetFields()
    form.setFieldsValue({ form_type: 'CONTRACT' })
    setModalOpen(true)
  }

  const openDesign = (record: ApprovalFlow) => {
    setDesignId(record.id)
  }

  const handleSubmit = async (values: FlowFormValues) => {
    const payload = {
      name: values.name,
      form_type: values.form_type,
      number: values.number || undefined,
      enable: 1,
    }
    await createApprovalFlow(payload)
    message.success('流程已创建')
    actionRef.current?.reload()
    return true
  }

  const handleToggleEnable = async (record: ApprovalFlow) => {
    const next = record.enable === 1 ? 0 : 1
    await setApprovalFlowEnable(record.id, next)
    message.success(next === 1 ? '流程已启用' : '流程已禁用')
    actionRef.current?.reload()
  }

  const columns: ProColumns<ApprovalFlow>[] = [
    { title: '编号', valueType: 'indexBorder', width: 70, search: false },
    { title: '名称', dataIndex: 'name', width: 200, search: false },
    {
      title: '表单类型',
      dataIndex: 'form_type',
      width: 120,
      search: false,
      valueEnum: {
        CONTRACT: { text: '合同' },
        QUOTATION: { text: '报价单' },
        ORDER: { text: '订单' },
        INVOICE: { text: '发票' },
      },
    },
    {
      title: '启用',
      dataIndex: 'enable',
      width: 80,
      search: false,
      valueEnum: {
        1: { text: '启用', status: 'Success' },
        0: { text: '禁用', status: 'Default' },
      },
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      valueType: 'dateTime',
      width: 170,
      search: false,
    },
    {
      title: '操作',
      valueType: 'option',
      width: 160,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Auth perm="approval:flow:enable">
            <Button type="link" size="small" onClick={() => handleToggleEnable(record)}>
              {record.enable === 1 ? '禁用' : '启用'}
            </Button>
          </Auth>
          <Auth perm="approval:flow:design">
            <Button type="link" size="small" onClick={() => openDesign(record)}>
              设计
            </Button>
          </Auth>
        </Space>
      ),
    },
  ]

  return (
    <>
      <ProTable<ApprovalFlow>
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        scroll={{ x: 'max-content' }}
        request={async ({ current, pageSize, ...rest }) => {
          const res = await listApprovalFlows({ page: current, page_size: pageSize, ...rest })
          return { data: res.list, total: res.total, success: true }
        }}
        pagination={{ defaultPageSize: 10, showSizeChanger: true }}
        toolBarRender={() => [
          <Auth perm="approval:flow:add" key="add">
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              新增流程
            </Button>
          </Auth>,
        ]}
        headerTitle="审批流程列表"
      />
      <ModalForm<FlowFormValues>
        title="新增流程"
        form={form}
        open={modalOpen}
        onOpenChange={setModalOpen}
        modalProps={{ destroyOnHidden: true, maskClosable: false }}
        onFinish={handleSubmit}
        width={640}
        grid
      >
        <ProFormText
          name="name"
          label="名称"
          rules={[{ required: true, message: '请输入流程名称' }]}
          placeholder="如 合同审批"
          colProps={{ span: 12 }}
        />
        <ProFormSelect
          name="form_type"
          label="表单类型"
          rules={[{ required: true, message: '请选择表单类型' }]}
          options={FORM_TYPE_OPTIONS}
          colProps={{ span: 12 }}
        />
        <ProFormText
          name="number"
          label="编号"
          placeholder="流程编号,留空自动生成"
          colProps={{ span: 12 }}
        />
      </ModalForm>
      <Drawer
        title={null}
        open={designId !== null}
        onClose={() => {
          setDesignId(null)
          actionRef.current?.reload()
        }}
        width="90%"
        styles={{ body: { padding: 0, height: '100%' } }}
        destroyOnHidden
      >
        {designId !== null && (
          <Designer
            flowId={designId}
            onClose={() => {
              setDesignId(null)
              actionRef.current?.reload()
            }}
          />
        )}
      </Drawer>
    </>
  )
}
