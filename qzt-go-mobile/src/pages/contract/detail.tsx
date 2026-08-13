import { useEffect, useState } from 'react'
import { Button, Dialog, ErrorBlock, NavBar, Tag, Toast } from 'antd-mobile'
import { useNavigate, useParams } from 'react-router-dom'
import { deleteContract, getContract } from '../../services/crm'
import {
  createPaymentPlan,
  createPaymentRecord,
  deletePaymentPlan,
  deletePaymentRecord,
  getPaymentSummary,
  listPaymentRecords,
  updatePaymentPlan,
} from '../../services/payment'
import { pushApproval } from '../../services/approval'
import FormSheet from '../../components/FormSheet'
import ContractFormSheet from '../../components/ContractFormSheet'
import { PAYMENT_METHODS, PAYMENT_PLAN_STATUS, type CrmContract, type PaymentPlan, type PaymentRecord, type PaymentSummary } from '../../types/crm'

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
  const [summary, setSummary] = useState<PaymentSummary | null>(null)
  const [records, setRecords] = useState<PaymentRecord[]>([])
  const [planSheetOpen, setPlanSheetOpen] = useState(false)
  const [recordSheetOpen, setRecordSheetOpen] = useState(false)
  const [acting, setActing] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [editingPlan, setEditingPlan] = useState<PaymentPlan | null>(null)

  const reload = () => {
    if (!id) return
    getContract(Number(id))
      .then((d) => {
        setData(d)
        loadPayment(d.id)
      })
      .catch(() => setFailed(true))
  }

  const loadPayment = (cid: number) => {
    getPaymentSummary(cid).then(setSummary).catch(() => {})
    listPaymentRecords(cid).then(setRecords).catch(() => {})
  }

  const onPushApproval = async () => {
    if (!data) return
    const ok = await Dialog.confirm({ content: '确定提交该合同审批?' })
    if (!ok) return
    setActing(true)
    try {
      await pushApproval('CONTRACT', data.id)
      Toast.show({ icon: 'success', content: '已提交审批' })
      getContract(data.id).then(setData).catch(() => {})
    } catch {
      // 拦截器已 toast
    } finally {
      setActing(false)
    }
  }

  // 删除合同
  const onDelete = async () => {
    if (!data) return
    const ok = await Dialog.confirm({ content: `确定删除合同「${data.name}」?此操作不可恢复。` })
    if (!ok) return
    setActing(true)
    try {
      await deleteContract(data.id)
      Toast.show({ icon: 'success', content: '已删除' })
      navigate(-1)
    } catch {
    } finally {
      setActing(false)
    }
  }

  // 删除回款计划
  const onDeletePlan = async (p: PaymentPlan) => {
    const ok = await Dialog.confirm({ content: '确定删除该回款计划?' })
    if (!ok) return
    try {
      await deletePaymentPlan(p.id)
      Toast.show({ icon: 'success', content: '已删除' })
      if (data) loadPayment(data.id)
    } catch {
    }
  }

  // 删除回款记录
  const onDeleteRecord = async (r: PaymentRecord) => {
    const ok = await Dialog.confirm({ content: '确定删除该回款记录?' })
    if (!ok) return
    try {
      await deletePaymentRecord(r.id)
      Toast.show({ icon: 'success', content: '已删除' })
      if (data) loadPayment(data.id)
    } catch {
    }
  }

  useEffect(reload, [id])

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

      {/* 回款计划 */}
      <div style={{ margin: '8px 12px', padding: '0 16px', background: 'var(--bg-card)', borderRadius: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0' }}>
          <span style={{ fontWeight: 600 }}>回款计划</span>
          <Button size="small" color="primary" onClick={() => setPlanSheetOpen(true)}>
            新建计划
          </Button>
        </div>
        {summary && summary.plans && summary.plans.length > 0 ? (
          summary.plans.map((p: PaymentPlan) => (
            <div
              key={p.id}
              style={{ display: 'flex', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--divider)', fontSize: 14 }}
            >
              <span style={{ flex: 1 }}>{p.plan_date?.slice(0, 10)}</span>
              <span style={{ flex: 1, textAlign: 'right' }}>¥{Number(p.plan_amount).toLocaleString()}</span>
              <span style={{ width: 56, textAlign: 'right' }}>
                <Tag color={PAYMENT_PLAN_STATUS[p.status]?.color || 'default'} fill="outline">
                  {PAYMENT_PLAN_STATUS[p.status]?.text || '-'}
                </Tag>
              </span>
              <span style={{ width: 76, textAlign: 'right', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <a style={{ color: 'var(--brand)', fontSize: 12 }} onClick={() => setEditingPlan(p)}>编辑</a>
                <a style={{ color: '#ff4d4f', fontSize: 12 }} onClick={() => onDeletePlan(p)}>删除</a>
              </span>
            </div>
          ))
        ) : (
          <div style={{ color: 'var(--text-tertiary)', fontSize: 13, padding: '8px 0 16px' }}>暂无计划</div>
        )}
      </div>

      {/* 回款记录 */}
      <div style={{ margin: '8px 12px', padding: '0 16px', background: 'var(--bg-card)', borderRadius: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0' }}>
          <span style={{ fontWeight: 600 }}>回款记录</span>
          <Button size="small" color="success" onClick={() => setRecordSheetOpen(true)}>
            登记回款
          </Button>
        </div>
        {records.length > 0 ? (
          records.map((r) => (
            <div
              key={r.id}
              style={{ display: 'flex', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--divider)', fontSize: 14 }}
            >
              <span style={{ flex: 1 }}>{r.received_date?.slice(0, 10)}</span>
              <span style={{ flex: 1, textAlign: 'right', color: 'var(--success)' }}>
                ¥{Number(r.amount).toLocaleString()}
              </span>
              <span style={{ width: 110, textAlign: 'right', color: 'var(--text-tertiary)', fontSize: 12 }}>
                {r.method || '-'}
                <a style={{ color: '#ff4d4f', fontSize: 12, marginLeft: 8 }} onClick={() => onDeleteRecord(r)}>删除</a>
              </span>
            </div>
          ))
        ) : (
          <div style={{ color: 'var(--text-tertiary)', fontSize: 13, padding: '8px 0 16px' }}>暂无回款</div>
        )}
      </div>

      {/* 操作 */}
      <div style={{ margin: '8px 12px', display: 'flex', gap: 8 }}>
        <Button block color="primary" fill="outline" onClick={() => setShowEdit(true)}>
          编辑
        </Button>
        <Button block color="danger" fill="outline" onClick={onDelete} loading={acting}>
          删除
        </Button>
      </div>
      {(!data.approval_status || data.approval_status === 'NONE' || data.approval_status === 'REVOKED') && (
        <div style={{ margin: '0 12px 24px' }}>
          <Button block color="primary" fill="outline" loading={acting} onClick={onPushApproval}>
            提交审批
          </Button>
        </div>
      )}

      <FormSheet
        visible={planSheetOpen || !!editingPlan}
        title={editingPlan ? '编辑回款计划' : '新建回款计划'}
        fields={[
          { name: 'plan_date', label: '计划日期', type: 'date', datePrecision: 'date', required: true },
          { name: 'plan_amount', label: '计划金额', type: 'number', required: true, placeholder: '0.00' },
          { name: 'remark', label: '备注', type: 'text' },
        ]}
        initialValues={
          editingPlan
            ? { plan_date: editingPlan.plan_date?.slice(0, 10), plan_amount: editingPlan.plan_amount, remark: editingPlan.remark }
            : undefined
        }
        onClose={() => {
          setPlanSheetOpen(false)
          setEditingPlan(null)
        }}
        onSubmit={async (v) => {
          if (editingPlan) {
            await updatePaymentPlan(editingPlan.id, {
              plan_date: v.plan_date,
              plan_amount: Number(v.plan_amount),
              remark: v.remark,
            })
          } else {
            await createPaymentPlan(data.id, {
              plan_date: v.plan_date,
              plan_amount: Number(v.plan_amount),
              remark: v.remark,
            })
          }
          setEditingPlan(null)
          loadPayment(data.id)
        }}
      />
      <FormSheet
        visible={recordSheetOpen}
        title="登记回款"
        fields={[
          { name: 'received_date', label: '回款日期', type: 'date', datePrecision: 'date', required: true },
          { name: 'amount', label: '回款金额', type: 'number', required: true, placeholder: '0.00' },
          {
            name: 'method',
            label: '回款方式',
            type: 'select',
            options: PAYMENT_METHODS.map((m) => ({ label: m.label, value: m.value })),
          },
          { name: 'remark', label: '备注', type: 'text' },
        ]}
        onClose={() => setRecordSheetOpen(false)}
        onSubmit={async (v) => {
          await createPaymentRecord(data.id, {
            received_date: v.received_date,
            amount: Number(v.amount),
            method: v.method,
            remark: v.remark,
          })
          loadPayment(data.id)
        }}
      />

      <ContractFormSheet
        visible={showEdit}
        onClose={() => setShowEdit(false)}
        contract={data}
        onSubmitted={reload}
      />
    </div>
  )
}
