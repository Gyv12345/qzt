import { useEffect } from 'react'
import { App } from 'antd'
import { ModalForm, ProForm, ProFormDigit, ProFormSelect, ProFormText, ProFormTextArea } from '@ant-design/pro-components'
import { createMeetingRoom, getMeetingRoom, updateMeetingRoom } from '../../../services/oa'
import { MEETING_ROOM_STATUS_OPTIONS, EQUIPMENT_OPTIONS } from '../../../types/oa'

interface EditModalProps {
  open: boolean
  editingId: number | null
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

interface FormValues {
  name: string
  location?: string
  capacity?: number
  equipment?: string[]
  status?: string
  remark?: string
}

export default function MeetingRoomEditModal({ open, editingId, onOpenChange, onSuccess }: EditModalProps) {
  const { message } = App.useApp()
  const [form] = ProForm.useForm<FormValues>()

  useEffect(() => {
    if (!open) return
    if (editingId) {
      getMeetingRoom(editingId).then((r) => {
        form.setFieldsValue({
          name: r.name,
          location: r.location,
          capacity: r.capacity || 10,
          equipment: r.equipment ? r.equipment.split(',').filter(Boolean) : [],
          status: r.status,
          remark: r.remark,
        })
      })
    } else {
      form.setFieldsValue({ status: 'ENABLED', capacity: 10 })
    }
  }, [open, editingId])

  const handleSubmit = async (values: FormValues) => {
    const payload = {
      name: values.name,
      location: values.location || '',
      capacity: values.capacity || 0,
      equipment: Array.isArray(values.equipment) ? values.equipment.join(',') : '',
      status: values.status || 'ENABLED',
      remark: values.remark || '',
    }
    if (editingId) {
      await updateMeetingRoom(editingId, payload)
      message.success('已更新')
    } else {
      await createMeetingRoom(payload)
      message.success('已创建')
    }
    onSuccess()
    return true
  }

  return (
    <ModalForm<FormValues>
      title={editingId ? '编辑会议室' : '新增会议室'}
      form={form}
      open={open}
      onOpenChange={onOpenChange}
      modalProps={{ destroyOnHidden: true, maskClosable: false }}
      onFinish={handleSubmit}
      width={560}
    >
      <ProFormText name="name" label="会议室名称" rules={[{ required: true, message: '请输入' }]} colProps={{ span: 12 }} />
      <ProFormText name="location" label="位置" colProps={{ span: 12 }} />
      <ProFormDigit name="capacity" label="容纳人数" min={1} colProps={{ span: 12 }} />
      <ProFormSelect name="status" label="状态" options={MEETING_ROOM_STATUS_OPTIONS} colProps={{ span: 12 }} />
      <ProFormSelect name="equipment" label="设备" mode="multiple" options={EQUIPMENT_OPTIONS} colProps={{ span: 24 }} />
      <ProFormTextArea name="remark" label="备注" colProps={{ span: 24 }} fieldProps={{ autoSize: { minRows: 2 } }} />
    </ModalForm>
  )
}
