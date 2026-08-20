import { useCallback, useState } from 'react'
import { FloatingBubble, InfiniteScroll, List, NavBar, PullToRefresh, Tag } from 'antd-mobile'
import { AddOutline } from 'antd-mobile-icons'
import { useNavigate } from 'react-router-dom'
import { createLoan, listLoans } from '../../services/oa'
import type { OaLoan } from '../../types/oa'
import { useInfiniteList } from '../../hooks/useInfiniteList'
import { APPROVAL_STATUS } from '../../types/oa'
import FormSheet from '../../components/FormSheet'

const REPAY_TEXT: Record<number, string> = { 0: '未还', 1: '部分', 2: '已还清' }
const REPAY_COLOR: Record<number, string> = { 0: 'default', 1: 'warning', 2: 'success' }
const LOAN_TYPE_OPTIONS = [
  { label: '备用金', value: '备用金' },
  { label: '个人借款', value: '个人借款' },
  { label: '差旅借款', value: '差旅借款' },
  { label: '其他', value: '其他' },
]

export default function LoanList() {
  const navigate = useNavigate()
  const [showNew, setShowNew] = useState(false)
  const fetcher = useCallback((params: { page: number; page_size: number }) => listLoans(params), [])
  const { list, hasMore, loadMore, refresh } = useInfiniteList<OaLoan>(fetcher, { page_size: 20 })

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%' }}>
      <NavBar onBack={() => navigate(-1)}>借款管理</NavBar>
      <PullToRefresh onRefresh={refresh}>
        <List>
          {list.map((l) => {
            const s = APPROVAL_STATUS[l.approval_status] || APPROVAL_STATUS.NONE
            return (
              <List.Item
                key={l.id}
                onClick={() => navigate(`/loan/${l.id}`)}
                description={<span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{l.loan_no} · {l.loan_type}</span>}
                extra={
                  <span>
                    <div style={{ textAlign: 'right', fontWeight: 600 }}>¥{Number(l.amount).toFixed(2)}</div>
                    <Tag color={s.color} fill="outline" style={{ marginTop: 2 }}>{s.text}</Tag>
                    {l.approval_status === 'APPROVED' && <Tag color={REPAY_COLOR[l.repaid_status]} fill="outline" style={{ marginLeft: 4 }}>{REPAY_TEXT[l.repaid_status]}</Tag>}
                  </span>
                }
              >
                {l.title}
              </List.Item>
            )
          })}
          {list.length === 0 && <List.Item><span style={{ color: 'var(--text-tertiary)' }}>暂无借款</span></List.Item>}
        </List>
        <InfiniteScroll loadMore={loadMore} hasMore={hasMore} />
      </PullToRefresh>

      <FloatingBubble style={{ '--size': '48px' } as any} onClick={() => setShowNew(true)}>
        <AddOutline fontSize={24} />
      </FloatingBubble>

      <FormSheet
        visible={showNew}
        title="新建借款"
        fields={[
          { name: 'title', label: '借款标题', type: 'text', required: true },
          { name: 'loan_type', label: '借款类型', type: 'select', required: true, options: LOAN_TYPE_OPTIONS },
          { name: 'amount', label: '借款金额', type: 'number', required: true },
          { name: 'expected_date', label: '预计还款日期', type: 'date', datePrecision: 'date' },
          { name: 'reason', label: '借款事由', type: 'textarea' },
        ]}
        onClose={() => setShowNew(false)}
        onSubmit={async (v) => {
          await createLoan({
            title: v.title,
            loan_type: v.loan_type,
            amount: v.amount ? String(v.amount) : '0',
            expected_date: v.expected_date || undefined,
            reason: v.reason || undefined,
          })
          refresh()
        }}
      />
    </div>
  )
}
