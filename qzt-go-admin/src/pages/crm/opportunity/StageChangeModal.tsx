import { useEffect } from 'react'
import { App, Form } from 'antd'
import { ModalForm, ProFormSelect, ProFormText } from '@ant-design/pro-components'
import { changeOpportunityStage } from '../../../services/crm'
import type { CrmOpportunity } from '../../../types/crm'

interface StageFormValues {
  stage: string
  reason?: string
}

interface StageChangeModalProps {
  /** 目标商机(非空即打开),关闭时置 null */
  target: CrmOpportunity | null
  /** 阶段下拉选项 */
  stageOptions: { label: string; value: string }[]
  onClose: () => void
  onSuccess: () => void
}

/** 商机阶段流转弹窗:目标阶段 + 流转原因 */
export default function StageChangeModal({ target, stageOptions, onClose, onSuccess }: StageChangeModalProps) {
  const { message } = App.useApp()
  const [stageForm] = Form.useForm<StageFormValues>()

  useEffect(() => {
    if (!target) return
    stageForm.resetFields()
    stageForm.setFieldsValue({ stage: target.stage, reason: undefined })
  }, [target, stageForm])

  const handleSubmit = async (values: StageFormValues) => {
    if (!target) return false
    await changeOpportunityStage(target.id, values.stage, values.reason)
    message.success('阶段已流转')
    onSuccess()
    return true
  }

  return (
    <ModalForm<StageFormValues>
      title={target ? `阶段流转 - ${target.name}` : '阶段流转'}
      form={stageForm}
      open={!!target}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      modalProps={{ destroyOnHidden: true, maskClosable: false }}
      onFinish={handleSubmit}
      width={640}
      grid
    >
      <ProFormSelect
        name="stage"
        label="目标阶段"
        options={stageOptions}
        rules={[{ required: true, message: '请选择目标阶段' }]}
        colProps={{ span: 12 }}
      />
      <ProFormText name="reason" label="流转原因" colProps={{ span: 12 }} />
    </ModalForm>
  )
}
