import { useCallback, useState } from 'react'
import { Dialog, FloatingBubble, InfiniteScroll, List, NavBar, PullToRefresh, SearchBar, Tag, Toast } from 'antd-mobile'
import { AddOutline } from 'antd-mobile-icons'
import { useNavigate } from 'react-router-dom'
import { createWarehouse, deleteWarehouse, listWarehouses, updateWarehouse } from '../../../services/psi'
import { PSI_STATUS_TEXT, type PsiWarehouse } from '../../../types/psi'
import { useInfiniteList } from '../../../hooks/useInfiniteList'
import FormSheet from '../../../components/FormSheet'

export default function WarehouseList() {
  const navigate = useNavigate()
  const [keyword, setKeyword] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const fetcher = useCallback(
    (params: { page: number; page_size: number }) =>
      listWarehouses({ ...params, keyword: keyword || undefined }),
    [keyword],
  )
  const { list, hasMore, loadMore, refresh } = useInfiniteList<PsiWarehouse>(fetcher, { page_size: 20 }, [keyword])

  const onDelete = async (w: PsiWarehouse) => {
    const ok = await Dialog.confirm({ content: `确定删除仓库「${w.name}」?` })
    if (!ok) return
    try {
      await deleteWarehouse(w.id)
      Toast.show({ icon: 'success', content: '已删除' })
      refresh()
    } catch {
    }
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%' }}>
      <NavBar onBack={() => navigate(-1)}>仓库</NavBar>
      <div style={{ padding: 8, background: 'var(--bg-card)' }}>
        <SearchBar placeholder="搜索仓库名称/编码" onSearch={setKeyword} onClear={() => setKeyword('')} />
      </div>
      <PullToRefresh onRefresh={refresh}>
        <List>
          {list.map((w) => (
            <List.Item
              key={w.id}
              description={
                <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                  {w.code}
                  {w.address ? ` · ${w.address}` : ''}
                  {w.phone ? ` · ${w.phone}` : ''}
                </span>
              }
              extra={
                <div style={{ display: 'flex', gap: 4, flexDirection: 'column', alignItems: 'flex-end' }}>
                  {w.is_default === 1 && <Tag color="primary" fill="outline">默认</Tag>}
                  <Tag color={w.status === 1 ? 'success' : 'default'} fill="outline">{PSI_STATUS_TEXT[w.status] || '-'}</Tag>
                  <div style={{ fontSize: 12 }}>
                    <a style={{ color: 'var(--brand)' }} onClick={(e) => { e.stopPropagation(); setEditing(w) }}>编辑</a>
                    <span style={{ color: 'var(--text-tertiary)', margin: '0 6px' }}>/</span>
                    <a style={{ color: '#ff4d4f' }} onClick={(e) => { e.stopPropagation(); onDelete(w) }}>删除</a>
                  </div>
                </div>
              }
            >
              {w.name}
            </List.Item>
          ))}
          {list.length === 0 && <List.Item><span style={{ color: 'var(--text-tertiary)' }}>暂无仓库</span></List.Item>}
        </List>
        <InfiniteScroll loadMore={loadMore} hasMore={hasMore} />
      </PullToRefresh>

      <FloatingBubble style={{ '--size': '48px' } as any} onClick={() => setShowNew(true)}>
        <AddOutline fontSize={24} />
      </FloatingBubble>

      <FormSheet
        visible={showNew || !!editing}
        title={editing ? '编辑仓库' : '新建仓库'}
        fields={[
          { name: 'name', label: '名称', type: 'text', required: true },
          { name: 'code', label: '编码', type: 'text' },
          { name: 'address', label: '地址', type: 'text' },
          { name: 'manager', label: '负责人', type: 'text' },
          { name: 'remark', label: '备注', type: 'textarea' },
        ]}
        initialValues={
          editing
            ? { name: editing.name, code: editing.code, address: editing.address, manager: editing.manager, remark: editing.remark }
            : undefined
        }
        onClose={() => {
          setShowNew(false)
          setEditing(null)
        }}
        onSubmit={async (v) => {
          const payload = {
            name: v.name,
            code: v.code || undefined,
            address: v.address || undefined,
            manager: v.manager || undefined,
            remark: v.remark || undefined,
          }
          if (editing) await updateWarehouse(editing.id, payload)
          else await createWarehouse(payload)
          setEditing(null)
          refresh()
        }}
      />
    </div>
  )
}
