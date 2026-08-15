import { useCallback, useState } from 'react'
import { InfiniteScroll, List, NavBar, PullToRefresh, SearchBar, Tag, FloatingBubble } from 'antd-mobile'
import { AddOutline } from 'antd-mobile-icons'
import { useNavigate } from 'react-router-dom'
import { listExpenses, createExpense } from '../../services/oa'
import type { OaExpense } from '../../types/oa'
import { useInfiniteList } from '../../hooks/useInfiniteList'
import { APPROVAL_STATUS, EXPENSE_TYPE } from '../../types/oa'
import FormSheet from '../../components/FormSheet'

export default function ExpenseList() {
  const navigate = useNavigate()
  const [keyword, setKeyword] = useState('')
  const [showNew, setShowNew] = useState(false)

  const fetcher = useCallback(
    (params: { page: number; page_size: number }) =>
      listExpenses({ ...params, approval_status: keyword || undefined }),
    [keyword],
  )

  const { list, hasMore, loadMore, refresh } = useInfiniteList<OaExpense>(fetcher, { page_size: 20 }, [keyword])

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%' }}>
      <NavBar onBack={() => navigate(-1)}>报销管理</NavBar>
      <div style={{ padding: 8, background: 'var(--bg-card)' }}>
        <SearchBar placeholder="搜索审批状态" onSearch={setKeyword} onClear={() => setKeyword('')} />
      </div>

      <PullToRefresh onRefresh={refresh}>
        <List>
          {list.map((e) => {
            const s = APPROVAL_STATUS[e.approval_status] || APPROVAL_STATUS.NONE
            return (
              <List.Item
                key={e.id}
                onClick={() => navigate(`/expense/${e.id}`)}
                description={
                  <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                    {e.expense_no} · {EXPENSE_TYPE[e.expense_type] || e.expense_type}
                  </span>
                }
                extra={
                  <span>
                    <div style={{ textAlign: 'right', fontWeight: 600, color: 'var(--brand)' }}>¥{Number(e.amount).toFixed(2)}</div>
                    <Tag color={s.color} fill="outline" style={{ marginTop: 4 }}>{s.text}</Tag>
                  </span>
                }
              >
                {e.title}
              </List.Item>
            )
          })}
          {list.length === 0 && <List.Item><span style={{ color: 'var(--text-tertiary)' }}>暂无报销</span></List.Item>}
        </List>
        <InfiniteScroll loadMore={loadMore} hasMore={hasMore} />
      </PullToRefresh>

      <FloatingBubble style={{ '--size': '48px' } as any} onClick={() => setShowNew(true)}>
        <AddOutline fontSize={24} />
      </FloatingBubble>

      <FormSheet
        visible={showNew}
        title="新建报销"
        onClose={() => setShowNew(false)}
        fields={[
          { name: 'title', label: '报销标题', type: 'text', required: true },
          { name: 'expense_type', label: '费用类型', type: 'select', required: true, options: [
            { label: '差旅', value: 'TRAVEL' }, { label: '办公', value: 'OFFICE' },
            { label: '招待', value: 'HOSPITALITY' }, { label: '交通', value: 'TRANSPORT' },
            { label: '通讯', value: 'COMMUNICATION' }, { label: '其他', value: 'OTHER' },
          ] },
          { name: 'amount', label: '金额', type: 'number', required: true },
          { name: 'description', label: '说明', type: 'textarea' },
        ]}
        onSubmit={async (vals) => {
          await createExpense({
            title: vals.title,
            expense_type: vals.expense_type,
            amount: String(vals.amount),
            description: vals.description,
          })
          refresh()
        }}
      />
    </div>
  )
}
