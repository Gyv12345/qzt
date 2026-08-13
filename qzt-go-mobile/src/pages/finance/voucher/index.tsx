import { useCallback, useState } from 'react'
import { FloatingBubble, InfiniteScroll, List, NavBar, PullToRefresh, Tag } from 'antd-mobile'
import { AddOutline } from 'antd-mobile-icons'
import { useNavigate } from 'react-router-dom'
import { createVoucher, listAccounts, listVouchers } from '../../../services/finance'
import { BALANCE_DIR, VOUCHER_STATUS, type FinAccount, type FinVoucher } from '../../../types/finance'
import { useInfiniteList } from '../../../hooks/useInfiniteList'
import FormSheet from '../../../components/FormSheet'

export default function VoucherList() {
  const navigate = useNavigate()
  const [showNew, setShowNew] = useState(false)
  const [accounts, setAccounts] = useState<FinAccount[]>([])
  const fetcher = useCallback((params: { page: number; page_size: number }) => listVouchers(params), [])
  const { list, hasMore, loadMore, refresh } = useInfiniteList<FinVoucher>(fetcher, { page_size: 20 })

  const openNew = () => {
    listAccounts()
      .then((res) => setAccounts((res || []).filter((a) => a.is_leaf)))
      .catch(() => {})
    setShowNew(true)
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%' }}>
      <NavBar onBack={() => navigate(-1)}>凭证管理</NavBar>
      <PullToRefresh onRefresh={refresh}>
        <List>
          {list.map((v) => {
            const st = VOUCHER_STATUS[v.status]
            return (
              <List.Item
                key={v.id}
                onClick={() => navigate(`/finance/voucher/${v.id}`)}
                description={<span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{v.voucher_no} · {v.voucher_date}</span>}
                extra={<span><div style={{ textAlign: 'right' }}>¥{Number(v.amount || 0).toFixed(2)} {BALANCE_DIR[v.direction]}</div><Tag color={st?.color} fill="outline">{st?.text}</Tag></span>}
              >
                {v.description}
              </List.Item>
            )
          })}
          {list.length === 0 && <List.Item><span style={{ color: 'var(--text-tertiary)' }}>暂无凭证</span></List.Item>}
        </List>
        <InfiniteScroll loadMore={loadMore} hasMore={hasMore} />
      </PullToRefresh>

      <FloatingBubble style={{ '--size': '48px' } as any} onClick={openNew}>
        <AddOutline fontSize={24} />
      </FloatingBubble>

      <FormSheet
        visible={showNew}
        title="新建凭证"
        fields={[
          { name: 'account_id', label: '科目', type: 'select', required: true, options: accounts.map((a) => ({ label: `${a.code} ${a.name}`, value: a.id })) },
          { name: 'voucher_date', label: '日期', type: 'date', required: true, datePrecision: 'date' },
          { name: 'description', label: '摘要', type: 'text', required: true },
          { name: 'direction', label: '方向', type: 'select', required: true, options: [{ label: '借', value: 'DEBIT' }, { label: '贷', value: 'CREDIT' }] },
          { name: 'amount', label: '金额', type: 'number', required: true },
        ]}
        onClose={() => setShowNew(false)}
        onSubmit={async (v) => {
          await createVoucher({
            account_id: Number(v.account_id),
            voucher_date: v.voucher_date,
            description: v.description,
            direction: v.direction,
            amount: String(v.amount),
          })
          setShowNew(false)
          refresh()
        }}
      />
    </div>
  )
}
