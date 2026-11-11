import { useEffect, useState } from 'react'
import { App } from 'antd'
import dayjs from 'dayjs'
import { ModalForm, ProForm, ProFormDateTimeRangePicker, ProFormDigit, ProFormSelect, ProFormText, ProFormTextArea } from '@ant-design/pro-components'
import { createVehicleApplication, getVehicleApplication, listVehicles, updateVehicleApplication } from '../../../services/oa'

interface EditModalProps {
  open: boolean
  editingId: number | null
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

interface FormValues {
  title: string
  vehicle_id: number
  time_range: [unknown, unknown]
  passengers?: number
  destination?: string
  reason: string
}

/** RangePicker 提交值兼容 dayjs 与字符串两种形态,统一转 'YYYY-MM-DD HH:mm:ss' */
const fmtTime = (v: unknown) => {
  if (dayjs.isDayjs(v)) return (v as dayjs.Dayjs).format('YYYY-MM-DD HH:mm:ss')
  return v ? String(v) : ''
}

export default function VehicleApplicationEditModal({ open, editingId, onOpenChange, onSuccess }: EditModalProps) {
  const { message } = App.useApp()
  const [form] = ProForm.useForm<FormValues>()
  const [vehicleOptions, setVehicleOptions] = useState<{ label: string; value: number }[]>([])

  useEffect(() => {
    if (!open) return
    // 车辆下拉:新建只列空闲车;编辑时把当前单据的车辆并入,保证回显
    listVehicles({ page: 1, page_size: 100 }).then((res) => {
      const idle = res.list.filter((v) => v.status === 'IDLE')
      const options = idle.map((v) => ({ label: v.vehicle_model ? `${v.plate_no}（${v.vehicle_model}）` : v.plate_no, value: v.id }))
      if (editingId) {
        getVehicleApplication(editingId).then((a) => {
          const cur = res.list.find((v) => v.id === a.vehicle_id)
          if (cur && !idle.some((v) => v.id === cur.id)) {
            options.unshift({ label: cur.vehicle_model ? `${cur.plate_no}（${cur.vehicle_model}·当前占用）` : cur.plate_no, value: cur.id })
          }
          setVehicleOptions(options)
        })
      } else {
        setVehicleOptions(options)
      }
    }).catch(() => {
      // 拦截器已提示
    })
    if (editingId) {
      getVehicleApplication(editingId).then((a) => {
        form.setFieldsValue({
          title: a.title,
          vehicle_id: a.vehicle_id,
          time_range: [a.start_time?.slice(0, 19), a.end_time?.slice(0, 19)],
          passengers: a.passengers,
          destination: a.destination,
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
      vehicle_id: values.vehicle_id,
      reason: values.reason,
      start_time: fmtTime(values.time_range?.[0]),
      end_time: fmtTime(values.time_range?.[1]),
      passengers: values.passengers ?? 1,
      destination: values.destination || '',
    }
    if (editingId) {
      await updateVehicleApplication(editingId, payload)
      message.success('已更新')
    } else {
      await createVehicleApplication(payload)
      message.success('已创建')
    }
    onSuccess()
    return true
  }

  return (
    <ModalForm<FormValues>
      title={editingId ? '编辑用车申请' : '发起用车申请'}
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
        name="vehicle_id"
        label="申请车辆"
        rules={[{ required: true, message: '请选择车辆' }]}
        options={vehicleOptions}
        fieldProps={{ showSearch: true, optionFilterProp: 'label' }}
        placeholder="仅显示空闲车辆"
        colProps={{ span: 12 }}
      />
      <ProFormDigit name="passengers" label="随行人数" min={1} precision={0} fieldProps={{ precision: 0 }} colProps={{ span: 12 }} />
      <ProFormDateTimeRangePicker
        name="time_range"
        label="出发 ~ 归还时间"
        rules={[
          { required: true, message: '请选择时间' },
          {
            validator: (_rule, value: [unknown, unknown] | undefined) => {
              if (!value?.[0] || !value?.[1]) return Promise.resolve()
              return fmtTime(value[0]) <= fmtTime(value[1])
                ? Promise.resolve()
                : Promise.reject(new Error('归还时间不能早于出发时间'))
            },
          },
        ]}
        fieldProps={{ format: 'YYYY-MM-DD HH:mm:ss', showTime: { format: 'HH:mm' } }}
        colProps={{ span: 24 }}
      />
      <ProFormText name="destination" label="目的地" colProps={{ span: 24 }} />
      <ProFormTextArea name="reason" label="用车事由" rules={[{ required: true, message: '请输入' }]} colProps={{ span: 24 }} />
    </ModalForm>
  )
}
