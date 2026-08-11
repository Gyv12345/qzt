import { useEffect } from 'react'
import { App } from 'antd'
import { ModalForm, ProForm, ProFormDatePicker, ProFormSelect, ProFormTextArea } from '@ant-design/pro-components'
import { createWorkLog, getWorkLog, updateWorkLog } from '../../../services/oa'
import { LOG_TYPE_OPTIONS } from '../../../types/oa'

interface EditModalProps {
  open: boolean
  editingId: number | null
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

interface FormValues {
  log_type?: string
  log_date: string
  content?: string
  plan?: string
  problems?: string
}

export default function WorkLogEditModal({ open, editingId, onOpenChange, onSuccess }: EditModalProps) {
  const { message } = App.useApp()
  const [form] = ProForm.useForm<FormValues>()

  useEffect(() => {
    if (!open) return
    if (editingId) {
      getWorkLog(editingId).then((r) => {
        form.setFieldsValue({
          log_type: r.log_type,
          log_date: r.log_date?.slice(0, 10),
          content: r.content,
          plan: r.plan,
          problems: r.problems,
        })
      })
    } else {
      // 默认填今天
      const today = new Date().toISOString().slice(0, 10)
      form.setFieldsValue({ log_type: 'DAILY', log_date: today })
    }
  }, [open, editingId])

  const handleSubmit = async (values: FormValues) => {
    const payload = {
      log_type: values.log_type || 'DAILY',
      log_date: values.log_date,
      content: values.content || '',
      plan: values.plan || '',
      problems: values.problems || '',
    }
    if (editingId) {
      await updateWorkLog(editingId, payload)
      message.success('已更新')
    } else {
      await createWorkLog(payload)
      message.success('已创建')
    }
    onSuccess()
    return true
  }

  return (
    <ModalForm<FormValues>
      title={editingId ? '编辑工作日志' : '新增工作日志'}
      form={form}
      open={open}
      onOpenChange={onOpenChange}
      modalProps={{ destroyOnHidden: true, maskClosable: false }}
      onFinish={handleSubmit}
      width={640}
      grid
    >
      <ProFormSelect name="log_type" label="类型" options={LOG_TYPE_OPTIONS} colProps={{ span: 12 }} />
      <ProFormDatePicker name="log_date" label="日期" rules={[{ required: true, message: '请选择' }]} colProps={{ span: 12 }} />
      <ProFormTextArea name="content" label="今日完成" colProps={{ span: 24 }} fieldProps={{ autoSize: { minRows: 3 } }} />
      <ProFormTextArea name="plan" label="明日计划" colProps={{ span: 24 }} fieldProps={{ autoSize: { minRows: 3 } }} />
      <ProFormTextArea name="problems" label="遇到问题" colProps={{ span: 24 }} fieldProps={{ autoSize: { minRows: 2 } }} />
    </ModalForm>
  )
}
