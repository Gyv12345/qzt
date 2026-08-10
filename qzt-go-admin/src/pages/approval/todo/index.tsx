import { useRef, useState } from 'react'
import { App, Button, Form, Space } from 'antd'
import {
  ModalForm,
  ProFormTextArea,
  ProTable,
  type ActionType,
  type ProColumns,
} from '@ant-design/pro-components'
import Auth from '../../../components/Auth'
import { approveTask, listMyTodos, rejectTask } from '../../../services/approval'
import type { ApprovalTask } from '../../../types/approval'
import InstanceDrawer from '../InstanceDrawer'

interface CommentFormValues {
  comment?: string
}

export default function ApprovalTodoPage() {
  const { message } = App.useApp()
  const actionRef = useRef<ActionType>(null)
  const [form] = Form.useForm<CommentFormValues>()
  const [approveOpen, setApproveOpen] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [current, setCurrent] = useState<ApprovalTask | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerInstanceId, setDrawerInstanceId] = useState<number | null>(null)

  const openApprove = (record: ApprovalTask) => {
    setCurrent(record)
    form.resetFields()
    setApproveOpen(true)
  }

  const openReject = (record: ApprovalTask) => {
    setCurrent(record)
    form.resetFields()
    setRejectOpen(true)
  }

  const openDetail = (record: ApprovalTask) => {
    setDrawerInstanceId(record.instance_id ?? null)
    setDrawerOpen(true)
  }

  const handleApprove = async (values: CommentFormValues) => {
    if (!current) return false
    await approveTask(current.id, values.comment || undefined)
    message.success('已通过')
    actionRef.current?.reload()
    return true
  }

  const handleReject = async (values: CommentFormValues) => {
    if (!current) return false
    await rejectTask(current.id, values.comment || '')
    message.success('已驳回')
    actionRef.current?.reload()
    return true
  }

  const columns: ProColumns<ApprovalTask>[] = [
    { title: '编号', valueType: 'indexBorder', width: 70, search: false },
    {
      title: '类型',
      width: 100,
      search: false,
      render: (_, record) => record.instance?.form_type_label || record.instance?.type || '-',
    },
    {
      title: '标题',
      width: 240,
      search: false,
      ellipsis: true,
      render: (_, record) => record.instance?.resource_title || (record.instance ? `#${record.instance.resource_id}` : '-'),
    },
    { title: '轮次', dataIndex: 'node_round', width: 70, search: false },
    {
      title: '到达时间',
      dataIndex: 'created_at',
      valueType: 'dateTime',
      width: 170,
      search: false,
    },
    {
      title: '操作',
      valueType: 'option',
      width: 180,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Auth perm="approval:todo:approve">
            <Button type="link" size="small" onClick={() => openApprove(record)}>
              通过
            </Button>
          </Auth>
          <Auth perm="approval:todo:reject">
            <Button type="link" size="small" danger onClick={() => openReject(record)}>
              驳回
            </Button>
          </Auth>
          <Button type="link" size="small" onClick={() => openDetail(record)}>
            详情
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <>
      <ProTable<ApprovalTask>
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        scroll={{ x: 'max-content' }}
        request={async ({ current, pageSize, ...rest }) => {
          const res = await listMyTodos({ page: current, page_size: pageSize, ...rest })
          return { data: res.list, total: res.total, success: true }
        }}
        pagination={{ defaultPageSize: 10, showSizeChanger: true }}
        headerTitle="我的待办"
      />
      <ModalForm<CommentFormValues>
        title="通过审批"
        form={form}
        open={approveOpen}
        onOpenChange={setApproveOpen}
        modalProps={{ destroyOnHidden: true, maskClosable: false }}
        onFinish={handleApprove}
        width={480}
      >
        <ProFormTextArea
          name="comment"
          label="备注"
          placeholder="备注(可选)"
          fieldProps={{ rows: 3 }}
        />
      </ModalForm>
      <ModalForm<CommentFormValues>
        title="驳回审批"
        form={form}
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        modalProps={{ destroyOnHidden: true, maskClosable: false }}
        onFinish={handleReject}
        width={480}
      >
        <ProFormTextArea
          name="comment"
          label="驳回原因"
          placeholder="请填写驳回原因"
          rules={[{ required: true, message: '请填写驳回原因' }]}
          fieldProps={{ rows: 3 }}
        />
      </ModalForm>
      <InstanceDrawer
        instanceId={drawerInstanceId}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </>
  )
}
