import { useRef, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { App, Button, Popconfirm, Space, Tag } from 'antd'
import { PlusOutlined, EditOutlined } from '@ant-design/icons'
import { ProTable, type ActionType, type ProColumns } from '@ant-design/pro-components'
import Auth from '../../../components/Auth'
import { listDocuments, deleteDocument, listCategories } from '../../../services/kb'
import type { KbDocument, KbCategory } from '../../../types/kb'

export default function DocumentListPage() {
  const { message } = App.useApp()
  const navigate = useNavigate()
  const actionRef = useRef<ActionType>(null)
  const [categories, setCategories] = useState<KbCategory[]>([])

  useEffect(() => {
    listCategories().then((res) => setCategories(res.list || []))
  }, [])

  const catMap = new Map(categories.map((c) => [c.id, c.name]))

  const handleDelete = async (id: number) => {
    await deleteDocument(id)
    message.success('已删除')
    actionRef.current?.reload()
  }

  const columns: ProColumns<KbDocument>[] = [
    { title: '编号', valueType: 'indexBorder', width: 60 },
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
    { title: '更新时间', dataIndex: 'updated_at', valueType: 'dateTime', width: 160, search: false },
    {
      title: '操作',
      valueType: 'option',
      width: 140,
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => navigate(`/kb/document/editor?id=${record.id}`)}>编辑</Button>
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
        <Auth perm="kb:document:add" key="add">
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/kb/document/editor')}>新建文档</Button>
        </Auth>,
      ]}
      headerTitle="知识库文档"
    />
  )
}
