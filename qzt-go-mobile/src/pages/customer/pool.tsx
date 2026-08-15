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
import { listCustomers, listCustomerPools, pickCustomer, type CrmPool } from '../../services/crm'
import type { CrmCustomer } from '../../types/crm'
import { useInfiniteList } from '../../hooks/useInfiniteList'
import { useAuthStore } from '../../stores/auth'

const LEVEL_TEXT: Record<string, string> = { A: 'A级', B: 'B级', C: 'C级' }

/** 客户公海:浏览各公海池 + 领取 */
export default function CustomerPool() {
  const navigate = useNavigate()
  const hasPerm = useAuthStore((s) => s.hasPerm)
  const [keyword, setKeyword] = useState('')
  const [poolKey, setPoolKey] = useState('') // ''=全部公海 / poolId
  const [pools, setPools] = useState<CrmPool[]>([])

  useEffect(() => {
    listCustomerPools()
      .then(setPools)
      .catch(() => {})
  }, [])

  const fetcher = useCallback(
    (params: { page: number; page_size: number }) =>
      listCustomers({
        ...params,
        keyword: keyword || undefined,
        pool_filter: 'PUBLIC',
        pool_id: poolKey ? Number(poolKey) : undefined,
      }),
    [keyword, poolKey],
  )

  const { list, hasMore, loadMore, refresh } = useInfiniteList<CrmCustomer>(fetcher, {
    page_size: 20,
  }, [keyword, poolKey])

  // 领取客户
  const onPick = async (c: CrmCustomer) => {
    try {
      await pickCustomer(c.id)
      Toast.show({ icon: 'success', content: '领取成功' })
      refresh()
    } catch {
      // 拦截器已 toast
    }
  }

  const tabs = [{ key: '', label: '全部公海' }, ...pools.map((p) => ({ key: String(p.id), label: p.name }))]

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%' }}>
      <NavBar onBack={() => navigate(-1)}>客户公海</NavBar>
      <div style={{ padding: 8, background: 'var(--bg-card)' }}>
        <SearchBar placeholder="搜索客户名称" onSearch={setKeyword} onClear={() => setKeyword('')} />
      </div>
      <Tabs activeKey={poolKey} onChange={setPoolKey}>
        {tabs.map((t) => (
          <Tabs.Tab key={t.key} title={t.label} />
        ))}
      </Tabs>

      <PullToRefresh onRefresh={refresh}>
        <List>
          {list.map((c) => (
            <List.Item
              key={c.id}
              onClick={() => navigate(`/customer/${c.id}`)}
              description={
                <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                  {c.customer_no}
                  {c.industry ? ` · ${c.industry}` : ''}
                </span>
              }
              extra={
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  {c.level && (
                    <Tag color="primary" fill="outline">
                      {LEVEL_TEXT[c.level] || c.level}
                    </Tag>
                  )}
                  {hasPerm('crm:customer:pick') && (
                    <a
                      style={{ fontSize: 12, color: 'var(--brand)' }}
                      onClick={(e) => {
                        e.stopPropagation()
                        onPick(c)
                      }}
                    >
                      领取
                    </a>
                  )}
                </div>
              }
            >
              {c.name}
            </List.Item>
          ))}
          {list.length === 0 && (
            <List.Item>
              <span style={{ color: 'var(--text-tertiary)' }}>公海暂无客户</span>
            </List.Item>
          )}
        </List>
        <InfiniteScroll loadMore={loadMore} hasMore={hasMore} />
      </PullToRefresh>
    </div>
  )
}
