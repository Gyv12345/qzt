import { useCallback, useState } from 'react'
import { Dialog, FloatingBubble, InfiniteScroll, List, NavBar, PullToRefresh, SearchBar, Tag, Toast } from 'antd-mobile'
import { AddOutline } from 'antd-mobile-icons'
import { useNavigate } from 'react-router-dom'
import { createSupplier, deleteSupplier, listSuppliers, updateSupplier } from '../../../services/psi'
import { PSI_STATUS_TEXT, type PsiSupplier } from '../../../types/psi'
import { useInfiniteList } from '../../../hooks/useInfiniteList'
import FormSheet from '../../../components/FormSheet'

export default function SupplierList() {
  const navigate = useNavigate()
  const [keyword, setKeyword] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const fetcher = useCallback(
    (params: { page: number; page_size: number }) =>
      listSuppliers({ ...params, keyword: keyword || undefined }),
    [keyword],
  )
  const { list, hasMore, loadMore, refresh } = useInfiniteList<PsiSupplier>(fetcher, { page_size: 20 }, [keyword])

  const onDelete = async (s: PsiSupplier) => {
    const ok = await Dialog.confirm({ content: `确定删除供应商「${s.name}」?` })
    if (!ok) return
    try {
      await deleteSupplier(s.id)
      Toast.show({ icon: 'success', content: '已删除' })
      refresh()
    } catch {
    }
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%' }}>
      <NavBar onBack={() => navigate(-1)}>供应商</NavBar>
      <div style={{ padding: 8, background: 'var(--bg-card)' }}>
        <SearchBar placeholder="搜索供应商" onSearch={setKeyword} onClear={() => setKeyword('')} />
      </div>
      <PullToRefresh onRefresh={refresh}>
        <List>
          {list.map((s) => (
            <List.Item
              key={s.id}
              description={
                <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                  {s.supplier_no}
                  {s.contact_person ? ` · ${s.contact_person}` : ''}
                  {s.phone ? ` · ${s.phone}` : ''}
                </span>
              }
              extra={
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  <Tag color={s.status === 1 ? 'success' : 'default'} fill="outline">{PSI_STATUS_TEXT[s.status] || '-'}</Tag>
                  <div style={{ fontSize: 12 }}>
                    <a style={{ color: 'var(--brand)' }} onClick={(e) => { e.stopPropagation(); setEditing(s) }}>编辑</a>
                    <span style={{ color: 'var(--text-tertiary)', margin: '0 6px' }}>/</span>
                    <a style={{ color: '#ff4d4f' }} onClick={(e) => { e.stopPropagation(); onDelete(s) }}>删除</a>
                  </div>
                </div>
              }
            >
              {s.name}
            </List.Item>
          ))}
          {list.length === 0 && <List.Item><span style={{ color: 'var(--text-tertiary)' }}>暂无供应商</span></List.Item>}
        </List>
        <InfiniteScroll loadMore={loadMore} hasMore={hasMore} />
      </PullToRefresh>

      <FloatingBubble style={{ '--size': '48px' } as any} onClick={() => setShowNew(true)}>
        <AddOutline fontSize={24} />
      </FloatingBubble>

      <FormSheet
        visible={showNew || !!editing}
        title={editing ? '编辑供应商' : '新建供应商'}
        fields={[
          { name: 'name', label: '名称', type: 'text', required: true },
          { name: 'contact_name', label: '联系人', type: 'text' },
          { name: 'contact_phone', label: '电话', type: 'text' },
          { name: 'address', label: '地址', type: 'text' },
          { name: 'remark', label: '备注', type: 'textarea' },
        ]}
        initialValues={
          editing
            ? { name: editing.name, contact_name: editing.contact_person, contact_phone: editing.phone, address: editing.address, remark: editing.remark }
            : undefined
        }
        onClose={() => {
          setShowNew(false)
          setEditing(null)
        }}
        onSubmit={async (v) => {
          const payload = {
            name: v.name,
            contact_name: v.contact_name || undefined,
            contact_phone: v.contact_phone || undefined,
            address: v.address || undefined,
            remark: v.remark || undefined,
          }
          if (editing) await updateSupplier(editing.id, payload)
          else await createSupplier(payload)
          setEditing(null)
          refresh()
        }}
      />
    </div>
  )
}
