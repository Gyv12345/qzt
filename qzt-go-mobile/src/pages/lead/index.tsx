import { useCallback, useState } from 'react'
import { InfiniteScroll, List, NavBar, PullToRefresh, SearchBar, Tabs, Tag, FloatingBubble } from 'antd-mobile'
import { AddOutline } from 'antd-mobile-icons'
import { useNavigate } from 'react-router-dom'
import { listLeads, createLead } from '../../services/crm'
import type { CrmLead } from '../../types/crm'
import { useInfiniteList } from '../../hooks/useInfiniteList'
import FormSheet from '../../components/FormSheet'

// 线索状态: 1新建 2跟进中 3已转化 4无效
const STATUS_TEXT: Record<number, string> = { 1: '新建', 2: '跟进中', 3: '已转化', 4: '无效' }
const STATUS_COLOR: Record<number, string> = {
  1: 'primary',
  2: 'warning',
  3: 'success',
  4: 'default',
}

// Tab 选项: ''=全部 / '1'..'4'
const STATUS_TABS = [
  { key: '', label: '全部' },
  { key: '1', label: '新建' },
  { key: '2', label: '跟进中' },
  { key: '3', label: '已转化' },
  { key: '4', label: '无效' },
]

export default function LeadList() {
  const navigate = useNavigate()
  const [keyword, setKeyword] = useState('')
  const [statusKey, setStatusKey] = useState('')
  const [showNew, setShowNew] = useState(false)

  const fetcher = useCallback(
    (params: { page: number; page_size: number }) =>
      listLeads({
        ...params,
        keyword: keyword || undefined,
        status: statusKey ? Number(statusKey) : undefined,
      }),
    [keyword, statusKey],
  )

  const { list, hasMore, loadMore, refresh } = useInfiniteList<CrmLead>(fetcher, {
    page_size: 20,
  })

  const onSearch = (val: string) => {
    setKeyword(val)
    refresh()
  }

  const onTabChange = (key: string) => {
    setStatusKey(key)
    refresh()
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%' }}>
      <NavBar onBack={() => navigate(-1)}>线索</NavBar>
      <div style={{ padding: 8, background: 'var(--bg-card)' }}>
        <SearchBar placeholder="搜索线索名称" onSearch={onSearch} onClear={() => onSearch('')} />
      </div>
      <Tabs activeKey={statusKey} onChange={onTabChange}>
        {STATUS_TABS.map((t) => (
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
                <Tag color={STATUS_COLOR[l.status] || 'default'} fill="outline">
                  {STATUS_TEXT[l.status] || '未知'}
                </Tag>
              }
            >
              {l.name}
              {l.contact_name ? `（${l.contact_name}）` : ''}
            </List.Item>
          ))}
          {list.length === 0 && (
            <List.Item>
              <span style={{ color: 'var(--text-tertiary)' }}>暂无线索</span>
            </List.Item>
          )}
        </List>
        <InfiniteScroll loadMore={loadMore} hasMore={hasMore} />
      </PullToRefresh>

      <FloatingBubble style={{ '--size': '48px' } as any} onClick={() => setShowNew(true)}>
        <AddOutline fontSize={24} />
      </FloatingBubble>

      <FormSheet
        visible={showNew}
        title="新建线索"
        onClose={() => setShowNew(false)}
        fields={[
          { name: 'name', label: '线索名称', type: 'text', required: true },
          { name: 'contact_name', label: '联系人', type: 'text' },
          { name: 'phone', label: '电话', type: 'text' },
          { name: 'company', label: '公司', type: 'text' },
          { name: 'source', label: '来源', type: 'text' },
        ]}
        onSubmit={async (vals) => {
          await createLead(vals as { name: string; contact_name?: string; phone?: string; company?: string; source?: string })
          refresh()
        }}
      />
    </div>
  )
}
