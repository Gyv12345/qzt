import { useEffect, useState } from 'react'
import { App } from 'antd'
import dayjs from 'dayjs'
import { ModalForm, ProForm, ProFormDatePicker, ProFormDigit, ProFormSelect, ProFormText, ProFormTextArea } from '@ant-design/pro-components'
import { createSealApplication, getSealApplication, listSeals, updateSealApplication } from '../../../services/oa'

interface EditModalProps {
  open: boolean
  editingId: number | null
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

interface FormValues {
  title: string
  seal_id: number
  document_name?: string
  copies?: number
  seal_date: unknown
  reason: string
}

/** DatePicker 提交值兼容 dayjs 与字符串两种形态,统一转 'YYYY-MM-DD' */
const fmtDate = (v: unknown) => {
  if (dayjs.isDayjs(v)) return (v as dayjs.Dayjs).format('YYYY-MM-DD')
  return v ? String(v) : ''
}

export default function SealApplicationEditModal({ open, editingId, onOpenChange, onSuccess }: EditModalProps) {
  const { message } = App.useApp()
  const [form] = ProForm.useForm<FormValues>()
  const [sealOptions, setSealOptions] = useState<{ label: string; value: number }[]>([])

  useEffect(() => {
    if (!open) return
    // 印章下拉:新建只列启用中的印章;编辑时把当前单据的印章并入,保证回显
    listSeals({ page: 1, page_size: 100 }).then((res) => {
      const enabled = res.list.filter((s) => s.status === 1)
      const options = enabled.map((s) => ({ label: s.name, value: s.id }))
      if (editingId) {
        getSealApplication(editingId).then((a) => {
          const cur = res.list.find((s) => s.id === a.seal_id)
          if (cur && !enabled.some((s) => s.id === cur.id)) {
            options.unshift({ label: `${cur.name}（已停用）`, value: cur.id })
          }
          setSealOptions(options)
        })
      } else {
        setSealOptions(options)
      }
    }).catch(() => {
      // 拦截器已提示
    })
    if (editingId) {
      getSealApplication(editingId).then((a) => {
        form.setFieldsValue({
          title: a.title,
          seal_id: a.seal_id,
          document_name: a.document_name,
          copies: a.copies,
          seal_date: a.seal_date?.slice(0, 10),
          reason: a.reason,
        })
      })
    } else {
      form.resetFields()
    }
  }, [open, editingId, form])

  const handleSubmit = async (values: FormValues) => {
    const payload = {
      title: values.title,
      seal_id: values.seal_id,
      reason: values.reason,
      document_name: values.document_name || '',
      copies: values.copies ?? 1,
      seal_date: fmtDate(values.seal_date),
    }
    if (editingId) {
      await updateSealApplication(editingId, payload)
      message.success('已更新')
    } else {
      await createSealApplication(payload)
      message.success('已创建')
    }
    onSuccess()
    return true
  }

  return (
    <ModalForm<FormValues>
      title={editingId ? '编辑用印申请' : '发起用印申请'}
      form={form}
      open={open}
      onOpenChange={onOpenChange}
      modalProps={{ destroyOnHidden: true, maskClosable: false }}
      onFinish={handleSubmit}
      width={640}
      grid
    >
      <ProFormText name="title" label="申请标题" rules={[{ required: true, message: '请输入' }]} colProps={{ span: 24 }} />
      <ProFormSelect
        name="seal_id"
        label="申请印章"
        rules={[{ required: true, message: '请选择印章' }]}
        options={sealOptions}
        fieldProps={{ showSearch: true, optionFilterProp: 'label' }}
        placeholder="仅显示启用中的印章"
        colProps={{ span: 12 }}
      />
      <ProFormDatePicker name="seal_date" label="用印日期" rules={[{ required: true, message: '请选择日期' }]} fieldProps={{ format: 'YYYY-MM-DD' }} colProps={{ span: 12 }} />
      <ProFormText name="document_name" label="文件名称" colProps={{ span: 12 }} />
      <ProFormDigit name="copies" label="份数" min={1} precision={0} fieldProps={{ precision: 0 }} colProps={{ span: 12 }} />
      <ProFormTextArea name="reason" label="用印事由" rules={[{ required: true, message: '请输入' }]} colProps={{ span: 24 }} />
    </ModalForm>
  )
}
