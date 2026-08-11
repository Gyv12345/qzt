import { useEffect } from 'react'
import { App } from 'antd'
import { ModalForm, ProForm, ProFormSelect, ProFormText, ProFormTextArea, ProFormDateTimePicker } from '@ant-design/pro-components'
import { createSchedule, getSchedule, updateSchedule } from '../../../services/oa'
import { SCHEDULE_TYPE_OPTIONS, REMIND_TYPE_OPTIONS, SCHEDULE_STATUS_OPTIONS } from '../../../types/oa'

interface EditModalProps {
  open: boolean
  editingId: number | null
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

interface FormValues {
  title: string
  event_type?: string
  start_time: string
  end_time: string
  location?: string
  content?: string
  remind_type?: string
  status?: string
}

const today = (offsetHours = 0) => {
  const d = new Date()
  d.setHours(d.getHours() + offsetHours, 0, 0, 0)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

export default function ScheduleEditModal({ open, editingId, onOpenChange, onSuccess }: EditModalProps) {
  const { message } = App.useApp()
  const [form] = ProForm.useForm<FormValues>()

  useEffect(() => {
    if (!open) return
    if (editingId) {
      getSchedule(editingId).then((r) => {
        form.setFieldsValue({
          title: r.title,
          event_type: r.event_type,
          start_time: r.start_time,
          end_time: r.end_time,
          location: r.location,
          content: r.content,
          remind_type: r.remind_type,
          status: r.status,
        })
      })
    } else {
      form.setFieldsValue({
        event_type: 'OTHER',
        start_time: today(0),
        end_time: today(1),
        remind_type: 'NONE',
        status: 'PENDING',
      })
    }
  }, [open, editingId])

  const handleSubmit = async (values: FormValues) => {
    const payload = {
      title: values.title,
      event_type: values.event_type || 'OTHER',
      start_time: values.start_time,
      end_time: values.end_time,
      location: values.location || '',
      content: values.content || '',
      remind_type: values.remind_type || 'NONE',
      status: values.status || 'PENDING',
    }
    if (editingId) {
      await updateSchedule(editingId, payload)
      message.success('已更新')
    } else {
      await createSchedule(payload)
      message.success('已创建')
    }
    onSuccess()
    return true
  }

  return (
    <ModalForm<FormValues>
      title={editingId ? '编辑日程' : '新增日程'}
      form={form}
      open={open}
      onOpenChange={onOpenChange}
      modalProps={{ destroyOnHidden: true, maskClosable: false }}
      onFinish={handleSubmit}
      width={640}
      grid
    >
      <ProFormText name="title" label="标题" rules={[{ required: true, message: '请输入' }]} colProps={{ span: 24 }} />
      <ProFormSelect name="event_type" label="类型" options={SCHEDULE_TYPE_OPTIONS} colProps={{ span: 8 }} />
      <ProFormSelect name="remind_type" label="提醒" options={REMIND_TYPE_OPTIONS} colProps={{ span: 8 }} />
      <ProFormSelect name="status" label="状态" options={SCHEDULE_STATUS_OPTIONS} colProps={{ span: 8 }} />
      <ProFormDateTimePicker name="start_time" label="开始时间" rules={[{ required: true, message: '请选择' }]} colProps={{ span: 12 }} fieldProps={{ style: { width: '100%' }, format: 'YYYY-MM-DD HH:mm:ss' }} />
      <ProFormDateTimePicker name="end_time" label="结束时间" rules={[{ required: true, message: '请选择' }]} colProps={{ span: 12 }} fieldProps={{ style: { width: '100%' }, format: 'YYYY-MM-DD HH:mm:ss' }} />
      <ProFormText name="location" label="地点" colProps={{ span: 24 }} />
      <ProFormTextArea name="content" label="内容" colProps={{ span: 24 }} fieldProps={{ autoSize: { minRows: 2 } }} />
    </ModalForm>
  )
}
