import { useState, useEffect, useCallback } from 'react'
import {
  App, Button, Card, Popconfirm, Space, Table, Tabs, Tag, Upload, Input, Breadcrumb,
  Drawer, Form, Modal, Radio, Typography,
} from 'antd'
import {
  FolderOutlined, FileOutlined, DeleteOutlined, EditOutlined,
  FolderAddOutlined, UploadOutlined, DownloadOutlined, HomeOutlined,
  ShareAltOutlined, CopyOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import Auth from '../../components/Auth'
import {
  listCloudFiles, createFolder, createFile, updateFile, deleteFile, getUsage,
} from '../../services/cloud'
import {
  createShare, listShares, cancelShare,
} from '../../services/cloudShare'
import { copyToClipboard } from '../../utils/clipboard'
import { uploadFile as uploadFileApi } from '../../services/attachment'
import type { CloudFile, CloudShare, CloudShareCreated } from '../../types/cloud'

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

/** 有效期展示(截到分钟) */
function formatExpire(s?: string): string {
  return (s || '').slice(0, 16)
}

/** 分享状态:已取消 > 已过期 > 有效(过期由前端按 expire_at 判断) */
function shareStatus(r: CloudShare): { label: string; color: string } {
  if (r.disabled) return { label: '已取消', color: 'default' }
  const t = new Date((r.expire_at || '').replace(' ', 'T')).getTime()
  if (t && t < Date.now()) return { label: '已过期', color: 'orange' }
  return { label: '有效', color: 'green' }
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

  // ── 分享 ──
  const [shareTarget, setShareTarget] = useState<CloudFile | null>(null)
  const [shareCreated, setShareCreated] = useState<CloudShareCreated | null>(null)
  const [shareSubmitting, setShareSubmitting] = useState(false)
  const [shareForm] = Form.useForm<{ expire_days: number; extract_code?: string }>()

  const openShareModal = (record: CloudFile) => {
    shareForm.setFieldsValue({ expire_days: 7, extract_code: '' })
    setShareCreated(null)
    setShareTarget(record)
  }

  const handleSubmitShare = async () => {
    if (!shareTarget) return
    const values = await shareForm.validateFields()
    const code = (values.extract_code || '').trim()
    if (code && !/^[A-Za-z0-9]{4,12}$/.test(code)) {
      message.error('提取码为 4-12 位字母或数字')
      return
    }
    setShareSubmitting(true)
    try {
      const res = await createShare({
        file_id: shareTarget.id,
        expire_days: values.expire_days,
        extract_code: code || undefined,
      })
      setShareCreated(res)
    } catch { /* 失败由请求拦截器统一提示 */ } finally {
      setShareSubmitting(false)
    }
  }

  const copyShareText = async (text: string, label: string) => {
    const ok = await copyToClipboard(text)
    if (ok) message.success(`${label}已复制`)
    else message.error('复制失败,请手动选择复制')
  }

  // ── 我的分享 ──
  const [sharesOpen, setSharesOpen] = useState(false)
  const [shares, setShares] = useState<CloudShare[]>([])
  const [sharesTotal, setSharesTotal] = useState(0)
  const [sharesPage, setSharesPage] = useState(1)
  const [sharesLoading, setSharesLoading] = useState(false)

  const loadShares = useCallback(async (page: number) => {
    setSharesLoading(true)
    try {
      const res = await listShares({ page, page_size: 10 })
      setShares(res.list || [])
      setSharesTotal(res.total || 0)
    } catch { /* 失败由请求拦截器统一提示 */ } finally {
      setSharesLoading(false)
    }
  }, [])

  const openSharesDrawer = () => {
    setSharesPage(1)
    setSharesOpen(true)
    loadShares(1)
  }

  const handleCancelShare = async (id: number) => {
    await cancelShare(id)
    message.success('已取消分享')
    loadShares(sharesPage)
  }

  const shareColumns: ColumnsType<CloudShare> = [
    { title: '文件名', dataIndex: 'file_name', ellipsis: true },
    { title: '大小', dataIndex: 'size', width: 90, render: (_, r) => formatSize(r.size) },
    { title: '下载次数', dataIndex: 'download_count', width: 90 },
    { title: '有效期', dataIndex: 'expire_at', width: 150, render: (_, r) => formatExpire(r.expire_at) },
    {
      title: '状态',
      width: 80,
      render: (_, r) => {
        const s = shareStatus(r)
        return <Tag color={s.color}>{s.label}</Tag>
      },
    },
    {
      title: '操作',
      width: 170,
      fixed: 'right',
      render: (_, r) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<CopyOutlined />}
            onClick={() => copyShareText(`${window.location.origin}/share/${r.token}`, '链接')}
          >
            复制链接
          </Button>
          <Auth perm="cloud:share:cancel">
            <Popconfirm
              title="取消后链接立即失效,确认取消?"
              okText="取消分享"
              cancelText="再想想"
              onConfirm={() => handleCancelShare(r.id)}
            >
              <Button type="link" size="small" danger>取消分享</Button>
            </Popconfirm>
          </Auth>
        </Space>
      ),
    },
  ]

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
      width: 200,
      render: (_, record) => (
        <Space>
          {record.is_dir === 0 && record.url && (
            <Button type="link" size="small" icon={<DownloadOutlined />} onClick={() => handleDownload(record)}>下载</Button>
          )}
          {record.is_dir === 0 && (
            <Auth perm="cloud:share:create">
              <Button type="link" size="small" icon={<ShareAltOutlined />} onClick={() => openShareModal(record)}>分享</Button>
            </Auth>
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
          <Auth perm="cloud:share:create">
            <Button icon={<ShareAltOutlined />} onClick={openSharesDrawer}>我的分享</Button>
          </Auth>
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
        items={breadcrumbs.map((b, i) => {
          const label = (
            <>
              {i === 0 && <HomeOutlined />} {b.name}
            </>
          )
          // 末位=当前目录(不可点);其余祖先级全部可点击返回,含根目录
          return {
            title: i === breadcrumbs.length - 1 ? label : <a onClick={() => navigateTo(i)}>{label}</a>,
          }
        })}
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

      {/* 分享弹窗:表单 → 创建成功后的结果视图 */}
      <Modal
        title={`分享「${shareTarget?.name ?? ''}」`}
        open={!!shareTarget}
        onCancel={() => setShareTarget(null)}
        destroyOnHidden
        footer={
          shareCreated ? (
            <Button type="primary" onClick={() => setShareTarget(null)}>完成</Button>
          ) : (
            [
              <Button key="cancel" onClick={() => setShareTarget(null)}>取消</Button>,
              <Button key="ok" type="primary" loading={shareSubmitting} onClick={handleSubmitShare}>创建分享</Button>,
            ]
          )
        }
      >
        {shareCreated ? (
          <div style={{ display: 'grid', gap: 12, padding: '4px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ flexShrink: 0, color: '#999' }}>分享链接</span>
              <Typography.Text ellipsis style={{ flex: 1 }}>
                {`${window.location.origin}/share/${shareCreated.token}`}
              </Typography.Text>
              <Button
                size="small"
                icon={<CopyOutlined />}
                onClick={() => copyShareText(`${window.location.origin}/share/${shareCreated.token}`, '链接')}
              >
                复制
              </Button>
            </div>
            {shareCreated.extract_code && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ flexShrink: 0, color: '#999' }}>提取码</span>
                <Typography.Text>{shareCreated.extract_code}</Typography.Text>
                <Button
                  size="small"
                  icon={<CopyOutlined />}
                  onClick={() => copyShareText(shareCreated.extract_code, '提取码')}
                >
                  复制
                </Button>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ flexShrink: 0, color: '#999' }}>有效期至</span>
              <Typography.Text>{formatExpire(shareCreated.expire_at)}</Typography.Text>
              <Button
                size="small"
                icon={<CopyOutlined />}
                onClick={() => copyShareText(shareCreated.expire_at, '有效期')}
              >
                复制
              </Button>
            </div>
          </div>
        ) : (
          <Form form={shareForm} layout="vertical" initialValues={{ expire_days: 7 }}>
            <Form.Item name="expire_days" label="有效期" rules={[{ required: true, message: '请选择有效期' }]}>
              <Radio.Group>
                <Radio.Button value={7}>7 天</Radio.Button>
                <Radio.Button value={30}>30 天</Radio.Button>
              </Radio.Group>
            </Form.Item>
            <Form.Item name="extract_code" label="提取码" extra="留空则无需提取码;4-12 位字母或数字">
              <Input placeholder="可选,如 a1b2c3" maxLength={12} allowClear />
            </Form.Item>
          </Form>
        )}
      </Modal>

      {/* 我的分享 */}
      <Drawer
        title="我的分享"
        width={720}
        open={sharesOpen}
        onClose={() => setSharesOpen(false)}
        destroyOnHidden
      >
        <Table<CloudShare>
          rowKey="id"
          size="small"
          loading={sharesLoading}
          columns={shareColumns}
          dataSource={shares}
          scroll={{ x: 'max-content' }}
          pagination={{
            current: sharesPage,
            pageSize: 10,
            total: sharesTotal,
            showSizeChanger: false,
            showTotal: (t) => `共 ${t} 条`,
            onChange: (p) => { setSharesPage(p); loadShares(p) },
          }}
          locale={{ emptyText: '暂无分享' }}
        />
      </Drawer>
    </Card>
  )
}
