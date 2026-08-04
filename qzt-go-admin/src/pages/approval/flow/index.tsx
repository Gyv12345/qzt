import { useRef, useState } from 'react'
import { App, Button, Descriptions, Drawer, Empty, Form, Space, Spin, Steps, Tag, Typography } from 'antd'
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
  getApprovalFlow,
  listApprovalFlows,
  setApprovalFlowEnable,
} from '../../../services/approval'
import type { ApprovalFlow, ApprovalFlowDetail } from '../../../types/approval'

interface FlowFormValues {
  name: string
  form_type: string
  number?: string
}

const FORM_TYPE_OPTIONS = [{ label: '合同(CONTRACT)', value: 'CONTRACT' }]

export default function ApprovalFlowPage() {
  const { message } = App.useApp()
  const actionRef = useRef<ActionType>(null)
  const [form] = Form.useForm<FlowFormValues>()
  const [modalOpen, setModalOpen] = useState(false)
  const [designOpen, setDesignOpen] = useState(false)
  const [designLoading, setDesignLoading] = useState(false)
  const [designDetail, setDesignDetail] = useState<ApprovalFlowDetail | null>(null)

  const openCreate = () => {
    form.resetFields()
    form.setFieldsValue({ form_type: 'CONTRACT' })
    setModalOpen(true)
  }

  const openDesign = async (record: ApprovalFlow) => {
    setDesignOpen(true)
    setDesignLoading(true)
    setDesignDetail(null)
    try {
      const res = await getApprovalFlow(record.id)
      setDesignDetail(res)
    } finally {
      setDesignLoading(false)
    }
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
      valueEnum: { CONTRACT: { text: '合同(CONTRACT)' } },
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

  const sortedNodes = designDetail?.nodes ? [...designDetail.nodes].sort((a, b) => a.sort - b.sort) : []

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
      <Drawer title="流程设计" width={520} open={designOpen} onClose={() => setDesignOpen(false)} destroyOnHidden>
        <Spin spinning={designLoading}>
          {designDetail ? (
            <>
              <Descriptions column={1} bordered size="small">
                <Descriptions.Item label="流程名称">{designDetail.name}</Descriptions.Item>
                <Descriptions.Item label="编号">{designDetail.number || '-'}</Descriptions.Item>
                <Descriptions.Item label="表单类型">{designDetail.form_type || '-'}</Descriptions.Item>
                <Descriptions.Item label="状态">
                  {designDetail.enable === 1 ? (
                    <Tag color="success">启用</Tag>
                  ) : (
                    <Tag>禁用</Tag>
                  )}
                </Descriptions.Item>
              </Descriptions>
              <Typography.Title level={5} style={{ marginTop: 24 }}>
                节点链
              </Typography.Title>
              {sortedNodes.length > 0 ? (
                <Steps
                  direction="vertical"
                  current={-1}
                  items={sortedNodes.map((node) => ({
                    title: `${node.name}(${node.node_type})`,
                    description: `节点编号:${node.number || '-'}`,
                  }))}
                />
              ) : (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无节点" />
              )}
              <Typography.Title level={5} style={{ marginTop: 24 }}>
                审批人配置
              </Typography.Title>
              {designDetail.approvers && designDetail.approvers.length > 0 ? (
                designDetail.approvers.map((approver) => (
                  <Descriptions
                    key={approver.id}
                    column={1}
                    bordered
                    size="small"
                    style={{ marginBottom: 16 }}
                  >
                    <Descriptions.Item label="审批方式">
                      {approver.approval_type || '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="审批人类型">
                      {approver.approver_type || '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="审批人列表">
                      {approver.approver_list || '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="多人审批模式">
                      {approver.multi_approver_mode || '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="抄送列表">{approver.cc_list || '-'}</Descriptions.Item>
                  </Descriptions>
                ))
              ) : (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无审批人配置" />
              )}
            </>
          ) : null}
        </Spin>
      </Drawer>
    </>
  )
}
