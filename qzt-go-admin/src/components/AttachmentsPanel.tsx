import { useEffect, useState } from 'react'
import { App, Button, Empty, Popconfirm, Space, Spin, Table, Tag, Typography } from 'antd'
import { DownloadOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import FileUpload, { type UploadedFileInfo } from '../components/FileUpload'
import Auth from '../components/Auth'
import { useUserStore } from '../stores/users'
import {
  createAttachment,
  deleteAttachment,
  listAttachments,
  signFileURL,
} from '../services/attachment'
import type { Attachment } from '../types/attachment'

interface AttachmentsPanelProps {
  /** 业务类型,如 CUSTOMER/CONTRACT/OPPORTUNITY(与后端 biz_type 一致,大写) */
  bizType: string
  /** 资源ID */
  resourceId: number
  /** 上传权限码,如 crm:customer:attachment:upload。留空则不包权限组件 */
  uploadPerm?: string
  /** 删除权限码 */
  deletePerm?: string
  /** 默认可见性(默认 private) */
  defaultVisibility?: 'public' | 'private'
}

/**
 * 通用附件面板。
 * 挂在任意业务详情抽屉的「附件」Tab 里,通过 bizType + resourceId 关联。
 * 私有文件下载走 /api/file/sign 拿短期 URL 后 window.open。
 */
export default function AttachmentsPanel({
  bizType,
  resourceId,
  uploadPerm,
  deletePerm,
  defaultVisibility = 'private',
}: AttachmentsPanelProps) {
  const { message } = App.useApp()
  const [loading, setLoading] = useState(true)
  const [list, setList] = useState<Attachment[]>([])
  const [uploading, setUploading] = useState(false)
  const [pendingFiles, setPendingFiles] = useState<UploadedFileInfo[]>([])
  const nickname = useUserStore((s) => s.nickname)
  const loadUsers = useUserStore((s) => s.load)

  const load = async () => {
    if (!resourceId) return
    setLoading(true)
    try {
      const res = await listAttachments(bizType, resourceId)
      setList(res || [])
      // 预加载用户缓存(用于展示上传人昵称)
      await loadUsers()
    } catch {
      setList([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bizType, resourceId])

  const handleUpload = async (files: UploadedFileInfo[]) => {
    setPendingFiles(files)
    setUploading(true)
    try {
      for (const f of files) {
        await createAttachment({
          biz_type: bizType,
          resource_id: resourceId,
          file_name: f.file_name,
          object_key: f.object_key,
          url: f.url,
          size: f.size,
          content_type: f.content_type,
          visibility: f.visibility || defaultVisibility,
        })
      }
      setPendingFiles([])
      message.success(`成功上传 ${files.length} 个文件`)
      await load()
    } catch {
      message.error('附件保存失败')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await deleteAttachment(id)
      message.success('已删除')
      await load()
    } catch {
      message.error('删除失败')
    }
  }

  const handleDownload = async (att: Attachment) => {
    try {
      if (att.visibility === 'public') {
        // 公共文件:直接打开 URL
        window.open(att.url, '_blank')
        return
      }
      // 私有文件:先签名再打开
      const res = await signFileURL(att.object_key || att.url)
      window.open(res.url, '_blank')
    } catch {
      message.error('获取下载链接失败')
    }
  }

  const columns: ColumnsType<Attachment> = [
    {
      title: '文件名',
      dataIndex: 'file_name',
      ellipsis: true,
      render: (name: string, record) => (
        <Button type="link" size="small" style={{ padding: 0 }} onClick={() => handleDownload(record)}>
          {name}
        </Button>
      ),
    },
    {
      title: '大小',
      dataIndex: 'size',
      width: 90,
      render: (size: number) => formatSize(size),
    },
    {
      title: '类型',
      dataIndex: 'visibility',
      width: 80,
      render: (v: string) => (
        <Tag color={v === 'public' ? 'green' : 'orange'}>
          {v === 'public' ? '公共' : '私有'}
        </Tag>
      ),
    },
    {
      title: '上传人',
      dataIndex: 'uploader_id',
      width: 100,
      render: (id: number) => nickname(id),
    },
    {
      title: '上传时间',
      dataIndex: 'created_at',
      width: 160,
      render: (t: string) => (
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {t}
        </Typography.Text>
      ),
    },
    {
      title: '操作',
      width: 80,
      render: (_, record) => (
        <Space size={4}>
          <Button
            type="text"
            size="small"
            icon={<DownloadOutlined />}
            onClick={() => handleDownload(record)}
          />
          {deletePerm ? (
            <Auth perm={deletePerm}>
              <Popconfirm title="确认删除该附件?" onConfirm={() => handleDelete(record.id)}>
                <Button type="text" size="small" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            </Auth>
          ) : (
            <Popconfirm title="确认删除该附件?" onConfirm={() => handleDelete(record.id)}>
              <Button type="text" size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ]

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 48 }}>
        <Spin />
      </div>
    )
  }

  const uploadWidget = (
    <FileUpload
      folder={bizType.toLowerCase()}
      visibility={defaultVisibility}
      value={pendingFiles}
      onChange={handleUpload}
      disabled={uploading}
    />
  )

  return (
    <div>
      {uploadPerm ? <Auth perm={uploadPerm}>{uploadWidget}</Auth> : uploadWidget}

      <Table<Attachment>
        size="small"
        rowKey="id"
        columns={columns}
        dataSource={list}
        pagination={false}
        locale={{
          emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无附件" />,
        }}
        style={{ marginTop: 12 }}
      />
    </div>
  )
}

function formatSize(bytes: number): string {
  if (!bytes) return '-'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
