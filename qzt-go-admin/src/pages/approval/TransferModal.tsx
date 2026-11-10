import { App, Form, Input, Modal, Radio, Typography } from 'antd'
import UserSelect from '../../components/UserSelect'
import { transferTask } from '../../services/approval'
import type { ApprovalTask, TransferMode } from '../../types/approval'

// TransferModal.tsx 审批转办/委托弹窗。
// TRANSFER=任务让渡出队(责任转移);DELEGATE=受托代审(责任仍在委托人,审计记录标注代审)。

interface TransferModalProps {
  open: boolean
  task: ApprovalTask | null
  onClose: () => void
  onSuccess: () => void
}

export default function TransferModal({ open, task, onClose, onSuccess }: TransferModalProps) {
  const { message } = App.useApp()
  const [form] = Form.useForm<{ target_user_id: number; mode: TransferMode; comment?: string }>()

  const handleOk = async () => {
    if (!task) return
    const values = await form.validateFields()
    await transferTask({
      task_id: task.id,
      target_user_id: values.target_user_id,
      mode: values.mode,
      comment: values.comment?.trim() || undefined,
    })
    message.success(values.mode === 'DELEGATE' ? '已委托' : '已转办')
    onSuccess()
  }

  return (
    <Modal
      title="转办/委托"
      open={open}
      onOk={handleOk}
      onCancel={onClose}
      destroyOnHidden
      width={480}
      okText="确认"
      cancelText="取消"
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{ mode: 'TRANSFER' }}
      >
        <Form.Item
          name="mode"
          label="操作类型"
          rules={[{ required: true, message: '请选择操作类型' }]}
        >
          <Radio.Group>
            <Radio value="TRANSFER">转办(任务让渡,我出队)</Radio>
        <Radio value="DELEGATE">委托(他人代审,责任仍在我)</Radio>
          </Radio.Group>
        </Form.Item>
        <Form.Item
          name="target_user_id"
          label="目标审批人"
          rules={[{ required: true, message: '请选择目标审批人' }]}
        >
          <UserSelect placeholder="选择转办/委托给谁" />
        </Form.Item>
        <Form.Item name="comment" label="说明(可选)">
          <Input.TextArea rows={3} placeholder="转办/委托原因" />
        </Form.Item>
      </Form>
      <Typography.Text type="secondary">
        转办后任务从我的待办消失,由目标审批人处理;委托后受托人代为审批,审计记录标注代审。
      </Typography.Text>
    </Modal>
  )
}
