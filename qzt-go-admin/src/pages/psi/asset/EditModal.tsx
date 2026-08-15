import { useEffect } from 'react'
import { App } from 'antd'
import { ModalForm, ProForm, ProFormDatePicker, ProFormDigit, ProFormSelect, ProFormText, ProFormTextArea } from '@ant-design/pro-components'
import { createAsset, listAssets, updateAsset } from '../../../services/psi'

interface EditModalProps {
  open: boolean
  editingId: number | null
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

const CATEGORY_OPTIONS = [
  { label: '电脑', value: '电脑' },
  { label: '设备', value: '设备' },
  { label: '家具', value: '家具' },
  { label: '车辆', value: '车辆' },
  { label: '其他', value: '其他' },
]

const STATUS_OPTIONS = [
  { label: '使用中', value: 1 },
  { label: '闲置', value: 2 },
  { label: '维修中', value: 3 },
  { label: '已报废', value: 4 },
  { label: '丢失', value: 5 },
]

interface FormValues {
  name: string
  category?: string
  spec?: string
  serial_no?: string
  purchase_date?: string
  purchase_price?: number
  useful_life?: number
  status?: number
  location?: string
  remark?: string
}

export default function AssetEditModal({ open, editingId, onOpenChange, onSuccess }: EditModalProps) {
  const { message } = App.useApp()
  const [form] = ProForm.useForm<FormValues>()

  useEffect(() => {
    if (!open) return
    if (editingId) {
      listAssets({ page: 1, page_size: 200 }).then((res) => {
        const a = res.list.find((x: { id: number }) => x.id === editingId)
        if (a) {
          form.setFieldsValue({
            name: a.name,
            category: a.category,
            spec: a.spec,
            serial_no: a.serial_no,
            purchase_date: a.purchase_date?.slice(0, 10),
            purchase_price: a.purchase_price ? Number(a.purchase_price) : undefined,
            useful_life: a.useful_life,
            status: a.status,
            location: a.location,
            remark: a.remark,
          })
        }
      })
    } else {
      form.resetFields()
      form.setFieldsValue({ status: 1, category: '电脑' })
    }
  }, [open, editingId, form])

  const handleSubmit = async (values: FormValues) => {
    const payload = {
      name: values.name,
      category: values.category || '',
      spec: values.spec || '',
      serial_no: values.serial_no || '',
      purchase_date: values.purchase_date || '',
      purchase_price: values.purchase_price ? String(values.purchase_price) : '',
      useful_life: values.useful_life || 0,
      status: values.status,
      location: values.location || '',
      remark: values.remark || '',
    }
    if (editingId) {
      await updateAsset(editingId, payload)
      message.success('已更新')
    } else {
      await createAsset(payload)
      message.success('已创建')
    }
    onSuccess()
    return true
  }

  return (
    <ModalForm<FormValues>
      title={editingId ? '编辑资产' : '新增资产'}
      form={form}
      open={open}
      onOpenChange={onOpenChange}
      modalProps={{ destroyOnHidden: true, maskClosable: false }}
      onFinish={handleSubmit}
      width={640}
      grid
    >
      <ProFormText name="name" label="资产名称" rules={[{ required: true, message: '请输入' }]} colProps={{ span: 12 }} />
      <ProFormSelect name="category" label="类别" options={CATEGORY_OPTIONS} colProps={{ span: 12 }} />
      <ProFormText name="spec" label="规格型号" colProps={{ span: 12 }} />
      <ProFormText name="serial_no" label="SN/序列号" colProps={{ span: 12 }} />
      <ProFormDatePicker name="purchase_date" label="采购日期" colProps={{ span: 12 }} />
      <ProFormDigit name="purchase_price" label="采购价格" min={0} precision={2} fieldProps={{ addonBefore: '¥' }} colProps={{ span: 12 }} />
      <ProFormDigit name="useful_life" label="使用年限(月)" min={0} fieldProps={{ precision: 0 }} colProps={{ span: 12 }} />
      <ProFormSelect name="status" label="状态" options={STATUS_OPTIONS} colProps={{ span: 12 }} />
      <ProFormText name="location" label="存放位置" colProps={{ span: 24 }} />
      <ProFormTextArea name="remark" label="备注" colProps={{ span: 24 }} />
    </ModalForm>
  )
}
