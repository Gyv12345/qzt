import { useEffect, useState } from 'react'
import { App } from 'antd'
import { ModalForm, ProForm, ProFormDigit, ProFormSelect, ProFormText, ProFormTextArea } from '@ant-design/pro-components'
import { createVehicle, getVehicle, updateVehicle } from '../../../services/oa'
import { listUserOptions } from '../../../services/system'
import { VEHICLE_STATUS_OPTIONS } from '../../../types/oa'

interface EditModalProps {
  open: boolean
  editingId: number | null
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

interface FormValues {
  plate_no: string
  vehicle_model?: string
  seats?: number
  status?: string
  owner_id?: number
  remark?: string
}

export default function VehicleEditModal({ open, editingId, onOpenChange, onSuccess }: EditModalProps) {
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
      getVehicle(editingId).then((v) => {
        form.setFieldsValue({
          plate_no: v.plate_no,
          vehicle_model: v.vehicle_model,
          seats: v.seats,
          status: v.status,
          owner_id: v.owner_id ?? undefined,
          remark: v.remark,
        })
      })
    } else {
      form.resetFields()
    }
  }, [open, editingId, form])

  const handleSubmit = async (values: FormValues) => {
    const payload = {
      plate_no: values.plate_no,
      vehicle_model: values.vehicle_model || '',
      seats: values.seats ?? 5,
      status: values.status || 'IDLE',
      owner_id: values.owner_id ?? null,
      remark: values.remark || '',
    }
    if (editingId) {
      await updateVehicle(editingId, payload)
      message.success('已更新')
    } else {
      await createVehicle(payload)
      message.success('已创建')
    }
    onSuccess()
    return true
  }

  return (
    <ModalForm<FormValues>
      title={editingId ? '编辑车辆' : '新增车辆'}
      form={form}
      open={open}
      onOpenChange={onOpenChange}
      modalProps={{ destroyOnHidden: true, maskClosable: false }}
      onFinish={handleSubmit}
      width={560}
      grid
    >
      <ProFormText name="plate_no" label="车牌号" rules={[{ required: true, message: '请输入车牌号' }]} placeholder="如 京A12345" colProps={{ span: 12 }} />
      <ProFormText name="vehicle_model" label="车型" placeholder="如 别克GL8" colProps={{ span: 12 }} />
      <ProFormDigit name="seats" label="座位数" min={1} max={60} precision={0} fieldProps={{ precision: 0 }} colProps={{ span: 12 }} />
      <ProFormSelect name="status" label="状态" options={VEHICLE_STATUS_OPTIONS} colProps={{ span: 12 }} />
      <ProFormSelect
        name="owner_id"
        label="责任人"
        options={userOptions}
        fieldProps={{ showSearch: true, optionFilterProp: 'label' }}
        allowClear
        colProps={{ span: 12 }}
      />
      <ProFormTextArea name="remark" label="备注" colProps={{ span: 24 }} />
    </ModalForm>
  )
}
