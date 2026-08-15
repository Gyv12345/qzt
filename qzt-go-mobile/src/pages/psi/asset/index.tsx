import { useCallback, useState } from 'react'
import { Dialog, FloatingBubble, InfiniteScroll, List, NavBar, PullToRefresh, SearchBar, Tag, Toast } from 'antd-mobile'
import { AddOutline } from 'antd-mobile-icons'
import { useNavigate } from 'react-router-dom'
import { createAsset, deleteAsset, listAssets, updateAsset } from '../../../services/psi'
import type { PsiAsset } from '../../../types/psi'
import { ASSET_STATUS } from '../../../types/psi'
import { useInfiniteList } from '../../../hooks/useInfiniteList'
import FormSheet from '../../../components/FormSheet'

export default function AssetList() {
  const navigate = useNavigate()
  const [keyword, setKeyword] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const fetcher = useCallback(
    (params: { page: number; page_size: number }) => listAssets({ ...params, keyword: keyword || undefined }),
    [keyword],
  )
  const { list, hasMore, loadMore, refresh } = useInfiniteList<PsiAsset>(fetcher, { page_size: 20 }, [keyword])

  const onDelete = async (a: PsiAsset) => {
    const ok = await Dialog.confirm({ content: `确定删除资产「${a.name}」?` })
    if (!ok) return
    try {
      await deleteAsset(a.id)
      Toast.show({ icon: 'success', content: '已删除' })
      refresh()
    } catch {
    }
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%' }}>
      <NavBar onBack={() => navigate(-1)}>固定资产</NavBar>
      <div style={{ padding: 8, background: 'var(--bg-card)' }}>
        <SearchBar placeholder="搜索资产名称/编号" onSearch={setKeyword} onClear={() => setKeyword('')} />
      </div>
      <PullToRefresh onRefresh={refresh}>
        <List>
          {list.map((a) => {
            const s = ASSET_STATUS[a.status] || ASSET_STATUS[1]
            return (
              <List.Item
                key={a.id}
                description={<span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{a.asset_no} · {a.category} · {a.location || '-'}</span>}
                extra={
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    <Tag color={s.color} fill="outline">{s.text}</Tag>
                    <div style={{ fontSize: 12 }}>
                      <a style={{ color: 'var(--brand)' }} onClick={(e) => { e.stopPropagation(); setEditing(a) }}>编辑</a>
                      <span style={{ color: 'var(--text-tertiary)', margin: '0 6px' }}>/</span>
                      <a style={{ color: '#ff4d4f' }} onClick={(e) => { e.stopPropagation(); onDelete(a) }}>删除</a>
                    </div>
                  </div>
                }
              >
                {a.name}
              </List.Item>
            )
          })}
          {list.length === 0 && <List.Item><span style={{ color: 'var(--text-tertiary)' }}>暂无资产</span></List.Item>}
        </List>
        <InfiniteScroll loadMore={loadMore} hasMore={hasMore} />
      </PullToRefresh>

      <FloatingBubble style={{ '--size': '48px' } as any} onClick={() => setShowNew(true)}>
        <AddOutline fontSize={24} />
      </FloatingBubble>

      <FormSheet
        visible={showNew || !!editing}
        title={editing ? '编辑资产' : '新建资产'}
        fields={[
          { name: 'name', label: '名称', type: 'text', required: true },
          { name: 'asset_no', label: '编号', type: 'text' },
          { name: 'category', label: '分类', type: 'text' },
          { name: 'quantity', label: '数量', type: 'number' },
          { name: 'value', label: '价值', type: 'number' },
          { name: 'remark', label: '备注', type: 'textarea' },
        ]}
        initialValues={
          editing
            ? { name: editing.name, asset_no: editing.asset_no, category: editing.category, quantity: editing.quantity, value: editing.value, remark: editing.remark }
            : undefined
        }
        onClose={() => {
          setShowNew(false)
          setEditing(null)
        }}
        onSubmit={async (v) => {
          const payload = {
            name: v.name,
            asset_no: v.asset_no || undefined,
            category: v.category || undefined,
            quantity: v.quantity ? Number(v.quantity) : undefined,
            value: v.value || undefined,
            remark: v.remark || undefined,
          }
          if (editing) await updateAsset(editing.id, payload)
          else await createAsset(payload)
          setEditing(null)
          refresh()
        }}
      />
    </div>
  )
}
