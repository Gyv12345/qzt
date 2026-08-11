import { useEffect, useState } from 'react'
import { App } from 'antd'
import { ModalForm, ProForm, ProFormDatePicker, ProFormDigit, ProFormSelect, ProFormTextArea } from '@ant-design/pro-components'
import DictSelect from '../../../components/DictSelect'
import { applyLeave, listEmployees } from '../../../services/hrm'

interface EditModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

interface FormValues {
  employee_id: number
  leave_type: string
  start_date: string
  end_date: string
  duration_days: number
  reason?: string
}

export default function LeaveEditModal({ open, onOpenChange, onSuccess }: EditModalProps) {
  const { message } = App.useApp()
  const [form] = ProForm.useForm<FormValues>()
  const [employees, setEmployees] = useState<{ label: string; value: number }[]>([])

  useEffect(() => {
    if (open) {
      listEmployees({ page: 1, page_size: 100 }).then((res) => {
        setEmployees(
          res.list.map((e) => ({
            label: `${e.name}(${e.emp_no})`,
            value: e.id,
          })),
        )
      })
    }
  }, [open])

  const handleSubmit = async (values: FormValues) => {
    await applyLeave({
      employee_id: values.employee_id,
      leave_type: values.leave_type,
      start_date: values.start_date + ' 00:00:00',
      end_date: values.end_date + ' 23:59:59',
      duration_days: String(values.duration_days),
      reason: values.reason,
    })
    message.success('已提交请假申请')
    onSuccess()
    return true
  }

  return (
    <ModalForm<FormValues>
      title="申请请假"
      form={form}
      open={open}
      onOpenChange={onOpenChange}
      modalProps={{ destroyOnHidden: true, maskClosable: false }}
      onFinish={handleSubmit}
      width={560}
      grid
    >
      <ProFormSelect
        name="employee_id"
        label="请假人"
        options={employees}
        rules={[{ required: true, message: '请选择员工' }]}
        colProps={{ span: 24 }}
      />
      <ProForm.Item name="leave_type" label="请假类型" rules={[{ required: true, message: '请选择' }]} colProps={{ span: 12 }}>
        <DictSelect code="LEAVE_TYPE" placeholder="选择类型" />
      </ProForm.Item>
      <ProFormDigit
        name="duration_days"
        label="请假天数"
        min={0.5}
        step={0.5}
        precision={1}
        rules={[{ required: true, message: '请输入天数' }]}
        colProps={{ span: 12 }}
      />
      <ProFormDatePicker
        name="start_date"
        label="开始日期"
        rules={[{ required: true, message: '请选择' }]}
        colProps={{ span: 12 }}
      />
      <ProFormDatePicker
        name="end_date"
        label="结束日期"
        rules={[{ required: true, message: '请选择' }]}
        colProps={{ span: 12 }}
      />
      <ProFormTextArea name="reason" label="请假事由" colProps={{ span: 24 }} />
    </ModalForm>
  )
}
