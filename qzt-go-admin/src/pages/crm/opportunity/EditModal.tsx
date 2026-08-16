import { useEffect } from 'react'
import { App, Col, DatePicker, Form, InputNumber } from 'antd'
import { ModalForm, ProForm, ProFormSelect, ProFormText, ProFormTextArea } from '@ant-design/pro-components'
import dayjs, { type Dayjs } from 'dayjs'
import CustomerSelect from '../../../components/CustomerSelect'
import UserSelect from '../../../components/UserSelect'
import { createOpportunity, updateOpportunity } from '../../../services/crm'
import type { CrmOpportunity, CrmOpportunityPayload } from '../../../types/crm'

export interface OpportunityFormValues {
  name: string
  opportunity_no?: string
  customer_id: number
  expected_amount?: number
  expected_close_date?: Dayjs
  stage?: string
  probability?: number
  owner_id?: number
  description?: string
}

interface EditModalProps {
  open: boolean
  editing: CrmOpportunity | null
  /** 阶段下拉选项 */
  stageOptions: { label: string; value: string }[]
  /** 新建时默认阶段(第一个阶段) */
  defaultStage?: string
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export default function OpportunityEditModal({
  open,
  editing,
  stageOptions,
  defaultStage,
  onOpenChange,
  onSuccess,
}: EditModalProps) {
  const { message } = App.useApp()
  const [form] = Form.useForm<OpportunityFormValues>()

  useEffect(() => {
    if (!open) return
    if (editing) {
      form.setFieldsValue({
        name: editing.name,
        opportunity_no: editing.opportunity_no || undefined,
        customer_id: editing.customer_id,
        expected_amount: editing.expected_amount ? Number(editing.expected_amount) : undefined,
        expected_close_date: editing.expected_close_date ? dayjs(editing.expected_close_date) : undefined,
        stage: editing.stage,
        probability: editing.probability ?? undefined,
        owner_id: editing.owner_id ?? undefined,
        description: editing.description,
      })
    } else {
      form.resetFields()
      form.setFieldsValue({ stage: defaultStage })
    }
  }, [open, editing, defaultStage, form])

  const handleSubmit = async (values: OpportunityFormValues) => {
    const payload: CrmOpportunityPayload = {
      name: values.name,
      opportunity_no: values.opportunity_no,
      customer_id: values.customer_id,
      expected_amount: values.expected_amount,
      expected_close_date: values.expected_close_date
        ? values.expected_close_date.format('YYYY-MM-DD')
        : undefined,
      stage: values.stage,
      probability: values.probability,
      owner_id: values.owner_id,
      description: values.description,
    }
    if (editing) {
      await updateOpportunity(editing.id, payload)
      message.success('商机已更新')
    } else {
      await createOpportunity(payload)
      message.success('商机已创建')
    }
    onSuccess()
    return true
  }

  return (
    <ModalForm<OpportunityFormValues>
      title={editing ? '编辑商机' : '新增商机'}
      form={form}
      open={open}
      onOpenChange={onOpenChange}
      modalProps={{ destroyOnHidden: true, maskClosable: false }}
      onFinish={handleSubmit}
      width={640}
      grid
    >
      <ProFormText
        name="name"
        label="商机名称"
        rules={[{ required: true, message: '请输入商机名称' }]}
        colProps={{ span: 12 }}
      />
      <ProFormText
        name="opportunity_no"
        label="商机编号"
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
        <ProForm.Item name="expected_amount" label="预期金额">
          <InputNumber min={0} precision={2} style={{ width: '100%' }} placeholder="金额" />
        </ProForm.Item>
      </Col>
      <Col span={12}>
        <ProForm.Item name="expected_close_date" label="预计成交日">
          <DatePicker style={{ width: '100%' }} />
        </ProForm.Item>
      </Col>
      <ProFormSelect
        name="stage"
        label="阶段"
        options={stageOptions}
        placeholder="选择阶段"
        colProps={{ span: 12 }}
      />
      <Col span={12}>
        <ProForm.Item name="probability" label="成交概率(%)">
          <InputNumber min={0} max={100} style={{ width: '100%' }} placeholder="0-100" />
        </ProForm.Item>
      </Col>
      <Col span={12}>
        <ProForm.Item name="owner_id" label="负责人">
          <UserSelect />
        </ProForm.Item>
      </Col>
      <ProFormTextArea
        name="description"
        label="描述"
        fieldProps={{ rows: 3 }}
        colProps={{ span: 24 }}
      />
    </ModalForm>
  )
}
