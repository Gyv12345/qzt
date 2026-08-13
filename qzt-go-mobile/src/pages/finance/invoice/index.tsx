import { useCallback, useEffect, useRef, useState } from 'react'
import { FloatingBubble, InfiniteScroll, List, NavBar, PullToRefresh, Tabs, Tag } from 'antd-mobile'
import { AddOutline } from 'antd-mobile-icons'
import { useNavigate } from 'react-router-dom'
import { createInvoice, listInvoices } from '../../../services/finance'
import { INVOICE_DIRECTION, INVOICE_TYPE, type FinInvoice } from '../../../types/finance'
import { useInfiniteList } from '../../../hooks/useInfiniteList'
import FormSheet from '../../../components/FormSheet'

const TABS = [
  { key: '', label: '全部' },
  ...Object.entries(INVOICE_DIRECTION).map(([k, v]) => ({ key: k, label: v.text })),
]

export default function InvoiceList() {
  const navigate = useNavigate()
  const [direction, setDirection] = useState('')
  const [showNew, setShowNew] = useState(false)
  const fetcher = useCallback(
    (params: { page: number; page_size: number }) => listInvoices({ ...params, direction: direction || undefined }),
    [direction],
  )
  const { list, hasMore, loadMore, refresh } = useInfiniteList<FinInvoice>(fetcher, { page_size: 20 })

  const firstRef = useRef(true)
  useEffect(() => {
    if (firstRef.current) {
      firstRef.current = false
      return
    }
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [direction])

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%' }}>
      <NavBar onBack={() => navigate(-1)}>发票管理</NavBar>
      <Tabs activeKey={direction} onChange={setDirection}>
        {TABS.map((t) => (
          <Tabs.Tab key={t.key} title={t.label} />
        ))}
      </Tabs>
      <PullToRefresh onRefresh={refresh}>
        <List>
          {list.map((inv) => {
            const d = INVOICE_DIRECTION[inv.direction]
            return (
              <List.Item
                key={inv.id}
                onClick={() => navigate(`/finance/invoice/${inv.id}`)}
                description={<span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{inv.invoice_no} · {inv.invoice_date} · {inv.party_name || '-'}</span>}
                extra={<span><div style={{ textAlign: 'right' }}>¥{Number(inv.total_amount || 0).toFixed(2)}</div><Tag color={d?.color} fill="outline">{d?.text}</Tag></span>}
              >
                {INVOICE_TYPE[inv.invoice_type] || inv.invoice_type}
              </List.Item>
            )
          })}
          {list.length === 0 && <List.Item><span style={{ color: 'var(--text-tertiary)' }}>暂无发票</span></List.Item>}
        </List>
        <InfiniteScroll loadMore={loadMore} hasMore={hasMore} />
      </PullToRefresh>

      <FloatingBubble style={{ '--size': '48px' } as any} onClick={() => setShowNew(true)}>
        <AddOutline fontSize={24} />
      </FloatingBubble>

      <FormSheet
        visible={showNew}
        title="新建发票"
        fields={[
          { name: 'invoice_no', label: '发票号', type: 'text', required: true },
          { name: 'invoice_type', label: '类型', type: 'select', required: true, options: Object.entries(INVOICE_TYPE).map(([k, v]) => ({ label: v, value: k })) },
          { name: 'direction', label: '方向', type: 'select', required: true, options: [{ label: '收票', value: 'RECEIVED' }, { label: '开票', value: 'ISSUED' }] },
          { name: 'invoice_date', label: '日期', type: 'date', required: true, datePrecision: 'date' },
          { name: 'amount', label: '不含税金额', type: 'number', required: true },
          { name: 'tax_rate', label: '税率(如0.13)', type: 'number' },
          { name: 'party_name', label: '对方名称', type: 'text' },
        ]}
        onClose={() => setShowNew(false)}
        onSubmit={async (v) => {
          await createInvoice({
            invoice_no: v.invoice_no,
            invoice_type: v.invoice_type,
            direction: v.direction,
            invoice_date: v.invoice_date,
            amount: String(v.amount),
            tax_rate: v.tax_rate ? String(v.tax_rate) : undefined,
            party_name: v.party_name || undefined,
          })
          setShowNew(false)
          refresh()
        }}
      />
    </div>
  )
}
