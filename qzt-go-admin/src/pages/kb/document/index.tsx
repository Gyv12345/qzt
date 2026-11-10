import { useRef, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { App, Button, Popconfirm, Space, Switch, Tag, Tooltip } from 'antd'
import { PlusOutlined, EditOutlined, ReloadOutlined } from '@ant-design/icons'
import { ProTable, type ActionType, type ProColumns } from '@ant-design/pro-components'
import Auth from '../../../components/Auth'
import { listDocuments, deleteDocument, listCategories, reindexDocument } from '../../../services/kb'
import { listConfigs, updateConfig } from '../../../services/system'
import type { KbDocument, KbCategory } from '../../../types/kb'
import { pageIndexColumn } from '../../../components/IndexTag'

export default function DocumentListPage() {
  const { message } = App.useApp()
  const navigate = useNavigate()
  const actionRef = useRef<ActionType>(null)
  const [categories, setCategories] = useState<KbCategory[]>([])
  const [reindexing, setReindexing] = useState<number | null>(null)
  // P17 RAG 总开关（sys_config kb.rag_enabled，界面可控）
  const [ragOn, setRagOn] = useState(false)
  const [ragConfigId, setRagConfigId] = useState<number | null>(null)
  const [ragSwitching, setRagSwitching] = useState(false)

  useEffect(() => {
    listCategories().then((res) => setCategories(res.list || []))
  }, [])

  useEffect(() => {
    listConfigs('kb')
      .then((res) => {
        const cfg = (res || []).find((c) => c.key === 'kb.rag_enabled')
        if (cfg) {
          setRagConfigId(cfg.id)
          setRagOn(cfg.value === '1')
        }
      })
      .catch(() => {})
  }, [])

  const catMap = new Map(categories.map((c) => [c.id, c.name]))

  const handleDelete = async (id: number) => {
    await deleteDocument(id)
    message.success('已删除')
    actionRef.current?.reload()
  }

  // 重建向量切片：embedding 未配置或失败时后端会返回错误信息
  const handleReindex = async (id: number) => {
    setReindexing(id)
    try {
      const res = await reindexDocument(id)
      message.success(`已重建，共 ${res?.chunks ?? 0} 个切片`)
      actionRef.current?.reload()
    } finally {
      setReindexing(null)
    }
  }

  const toggleRAG = async (checked: boolean) => {
    if (!ragConfigId) return
    setRagSwitching(true)
    try {
      await updateConfig(ragConfigId, { value: checked ? '1' : '0' })
      setRagOn(checked)
      message.success(checked ? 'RAG 召回已开启（写稿将召回知识库事实依据）' : 'RAG 召回已关闭')
    } finally {
      setRagSwitching(false)
    }
  }

  const columns: ProColumns<KbDocument>[] = [
    pageIndexColumn(actionRef, { width: 60 }),
    {
      title: '标题',
      dataIndex: 'title',
      width: 300,
      render: (_, r) => (
        <a onClick={() => navigate(`/kb/document/editor?id=${r.id}`)}>{r.title}</a>
      ),
    },
    {
      title: '分类',
      dataIndex: 'category_id',
      width: 120,
      valueType: 'select',
      valueEnum: Object.fromEntries(categories.map((c) => [c.id, { text: c.name }])),
      render: (_, r) => catMap.get(r.category_id) || '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      valueType: 'select',
      valueEnum: { draft: { text: '草稿' }, published: { text: '已发布' } },
      render: (_, r) => <Tag color={r.status === 'published' ? 'success' : 'default'}>{r.status === 'published' ? '已发布' : '草稿'}</Tag>,
    },
    { title: '浏览', dataIndex: 'view_count', width: 70, search: false },
    {
      title: '切片',
      dataIndex: 'chunk_count',
      width: 70,
      search: false,
      render: (_, r) =>
        r.chunk_count > 0 ? (
          <Tooltip title="已向量化，可被 GEO 写稿召回">
            <Tag color="success">{r.chunk_count}</Tag>
          </Tooltip>
        ) : (
          <Tooltip title="未向量化（embedding 未配置或待重建索引）">
            <Tag>0</Tag>
          </Tooltip>
        ),
    },
    { title: '更新时间', dataIndex: 'updated_at', valueType: 'dateTime', width: 160, search: false },
    {
      title: '操作',
      valueType: 'option',
      width: 200,
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => navigate(`/kb/document/editor?id=${record.id}`)}>编辑</Button>
          <Auth perm="kb:document:reindex">
            <Button type="link" size="small" icon={<ReloadOutlined />} loading={reindexing === record.id} onClick={() => handleReindex(record.id)}>重建索引</Button>
          </Auth>
          <Auth perm="kb:document:delete">
            <Popconfirm title="确认删除?" okText="删除" okButtonProps={{ danger: true }} cancelText="取消" onConfirm={() => handleDelete(record.id)}>
              <Button type="link" size="small" danger>删除</Button>
            </Popconfirm>
          </Auth>
        </Space>
      ),
    },
  ]

  return (
    <ProTable<KbDocument>
      rowKey="id"
      actionRef={actionRef}
      columns={columns}
      scroll={{ x: 'max-content' }}
      request={async (params) => {
        const { current, pageSize, ...rest } = params
        const data = await listDocuments({ page: current || 1, page_size: pageSize || 10, ...rest })
        return { data: data.list, total: data.total, success: true }
      }}
      toolBarRender={() => [
        <Tooltip key="rag" title="开启后文档保存时自动切片向量化，GEO 写稿将召回知识库事实依据。需先在服务器 .env 配置 KB_EMBEDDING_API_KEY，未配置时开关不生效">
          <Space size={6}>
            <span style={{ fontSize: 13 }}>RAG 召回</span>
            <Switch size="small" checked={ragOn} loading={ragSwitching} disabled={!ragConfigId} onChange={toggleRAG} />
          </Space>
        </Tooltip>,
        <Auth perm="kb:document:add" key="add">
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/kb/document/editor')}>新建文档</Button>
        </Auth>,
      ]}
      headerTitle="知识库文档"
    />
  )
}
