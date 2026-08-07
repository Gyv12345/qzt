import { useEffect } from 'react'
import { App } from 'antd'
import { ModalForm, ProForm, ProFormDatePicker, ProFormDigit, ProFormSelect, ProFormText, ProFormTextArea } from '@ant-design/pro-components'
import { createTrip, getTrip, updateTrip } from '../../../services/oa'

interface EditModalProps {
  open: boolean
  editingId: number | null
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

interface FormValues {
  title: string
  destination: string
  start_date: string
  end_date: string
  purpose?: string
  transport?: string
  budget_amount?: number
  description?: string
}

const TRANSPORT_OPTIONS = [
  { label: '飞机', value: '飞机' },
  { label: '高铁', value: '高铁' },
  { label: '火车', value: '火车' },
  { label: '自驾', value: '自驾' },
  { label: '其他', value: '其他' },
]

export default function TripEditModal({ open, editingId, onOpenChange, onSuccess }: EditModalProps) {
  const { message } = App.useApp()
  const [form] = ProForm.useForm<FormValues>()

  useEffect(() => {
    if (!open) return
    if (editingId) {
      getTrip(editingId).then((t) => {
        form.setFieldsValue({
          title: t.title,
          destination: t.destination,
          start_date: t.start_date?.slice(0, 10),
          end_date: t.end_date?.slice(0, 10),
          purpose: t.purpose,
          transport: t.transport,
          budget_amount: t.budget_amount ? Number(t.budget_amount) : undefined,
          description: t.description,
        })
      })
    } else {
      form.resetFields()
    }
  }, [open, editingId])

  const handleSubmit = async (values: FormValues) => {
    const payload = {
      title: values.title,
      destination: values.destination,
      start_date: values.start_date,
      end_date: values.end_date,
      purpose: values.purpose || '',
      transport: values.transport || '',
      budget_amount: values.budget_amount ? String(values.budget_amount) : '',
      description: values.description || '',
    }
    if (editingId) {
      await updateTrip(editingId, payload)
      message.success('已更新')
    } else {
      await createTrip(payload)
      message.success('已创建')
    }
    onSuccess()
    return true
  }

  return (
    <ModalForm<FormValues>
      title={editingId ? '编辑出差申请' : '新增出差申请'}
      form={form}
      open={open}
      onOpenChange={onOpenChange}
      modalProps={{ destroyOnHidden: true, maskClosable: false }}
      onFinish={handleSubmit}
      width={640}
    >
      <ProFormText name="title" label="出差标题" rules={[{ required: true, message: '请输入' }]} colProps={{ span: 24 }} />
      <ProFormText name="destination" label="目的地" rules={[{ required: true, message: '请输入' }]} colProps={{ span: 12 }} />
      <ProFormSelect name="transport" label="交通方式" options={TRANSPORT_OPTIONS} colProps={{ span: 12 }} />
      <ProFormDatePicker name="start_date" label="出发日期" rules={[{ required: true, message: '请选择' }]} colProps={{ span: 12 }} />
      <ProFormDatePicker name="end_date" label="返回日期" rules={[{ required: true, message: '请选择' }]} colProps={{ span: 12 }} />
      <ProFormDigit name="budget_amount" label="预算金额" min={0} precision={2} fieldProps={{ addonBefore: '¥' }} colProps={{ span: 12 }} />
      <ProFormTextArea name="purpose" label="出差目的" colProps={{ span: 24 }} />
      <ProFormTextArea name="description" label="备注说明" colProps={{ span: 24 }} />
    </ModalForm>
  )
}
