import { useRef } from 'react'
import { App, Button, Space } from 'antd'
import { PictureOutlined } from '@ant-design/icons'
import MDEditor from '@uiw/react-md-editor'
import request from '../utils/request'

interface STSResponse {
  driver: 'oss' | 'local'
  upload_url?: string
  file_url?: string
  content_type?: string
}

interface UploadResponse {
  url?: string
  resource_domain?: string
}

interface MarkdownEditorProps {
  value?: string
  onChange?: (value: string) => void
  height?: number
  placeholder?: string
}

/** OSS 直传(或 local 代理上传),返回可直链访问的完整 URL。 */
async function uploadImage(file: File): Promise<string> {
  const sts = await request.get<unknown, STSResponse>('/api/upload/sts', {
    params: { filename: file.name, folder: 'article' },
  })
  if (sts.driver === 'local') {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('folder', 'article')
    const res = await request.post<unknown, { code: number; data: UploadResponse }>('/api/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    if (res.code === 0 && res.data.url) {
      const u = res.data.url
      return /^https?:\/\//.test(u) ? u : `${res.data.resource_domain ?? ''}${u}`
    }
    throw new Error('上传失败')
  }
  const putRes = await fetch(sts.upload_url!, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': sts.content_type || file.type },
  })
  if (!putRes.ok) throw new Error(`OSS ${putRes.status}`)
  return sts.file_url!
}

/**
 * Markdown 编辑器(带预览),输出 markdown 文本。
 * P22: 工具条「插入图片」+ 粘贴图片直传(OSS/local 同通道),插入 ![alt](url) 到光标处。
 */
export default function MarkdownEditor({ value, onChange, height = 300, placeholder = '支持 Markdown 语法' }: MarkdownEditorProps) {
  const { message } = App.useApp()
  const rootRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  /** 在光标处插入文本;取不到光标时追加到末尾。 */
  const insertAtCursor = (text: string) => {
    const ta = rootRef.current?.querySelector('textarea')
    if (!ta) {
      onChange?.((value ?? '') + text)
      return
    }
    const start = ta.selectionStart ?? (value ?? '').length
    const end = ta.selectionEnd ?? start
    onChange?.((value ?? '').slice(0, start) + text + (value ?? '').slice(end))
    requestAnimationFrame(() => {
      ta.focus()
      ta.setSelectionRange(start + text.length, start + text.length)
    })
  }

  const handleFiles = async (files: FileList | File[] | null) => {
    const imgs = Array.from(files ?? []).filter((f) => f.type.startsWith('image/'))
    if (imgs.length === 0) return
    for (const f of imgs) {
      message.open({ type: 'loading', content: `正在上传 ${f.name}…`, key: f.name, duration: 0 })
      try {
        const url = await uploadImage(f)
        insertAtCursor(`\n![${f.name}](${url})\n`)
        message.open({ type: 'success', content: `${f.name} 已插入`, key: f.name })
      } catch {
        message.open({ type: 'error', content: `${f.name} 上传失败`, key: f.name })
      }
    }
  }

  return (
    <div data-color-mode="light" ref={rootRef} style={{ width: '100%' }}>
      <div style={{ marginBottom: 4 }}>
        <Space>
          <Button size="small" icon={<PictureOutlined />} onClick={() => fileRef.current?.click()}>
            插入图片
          </Button>
          <span style={{ fontSize: 12, color: '#999' }}>支持直接粘贴图片,自动上传后插入</span>
        </Space>
      </div>
      <MDEditor
        value={value}
        height={height}
        preview="edit"
        onChange={(val) => onChange?.(val ?? '')}
        textareaProps={{
          placeholder,
          onPaste: (e) => {
            const files = e.clipboardData?.files
            if (files && Array.from(files).some((f) => f.type.startsWith('image/'))) {
              e.preventDefault()
              handleFiles(files)
            }
          },
        }}
      />
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => {
          handleFiles(e.target.files)
          e.target.value = ''
        }}
      />
    </div>
  )
}
