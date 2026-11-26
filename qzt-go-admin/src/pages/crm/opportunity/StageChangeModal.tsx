import { useEffect } from 'react'
import { Alert, App, Col, Form, Space, Tag } from 'antd'
import { ModalForm, ProForm, ProFormSelect, ProFormText } from '@ant-design/pro-components'
import DictSelect from '../../../components/DictSelect'
import { changeOpportunityStage } from '../../../services/crm'
import {
  OPPORTUNITY_REQUIRED_FIELD_OPTIONS,
  type CrmOpportunity,
  type StageDef,
} from '../../../types/crm'

interface StageFormValues {
  stage: string
  reason?: string
  lost_reason?: string
}

interface StageChangeModalProps {
  /** 目标商机(非空即打开),关闭时置 null */
  target: CrmOpportunity | null
  /** 阶段定义,用于选项与阶段要求展示 */
  stageDefs: StageDef[]
  /** 看板快捷流转时预选的目标阶段 */
  initialStage?: string
  onClose: () => void
  onSuccess: () => void
}

/** 商机阶段流转弹窗:目标阶段、阶段要求、流转原因与输单原因 */
export default function StageChangeModal({
  target,
  stageDefs,
  initialStage,
  onClose,
  onSuccess,
}: StageChangeModalProps) {
  const { message } = App.useApp()
  const [stageForm] = Form.useForm<StageFormValues>()
  const selectedStageKey = Form.useWatch('stage', stageForm)
  const selectedStage = stageDefs.find((stage) => stage.key === selectedStageKey)
  const requiredFieldLabels = (selectedStage?.required_fields ?? []).map(
    (field) => OPPORTUNITY_REQUIRED_FIELD_OPTIONS.find((item) => item.value === field)?.label ?? field,
  )

  useEffect(() => {
    if (!target) return
    stageForm.resetFields()
    stageForm.setFieldsValue({
      stage: initialStage ?? target.stage,
      reason: undefined,
      lost_reason: undefined,
    })
  }, [target, initialStage, stageForm])

  const handleSubmit = async (values: StageFormValues) => {
    if (!target) return false
    await changeOpportunityStage(target.id, {
      stage: values.stage,
      reason: values.reason || undefined,
      lost_reason: values.stage === 'LOST' ? values.lost_reason : undefined,
    })
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
        options={stageDefs.map((stage) => ({ label: stage.label, value: stage.key }))}
        rules={[{ required: true, message: '请选择目标阶段' }]}
        colProps={{ span: 12 }}
      />
      <ProFormText name="reason" label="流转原因" colProps={{ span: 12 }} />
      {selectedStage && (
        <Col span={24}>
          <Alert
            type="info"
            showIcon
            message={`${selectedStage.label}阶段要求`}
            description={
              <Space direction="vertical" size={8} style={{ width: '100%' }}>
                <div>{selectedStage.guidance || '暂无阶段说明'}</div>
                <Space size={[0, 8]} wrap>
                  <span>资料要求:</span>
                  {requiredFieldLabels.length > 0 ? (
                    requiredFieldLabels.map((label) => <Tag key={label}>{label}</Tag>)
                  ) : (
                    <span>无</span>
                  )}
                </Space>
                {selectedStage.require_followup && <div>该阶段要求有跟进记录。</div>}
                {!!selectedStage.stagnant_days && <div>停留超过 {selectedStage.stagnant_days} 天将标记为停滞。</div>}
              </Space>
            }
            style={{ marginBottom: 24 }}
          />
        </Col>
      )}
      {selectedStageKey === 'LOST' && (
        <Col span={12}>
          <ProForm.Item
            name="lost_reason"
            label="输单原因"
            rules={[{ required: true, message: '请选择输单原因' }]}
          >
            <DictSelect code="OPPORTUNITY_LOST_REASON" placeholder="请选择输单原因" />
          </ProForm.Item>
        </Col>
      )}
    </ModalForm>
  )
}
