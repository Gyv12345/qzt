import { useEffect, useState } from 'react'
import { App, Select, Switch } from 'antd'
import { ModalForm, ProForm, ProFormText } from '@ant-design/pro-components'
import MarkdownEditor from '../../../components/MarkdownEditor'
import FileUpload, { type UploadedFileInfo } from '../../../components/FileUpload'
import { sendMessage } from '../../../services/oa'
import { listUserOptions } from '../../../services/system'

interface EditModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export default function MessageEditModal({ open, onOpenChange, onSuccess }: EditModalProps) {
  const { message } = App.useApp()
  const [form] = ProForm.useForm()
  const [content, setContent] = useState('')
  const [isMarkdown, setIsMarkdown] = useState(false)
  const [receiverId, setReceiverId] = useState<number | null>(null)
  const [files, setFiles] = useState<UploadedFileInfo[]>([])
  const [users, setUsers] = useState<{ label: string; value: number }[]>([])

  useEffect(() => {
    if (open) {
      listUserOptions().then((res) => {
        setUsers(
          (res.list || []).map((u) => ({
            label: `${u.nickname || u.username}(${u.username})`,
            value: u.id,
          })),
        )
      })
      form.resetFields()
      setContent('')
      setIsMarkdown(false)
      setReceiverId(null)
      setFiles([])
    }
  }, [open])

  const handleSubmit = async (values: any) => {
    if (!receiverId) {
      message.error('请选择收件人')
      return false
    }
    if (!values.title || !content) {
      message.error('请填写标题和内容')
      return false
    }

    // 如果有附件,将附件链接追加到内容末尾
    let finalContent = content
    if (files.length > 0) {
      const attachLinks = files.map(f => `\n\n📎 [${f.file_name}](${f.url})`).join('')
      finalContent += attachLinks
    }

    await sendMessage({
      receiver_id: receiverId,
      title: values.title,
      content: finalContent,
      content_type: isMarkdown ? 'markdown' : 'text',
    })

    message.success('已发送')
    onSuccess()
    return true
  }

  return (
    <ModalForm
      title="写信"
      form={form}
      open={open}
      onOpenChange={onOpenChange}
      modalProps={{ destroyOnHidden: true, maskClosable: false }}
      onFinish={handleSubmit}
      width={720}
    >
      <div style={{ marginBottom: 16 }}>
        <div style={{ marginBottom: 4 }}>收件人</div>
        <Select
          showSearch
          placeholder="选择收件人"
          style={{ width: '100%' }}
          options={users}
          value={receiverId}
          onChange={setReceiverId}
          filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
        />
      </div>

      <ProFormText name="title" label="标题" rules={[{ required: true, message: '请输入标题' }]} colProps={{ span: 24 }} />

      <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
        <span>Markdown 模式</span>
        <Switch checked={isMarkdown} onChange={setIsMarkdown} />
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ marginBottom: 4 }}>内容</div>
        {isMarkdown ? (
          <MarkdownEditor value={content} onChange={setContent} height={250} />
        ) : (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="请输入内容..."
            style={{ width: '100%', minHeight: 150, padding: 8, borderRadius: 6, border: '1px solid #d9d9d9', resize: 'vertical' }}
          />
        )}
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ marginBottom: 4 }}>附件</div>
        <FileUpload
          value={files}
          onChange={setFiles}
          folder="message"
        />
      </div>
    </ModalForm>
  )
}
