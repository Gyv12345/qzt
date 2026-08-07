import { App } from 'antd'
import { ModalForm, ProForm, ProFormDatePicker, ProFormDigit, ProFormRadio, ProFormSelect, ProFormText, ProFormTextArea } from '@ant-design/pro-components'
import { createReceivable } from '../../../services/finance'

interface EditModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

interface FormValues {
  direction: string
  party_type: string
  party_name: string
  occur_date: string
  due_date?: string
  original_amount: number
  biz_type?: string
  remark?: string
}

export default function ReceivableEditModal({ open, onOpenChange, onSuccess }: EditModalProps) {
  const { message } = App.useApp()
  const [form] = ProForm.useForm<FormValues>()

  const handleSubmit = async (values: FormValues) => {
    await createReceivable({
      direction: values.direction,
      party_type: values.party_type,
      party_name: values.party_name,
      occur_date: values.occur_date,
      due_date: values.due_date || '',
      original_amount: String(values.original_amount),
      biz_type: values.biz_type || '',
      remark: values.remark || '',
    })
    message.success('已创建')
    onSuccess()
    return true
  }

  return (
    <ModalForm<FormValues>
      title="新增往来款"
      form={form}
      open={open}
      onOpenChange={onOpenChange}
      modalProps={{ destroyOnHidden: true, maskClosable: false }}
      onFinish={handleSubmit}
      width={600}
      initialValues={{ direction: 'RECEIVABLE', party_type: 'CUSTOMER' }}
    >
      <ProFormRadio.Group
        name="direction"
        label="方向"
        rules={[{ required: true }]}
        options={[
          { label: '应收(客户欠我)', value: 'RECEIVABLE' },
          { label: '应付(我欠供应商)', value: 'PAYABLE' },
        ]}
        colProps={{ span: 24 }}
      />
      <ProFormSelect
        name="party_type"
        label="往来方类型"
        options={[
          { label: '客户', value: 'CUSTOMER' },
          { label: '供应商', value: 'SUPPLIER' },
          { label: '员工', value: 'EMPLOYEE' },
        ]}
        colProps={{ span: 12 }}
      />
      <ProFormText name="party_name" label="往来方名称" rules={[{ required: true, message: '请输入' }]} colProps={{ span: 12 }} />
      <ProFormDigit
        name="original_amount"
        label="金额"
        min={0.01}
        precision={2}
        fieldProps={{ addonBefore: '¥' }}
        rules={[{ required: true, message: '请输入' }]}
        colProps={{ span: 12 }}
      />
      <ProFormText name="biz_type" label="业务类型" placeholder="如 CONTRACT/PURCHASE_ORDER" colProps={{ span: 12 }} />
      <ProFormDatePicker name="occur_date" label="发生日期" rules={[{ required: true, message: '请选择' }]} colProps={{ span: 12 }} />
      <ProFormDatePicker name="due_date" label="到期日期" colProps={{ span: 12 }} />
      <ProFormTextArea name="remark" label="备注" colProps={{ span: 24 }} />
    </ModalForm>
  )
}
