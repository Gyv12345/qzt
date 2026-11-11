import { useEffect, useState } from 'react'
import { App } from 'antd'
import { ModalForm, ProForm, ProFormSelect, ProFormText, ProFormTextArea } from '@ant-design/pro-components'
import { createSeal, getSeal, updateSeal } from '../../../services/oa'
import { listUserOptions } from '../../../services/system'
import { SEAL_STATUS_OPTIONS, SEAL_TYPE_OPTIONS } from '../../../types/oa'

interface EditModalProps {
  open: boolean
  editingId: number | null
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

interface FormValues {
  name: string
  type?: string
  keeper_id?: number
  status?: number
  remark?: string
}

export default function SealEditModal({ open, editingId, onOpenChange, onSuccess }: EditModalProps) {
  const { message } = App.useApp()
  const [form] = ProForm.useForm<FormValues>()
  const [userOptions, setUserOptions] = useState<{ label: string; value: number }[]>([])

  useEffect(() => {
    if (!open) return
    listUserOptions().then((res) => {
      setUserOptions(res.list.map((u) => ({ label: u.nickname || u.username, value: u.id })))
    }).catch(() => {
      // 拦截器已提示
    })
    if (editingId) {
      getSeal(editingId).then((s) => {
        form.setFieldsValue({
          name: s.name,
          type: s.type,
          keeper_id: s.keeper_id ?? undefined,
          status: s.status,
          remark: s.remark,
        })
      })
    } else {
      form.resetFields()
    }
  }, [open, editingId, form])

  const handleSubmit = async (values: FormValues) => {
    const payload = {
      name: values.name,
      type: values.type || 'OFFICIAL',
      keeper_id: values.keeper_id ?? null,
      status: values.status ?? 1,
      remark: values.remark || '',
    }
    if (editingId) {
      await updateSeal(editingId, payload)
      message.success('已更新')
    } else {
      await createSeal(payload)
      message.success('已创建')
    }
    onSuccess()
    return true
  }

  return (
    <ModalForm<FormValues>
      title={editingId ? '编辑印章' : '新增印章'}
      form={form}
      open={open}
      onOpenChange={onOpenChange}
      modalProps={{ destroyOnHidden: true, maskClosable: false }}
      onFinish={handleSubmit}
      width={560}
      grid
    >
      <ProFormText name="name" label="印章名称" rules={[{ required: true, message: '请输入印章名称' }]} colProps={{ span: 12 }} />
      <ProFormSelect name="type" label="印章类型" options={SEAL_TYPE_OPTIONS} colProps={{ span: 12 }} />
      <ProFormSelect
        name="keeper_id"
        label="保管人"
        options={userOptions}
        fieldProps={{ showSearch: true, optionFilterProp: 'label' }}
        allowClear
        colProps={{ span: 12 }}
      />
      <ProFormSelect name="status" label="状态" options={SEAL_STATUS_OPTIONS} colProps={{ span: 12 }} />
      <ProFormTextArea name="remark" label="备注" colProps={{ span: 24 }} />
    </ModalForm>
  )
}
