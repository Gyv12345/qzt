import { useEffect, useState } from 'react'
import { App } from 'antd'
import { ModalForm, ProForm, ProFormDateTimePicker, ProFormDigit, ProFormSelect, ProFormText, ProFormTextArea } from '@ant-design/pro-components'
import { createMeetingBooking, getMeetingBooking, updateMeetingBooking, listMeetingRooms } from '../../../services/oa'
import type { OaMeetingRoom } from '../../../types/oa'

interface EditModalProps {
  open: boolean
  editingId: number | null
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

interface FormValues {
  title: string
  room_id: number
  start_time: string
  end_time: string
  attendees?: number
  topic?: string
  remark?: string
}

const defaultTime = (offsetHours: number) => {
  const d = new Date()
  d.setHours(d.getHours() + offsetHours, 0, 0, 0)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

export default function MeetingBookingEditModal({ open, editingId, onOpenChange, onSuccess }: EditModalProps) {
  const { message } = App.useApp()
  const [form] = ProForm.useForm<FormValues>()
  const [rooms, setRooms] = useState<OaMeetingRoom[]>([])

  useEffect(() => {
    if (open) {
      listMeetingRooms({ page: 1, page_size: 100 }).then((res) => setRooms(res.list || []))
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    if (editingId) {
      getMeetingBooking(editingId).then((r) => {
        form.setFieldsValue({
          title: r.title,
          room_id: r.room_id,
          start_time: r.start_time,
          end_time: r.end_time,
          attendees: r.attendees,
          topic: r.topic,
          remark: r.remark,
        })
      })
    } else {
      form.setFieldsValue({
        start_time: defaultTime(1),
        end_time: defaultTime(2),
        attendees: 5,
      })
    }
  }, [open, editingId])

  const handleSubmit = async (values: FormValues) => {
    const payload = {
      title: values.title,
      room_id: values.room_id,
      start_time: values.start_time,
      end_time: values.end_time,
      attendees: values.attendees || 0,
      topic: values.topic || '',
      remark: values.remark || '',
    }
    if (editingId) {
      await updateMeetingBooking(editingId, payload)
      message.success('已更新')
    } else {
      await createMeetingBooking(payload)
      message.success('已创建')
    }
    onSuccess()
    return true
  }

  const roomOptions = rooms
    .filter((r) => r.status === 'ENABLED')
    .map((r) => ({
      label: `${r.name} (${r.capacity}人${r.location ? '·' + r.location : ''})`,
      value: r.id,
    }))

  return (
    <ModalForm<FormValues>
      title={editingId ? '编辑会议预订' : '新增会议预订'}
      form={form}
      open={open}
      onOpenChange={onOpenChange}
      modalProps={{ destroyOnHidden: true, maskClosable: false }}
      onFinish={handleSubmit}
      width={640}
      grid
    >
      <ProFormText name="title" label="会议标题" rules={[{ required: true, message: '请输入' }]} colProps={{ span: 24 }} />
      <ProFormSelect
        name="room_id"
        label="会议室"
        options={roomOptions}
        rules={[{ required: true, message: '请选择' }]}
        colProps={{ span: 24 }}
        placeholder={rooms.length === 0 ? '请先在会议室管理中添加会议室' : '请选择'}
      />
      <ProFormDateTimePicker name="start_time" label="开始时间" rules={[{ required: true, message: '请选择' }]} colProps={{ span: 12 }} fieldProps={{ style: { width: '100%' }, format: 'YYYY-MM-DD HH:mm:ss' }} />
      <ProFormDateTimePicker name="end_time" label="结束时间" rules={[{ required: true, message: '请选择' }]} colProps={{ span: 12 }} fieldProps={{ style: { width: '100%' }, format: 'YYYY-MM-DD HH:mm:ss' }} />
      <ProFormDigit name="attendees" label="参会人数" min={1} colProps={{ span: 12 }} />
      <ProFormTextArea name="topic" label="会议主题/议程" colProps={{ span: 24 }} fieldProps={{ autoSize: { minRows: 2 } }} />
      <ProFormTextArea name="remark" label="备注" colProps={{ span: 24 }} fieldProps={{ autoSize: { minRows: 2 } }} />
    </ModalForm>
  )
}
