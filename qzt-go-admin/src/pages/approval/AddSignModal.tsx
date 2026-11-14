import { useEffect } from 'react'
import { App, Form, Input, Modal, Radio, Typography } from 'antd'
import UserSelect from '../../components/UserSelect'
import { useAuthStore } from '../../stores/auth'
import { addSignTask } from '../../services/approval'
import type { AddSignMode, ApprovalTask } from '../../types/approval'

// AddSignModal.tsx 审批加签弹窗。
// before=前加签:被加签人先审,通过后回到我;after=后加签:我审完后顺延给被加签人。

interface FormValues {
  user_ids: number[]
  mode: AddSignMode
  comment?: string
}

interface AddSignModalProps {
  open: boolean
  task: ApprovalTask | null
  onClose: () => void
  onSuccess: () => void
}

export default function AddSignModal({ open, task, onClose, onSuccess }: AddSignModalProps) {
  const { message } = App.useApp()
  const [form] = Form.useForm<FormValues>()

  // 每次打开清空上次填写的值(外部 form 实例在 destroyOnHidden 后仍保留旧值)
  useEffect(() => {
    if (open) form.resetFields()
  }, [open, form])

  const handleOk = async () => {
    if (!task) return
    const values = await form.validateFields()
    await addSignTask({
      task_id: task.id,
      user_ids: values.user_ids,
      mode: values.mode,
    })
    message.success('加签成功')
    onSuccess()
  }

  return (
    <Modal
      title="加签"
      open={open}
      onOk={handleOk}
      onCancel={onClose}
      destroyOnHidden
      width={480}
      okText="确认加签"
      cancelText="取消"
    >
      <Form<FormValues> form={form} layout="vertical" initialValues={{ mode: 'before' }}>
        <Form.Item name="mode" label="加签方式" rules={[{ required: true }]}>
          <Radio.Group>
            <Radio value="before">前加签(被加签人先审,通过后回到我)</Radio>
            <Radio value="after">后加签(我审完后顺延给被加签人)</Radio>
          </Radio.Group>
        </Form.Item>
        <Form.Item
          name="user_ids"
          label="被加签人(可多选)"
          rules={[
            { required: true, message: '请选择被加签人' },
            {
              validator: (_, value?: number[]) => {
                const myId = useAuthStore.getState().profile?.id
                if (value && myId !== undefined && value.includes(myId)) {
                  return Promise.reject(new Error('不能加签给自己'))
                }
                return Promise.resolve()
              },
            },
          ]}
        >
          <UserSelect mode="multiple" placeholder="选择被加签人" />
        </Form.Item>
        <Form.Item name="comment" label="说明(可选)">
          <Input.TextArea rows={3} placeholder="加签原因" />
        </Form.Item>
      </Form>
      <Typography.Text type="secondary">
        前加签:新加签人先审批,通过后任务回到我继续处理;后加签:我审批通过后任务顺延给新加签人。
      </Typography.Text>
    </Modal>
  )
}
