import { useEffect, useState } from 'react'
import { ErrorBlock, NavBar, Tag } from 'antd-mobile'
import { useNavigate, useParams } from 'react-router-dom'
import { getContract } from '../../services/crm'
import type { CrmContract } from '../../types/crm'

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
const APPROVAL_TEXT: Record<string, string> = {
  NONE: '未审批',
  PROCESSING: '审批中',
  APPROVED: '已通过',
  REJECTED: '已拒绝',
  REVOKED: '已撤回',
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

export default function ContractDetail() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [data, setData] = useState<CrmContract | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!id) return
    getContract(Number(id))
      .then(setData)
      .catch(() => setFailed(true))
  }, [id])

  if (failed) {
    return (
      <div style={{ background: 'var(--bg)', minHeight: '100%' }}>
        <NavBar onBack={() => navigate(-1)}>合同详情</NavBar>
        <div style={{ paddingTop: 80 }}>
          <ErrorBlock status="empty" description="加载失败" />
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div style={{ background: 'var(--bg)', minHeight: '100%' }}>
        <NavBar onBack={() => navigate(-1)}>合同详情</NavBar>
      </div>
    )
  }

  const total = toAmount(data.total_amount)
  const received = toAmount(data.received_amount)
  const progress = total > 0 ? Math.round((received / total) * 100) : 0

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%', paddingBottom: 24 }}>
      <NavBar onBack={() => navigate(-1)}>合同详情</NavBar>

      {/* 标题区 */}
      <div style={{ padding: '16px 16px 8px', background: 'var(--bg-card)' }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>{data.name}</div>
        <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <Tag color={STAGE_COLOR[data.stage] || 'default'} fill="outline">
            {STAGE_TEXT[data.stage] || data.stage}
          </Tag>
          {data.approval_status && data.approval_status !== 'NONE' && (
            <Tag color="primary" fill="outline">
              {APPROVAL_TEXT[data.approval_status] || data.approval_status}
            </Tag>
          )}
          <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>{data.contract_no}</span>
        </div>
      </div>

      {/* 金额 + 回款进度 */}
      <div style={{ margin: '8px 12px', padding: 20, background: 'var(--bg-card)', borderRadius: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>合同总额</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--text)', marginTop: 2 }}>
              ¥{formatAmount(data.total_amount)}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>已回款</div>
            <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--success)', marginTop: 2 }}>
              ¥{formatAmount(data.received_amount)}
            </div>
          </div>
        </div>
        {/* 进度条 */}
        <div style={{ marginTop: 16, height: 8, background: 'var(--divider)', borderRadius: 4, overflow: 'hidden' }}>
          <div
            style={{
              width: `${Math.min(progress, 100)}%`,
              height: '100%',
              background: 'linear-gradient(to right, #52c41a, #389e0d)',
              borderRadius: 4,
              transition: 'width 0.3s',
            }}
          />
        </div>
        <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-tertiary)', marginTop: 8 }}>
          回款进度 {progress}%
        </div>
      </div>

      {/* 详情 */}
      <div style={{ margin: '0 12px', padding: '0 16px', background: 'var(--bg-card)', borderRadius: 14 }}>
        <Row label="合同编号" value={data.contract_no} />
        <Row label="合同阶段" value={STAGE_TEXT[data.stage] || data.stage} />
        <Row label="审批状态" value={APPROVAL_TEXT[data.approval_status] || data.approval_status} />
        <Row label="签订日期" value={data.signed_date ? data.signed_date.slice(0, 10) : '—'} />
        <Row label="开始日期" value={data.start_date ? data.start_date.slice(0, 10) : '—'} />
        <Row label="结束日期" value={data.end_date ? data.end_date.slice(0, 10) : '—'} />
        {data.content && <Row label="备注" value={data.content} />}
      </div>
    </div>
  )
}
