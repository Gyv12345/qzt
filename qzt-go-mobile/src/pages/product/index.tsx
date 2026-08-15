import { useCallback, useState } from 'react'
import { FloatingBubble, InfiniteScroll, List, NavBar, PullToRefresh, SearchBar, Tag } from 'antd-mobile'
import { AddOutline } from 'antd-mobile-icons'
import { useNavigate } from 'react-router-dom'
import { createProduct, listProducts } from '../../services/crm'
import type { CrmProduct } from '../../types/crm'
import { useInfiniteList } from '../../hooks/useInfiniteList'
import FormSheet from '../../components/FormSheet'

export default function ProductList() {
  const navigate = useNavigate()
  const [keyword, setKeyword] = useState('')
  // 已提交的搜索词:仅在点击搜索/清空时更新,作为 hook 的 dep(避免每击键都发请求)
  const [query, setQuery] = useState('')
  const [showNew, setShowNew] = useState(false)
  const fetcher = useCallback(
    (params: { page: number; page_size: number }) => listProducts({ ...params, keyword: query || undefined }),
    [query],
  )
  const { list, hasMore, loadMore, refresh } = useInfiniteList<CrmProduct>(fetcher, { page_size: 20 }, [query])

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%' }}>
      <NavBar onBack={() => navigate(-1)}>产品管理</NavBar>
      <div style={{ padding: 8, background: 'var(--bg-card)' }}>
        <SearchBar
          placeholder="搜索产品名称"
          value={keyword}
          onChange={setKeyword}
          onSearch={(v) => setQuery(v)}
          onClear={() => {
            setKeyword('')
            setQuery('')
          }}
        />
      </div>
      <PullToRefresh onRefresh={refresh}>
        <List>
          {list.map((p) => (
            <List.Item
              key={p.id}
              onClick={() => navigate(`/product/${p.id}`)}
              description={<span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{p.product_no} · {p.category || '-'} · {p.spec || '-'}</span>}
              extra={<span style={{ fontWeight: 600, color: 'var(--brand)' }}>{p.price ? `¥${p.price}` : ''}</span>}
            >
              {p.name}
              {p.status === 2 && <Tag color="default" style={{ marginLeft: 6 }}>已下架</Tag>}
            </List.Item>
          ))}
          {list.length === 0 && <List.Item><span style={{ color: 'var(--text-tertiary)' }}>暂无产品</span></List.Item>}
        </List>
        <InfiniteScroll loadMore={loadMore} hasMore={hasMore} />
      </PullToRefresh>

      <FloatingBubble style={{ '--size': '48px' } as any} onClick={() => setShowNew(true)}>
        <AddOutline fontSize={24} />
      </FloatingBubble>

      <FormSheet
        visible={showNew}
        title="新建产品"
        fields={[
          { name: 'name', label: '产品名称', type: 'text', required: true },
          { name: 'category', label: '分类', type: 'text' },
          { name: 'unit', label: '单位', type: 'text' },
          { name: 'standard_price', label: '标准价', type: 'number' },
          { name: 'cost_price', label: '成本价', type: 'number' },
          { name: 'description', label: '描述', type: 'textarea' },
        ]}
        onClose={() => setShowNew(false)}
        onSubmit={async (v) => {
          await createProduct({
            name: v.name,
            category: v.category || undefined,
            unit: v.unit || undefined,
            standard_price: v.standard_price ? Number(v.standard_price) : undefined,
            cost_price: v.cost_price ? Number(v.cost_price) : undefined,
            description: v.description || undefined,
          })
          refresh()
        }}
      />
    </div>
  )
}
