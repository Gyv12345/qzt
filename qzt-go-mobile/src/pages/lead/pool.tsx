import { useCallback, useEffect, useState } from 'react'
import {
  InfiniteScroll,
  List,
  NavBar,
  PullToRefresh,
  SearchBar,
  Tabs,
  Tag,
  Toast,
} from 'antd-mobile'
import { useNavigate } from 'react-router-dom'
import { listLeads, listLeadPools, pickLead, type CrmPool } from '../../services/crm'
import type { CrmLead } from '../../types/crm'
import { useInfiniteList } from '../../hooks/useInfiniteList'
import { useAuthStore } from '../../stores/auth'

const STATUS_TEXT: Record<number, string> = { 1: '新建', 2: '跟进中', 3: '已转化', 4: '无效' }
const STATUS_COLOR: Record<number, string> = {
  1: 'primary',
  2: 'warning',
  3: 'success',
  4: 'default',
}

/** 线索公海:浏览各公海池 + 领取 */
export default function LeadPool() {
  const navigate = useNavigate()
  const hasPerm = useAuthStore((s) => s.hasPerm)
  const [keyword, setKeyword] = useState('')
  const [poolKey, setPoolKey] = useState('')
  const [pools, setPools] = useState<CrmPool[]>([])

  useEffect(() => {
    listLeadPools()
      .then(setPools)
      .catch(() => {})
  }, [])

  const fetcher = useCallback(
    (params: { page: number; page_size: number }) =>
      listLeads({
        ...params,
        keyword: keyword || undefined,
        pool_filter: 'PUBLIC',
        pool_id: poolKey ? Number(poolKey) : undefined,
      }),
    [keyword, poolKey],
  )

  const { list, hasMore, loadMore, refresh } = useInfiniteList<CrmLead>(fetcher, {
    page_size: 20,
  }, [keyword, poolKey])

  const onPick = async (l: CrmLead) => {
    try {
      await pickLead(l.id)
      Toast.show({ icon: 'success', content: '领取成功' })
      refresh()
    } catch {
      // 拦截器已 toast
    }
  }

  const tabs = [{ key: '', label: '全部公海' }, ...pools.map((p) => ({ key: String(p.id), label: p.name }))]

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%' }}>
      <NavBar onBack={() => navigate(-1)}>线索公海</NavBar>
      <div style={{ padding: 8, background: 'var(--bg-card)' }}>
        <SearchBar placeholder="搜索线索名称" onSearch={setKeyword} onClear={() => setKeyword('')} />
      </div>
      <Tabs activeKey={poolKey} onChange={setPoolKey}>
        {tabs.map((t) => (
          <Tabs.Tab key={t.key} title={t.label} />
        ))}
      </Tabs>

      <PullToRefresh onRefresh={refresh}>
        <List>
          {list.map((l) => (
            <List.Item
              key={l.id}
              onClick={() => navigate(`/lead/${l.id}`)}
              description={
                <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                  {l.lead_no}
                  {l.company ? ` · ${l.company}` : ''}
                  {l.phone ? ` · ${l.phone}` : ''}
                </span>
              }
              extra={
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  <Tag color={STATUS_COLOR[l.status] || 'default'} fill="outline">
                    {STATUS_TEXT[l.status] || '未知'}
                  </Tag>
                  {hasPerm('crm:lead:pick') && (
                    <a
                      style={{ fontSize: 12, color: 'var(--brand)' }}
                      onClick={(e) => {
                        e.stopPropagation()
                        onPick(l)
                      }}
                    >
                      领取
                    </a>
                  )}
                </div>
              }
            >
              {l.name}
              {l.contact_name ? `（${l.contact_name}）` : ''}
            </List.Item>
          ))}
          {list.length === 0 && (
            <List.Item>
              <span style={{ color: 'var(--text-tertiary)' }}>公海暂无线索</span>
            </List.Item>
          )}
        </List>
        <InfiniteScroll loadMore={loadMore} hasMore={hasMore} />
      </PullToRefresh>
    </div>
  )
}
