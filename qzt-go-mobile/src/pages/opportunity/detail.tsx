import { useEffect, useState } from 'react'
import { ErrorBlock, NavBar, Tag } from 'antd-mobile'
import { useNavigate, useParams } from 'react-router-dom'
import { getOpportunity } from '../../services/crm'
import type { CrmOpportunity } from '../../types/crm'

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
  toAmount(v).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', padding: '14px 0', borderBottom: '1px solid var(--divider)' }}>
      <span style={{ width: 90, color: 'var(--text-tertiary)', fontSize: 14, flexShrink: 0 }}>{label}</span>
      <span style={{ flex: 1, color: 'var(--text)', fontSize: 14, wordBreak: 'break-word' }}>{value || '—'}</span>
    </div>
  )
}

export default function OpportunityDetail() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [data, setData] = useState<CrmOpportunity | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!id) return
    getOpportunity(Number(id))
      .then(setData)
      .catch(() => setFailed(true))
  }, [id])

  if (failed) {
    return (
      <div style={{ background: 'var(--bg)', minHeight: '100%' }}>
        <NavBar onBack={() => navigate(-1)}>商机详情</NavBar>
        <div style={{ paddingTop: 80 }}>
          <ErrorBlock status="empty" description="加载失败" />
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div style={{ background: 'var(--bg)', minHeight: '100%' }}>
        <NavBar onBack={() => navigate(-1)}>商机详情</NavBar>
      </div>
    )
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%', paddingBottom: 24 }}>
      <NavBar onBack={() => navigate(-1)}>商机详情</NavBar>

      {/* 标题区 */}
      <div style={{ padding: '16px 16px 8px', background: 'var(--bg-card)' }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>{data.name}</div>
        <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
          <Tag color={STAGE_COLOR[data.stage] || 'default'} fill="outline">
            {STAGE_TEXT[data.stage] || data.stage}
          </Tag>
          <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>{data.opportunity_no}</span>
        </div>
      </div>

      {/* 金额突出展示 */}
      <div
        style={{
          margin: '8px 12px',
          padding: '20px',
          background: 'var(--brand-gradient)',
          borderRadius: 14,
          color: '#fff',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 13, opacity: 0.85 }}>预计金额</div>
        <div style={{ fontSize: 30, fontWeight: 700, marginTop: 4 }}>¥{formatAmount(data.expected_amount)}</div>
        {data.probability != null && (
          <div style={{ fontSize: 12, opacity: 0.85, marginTop: 6 }}>成交概率 {data.probability}%</div>
        )}
      </div>

      {/* 详情 */}
      <div style={{ margin: '0 12px', padding: '0 16px', background: 'var(--bg-card)', borderRadius: 14 }}>
        <Row label="商机编号" value={data.opportunity_no} />
        <Row
          label="预计成交"
          value={data.expected_close_date ? data.expected_close_date.slice(0, 10) : '—'}
        />
        <Row label="阶段" value={STAGE_TEXT[data.stage] || data.stage} />
        <Row label="成交概率" value={data.probability != null ? `${data.probability}%` : '—'} />
        {data.description && <Row label="描述" value={data.description} />}
      </div>
    </div>
  )
}
