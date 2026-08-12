import { DatePicker, Form, Input, Popup, Selector, Button, TextArea, Toast } from 'antd-mobile'
import { useState } from 'react'
import dayjs from 'dayjs'
import { createFollowPlan } from '../services/crm'
import { FOLLOW_TYPES } from '../types/crm'

interface Props {
  visible: boolean
  onClose: () => void
  /** 从客户详情进入时自动关联该客户 */
  customerId?: number
  onSubmitted?: () => void
}

function PopupHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 0 12px',
      }}
    >
      <span style={{ fontSize: 17, fontWeight: 600 }}>{title}</span>
      <a style={{ color: 'var(--text-tertiary)' }} onClick={onClose}>
        关闭
      </a>
    </div>
  )
}

/** 新建跟进计划表单(跟进方式 + 内容 + 计划时间 + 提醒时间) */
export default function FollowPlanSheet({ visible, onClose, customerId, onSubmitted }: Props) {
  const [form] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)
  const [planTime, setPlanTime] = useState(() => dayjs().add(1, 'day').toDate())
  const [remindTime, setRemindTime] = useState<Date | null>(null)

  const pickPlanTime = async () => {
    const val = await DatePicker.prompt({
      defaultValue: planTime,
      min: new Date(),
      precision: 'minute',
      title: '选择计划时间',
    })
    if (val) setPlanTime(val)
  }

  const pickRemindTime = async () => {
    const val = await DatePicker.prompt({
      defaultValue: remindTime || planTime,
      min: new Date(),
      precision: 'minute',
      title: '选择提醒时间',
    })
    setRemindTime(val)
  }

  const handleFinish = async (v: Record<string, any>) => {
    const type = Array.isArray(v.type) ? v.type[0] : v.type
    if (!type) {
      Toast.show({ content: '请选择跟进方式' })
      return
    }
    setSubmitting(true)
    try {
      await createFollowPlan({
        type,
        content: v.content,
        plan_time: dayjs(planTime).format('YYYY-MM-DD HH:mm:ss'),
        remind_time: remindTime ? dayjs(remindTime).format('YYYY-MM-DD HH:mm:ss') : undefined,
        customer_id: customerId,
      })
      Toast.show({ icon: 'success', content: '计划已创建' })
      setRemindTime(null)
      setPlanTime(dayjs().add(1, 'day').toDate())
      onSubmitted?.()
      onClose()
    } catch {
      // 拦截器已 toast
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Popup
      visible={visible}
      onMaskClick={onClose}
      position="bottom"
      destroyOnClose
      bodyStyle={{ borderTopLeftRadius: 12, borderTopRightRadius: 12, maxHeight: '85vh', overflowY: 'auto' }}
    >
      <div style={{ padding: '0 16px 24px' }}>
        <PopupHeader title="新建跟进计划" onClose={onClose} />
        <Form
          form={form}
          layout="horizontal"
          onFinish={handleFinish}
          initialValues={{ type: ['PHONE'] }}
          footer={
            <Button block color="primary" size="large" loading={submitting} onClick={() => form.submit()}>
              创建计划
            </Button>
          }
        >
          <Form.Item name="type" label="跟进方式">
            <Selector options={FOLLOW_TYPES.map((t) => ({ label: t.label, value: t.value }))} columns={3} />
          </Form.Item>
          <Form.Item name="content" label="计划内容" rules={[{ required: true, message: '请输入计划内容' }]}>
            <TextArea rows={3} placeholder="请输入计划内容" />
          </Form.Item>
          <Form.Item label="计划时间" onClick={pickPlanTime} arrow>
            <Input readOnly value={dayjs(planTime).format('YYYY-MM-DD HH:mm')} style={{ textAlign: 'right' }} />
          </Form.Item>
          <Form.Item label="提醒时间" onClick={pickRemindTime} arrow>
            <Input
              readOnly
              placeholder="选填"
              value={remindTime ? dayjs(remindTime).format('YYYY-MM-DD HH:mm') : ''}
              style={{ textAlign: 'right' }}
            />
          </Form.Item>
        </Form>
      </div>
    </Popup>
  )
}
