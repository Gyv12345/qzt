import FormSheet, { type FormField } from './FormSheet'
import { createFollowRecord } from '../services/follow'
import { FOLLOW_TYPES } from '../types/crm'

interface Props {
  visible: boolean
  onClose: () => void
  /** 关联客户ID(与 leadId 至少传一个) */
  customerId?: number
  /** 关联线索ID */
  leadId?: number
  onSubmitted?: () => void
}

/** 格式当前时间为后端要求的 YYYY-MM-DD HH:mm:ss */
function nowStr() {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

/** 通用「写跟进」表单(客户/线索详情共用) */
export default function FollowRecordSheet({ visible, onClose, customerId, leadId, onSubmitted }: Props) {
  const fields: FormField[] = [
    {
      name: 'type',
      label: '跟进方式',
      type: 'select',
      required: true,
      options: FOLLOW_TYPES.map((f) => ({ label: f.label, value: f.value })),
    },
    { name: 'content', label: '跟进内容', type: 'textarea', required: true, placeholder: '请输入跟进内容' },
  ]

  const onSubmit = async (values: Record<string, any>) => {
    await createFollowRecord({
      type: values.type,
      content: values.content,
      follow_time: nowStr(),
      customer_id: customerId,
      lead_id: leadId,
    })
    onSubmitted?.()
  }

  return (
    <FormSheet visible={visible} title="写跟进" fields={fields} onClose={onClose} onSubmit={onSubmit} />
  )
}
