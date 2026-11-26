import { useEffect, useState } from 'react'
import { ActionSheet, Button, Card, Dialog, ErrorBlock, List, NavBar, SpinLoading, Tag, Toast } from 'antd-mobile'
import { useNavigate, useParams } from 'react-router-dom'
import {
  changeOpportunityStage,
  deleteOpportunity,
  getOpportunity,
  getOpportunityStageHistory,
  getStageConfig,
} from '../../services/crm'
import { listAllDicts } from '../../services/system'
import type { CrmOpportunity, StageDef, StageRecord } from '../../types/crm'
import { useAuthStore } from '../../stores/auth'
import OpportunityFormSheet from '../../components/OpportunityFormSheet'
import FormSheet, { type FormField } from '../../components/FormSheet'

// 本地兜底阶段映射(stage-config 拉取失败时用)
const STAGE_TEXT: Record<string, string> = {
  PROSPECTING: '初步接触',
  ANALYSIS: '需求分析',
  PROPOSAL: '方案报价',
  NEGOTIATION: '谈判',
  WON: '赢单',
  LOST: '输单',
}
const STAGE_COLOR: Record<string, string> = {
  PROSPECTING: 'default',
  ANALYSIS: 'primary',
  PROPOSAL: 'primary',
  NEGOTIATION: 'warning',
  WON: 'success',
  LOST: 'danger',
}

const formatAmount = (v?: string) =>
  Number(v || '0').toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const formatTime = (value?: string | null) => (value ? value.replace('T', ' ').slice(0, 16) : '未记录')

interface DictOption {
  label: string
  value: string
}

export default function OpportunityDetail() {
  const navigate = useNavigate()
  const { id } = useParams()
  const hasPerm = useAuthStore((s) => s.hasPerm)
  const [data, setData] = useState<CrmOpportunity | null>(null)
  const [stages, setStages] = useState<StageDef[]>([])
  const [history, setHistory] = useState<StageRecord[]>([])
  const [failed, setFailed] = useState(false)
  const [acting, setActing] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [lostTarget, setLostTarget] = useState<StageDef | null>(null)
  const [lostReasonOptions, setLostReasonOptions] = useState<DictOption[]>([])

  // stage-config 构建 key->label/color 映射
  const stageMap: Record<string, { label: string; color: string }> = {}
  for (const s of stages) stageMap[s.key] = { label: s.label, color: s.color || 'primary' }
  const stageLabel = (key: string) => stageMap[key]?.label || STAGE_TEXT[key] || key
  const stageColor = (key: string) => stageMap[key]?.color || STAGE_COLOR[key] || 'default'
  const currentStage = data ? stages.find((s) => s.key === data.stage) : undefined
  const lostReasonLabel = (value: string) =>
    lostReasonOptions.find((option) => option.value === value)?.label || value

  const loadLostReasonOptions = async () => {
    const dicts = await listAllDicts()
    const options = (dicts.find((dict) => dict.code === 'OPPORTUNITY_LOST_REASON')?.items || [])
      .filter((item) => item.status === 1)
      .sort((a, b) => a.sort - b.sort)
      .map((item) => ({ label: item.label, value: item.value }))
    setLostReasonOptions(options)
    return options
  }

  const lostFields: FormField[] = [
    {
      name: 'lost_reason',
      label: '输单原因',
      type: 'select',
      required: true,
      options: lostReasonOptions,
    },
    { name: 'reason', label: '补充说明', type: 'textarea', placeholder: '选填，记录本次输单的具体情况' },
  ]

  const reload = () => {
    if (!id) return
    setData(null)
    setFailed(false)
    getOpportunity(Number(id))
      .then((d) => {
        setData(d)
        getOpportunityStageHistory(d.id)
          .then(setHistory)
          .catch(() => {})
      })
      .catch(() => setFailed(true))
  }

  useEffect(() => {
    reload()
    getStageConfig('OPPORTUNITY')
      .then((res) => {
        const arr = (res?.stages || []).slice().sort((a, b) => (a.sort || 0) - (b.sort || 0))
        setStages(arr)
      })
      .catch(() => {})
    loadLostReasonOptions().catch(() => {})
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
        <div style={{ textAlign: 'center', paddingTop: 40 }}>
          <SpinLoading />
        </div>
      </div>
    )
  }

  const openLostSheet = async (target: StageDef) => {
    setActing(true)
    try {
      const options = lostReasonOptions.length > 0 ? lostReasonOptions : await loadLostReasonOptions()
      if (options.length === 0) {
        Toast.show({ content: '暂未配置输单原因，请联系管理员' })
        return
      }
      setLostTarget(target)
    } catch {
      // 字典加载错误由 request 拦截器 Toast
    } finally {
      setActing(false)
    }
  }

  // 推进阶段:列出其他阶段供选择;输单必须先填写字典原因
  const onAdvance = () => {
    const others = stages.filter((s) => s.key !== data.stage)
    if (others.length === 0) {
      Toast.show({ content: '无更多阶段' })
      return
    }
    ActionSheet.show({
      actions: others.map((s) => ({ text: s.label, key: s.key })),
      cancelText: '取消',
      onAction: (_item, index) => {
        const target = others[index]
        if (target.key === 'LOST') {
          openLostSheet(target)
          return
        }
        setActing(true)
        changeOpportunityStage(data.id, { stage: target.key, reason: '移动端推进' })
          .then(() => {
            Toast.show({ icon: 'success', content: '阶段已更新' })
            reload()
          })
          .catch(() => {
            // 后端 SOP 校验错误由 request 拦截器 Toast
          })
          .finally(() => setActing(false))
      },
    })
  }

  const onLostSubmit = async (values: Record<string, any>) => {
    if (!lostTarget) return
    await changeOpportunityStage(data.id, {
      stage: lostTarget.key,
      lost_reason: values.lost_reason,
      reason: values.reason || undefined,
    })
    reload()
  }

  // 删除商机
  const onDelete = async () => {
    const ok = await Dialog.confirm({ content: `确定删除商机「${data?.name}」?此操作不可恢复。` })
    if (!ok) return
    setActing(true)
    try {
      await deleteOpportunity(data!.id)
      Toast.show({ icon: 'success', content: '已删除' })
      navigate(-1)
    } catch {
    } finally {
      setActing(false)
    }
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%', paddingBottom: 24 }}>
      <NavBar onBack={() => navigate(-1)}>商机详情</NavBar>

      {/* 标题区 */}
      <div style={{ padding: '16px 16px 8px', background: 'var(--bg-card)' }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>{data.name}</div>
        <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
          <Tag color={stageColor(data.stage)} fill="outline">
            {stageLabel(data.stage)}
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
        <div style={{ display: 'flex', padding: '14px 0', borderBottom: '1px solid var(--divider)' }}>
          <span style={{ width: 90, color: 'var(--text-tertiary)', fontSize: 14, flexShrink: 0 }}>商机编号</span>
          <span style={{ flex: 1, fontSize: 14 }}>{data.opportunity_no}</span>
        </div>
        <div style={{ display: 'flex', padding: '14px 0', borderBottom: '1px solid var(--divider)' }}>
          <span style={{ width: 90, color: 'var(--text-tertiary)', fontSize: 14, flexShrink: 0 }}>预计成交</span>
          <span style={{ flex: 1, fontSize: 14 }}>
            {data.expected_close_date ? data.expected_close_date.slice(0, 10) : '—'}
          </span>
        </div>
        <div style={{ display: 'flex', padding: '14px 0', borderBottom: '1px solid var(--divider)' }}>
          <span style={{ width: 90, color: 'var(--text-tertiary)', fontSize: 14, flexShrink: 0 }}>阶段</span>
          <span style={{ flex: 1, fontSize: 14 }}>{stageLabel(data.stage)}</span>
        </div>
        <div style={{ display: 'flex', padding: '14px 0', borderBottom: '1px solid var(--divider)' }}>
          <span style={{ width: 90, color: 'var(--text-tertiary)', fontSize: 14, flexShrink: 0 }}>进入阶段</span>
          <span style={{ flex: 1, fontSize: 14 }}>{formatTime(data.stage_entered_at)}</span>
        </div>
        <div style={{ display: 'flex', padding: '14px 0', borderBottom: '1px solid var(--divider)' }}>
          <span style={{ width: 90, color: 'var(--text-tertiary)', fontSize: 14, flexShrink: 0 }}>停留天数</span>
          <span style={{ flex: 1, fontSize: 14 }}>
            {data.days_in_stage != null ? `${data.days_in_stage} 天` : '未记录'}
          </span>
        </div>
        <div style={{ display: 'flex', padding: '14px 0', borderBottom: '1px solid var(--divider)', alignItems: 'center' }}>
          <span style={{ width: 90, color: 'var(--text-tertiary)', fontSize: 14, flexShrink: 0 }}>阶段状态</span>
          <Tag color={data.is_stagnant ? 'danger' : 'success'} fill="outline">
            {data.is_stagnant ? '已停滞' : '正常'}
          </Tag>
          {data.is_stagnant && currentStage?.stagnant_days != null && (
            <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--text-tertiary)' }}>
              超过 {currentStage.stagnant_days} 天未流转
            </span>
          )}
        </div>
        <div style={{ display: 'flex', padding: '14px 0', borderBottom: '1px solid var(--divider)' }}>
          <span style={{ width: 90, color: 'var(--text-tertiary)', fontSize: 14, flexShrink: 0 }}>阶段说明</span>
          <span style={{ flex: 1, fontSize: 14, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {currentStage?.guidance || '暂无阶段说明'}
          </span>
        </div>
        {data.lost_reason && (
          <div style={{ display: 'flex', padding: '14px 0', borderBottom: '1px solid var(--divider)' }}>
            <span style={{ width: 90, color: 'var(--text-tertiary)', fontSize: 14, flexShrink: 0 }}>输单原因</span>
            <span style={{ flex: 1, fontSize: 14 }}>{lostReasonLabel(data.lost_reason)}</span>
          </div>
        )}
        <div style={{ display: 'flex', padding: '14px 0', borderBottom: '1px solid var(--divider)' }}>
          <span style={{ width: 90, color: 'var(--text-tertiary)', fontSize: 14, flexShrink: 0 }}>成交概率</span>
          <span style={{ flex: 1, fontSize: 14 }}>{data.probability != null ? `${data.probability}%` : '—'}</span>
        </div>
        {data.description && (
          <div style={{ display: 'flex', padding: '14px 0' }}>
            <span style={{ width: 90, color: 'var(--text-tertiary)', fontSize: 14, flexShrink: 0 }}>描述</span>
            <span style={{ flex: 1, fontSize: 14, wordBreak: 'break-word' }}>{data.description}</span>
          </div>
        )}
      </div>

      {/* 操作 */}
      <div style={{ margin: 8, display: 'flex', gap: 8 }}>
        {hasPerm('crm:opportunity:edit') && (
          <Button block color="primary" size="large" fill="outline" onClick={onAdvance} loading={acting}>
            推进阶段
          </Button>
        )}
        <Button block color="primary" size="large" fill="outline" onClick={() => setShowEdit(true)}>
          编辑
        </Button>
        <Button block color="danger" size="large" fill="outline" onClick={onDelete} loading={acting}>
          删除
        </Button>
      </div>

      {/* 阶段历史 */}
      <Card title="阶段历史" style={{ margin: 8 }}>
        {history.length === 0 ? (
          <div style={{ color: 'var(--text-tertiary)', fontSize: 13, padding: '8px 0' }}>暂无阶段变更记录</div>
        ) : (
          <List>
            {history.map((h) => (
              <List.Item
                key={h.id}
                description={
                  <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{formatTime(h.created_at)}</span>
                }
              >
                <span style={{ fontSize: 13 }}>
                  {h.from_stage ? stageLabel(h.from_stage) : '新建'} → <strong>{stageLabel(h.to_stage)}</strong>
                </span>
                {h.lost_reason && (
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    输单原因：{lostReasonLabel(h.lost_reason)}
                  </div>
                )}
                {h.reason && <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{h.reason}</div>}
              </List.Item>
            ))}
          </List>
        )}
      </Card>

      <OpportunityFormSheet
        visible={showEdit}
        onClose={() => setShowEdit(false)}
        opportunity={data}
        onSubmitted={reload}
      />

      <FormSheet
        visible={lostTarget != null}
        title="确认输单"
        fields={lostFields}
        onClose={() => setLostTarget(null)}
        onSubmit={onLostSubmit}
      />
    </div>
  )
}
