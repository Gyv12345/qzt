import { useEffect } from 'react'
import { App, Col, DatePicker, Form, InputNumber } from 'antd'
import {
  ModalForm,
  ProForm,
  ProFormText,
  ProFormTextArea,
} from '@ant-design/pro-components'
import dayjs, { type Dayjs } from 'dayjs'
import CustomerSelect from '../../../components/CustomerSelect'
import DictSelect from '../../../components/DictSelect'
import OpportunitySelect from '../../../components/OpportunitySelect'
import UserSelect from '../../../components/UserSelect'
import { createContract, updateContract } from '../../../services/crm'
import type { CrmContract, CrmContractPayload } from '../../../types/crm'

export interface ContractFormValues {
  name: string
  contract_no?: string
  customer_id: number
  opportunity_id?: number
  total_amount?: number
  signed_date?: Dayjs
  start_date?: Dayjs
  end_date?: Dayjs
  stage?: string
  owner_id?: number
  content?: string
}

const formatDate = (v: Dayjs | undefined) => (v ? v.format('YYYY-MM-DD') : undefined)

interface EditModalProps {
  open: boolean
  editing: CrmContract | null
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export default function ContractEditModal({ open, editing, onOpenChange, onSuccess }: EditModalProps) {
  const { message } = App.useApp()
  const [form] = Form.useForm<ContractFormValues>()
  // 表单内已选客户(联动商机下拉过滤)
  const selectedCustomerId = Form.useWatch('customer_id', form)

  useEffect(() => {
    if (!open) return
    if (editing) {
      form.setFieldsValue({
        name: editing.name,
        contract_no: editing.contract_no || undefined,
        customer_id: editing.customer_id,
        opportunity_id: editing.opportunity_id ?? undefined,
        total_amount: Number(editing.total_amount),
        signed_date: editing.signed_date ? dayjs(editing.signed_date) : undefined,
        start_date: editing.start_date ? dayjs(editing.start_date) : undefined,
        end_date: editing.end_date ? dayjs(editing.end_date) : undefined,
        stage: editing.stage || undefined,
        owner_id: editing.owner_id ?? undefined,
        content: editing.content,
      })
    } else {
      form.resetFields()
      form.setFieldsValue({ stage: 'DRAFT' } as Partial<ContractFormValues>)
    }
  }, [open, editing, form])

  const handleSubmit = async (values: ContractFormValues) => {
    const payload: CrmContractPayload = {
      name: values.name,
      contract_no: values.contract_no,
      customer_id: values.customer_id,
      opportunity_id: values.opportunity_id,
      total_amount: values.total_amount,
      signed_date: formatDate(values.signed_date),
      start_date: formatDate(values.start_date),
      end_date: formatDate(values.end_date),
      stage: values.stage,
      owner_id: values.owner_id,
      content: values.content,
    }
    if (editing) {
      await updateContract(editing.id, payload)
      message.success('合同已更新')
    } else {
      await createContract(payload)
      message.success('合同已创建')
    }
    onSuccess()
    return true
  }

  return (
    <ModalForm<ContractFormValues>
      title={editing ? '编辑合同' : '新增合同'}
      form={form}
      open={open}
      onOpenChange={onOpenChange}
      modalProps={{ destroyOnHidden: true, maskClosable: false }}
      onFinish={handleSubmit}
      onValuesChange={(changed) => {
        // 换客户后清空已选商机(商机下拉按客户过滤)
        if ('customer_id' in changed) form.setFieldsValue({ opportunity_id: undefined })
      }}
      width={720}
      grid
    >
      <ProFormText
        name="name"
        label="合同名称"
        rules={[{ required: true, message: '请输入合同名称' }]}
        placeholder="合同名称"
        colProps={{ span: 12 }}
      />
      <ProFormText
        name="contract_no"
        label="合同编号"
        placeholder="留空则自动生成"
        colProps={{ span: 12 }}
      />
      <Col span={12}>
        <ProForm.Item
          name="customer_id"
          label="客户"
          rules={[{ required: true, message: '请选择客户' }]}
        >
          <CustomerSelect />
        </ProForm.Item>
      </Col>
      <Col span={12}>
        <ProForm.Item name="opportunity_id" label="关联商机">
          <OpportunitySelect customerId={selectedCustomerId} />
        </ProForm.Item>
      </Col>
      <Col span={12}>
        <ProForm.Item name="total_amount" label="合同金额">
          <InputNumber min={0} precision={2} style={{ width: '100%' }} placeholder="合同金额" />
        </ProForm.Item>
      </Col>
      <Col span={12}>
        <ProForm.Item name="signed_date" label="签订日期">
          <DatePicker style={{ width: '100%' }} placeholder="选择日期" />
        </ProForm.Item>
      </Col>
      <Col span={12}>
        <ProForm.Item name="start_date" label="开始日期">
          <DatePicker style={{ width: '100%' }} placeholder="选择日期" />
        </ProForm.Item>
      </Col>
      <Col span={12}>
        <ProForm.Item name="end_date" label="结束日期">
          <DatePicker style={{ width: '100%' }} placeholder="选择日期" />
        </ProForm.Item>
      </Col>
      <Col span={12}>
        <ProForm.Item name="stage" label="阶段">
          <DictSelect code="CONTRACT_STAGE" placeholder="选择阶段" />
        </ProForm.Item>
      </Col>
      <Col span={12}>
        <ProForm.Item name="owner_id" label="负责人">
          <UserSelect />
        </ProForm.Item>
      </Col>
      <ProFormTextArea
        name="content"
        label="合同内容"
        placeholder="合同内容"
        colProps={{ span: 24 }}
      />
    </ModalForm>
  )
}
