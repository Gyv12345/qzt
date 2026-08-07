import { useCallback, useState } from 'react'
import { InfiniteScroll, List, NavBar, PullToRefresh, SearchBar, Tag } from 'antd-mobile'
import { useNavigate } from 'react-router-dom'
import { listAssets } from '../../../services/psi'
import type { PsiAsset } from '../../../types/psi'
import { ASSET_STATUS } from '../../../types/psi'
import { useInfiniteList } from '../../../hooks/useInfiniteList'

export default function AssetList() {
  const navigate = useNavigate()
  const [keyword, setKeyword] = useState('')
  const fetcher = useCallback(
    (params: { page: number; page_size: number }) => listAssets({ ...params, keyword: keyword || undefined }),
    [keyword],
  )
  const { list, hasMore, loadMore, refresh } = useInfiniteList<PsiAsset>(fetcher, { page_size: 20 })

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%' }}>
      <NavBar onBack={() => navigate(-1)}>固定资产</NavBar>
      <div style={{ padding: 8, background: 'var(--bg-card)' }}>
        <SearchBar placeholder="搜索资产名称/编号" onSearch={() => refresh()} onClear={() => { setKeyword(''); refresh() }} />
      </div>
      <PullToRefresh onRefresh={refresh}>
        <List>
          {list.map((a) => {
            const s = ASSET_STATUS[a.status] || ASSET_STATUS[1]
            return (
              <List.Item
                key={a.id}
                description={<span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{a.asset_no} · {a.category} · {a.location || '-'}</span>}
                extra={<Tag color={s.color} fill="outline">{s.text}</Tag>}
              >
                {a.name}
              </List.Item>
            )
          })}
          {list.length === 0 && <List.Item><span style={{ color: 'var(--text-tertiary)' }}>暂无资产</span></List.Item>}
        </List>
        <InfiniteScroll loadMore={loadMore} hasMore={hasMore} />
      </PullToRefresh>
    </div>
  )
}
