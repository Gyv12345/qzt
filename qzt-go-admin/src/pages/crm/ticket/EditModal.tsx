import { useEffect } from 'react'
import { App } from 'antd'
import { ModalForm, ProForm, ProFormSelect, ProFormText, ProFormTextArea } from '@ant-design/pro-components'
import CustomerSelect from '../../../components/CustomerSelect'
import { createTicket, getTicket, updateTicket } from '../../../services/crm'

interface EditModalProps {
  open: boolean
  editingId: number | null
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

const PRIORITY_OPTIONS = [
  { label: '低', value: 1 },
  { label: '中', value: 2 },
  { label: '高', value: 3 },
  { label: '紧急', value: 4 },
]

const CATEGORY_OPTIONS = [
  { label: '产品故障', value: '产品故障' },
  { label: '使用咨询', value: '使用咨询' },
  { label: '功能需求', value: '功能需求' },
  { label: '投诉', value: '投诉' },
  { label: '其他', value: '其他' },
]

interface FormValues {
  title: string
  description?: string
  customer_id?: number
  contact_name?: string
  contact_phone?: string
  category?: string
  priority: number
}

export default function TicketEditModal({ open, editingId, onOpenChange, onSuccess }: EditModalProps) {
  const { message } = App.useApp()
  const [form] = ProForm.useForm<FormValues>()

  useEffect(() => {
    if (!open) return
    if (editingId) {
      getTicket(editingId).then((detail) => {
        const t = detail.ticket
        form.setFieldsValue({
          title: t.title,
          description: t.description,
          customer_id: t.customer_id || undefined,
          contact_name: t.contact_name,
          contact_phone: t.contact_phone,
          category: t.category,
          priority: t.priority,
        })
      })
    } else {
      form.resetFields()
      form.setFieldsValue({ priority: 2 })
    }
  }, [open, editingId])

  const handleSubmit = async (values: FormValues) => {
    const payload = {
      title: values.title,
      description: values.description || '',
      customer_id: values.customer_id,
      contact_name: values.contact_name || '',
      contact_phone: values.contact_phone || '',
      category: values.category || '',
      priority: values.priority,
    }
    if (editingId) {
      await updateTicket(editingId, payload)
      message.success('已更新')
    } else {
      await createTicket(payload)
      message.success('已创建')
    }
    onSuccess()
    return true
  }

  return (
    <ModalForm<FormValues>
      title={editingId ? '编辑工单' : '新建工单'}
      form={form}
      open={open}
      onOpenChange={onOpenChange}
      modalProps={{ destroyOnHidden: true, maskClosable: false }}
      onFinish={handleSubmit}
      width={600}
      grid
    >
      <ProFormText name="title" label="标题" rules={[{ required: true, message: '请输入' }]} colProps={{ span: 24 }} />
      <ProForm.Item name="customer_id" label="客户" colProps={{ span: 12 }}>
        <CustomerSelect placeholder="选择客户" />
      </ProForm.Item>
      <ProFormSelect name="category" label="问题类型" options={CATEGORY_OPTIONS} colProps={{ span: 12 }} />
      <ProFormText name="contact_name" label="联系人" colProps={{ span: 12 }} />
      <ProFormText name="contact_phone" label="联系电话" colProps={{ span: 12 }} />
      <ProFormSelect name="priority" label="优先级" options={PRIORITY_OPTIONS} colProps={{ span: 12 }} />
      <ProFormTextArea name="description" label="问题描述" colProps={{ span: 24 }} />
    </ModalForm>
  )
}
