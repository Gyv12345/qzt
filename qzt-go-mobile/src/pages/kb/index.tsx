import { useCallback, useEffect, useState } from 'react'
import { Dialog, FloatingBubble, InfiniteScroll, List, NavBar, PullToRefresh, Tag, Toast } from 'antd-mobile'
import { AddOutline } from 'antd-mobile-icons'
import { useNavigate } from 'react-router-dom'
import { createKbDocument, deleteKbDocument, listKbCategories, listKbDocuments, updateKbDocument } from '../../services/oa'
import { useInfiniteList } from '../../hooks/useInfiniteList'
import FormSheet from '../../components/FormSheet'

export default function KbDocumentList() {
  const navigate = useNavigate()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [cats, setCats] = useState<any[]>([])
  const fetcher = useCallback((params: { page: number; page_size: number }) => listKbDocuments(params), [])
  const { list, hasMore, loadMore, refresh } = useInfiniteList<any>(fetcher, { page_size: 20 })

  useEffect(() => {
    listKbCategories()
      .then((r: any) => setCats(r.list || []))
      .catch(() => {})
  }, [])

  const onDelete = async (doc: any) => {
    const ok = await Dialog.confirm({ content: `确定删除文档「${doc.title}」?` })
    if (!ok) return
    try {
      await deleteKbDocument(doc.id)
      Toast.show({ icon: 'success', content: '已删除' })
      refresh()
    } catch {
    }
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%' }}>
      <NavBar onBack={() => navigate(-1)}>知识库</NavBar>
      <PullToRefresh onRefresh={refresh}>
        <List>
          {list.map((doc) => (
            <List.Item
              key={doc.id}
              onClick={() => navigate(`/kb/${doc.id}`)}
              description={<span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{doc.updated_at?.slice(0, 16)}</span>}
              extra={
                <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Tag color={doc.status === 'published' ? 'success' : 'default'} fill="outline">{doc.status === 'published' ? '已发布' : '草稿'}</Tag>
                  <a style={{ color: 'var(--brand)', fontSize: 12 }} onClick={(e) => { e.stopPropagation(); setEditing(doc) }}>编辑</a>
                  <a style={{ color: '#ff4d4f', fontSize: 12 }} onClick={(e) => { e.stopPropagation(); onDelete(doc) }}>删除</a>
                </span>
              }
            >
              {doc.title}
            </List.Item>
          ))}
          {list.length === 0 && <List.Item><span style={{ color: 'var(--text-tertiary)' }}>暂无文档</span></List.Item>}
        </List>
        <InfiniteScroll loadMore={loadMore} hasMore={hasMore} />
      </PullToRefresh>

      <FloatingBubble style={{ '--size': '48px' } as any} onClick={() => setShowForm(true)}>
        <AddOutline fontSize={24} />
      </FloatingBubble>

      <FormSheet
        visible={showForm || !!editing}
        title={editing ? '编辑文档' : '新建文档'}
        fields={[
          { name: 'title', label: '标题', type: 'text', required: true },
          { name: 'category_id', label: '分类', type: 'select', options: cats.map((c) => ({ label: c.name, value: c.id })) },
          { name: 'status', label: '状态', type: 'select', options: [{ label: '草稿', value: 'draft' }, { label: '发布', value: 'published' }] },
          { name: 'content', label: '正文(Markdown)', type: 'textarea' },
        ]}
        initialValues={editing ? { title: editing.title, category_id: editing.category_id, status: editing.status, content: editing.content } : undefined}
        onClose={() => {
          setShowForm(false)
          setEditing(null)
        }}
        onSubmit={async (v) => {
          const payload = {
            title: v.title,
            category_id: v.category_id ? Number(v.category_id) : undefined,
            status: v.status || 'draft',
            content: v.content || undefined,
          }
          if (editing) await updateKbDocument(editing.id, payload)
          else await createKbDocument(payload)
          setEditing(null)
          refresh()
        }}
      />
    </div>
  )
}
