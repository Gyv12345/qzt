import { useEffect } from 'react'
import { App, Form, Input, Modal, Select } from 'antd'
import { returnBackTask } from '../../services/approval'
import type { ApprovalTask, ReturnableNode } from '../../types/approval'

// ReturnBackModal.tsx 审批退回弹窗:选择退回到哪个节点 + 必填退回意见。
// 可退回节点来自实例详情的 returnable_nodes(后端按当前审批人计算)。

interface FormValues {
  return_to_node_id: number
  comment: string
}

interface ReturnBackModalProps {
  open: boolean
  task: ApprovalTask | null
  /** 当前审批人可退回的节点列表(实例详情 enrichment) */
  nodes: ReturnableNode[]
  onClose: () => void
  onSuccess: () => void
}

export default function ReturnBackModal({
  open,
  task,
  nodes,
  onClose,
  onSuccess,
}: ReturnBackModalProps) {
  const { message } = App.useApp()
  const [form] = Form.useForm<FormValues>()

  // 每次打开清空上次填写的值(外部 form 实例在 destroyOnHidden 后仍保留旧值)
  useEffect(() => {
    if (open) form.resetFields()
  }, [open, form])

  const handleOk = async () => {
    if (!task) return
    const values = await form.validateFields()
    await returnBackTask({
      task_id: task.id,
      return_to_node_id: values.return_to_node_id,
      comment: values.comment.trim(),
    })
    message.success('已退回')
    onSuccess()
  }

  return (
    <Modal
      title="退回"
      open={open}
      onOk={handleOk}
      onCancel={onClose}
      destroyOnHidden
      width={480}
      okText="确认退回"
      cancelText="取消"
    >
      <Form<FormValues> form={form} layout="vertical">
        <Form.Item
          name="return_to_node_id"
          label="退回到节点"
          rules={[{ required: true, message: '请选择退回节点' }]}
        >
          <Select
            placeholder={nodes.length > 0 ? '选择退回节点' : '无可退回节点'}
            disabled={nodes.length === 0}
            options={nodes.map((n) => ({ label: n.name, value: n.id }))}
          />
        </Form.Item>
        <Form.Item
          name="comment"
          label="退回意见"
          rules={[
            { required: true, message: '请填写退回意见' },
            { whitespace: true, message: '退回意见不能为空白' },
          ]}
        >
          <Input.TextArea rows={3} placeholder="请填写退回意见" />
        </Form.Item>
      </Form>
    </Modal>
  )
}
