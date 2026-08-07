import { useCallback } from 'react'
import { InfiniteScroll, List, NavBar, PullToRefresh, Tag } from 'antd-mobile'
import { useNavigate } from 'react-router-dom'
import { listLoans } from '../../services/oa'
import type { OaLoan } from '../../types/oa'
import { useInfiniteList } from '../../hooks/useInfiniteList'
import { APPROVAL_STATUS } from '../../types/oa'

const REPAY_TEXT: Record<number, string> = { 0: '未还', 1: '部分', 2: '已还清' }
const REPAY_COLOR: Record<number, string> = { 0: 'default', 1: 'warning', 2: 'success' }

export default function LoanList() {
  const navigate = useNavigate()
  const fetcher = useCallback(
    (params: { page: number; page_size: number }) => listLoans(params),
    [],
  )
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
                description={
                  <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                    {l.loan_no} · {l.loan_type}
                  </span>
                }
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
    </div>
  )
}
