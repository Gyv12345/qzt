import { useState } from 'react'
import { App, Form, Input, Modal } from 'antd'
import FileUpload, { type UploadedFileInfo } from './FileUpload'
import MarkdownEditor from './MarkdownEditor'
import { sendMail } from '../services/mail'
import type { MailAttachment } from '../types'

interface MailComposeModalProps {
  open: boolean
  onClose: () => void
  /** 默认收件人邮箱(可多个,逗号或分号分隔) */
  defaultTo?: string
  /** 默认收件人显示名(用于标题提示,不发送) */
  defaultToName?: string
}

/** 把逗号/分号/换行分隔的收件人字符串拆成数组 */
function parseEmails(raw: string): string[] {
  return raw
    .split(/[,;\n\s]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && /.+@.+/.test(s))
}

/**
 * 通用写邮件弹窗。
 * 收件人 / 抄送(支持多个,逗号或分号分隔)、主题、Markdown 正文、附件。
 * 复用 MarkdownEditor(正文)+ FileUpload(附件)。
 */
export default function MailComposeModal({
  open,
  onClose,
  defaultTo = '',
  defaultToName,
}: MailComposeModalProps) {
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [sending, setSending] = useState(false)
  const [body, setBody] = useState('')
  const [attachments, setAttachments] = useState<UploadedFileInfo[]>([])

  const handleAfterClose = () => {
    form.resetFields()
    setBody('')
    setAttachments([])
  }

  const handleSend = async () => {
    try {
      const values = await form.validateFields()
      const to = parseEmails(values.to || '')
      if (to.length === 0) {
        message.warning('请输入有效的收件人邮箱')
        return
      }
      const cc = values.cc ? parseEmails(values.cc) : []
      if (!body.trim()) {
        message.warning('请输入邮件正文')
        return
      }
      setSending(true)
      const payload: MailAttachment[] | undefined =
        attachments.length > 0
          ? attachments.map((f) => ({
              url: f.url,
              file_name: f.file_name,
              content_type: f.content_type,
            }))
          : undefined
      await sendMail({
        to,
        cc: cc.length > 0 ? cc : undefined,
        subject: values.subject,
        body,
        attachments: payload,
      })
      message.success('邮件已发送')
      onClose()
    } catch {
      // service 层已弹 error;表单校验失败由 Form 处理
    } finally {
      setSending(false)
    }
  }

  return (
    <Modal
      title="写邮件"
      open={open}
      onCancel={onClose}
      afterClose={handleAfterClose}
      onOk={handleSend}
      okText="发送"
      confirmLoading={sending}
      width={720}
      destroyOnHidden
      maskClosable={false}
    >
      <Form form={form} layout="vertical" initialValues={{ to: defaultTo }}>
        <Form.Item
          name="to"
          label={defaultToName ? `收件人(${defaultToName})` : '收件人'}
          rules={[{ required: true, message: '请输入收件人邮箱' }]}
        >
          <Input placeholder="多个邮箱用逗号或分号分隔" />
        </Form.Item>
        <Form.Item name="cc" label="抄送">
          <Input placeholder="选填,多个邮箱用逗号或分号分隔" />
        </Form.Item>
        <Form.Item
          name="subject"
          label="主题"
          rules={[{ required: true, message: '请输入邮件主题' }]}
        >
          <Input placeholder="邮件主题" />
        </Form.Item>
        <Form.Item label="正文" required>
          <MarkdownEditor
            value={body}
            onChange={setBody}
            height={280}
            placeholder="支持 Markdown 语法"
          />
        </Form.Item>
        <Form.Item label="附件">
          <FileUpload
            folder="mail"
            value={attachments}
            onChange={setAttachments}
            accept=""
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}
