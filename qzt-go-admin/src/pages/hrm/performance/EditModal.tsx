import { App } from 'antd'
import { ModalForm, ProForm, ProFormDatePicker, ProFormDigit, ProFormSelect, ProFormText, ProFormTextArea } from '@ant-design/pro-components'
import { createPerformance } from '../../../services/hrm'
import { listEmployees } from '../../../services/hrm'
import { useEffect, useState } from 'react'

interface EditModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

interface FormValues {
  title: string
  employee_id: number
  employee_name?: string
  dept_name?: string
  period: string
  start_date: string
  end_date: string
  reviewer_id?: number
  items: { item_name: string; weight?: string; target_desc?: string }[]
}

export default function PerfEditModal({ open, onOpenChange, onSuccess }: EditModalProps) {
  const { message } = App.useApp()
  const [form] = ProForm.useForm<FormValues>()
  const [employees, setEmployees] = useState<{ label: string; value: number }[]>([])

  useEffect(() => {
    if (open) {
      listEmployees({ page: 1, page_size: 100 }).then((res) => {
        setEmployees(res.list.map((e) => ({ label: `${e.name}(${e.emp_no})`, value: e.id })))
      })
    }
  }, [open])

  const handleSubmit = async (values: FormValues) => {
    await createPerformance({
      title: values.title,
      employee_id: values.employee_id,
      period: values.period || '',
      start_date: values.start_date,
      end_date: values.end_date,
      reviewer_id: values.reviewer_id,
      items: values.items || [],
    })
    message.success('考核已创建')
    onSuccess()
    return true
  }

  return (
    <ModalForm<FormValues>
      title="新建绩效考核"
      form={form}
      open={open}
      onOpenChange={onOpenChange}
      modalProps={{ destroyOnHidden: true, maskClosable: false }}
      onFinish={handleSubmit}
      width={680}
      initialValues={{ items: [{ item_name: '', weight: '100' }] }}
    >
      <ProFormText name="title" label="考核标题" rules={[{ required: true, message: '请输入' }]} colProps={{ span: 24 }} />
      <ProFormSelect name="employee_id" label="被考核人" options={employees} rules={[{ required: true, message: '请选择' }]} colProps={{ span: 12 }} />
      <ProFormText name="period" label="考核周期" placeholder="如 2026-Q3" colProps={{ span: 12 }} />
      <ProFormDatePicker name="start_date" label="开始日期" rules={[{ required: true, message: '请选择' }]} colProps={{ span: 12 }} />
      <ProFormDatePicker name="end_date" label="结束日期" rules={[{ required: true, message: '请选择' }]} colProps={{ span: 12 }} />
      <ProForm.Group>
        <ProFormText name="items[0].item_name" label="考核指标1" rules={[{ required: true, message: '请输入' }]} colProps={{ span: 16 }} />
        <ProFormDigit name="items[0].weight" label="权重(%)" min={0} max={100} fieldProps={{ precision: 0 }} colProps={{ span: 8 }} />
      </ProForm.Group>
      <ProFormTextArea name="items[0].target_desc" label="目标说明" colProps={{ span: 24 }} />
    </ModalForm>
  )
}
