import { useState, useEffect, useCallback } from 'react'
import { App, Button, Card, Popconfirm, Space, Table, Tabs, Tag, Upload, Input, Breadcrumb } from 'antd'
import {
  FolderOutlined, FileOutlined, DeleteOutlined, EditOutlined,
  FolderAddOutlined, UploadOutlined, DownloadOutlined, HomeOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import Auth from '../../components/Auth'
import {
  listCloudFiles, createFolder, createFile, updateFile, deleteFile, getUsage,
} from '../../services/cloud'
import { uploadFile as uploadFileApi } from '../../services/attachment'
import type { CloudFile } from '../../types/cloud'

const SCOPE_TABS = [
  { key: 'personal', label: '个人空间' },
  { key: 'dept', label: '部门共享' },
  { key: 'public', label: '公共共享' },
]

/** 格式化文件大小 */
function formatSize(bytes: number): string {
  if (bytes === 0) return '-'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/** 文件图标 */
function FileIcon({ record }: { record: CloudFile }) {
  if (record.is_dir === 1) return <FolderOutlined style={{ color: '#faad14', fontSize: 18 }} />
  return <FileOutlined style={{ color: '#8c8c8c', fontSize: 18 }} />
}

export default function CloudPage() {
  const { message, modal } = App.useApp()
  const [scope, setScope] = useState('personal')
  const [files, setFiles] = useState<CloudFile[]>([])
  const [loading, setLoading] = useState(false)
  const [breadcrumbs, setBreadcrumbs] = useState<{ id: number; name: string }[]>([{ id: 0, name: '根目录' }])
  const [currentParent, setCurrentParent] = useState(0)
  const [usage, setUsage] = useState(0)

  const loadFiles = useCallback(async (parentId: number, scopeVal: string) => {
    setLoading(true)
    try {
      const res = await listCloudFiles(parentId, scopeVal)
      setFiles(res.list || [])
    } finally {
      setLoading(false)
    }
  }, [])

  const loadUsage = useCallback(async () => {
    try {
      const res = await getUsage()
      setUsage(res.used || 0)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    loadFiles(0, scope)
    if (scope === 'personal') loadUsage()
  }, [scope, loadFiles, loadUsage])

  // 进入文件夹
  const enterFolder = (record: CloudFile) => {
    setCurrentParent(record.id)
    setBreadcrumbs([...breadcrumbs, { id: record.id, name: record.name }])
    loadFiles(record.id, scope)
  }

  // 面包屑导航
  const navigateTo = (idx: number) => {
    const newCrumbs = breadcrumbs.slice(0, idx + 1)
    setBreadcrumbs(newCrumbs)
    setCurrentParent(newCrumbs[newCrumbs.length - 1].id)
    loadFiles(newCrumbs[newCrumbs.length - 1].id, scope)
  }

  // 新建文件夹
  const handleNewFolder = () => {
    let folderName = ''
    modal.confirm({
      title: '新建文件夹',
      content: <Input placeholder="文件夹名称" onChange={(e) => { folderName = e.target.value }} />,
      onOk: async () => {
        if (!folderName) { message.error('请输入名称'); return }
        await createFolder({ parent_id: currentParent, name: folderName, scope })
        message.success('已创建')
        loadFiles(currentParent, scope)
      },
    })
  }

  // 上传文件
  const handleUpload = async (file: File) => {
    try {
      // 复用已有上传 API
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', 'cloud')
      const uploadRes = await uploadFileApi(file, 'cloud')
      // 创建文件记录
      await createFile({
        parent_id: currentParent,
        name: file.name,
        object_key: uploadRes.path || '',
        url: uploadRes.url || '',
        size: uploadRes.size || file.size,
        content_type: uploadRes.content_type || file.type,
        scope,
      })
      message.success(`${file.name} 上传成功`)
      loadFiles(currentParent, scope)
      if (scope === 'personal') loadUsage()
    } catch {
      message.error('上传失败')
    }
    return false // 阻止 antd 默认上传
  }

  // 重命名
  const handleRename = (record: CloudFile) => {
    let newName = record.name
    modal.confirm({
      title: '重命名',
      content: <Input defaultValue={record.name} onChange={(e) => { newName = e.target.value }} />,
      onOk: async () => {
        await updateFile(record.id, { name: newName })
        message.success('已重命名')
        loadFiles(currentParent, scope)
      },
    })
  }

  // 删除
  const handleDelete = async (id: number) => {
    await deleteFile(id)
    message.success('已删除')
    loadFiles(currentParent, scope)
    if (scope === 'personal') loadUsage()
  }

  // 下载
  const handleDownload = (record: CloudFile) => {
    if (record.url) {
      window.open(record.url, '_blank')
    }
  }

  const columns: ColumnsType<CloudFile> = [
    {
      title: '名称',
      dataIndex: 'name',
      render: (_, record) => (
        <Space>
          <FileIcon record={record} />
          {record.is_dir === 1 ? (
            <a onClick={() => enterFolder(record)}>{record.name}</a>
          ) : (
            <span>{record.name}</span>
          )}
        </Space>
      ),
    },
    {
      title: '大小',
      dataIndex: 'size',
      width: 100,
      render: (_, r) => r.is_dir === 1 ? '-' : formatSize(r.size),
    },
    {
      title: '类型',
      dataIndex: 'content_type',
      width: 120,
      render: (_, r) => r.is_dir === 1 ? <Tag color="orange">文件夹</Tag> : <Tag>{r.content_type || '文件'}</Tag>,
    },
    { title: '上传时间', dataIndex: 'created_at', width: 170, render: (_, r) => r.created_at?.slice(0, 16) },
    {
      title: '操作',
      width: 160,
      render: (_, record) => (
        <Space>
          {record.is_dir === 0 && record.url && (
            <Button type="link" size="small" icon={<DownloadOutlined />} onClick={() => handleDownload(record)}>下载</Button>
          )}
          <Auth perm="cloud:file:manage">
            <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleRename(record)} />
          </Auth>
          <Auth perm="cloud:file:delete">
            <Popconfirm title="确认删除?" okText="删除" okButtonProps={{ danger: true }} cancelText="取消" onConfirm={() => handleDelete(record.id)}>
              <Button type="link" size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </Auth>
        </Space>
      ),
    },
  ]

  return (
    <Card
      title={
        <Tabs
          activeKey={scope}
          onChange={(k) => { setScope(k); setCurrentParent(0); setBreadcrumbs([{ id: 0, name: '根目录' }]) }}
          items={SCOPE_TABS}
          size="small"
        />
      }
      extra={
        <Space>
          {scope === 'personal' && (
            <span style={{ color: '#999', fontSize: 12 }}>已用: {formatSize(usage)}</span>
          )}
          <Auth perm="cloud:file:upload">
            <Upload beforeUpload={handleUpload} showUploadList={false} maxCount={1}>
              <Button type="primary" icon={<UploadOutlined />}>上传文件</Button>
            </Upload>
          </Auth>
          <Auth perm="cloud:file:manage">
            <Button icon={<FolderAddOutlined />} onClick={handleNewFolder}>新建文件夹</Button>
          </Auth>
        </Space>
      }
    >
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={breadcrumbs.map((b, i) => ({
          title: i === 0 ? <><HomeOutlined /> {b.name}</> : <a onClick={() => navigateTo(i)}>{b.name}</a>,
        }))}
      />
      <Table<CloudFile>
        rowKey="id"
        columns={columns}
        dataSource={files}
        loading={loading}
        pagination={false}
        size="middle"
        locale={{ emptyText: '暂无文件' }}
      />
    </Card>
  )
}
