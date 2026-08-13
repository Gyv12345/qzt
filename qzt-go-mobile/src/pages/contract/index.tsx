import { useCallback, useState } from 'react'
import { FloatingBubble, InfiniteScroll, List, NavBar, PullToRefresh, SearchBar, Tag } from 'antd-mobile'
import { useNavigate } from 'react-router-dom'
import { listContracts } from '../../services/crm'
import type { CrmContract } from '../../types/crm'
import { useInfiniteList } from '../../hooks/useInfiniteList'
import { AddOutline } from 'antd-mobile-icons'
import ContractFormSheet from '../../components/ContractFormSheet'

const STAGE_TEXT: Record<string, string> = {
  DRAFT: '草稿',
  EXECUTING: '执行中',
  COMPLETED: '已完成',
  TERMINATED: '已终止',
}
const STAGE_COLOR: Record<string, string> = {
  DRAFT: 'default',
  EXECUTING: 'primary',
  COMPLETED: 'success',
  TERMINATED: 'danger',
}

const toAmount = (v?: string) => Number(v || '0')
const formatAmount = (v?: string) =>
  toAmount(v).toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })

export default function ContractList() {
  const navigate = useNavigate()
  const [keyword, setKeyword] = useState('')
  const [showNew, setShowNew] = useState(false)

  const fetcher = useCallback(
    (params: { page: number; page_size: number }) =>
      listContracts({ ...params, keyword: keyword || undefined }),
    [keyword],
  )

  const { list, hasMore, loadMore, refresh } = useInfiniteList<CrmContract>(fetcher, {
    page_size: 20,
  })

  const onSearch = (val: string) => {
    setKeyword(val)
    refresh()
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%' }}>
      <NavBar onBack={() => navigate(-1)}>合同</NavBar>
      <div style={{ padding: 8, background: 'var(--bg-card)' }}>
        <SearchBar placeholder="搜索合同名称" onSearch={onSearch} onClear={() => onSearch('')} />
      </div>

      <PullToRefresh onRefresh={refresh}>
        <List>
          {list.map((c) => {
            const total = toAmount(c.total_amount)
            const received = toAmount(c.received_amount)
            const progress = total > 0 ? Math.round((received / total) * 100) : 0
            return (
              <List.Item
                key={c.id}
                onClick={() => navigate(`/contract/${c.id}`)}
                description={
                  <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                    {c.contract_no}
                    {c.signed_date ? ` · 签订 ${c.signed_date.slice(0, 10)}` : ''}
                  </span>
                }
                extra={
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--brand)' }}>
                      ¥{formatAmount(c.total_amount)}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
                      回款 {progress}%
                    </div>
                    <Tag
                      color={STAGE_COLOR[c.stage] || 'default'}
                      fill="outline"
                      style={{ '--border-radius': '4px', fontSize: 11, marginTop: 4 }}
                    >
                      {STAGE_TEXT[c.stage] || c.stage}
                    </Tag>
                  </div>
                }
              >
                {c.name}
              </List.Item>
            )
          })}
        </List>
        <InfiniteScroll loadMore={loadMore} hasMore={hasMore} />
      </PullToRefresh>

      <FloatingBubble style={{ '--size': '48px' } as any} onClick={() => setShowNew(true)}>
        <AddOutline fontSize={24} />
      </FloatingBubble>

      <ContractFormSheet visible={showNew} onClose={() => setShowNew(false)} onSubmitted={refresh} />
    </div>
  )
}
