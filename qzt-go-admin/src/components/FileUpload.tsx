import { useState } from 'react'
import { App, Button, Space, Upload, type UploadFile, type UploadProps } from 'antd'
import { InboxOutlined, DeleteOutlined } from '@ant-design/icons'
import { getUploadSTS, uploadFile } from '../services/attachment'

export interface UploadedFileInfo {
  file_name: string
  object_key: string
  url: string
  size: number
  content_type: string
  visibility: string
}

interface FileUploadProps {
  /** 存储文件夹,如 contract/customer */
  folder: string
  /** 可见性: public(公共桶,默认)/ private(私有桶) */
  visibility?: 'public' | 'private'
  /** 接受的文件类型,如 .pdf,.doc,.jpg */
  accept?: string
  /** 已上传文件列表(受控) */
  value?: UploadedFileInfo[]
  onChange?: (files: UploadedFileInfo[]) => void
  /** 是否禁用 */
  disabled?: boolean
}

/**
 * 通用多文件上传组件(双桶)。
 * OSS 模式:前端直传(预签名 PUT)。
 * local 模式:走后端代理上传。
 * visibility=private 时上传到私有桶,返回 object_key(后续走 /api/file/sign 下载)。
 */
export default function FileUpload({
  folder,
  visibility = 'public',
  accept,
  value = [],
  onChange,
  disabled,
}: FileUploadProps) {
  const { message } = App.useApp()
  const [uploading, setUploading] = useState(false)
  const [uploadList] = useState<UploadFile[]>([])

  const customRequest: UploadProps['customRequest'] = async (options) => {
    const { file, onSuccess, onError } = options
    const f = file as File
    setUploading(true)

    try {
      // 1. 先尝试 OSS 直传
      const sts = await getUploadSTS(f.name, folder, visibility)

      let info: UploadedFileInfo
      if (sts.driver === 'local') {
        // local 模式:走后端代理上传
        const res = await uploadFile(f, folder, visibility)
        const fullUrl = /^https?:\/\//.test(res.url)
          ? res.url
          : `${res.resource_domain ?? ''}${res.url}`
        info = {
          file_name: res.original_name || f.name,
          object_key: res.path,
          url: visibility === 'private' ? res.path : fullUrl,
          size: res.size,
          content_type: res.content_type,
          visibility: res.visibility || visibility,
        }
      } else {
        // OSS 直传:PUT 文件到预签名 URL
        await fetch(sts.upload_url!, {
          method: 'PUT',
          body: f,
          headers: { 'Content-Type': sts.content_type || f.type },
        })
        // file_url: 公共桶=CDN明文URL;私有桶=objectKey
        info = {
          file_name: f.name,
          object_key: sts.file_url!,
          url: sts.file_url!,
          size: f.size,
          content_type: sts.content_type || f.type,
          visibility,
        }
      }

      onChange?.([...value, info])
      onSuccess?.({}, f)
      message.success(`${f.name} 上传成功`)
    } catch (err) {
      message.error(`${f.name} 上传失败`)
      onError?.(err as Error)
    } finally {
      setUploading(false)
    }
  }

  const handleRemove = (idx: number) => {
    const next = value.filter((_, i) => i !== idx)
    onChange?.(next)
  }

  return (
    <div>
      {value.length > 0 && (
        <Space direction="vertical" style={{ width: '100%', marginBottom: 8 }}>
          {value.map((file, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '6px 12px',
                background: '#fafafa',
                border: '1px solid #f0f0f0',
                borderRadius: 4,
              }}
            >
              <span style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {file.file_name}{' '}
                <span style={{ color: '#999', fontSize: 12 }}>
                  ({formatSize(file.size)})
                </span>
              </span>
              {!disabled && (
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => handleRemove(idx)}
                />
              )}
            </div>
          ))}
        </Space>
      )}

      {!disabled && (
        <Upload.Dragger
          accept={accept}
          fileList={uploadList}
          customRequest={customRequest}
          multiple
          showUploadList={false}
          disabled={uploading || disabled}
          style={{ padding: '12px 16px' }}
        >
          <p style={{ margin: 0, color: '#999' }}>
            <InboxOutlined style={{ fontSize: 24, marginRight: 8 }} />
            {uploading ? '上传中...' : '点击或拖拽文件到此区域上传'}
          </p>
        </Upload.Dragger>
      )}
    </div>
  )
}

function formatSize(bytes: number): string {
  if (!bytes) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
