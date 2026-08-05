import { useState } from 'react'
import { App, Upload } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { useAuthStore } from '../stores/auth'

interface UploadResponse {
  code?: number
  data?: { url?: string; resource_domain?: string }
}

interface ImageUploadProps {
  /** 当前 URL 值 */
  value?: string
  /** 值变更回调 */
  onChange?: (url: string) => void
  /** 上传的子目录(可选) */
  folder?: string
  /** accept 类型 */
  accept?: string
}

/**
 * 图片上传组件:上传到 /api/upload,拿到 OSS/CDN URL 回填表单。
 * 带预览(已有值显示图片,无值显示 + 号占位)。
 */
export default function ImageUpload({
  value,
  onChange,
  folder,
  accept = 'image/*',
}: ImageUploadProps) {
  const { message } = App.useApp()
  const accessToken = useAuthStore((s) => s.accessToken)
  const [loading, setLoading] = useState(false)

  return (
    <Upload
      name="file"
      accept={accept}
      listType="picture-card"
      showUploadList={false}
      action="/api/upload"
      data={folder ? { folder } : undefined}
      headers={{ Authorization: `Bearer ${accessToken}` }}
      beforeUpload={() => {
        setLoading(true)
        return true
      }}
      onChange={(info) => {
        if (info.file.status === 'done') {
          setLoading(false)
          const data = (info.file.response as UploadResponse | undefined)?.data
          if (data?.url) {
            // url 可能是完整 URL(含域名)或相对路径;仅在相对路径时拼接 resource_domain
            const fullUrl = /^https?:\/\//.test(data.url)
              ? data.url
              : `${data.resource_domain ?? ''}${data.url}`
            onChange?.(fullUrl)
            message.success('上传成功')
          }
        } else if (info.file.status === 'error') {
          setLoading(false)
          message.error('上传失败')
        }
      }}
    >
      {value ? (
        <img src={value} alt="预览" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
      ) : (
        <div style={{ color: '#999' }}>
          <PlusOutlined />
          <div style={{ marginTop: 4, fontSize: 12 }}>{loading ? '上传中...' : '上传图片'}</div>
        </div>
      )}
    </Upload>
  )
}
