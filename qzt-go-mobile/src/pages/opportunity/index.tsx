import { useCallback, useState } from 'react'
import { FloatingBubble, InfiniteScroll, List, NavBar, PullToRefresh, SearchBar, Tag } from 'antd-mobile'
import { useNavigate } from 'react-router-dom'
import { listOpportunities } from '../../services/crm'
import type { CrmOpportunity } from '../../types/crm'
import { useInfiniteList } from '../../hooks/useInfiniteList'
import { AddOutline } from 'antd-mobile-icons'
import OpportunityFormSheet from '../../components/OpportunityFormSheet'

// 商机阶段映射
const STAGE_TEXT: Record<string, string> = {
  PROSPECTING: '初步接触',
  QUALIFIED: '需求确认',
  PROPOSAL: '方案报价',
  NEGOTIATION: '谈判',
  WON: '赢单',
  LOST: '输单',
}
const STAGE_COLOR: Record<string, string> = {
  PROSPECTING: 'default',
  QUALIFIED: 'primary',
  PROPOSAL: 'primary',
  NEGOTIATION: 'warning',
  WON: 'success',
  LOST: 'danger',
}

const toAmount = (v?: string) => Number(v || '0')
const formatAmount = (v?: string) =>
  toAmount(v).toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })

export default function OpportunityList() {
  const navigate = useNavigate()
  const [keyword, setKeyword] = useState('')
  const [showNew, setShowNew] = useState(false)

  const fetcher = useCallback(
    (params: { page: number; page_size: number }) =>
      listOpportunities({ ...params, keyword: keyword || undefined }),
    [keyword],
  )

  const { list, hasMore, loadMore, refresh } = useInfiniteList<CrmOpportunity>(fetcher, {
    page_size: 20,
  }, [keyword])

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%' }}>
      <NavBar onBack={() => navigate(-1)}>商机</NavBar>
      <div style={{ padding: 8, background: 'var(--bg-card)' }}>
        <SearchBar placeholder="搜索商机名称" onSearch={setKeyword} onClear={() => setKeyword('')} />
      </div>

      <PullToRefresh onRefresh={refresh}>
        <List>
          {list.map((o) => (
            <List.Item
              key={o.id}
              onClick={() => navigate(`/opportunity/${o.id}`)}
              description={
                <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                  {o.opportunity_no}
                  {o.expected_close_date ? ` · 预计 ${o.expected_close_date.slice(0, 10)}` : ''}
                </span>
              }
              extra={
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--brand)' }}>
                    ¥{formatAmount(o.expected_amount)}
                  </div>
                  <Tag
                    color={STAGE_COLOR[o.stage] || 'default'}
                    fill="outline"
                    style={{ '--border-radius': '4px', fontSize: 11, marginTop: 4 }}
                  >
                    {STAGE_TEXT[o.stage] || o.stage}
                  </Tag>
                </div>
              }
            >
              {o.name}
            </List.Item>
          ))}
        </List>
        <InfiniteScroll loadMore={loadMore} hasMore={hasMore} />
      </PullToRefresh>

      <FloatingBubble style={{ '--size': '48px' } as any} onClick={() => setShowNew(true)}>
        <AddOutline fontSize={24} />
      </FloatingBubble>

      <OpportunityFormSheet visible={showNew} onClose={() => setShowNew(false)} onSubmitted={refresh} />
    </div>
  )
}
