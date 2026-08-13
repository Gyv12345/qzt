import { useState } from 'react'
import { App, Upload, type UploadProps } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import request from '../utils/request'

interface UploadResponse {
  url?: string
  resource_domain?: string
}

interface STSResponse {
  driver: 'oss' | 'local'
  upload_url?: string
  file_url?: string
  content_type?: string
}

interface ImageUploadProps {
  value?: string
  onChange?: (value: string) => void
  folder?: string
  accept?: string
}

/**
 * 图片上传组件。
 * OSS 模式:前端直传(后端返回预签名 URL,前端 PUT 到 OSS)。
 * local 模式:走后端代理上传。
 */
export default function ImageUpload({ value, onChange, folder = 'uploads', accept = 'image/*' }: ImageUploadProps) {
  const { message } = App.useApp()
  const [loading, setLoading] = useState(false)

  // OSS 直传:先获取预签名 URL,再 PUT 文件
  const customRequest: UploadProps['customRequest'] = async (options) => {
    const { file, onSuccess, onError } = options
    const f = file as File
    setLoading(true)

    try {
      // 1. 请求预签名 URL
      const sts = await request.get<unknown, STSResponse>('/api/upload/sts', {
        params: { filename: f.name, folder },
      })

      if (sts.driver === 'local') {
        // local 模式:走后端上传
        const formData = new FormData()
        formData.append('file', f)
        formData.append('folder', folder)
        const res = await request.post<unknown, { code: number; data: UploadResponse }>(
          '/api/upload',
          formData,
          { headers: { 'Content-Type': 'multipart/form-data' } },
        )
        if (res.code === 0 && res.data.url) {
          const fullUrl = /^https?:\/\//.test(res.data.url)
            ? res.data.url
            : `${res.data.resource_domain ?? ''}${res.data.url}`
          onChange?.(fullUrl)
          onSuccess?.({})
        } else {
          throw new Error('上传失败')
        }
        return
      }

      // 2. OSS 直传:PUT 文件到预签名 URL
      const putRes = await fetch(sts.upload_url!, {
        method: 'PUT',
        body: f,
        headers: {
          'Content-Type': sts.content_type || f.type,
        },
      })
      if (!putRes.ok) {
        throw new Error(`文件上传失败(OSS ${putRes.status})`)
      }

      // 3. 回填 CDN URL
      onChange?.(sts.file_url!)
      onSuccess?.({})
      message.success('上传成功')
    } catch (err) {
      message.error('上传失败')
      onError?.(err as Error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Upload
      listType="picture-card"
      showUploadList={false}
      accept={accept}
      customRequest={customRequest}
      maxCount={1}
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
