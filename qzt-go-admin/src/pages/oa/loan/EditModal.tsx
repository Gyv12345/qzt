import { useEffect } from 'react'
import { App } from 'antd'
import { ModalForm, ProForm, ProFormDatePicker, ProFormDigit, ProFormSelect, ProFormText, ProFormTextArea } from '@ant-design/pro-components'
import { createLoan, getLoan, updateLoan } from '../../../services/oa'
import { LOAN_TYPE_OPTIONS } from '../../../types/oa'

interface EditModalProps {
  open: boolean
  editingId: number | null
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

interface FormValues {
  title: string
  loan_type: string
  amount: number
  expected_date?: string
  reason?: string
}

export default function LoanEditModal({ open, editingId, onOpenChange, onSuccess }: EditModalProps) {
  const { message } = App.useApp()
  const [form] = ProForm.useForm<FormValues>()

  useEffect(() => {
    if (!open) return
    if (editingId) {
      getLoan(editingId).then((l) => {
        form.setFieldsValue({
          title: l.title,
          loan_type: l.loan_type,
          amount: Number(l.amount),
          expected_date: l.expected_date?.slice(0, 10),
          reason: l.reason,
        })
      })
    } else {
      form.resetFields()
    }
  }, [open, editingId])

  const handleSubmit = async (values: FormValues) => {
    const payload = {
      title: values.title,
      loan_type: values.loan_type,
      amount: String(values.amount),
      expected_date: values.expected_date || '',
      reason: values.reason || '',
    }
    if (editingId) {
      await updateLoan(editingId, payload)
      message.success('已更新')
    } else {
      await createLoan(payload)
      message.success('已创建')
    }
    onSuccess()
    return true
  }

  return (
    <ModalForm<FormValues>
      title={editingId ? '编辑借款' : '新增借款'}
      form={form}
      open={open}
      onOpenChange={onOpenChange}
      modalProps={{ destroyOnHidden: true, maskClosable: false }}
      onFinish={handleSubmit}
      width={560}
    >
      <ProFormText name="title" label="借款标题" rules={[{ required: true, message: '请输入' }]} colProps={{ span: 24 }} />
      <ProFormSelect name="loan_type" label="借款类型" options={LOAN_TYPE_OPTIONS} rules={[{ required: true, message: '请选择' }]} colProps={{ span: 12 }} />
      <ProFormDigit name="amount" label="借款金额" min={0} precision={2} fieldProps={{ addonBefore: '¥' }} rules={[{ required: true, message: '请输入' }]} colProps={{ span: 12 }} />
      <ProFormDatePicker name="expected_date" label="预计还款日期" colProps={{ span: 12 }} />
      <ProFormTextArea name="reason" label="借款事由" colProps={{ span: 24 }} />
    </ModalForm>
  )
}
