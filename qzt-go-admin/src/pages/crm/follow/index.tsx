import { useEffect, useRef, useState } from 'react'
import {
  App,
  Button,
  Card,
  DatePicker,
  Form,
  InputNumber,
  Popconfirm,
  Space,
  Tabs,
  Typography,
} from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import {
  ModalForm,
  ProForm,
  ProFormTextArea,
  ProTable,
  type ActionType,
  type ProColumns,
} from '@ant-design/pro-components'
import dayjs, { type Dayjs } from 'dayjs'
import Auth from '../../../components/Auth'
import CustomerSelect from '../../../components/CustomerSelect'
import DictSelect, { DictTag } from '../../../components/DictSelect'
import {
  convertFollowPlan,
  createFollowPlan,
  createFollowRecord,
  deleteFollowPlan,
  listCustomers,
  listMyTodoPlans,
  skipFollowPlan,
  updateFollowPlan,
} from '../../../services/crm'
import type {
  CrmFollowPlan,
  CrmFollowPlanPayload,
  CrmFollowRecordPayload,
} from '../../../types/crm'

const TIME_FORMAT = 'YYYY-MM-DD HH:mm:ss'

interface PlanFormValues {
  type: string
  content: string
  plan_time: Dayjs
  remind_time?: Dayjs
  customer_id?: number
  opportunity_id?: number
  contact_id?: number
  contract_id?: number
}

interface PlanEditFormValues {
  type: string
  content: string
  plan_time: Dayjs
  remind_time?: Dayjs
}

interface ConvertFormValues {
  type: string
  content: string
  follow_time: Dayjs
}

interface RecordFormValues {
  type: string
  content: string
  follow_time: Dayjs
  customer_id?: number
  opportunity_id?: number
  contact_id?: number
  contract_id?: number
}

export default function CrmFollowPage() {
  const { message } = App.useApp()
  const actionRef = useRef<ActionType>(null)
  const [createForm] = Form.useForm<PlanFormValues>()
  const [editForm] = Form.useForm<PlanEditFormValues>()
  const [convertForm] = Form.useForm<ConvertFormValues>()
  const [recordForm] = Form.useForm<RecordFormValues>()
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [convertOpen, setConvertOpen] = useState(false)
  const [editing, setEditing] = useState<CrmFollowPlan | null>(null)
  const [converting, setConverting] = useState<CrmFollowPlan | null>(null)
  const [customerMap, setCustomerMap] = useState<Record<number, string>>({})

  useEffect(() => {
    listCustomers({ page: 1, page_size: 100 })
      .then((res) => {
        const map: Record<number, string> = {}
        ;(res.list ?? []).forEach((c) => {
          map[c.id] = c.name
        })
        setCustomerMap(map)
      })
      .catch(() => {})
  }, [])

  const openCreate = () => {
    createForm.resetFields()
    setCreateOpen(true)
  }

  const openEdit = (record: CrmFollowPlan) => {
    setEditing(record)
    editForm.resetFields()
    editForm.setFieldsValue({
      type: record.type,
      content: record.content,
      plan_time: record.plan_time ? dayjs(record.plan_time) : undefined,
      remind_time: record.remind_time ? dayjs(record.remind_time) : undefined,
    })
    setEditOpen(true)
  }

  const openConvert = (record: CrmFollowPlan) => {
    setConverting(record)
    convertForm.resetFields()
    convertForm.setFieldsValue({
      type: record.type,
      content: record.content,
      follow_time: dayjs(),
    })
    setConvertOpen(true)
  }

  const handleCreate = async (values: PlanFormValues) => {
    const payload: CrmFollowPlanPayload = {
      type: values.type,
      content: values.content,
      plan_time: values.plan_time.format(TIME_FORMAT),
      remind_time: values.remind_time ? values.remind_time.format(TIME_FORMAT) : undefined,
      customer_id: values.customer_id,
      opportunity_id: values.opportunity_id,
      contact_id: values.contact_id,
      contract_id: values.contract_id,
    }
    await createFollowPlan(payload)
    message.success('跟进计划已创建')
    actionRef.current?.reload()
    return true
  }

  const handleEdit = async (values: PlanEditFormValues) => {
    if (!editing) return false
    await updateFollowPlan(editing.id, {
      type: values.type,
      content: values.content,
      plan_time: values.plan_time.format(TIME_FORMAT),
      remind_time: values.remind_time ? values.remind_time.format(TIME_FORMAT) : undefined,
    })
    message.success('跟进计划已更新')
    actionRef.current?.reload()
    return true
  }

  const handleConvert = async (values: ConvertFormValues) => {
    if (!converting) return false
    const payload: CrmFollowRecordPayload = {
      type: values.type,
      content: values.content,
      follow_time: values.follow_time.format(TIME_FORMAT),
      customer_id: converting.customer_id ?? undefined,
      opportunity_id: converting.opportunity_id ?? undefined,
      contact_id: converting.contact_id ?? undefined,
      contract_id: converting.contract_id ?? undefined,
    }
    await convertFollowPlan(converting.id, payload)
    message.success('已转为跟进记录')
    actionRef.current?.reload()
    return true
  }

  const handleSkip = async (record: CrmFollowPlan) => {
    await skipFollowPlan(record.id)
    message.success('计划已跳过')
    actionRef.current?.reload()
  }

  const handleDelete = async (record: CrmFollowPlan) => {
    await deleteFollowPlan(record.id)
    message.success('跟进计划已删除')
    actionRef.current?.reload()
  }

  const handleCreateRecord = async (values: RecordFormValues) => {
    const payload: CrmFollowRecordPayload = {
      type: values.type,
      content: values.content,
      follow_time: values.follow_time.format(TIME_FORMAT),
      customer_id: values.customer_id,
      opportunity_id: values.opportunity_id,
      contact_id: values.contact_id,
      contract_id: values.contract_id,
    }
    await createFollowRecord(payload)
    message.success('跟进记录已创建')
    recordForm.resetFields()
    recordForm.setFieldValue('follow_time', dayjs())
  }

  const relationFields = (
    <>
      <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
        关联资源可按需填写ID
      </Typography.Text>
      <ProForm.Item name="opportunity_id" label="关联商机" colProps={{ span: 12 }}>
        <InputNumber min={1} precision={0} style={{ width: '100%' }} placeholder="商机ID" />
      </ProForm.Item>
      <ProForm.Item name="contact_id" label="关联联系人" colProps={{ span: 12 }}>
        <InputNumber min={1} precision={0} style={{ width: '100%' }} placeholder="联系人ID" />
      </ProForm.Item>
      <ProForm.Item name="contract_id" label="关联合同" colProps={{ span: 12 }}>
        <InputNumber min={1} precision={0} style={{ width: '100%' }} placeholder="合同ID" />
      </ProForm.Item>
    </>
  )

  const columns: ProColumns<CrmFollowPlan>[] = [
    { title: '编号', valueType: 'indexBorder', width: 70 },
    {
      title: '类型',
      dataIndex: 'type',
      width: 100,
      render: (_, r) => <DictTag code="FOLLOW_UP_TYPE" value={r.type} />,
    },
    { title: '内容', dataIndex: 'content', width: 240, ellipsis: true },
    { title: '计划时间', dataIndex: 'plan_time', valueType: 'dateTime', width: 170 },
    { title: '提醒时间', dataIndex: 'remind_time', valueType: 'dateTime', width: 170 },
    {
      title: '关联客户',
      dataIndex: 'customer_id',
      width: 140,
      render: (_, r) => (r.customer_id ? (customerMap[r.customer_id] ?? `#${r.customer_id}`) : '-'),
    },
    { title: '创建时间', dataIndex: 'created_at', valueType: 'dateTime', width: 170 },
    {
      title: '操作',
      valueType: 'option',
      width: 220,
      fixed: 'right',
      render: (_, record) => (
        <Space size={0} wrap>
          <Auth perm="crm:follow:edit">
            <Button type="link" size="small" onClick={() => openConvert(record)}>
              转跟进记录
            </Button>
          </Auth>
          <Auth perm="crm:follow:edit">
            <Button type="link" size="small" onClick={() => openEdit(record)}>
              编辑
            </Button>
          </Auth>
          <Auth perm="crm:follow:edit">
            <Popconfirm
              title="确认跳过该计划?"
              okText="跳过"
              cancelText="取消"
              onConfirm={() => handleSkip(record)}
            >
              <Button type="link" size="small">
                跳过
              </Button>
            </Popconfirm>
          </Auth>
          <Auth perm="crm:follow:delete">
            <Popconfirm
              title="确认删除该计划?"
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
    <Card>
      <Tabs
        items={[
          {
            key: 'todo',
            label: '我的待办计划',
            children: (
              <ProTable<CrmFollowPlan>
                rowKey="id"
                actionRef={actionRef}
                columns={columns}
                scroll={{ x: 'max-content' }}
                search={false}
                pagination={false}
                request={async () => {
                  const data = await listMyTodoPlans()
                  return { data, success: true }
                }}
                headerTitle="待办计划"
                toolBarRender={() => [
                  <Auth perm="crm:follow:add" key="add">
                    <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                      新建跟进计划
                    </Button>
                  </Auth>,
                ]}
              />
            ),
          },
          {
            key: 'record',
            label: '写跟进记录',
            children: (
              <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 16 }}>
                <Auth perm="crm:follow:add">
                  <ProForm<RecordFormValues>
                    form={recordForm}
                    style={{ width: 640 }}
                    grid
                    initialValues={{ follow_time: dayjs() }}
                    submitter={{ searchConfig: { submitText: '提交', resetText: '重置' } }}
                    onFinish={handleCreateRecord}
                  >
                    <ProForm.Item
                      name="type"
                      label="跟进类型"
                      rules={[{ required: true, message: '请选择跟进类型' }]}
                      colProps={{ span: 12 }}
                    >
                      <DictSelect code="FOLLOW_UP_TYPE" placeholder="选择跟进类型" />
                    </ProForm.Item>
                    <ProForm.Item name="customer_id" label="关联客户" colProps={{ span: 12 }}>
                      <CustomerSelect />
                    </ProForm.Item>
                    <ProFormTextArea
                      name="content"
                      label="跟进内容"
                      fieldProps={{ rows: 4, placeholder: '记录本次跟进的内容' }}
                      rules={[{ required: true, message: '请输入跟进内容' }]}
                      colProps={{ span: 24 }}
                    />
                    <ProForm.Item
                      name="follow_time"
                      label="跟进时间"
                      rules={[{ required: true, message: '请选择跟进时间' }]}
                      colProps={{ span: 12 }}
                    >
                      <DatePicker showTime style={{ width: '100%' }} placeholder="选择跟进时间" />
                    </ProForm.Item>
                    {relationFields}
                  </ProForm>
                </Auth>
              </div>
            ),
          },
        ]}
      />

      <ModalForm<PlanFormValues>
        title="新建跟进计划"
        form={createForm}
        open={createOpen}
        onOpenChange={setCreateOpen}
        modalProps={{ destroyOnHidden: true, maskClosable: false }}
        onFinish={handleCreate}
        width={640}
        grid
      >
        <ProForm.Item
          name="type"
          label="跟进类型"
          rules={[{ required: true, message: '请选择跟进类型' }]}
          colProps={{ span: 12 }}
        >
          <DictSelect code="FOLLOW_UP_TYPE" placeholder="选择跟进类型" />
        </ProForm.Item>
        <ProForm.Item name="customer_id" label="关联客户" colProps={{ span: 12 }}>
          <CustomerSelect />
        </ProForm.Item>
        <ProFormTextArea
          name="content"
          label="跟进内容"
          fieldProps={{ rows: 4, placeholder: '计划跟进的内容' }}
          rules={[{ required: true, message: '请输入跟进内容' }]}
          colProps={{ span: 24 }}
        />
        <ProForm.Item
          name="plan_time"
          label="计划时间"
          rules={[{ required: true, message: '请选择计划时间' }]}
          colProps={{ span: 12 }}
        >
          <DatePicker showTime style={{ width: '100%' }} placeholder="选择计划时间" />
        </ProForm.Item>
        <ProForm.Item name="remind_time" label="提醒时间" colProps={{ span: 12 }}>
          <DatePicker showTime style={{ width: '100%' }} placeholder="选择提醒时间(可选)" />
        </ProForm.Item>
        {relationFields}
      </ModalForm>

      <ModalForm<PlanEditFormValues>
        title="编辑跟进计划"
        form={editForm}
        open={editOpen}
        onOpenChange={setEditOpen}
        modalProps={{ destroyOnHidden: true, maskClosable: false }}
        onFinish={handleEdit}
        width={640}
        grid
      >
        <ProForm.Item
          name="type"
          label="跟进类型"
          rules={[{ required: true, message: '请选择跟进类型' }]}
          colProps={{ span: 12 }}
        >
          <DictSelect code="FOLLOW_UP_TYPE" placeholder="选择跟进类型" />
        </ProForm.Item>
        <ProForm.Item
          name="plan_time"
          label="计划时间"
          rules={[{ required: true, message: '请选择计划时间' }]}
          colProps={{ span: 12 }}
        >
          <DatePicker showTime style={{ width: '100%' }} placeholder="选择计划时间" />
        </ProForm.Item>
        <ProFormTextArea
          name="content"
          label="跟进内容"
          fieldProps={{ rows: 4, placeholder: '计划跟进的内容' }}
          rules={[{ required: true, message: '请输入跟进内容' }]}
          colProps={{ span: 24 }}
        />
        <ProForm.Item name="remind_time" label="提醒时间" colProps={{ span: 12 }}>
          <DatePicker showTime style={{ width: '100%' }} placeholder="选择提醒时间(可选)" />
        </ProForm.Item>
      </ModalForm>

      <ModalForm<ConvertFormValues>
        title="转跟进记录"
        form={convertForm}
        open={convertOpen}
        onOpenChange={setConvertOpen}
        modalProps={{ destroyOnHidden: true, maskClosable: false }}
        onFinish={handleConvert}
        width={640}
        grid
      >
        <ProForm.Item
          name="type"
          label="跟进类型"
          rules={[{ required: true, message: '请选择跟进类型' }]}
          colProps={{ span: 12 }}
        >
          <DictSelect code="FOLLOW_UP_TYPE" placeholder="选择跟进类型" />
        </ProForm.Item>
        <ProForm.Item
          name="follow_time"
          label="跟进时间"
          rules={[{ required: true, message: '请选择跟进时间' }]}
          colProps={{ span: 12 }}
        >
          <DatePicker showTime style={{ width: '100%' }} placeholder="选择跟进时间" />
        </ProForm.Item>
        <ProFormTextArea
          name="content"
          label="跟进内容"
          fieldProps={{ rows: 4, placeholder: '记录本次跟进的内容' }}
          rules={[{ required: true, message: '请输入跟进内容' }]}
          colProps={{ span: 24 }}
        />
      </ModalForm>
    </Card>
  )
}
