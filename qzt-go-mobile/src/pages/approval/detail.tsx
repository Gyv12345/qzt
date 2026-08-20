import { useEffect, useState } from 'react'
import { Button, Card, Dialog, ErrorBlock, List, NavBar, Popup, Space, SpinLoading, Steps, TextArea, Toast } from 'antd-mobile'
import { useParams, useNavigate } from 'react-router-dom'
import { approve, getInstance, reject, revoke } from '../../services/approval'
import type { ApprovalInstanceDetail } from '../../types/approval'
import { useAuthStore } from '../../stores/auth'

const STATUS_TEXT: Record<string, string> = {
  PENDING: '待处理',
  APPROVING: '审批中',
  APPROVED: '已通过',
  REJECTED: '已驳回',
  REVOKED: '已撤回',
  UNAPPROVED: '未通过',
}

/** 审批记录 result → 文案 */
const RESULT_TEXT: Record<string, string> = {
  APPROVE: '通过',
  REJECT: '驳回',
  AUTO_PASS: '自动通过',
  REVOKE: '撤回',
}

export default function ApprovalDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [detail, setDetail] = useState<ApprovalInstanceDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [acting, setActing] = useState(false)
  const [showReject, setShowReject] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const myId = useAuthStore((s) => s.profile?.id)

  const load = () => {
    if (!id) return
    setLoading(true)
    getInstance(Number(id))
      .then(setDetail)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }

  useEffect(load, [id])

  if (loading) {
    return (
      <div style={{ paddingTop: '40vh', textAlign: 'center' }}>
        <SpinLoading style={{ '--size': '40px' }} />
      </div>
    )
  }
  if (error || !detail) {
    return <ErrorBlock status="default" title="加载失败" description="审批详情获取失败" />
  }

  // 找到当前用户的待审任务(可操作的任务状态为 APPROVING,且审批人是本人)
  const myTask = detail.tasks.find((t) => t.status === 'APPROVING' && t.approver_id === myId)
  const canAct = !!myTask

  const doApprove = async () => {
    if (!myTask) return
    const confirmed = await Dialog.confirm({ content: '确认通过该审批?' })
    if (!confirmed) return
    setActing(true)
    try {
      await approve({ task_id: myTask.id })
      Toast.show({ icon: 'success', content: '已通过' })
      load()
    } finally {
      setActing(false)
    }
  }

  const doReject = () => {
    if (!myTask) return
    setRejectReason('')
    setShowReject(true)
  }

  const confirmReject = async () => {
    if (!myTask) return
    if (!rejectReason.trim()) {
      Toast.show({ content: '请填写驳回原因' })
      return
    }
    setShowReject(false)
    setActing(true)
    try {
      await reject({ task_id: myTask.id, comment: rejectReason })
      Toast.show({ icon: 'success', content: '已驳回' })
      load()
    } finally {
      setActing(false)
    }
  }

  // 撤回(审批中显示;后端校验是否发起人)
  const doRevoke = async () => {
    const ok = await Dialog.confirm({ content: '确认撤回该审批?' })
    if (!ok) return
    setActing(true)
    try {
      await revoke(detail.id)
      Toast.show({ icon: 'success', content: '已撤回' })
      load()
    } finally {
      setActing(false)
    }
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%' }}>
      <NavBar onBack={() => navigate(-1)}>审批详情</NavBar>

      <Card title="基本信息" style={{ margin: 8 }}>
        <List>
          <List.Item extra={detail.resource_title || '-'}>标题</List.Item>
          <List.Item extra={detail.form_type_label || detail.type}>表单类型</List.Item>
          <List.Item extra={STATUS_TEXT[detail.approval_status] || detail.approval_status}>
            审批状态
          </List.Item>
          <List.Item extra={detail.submit_time}>提审时间</List.Item>
          {detail.comment && <List.Item extra={detail.comment}>备注</List.Item>}
        </List>
      </Card>

      {detail.records.length > 0 && (
        <Card title="审批记录" style={{ margin: 8 }}>
          <Steps direction="vertical">
            {detail.records.map((r) => (
              <Steps.Step
                key={r.id}
                title={RESULT_TEXT[r.result] || STATUS_TEXT[r.result] || r.result}
                description={
                  <span style={{ fontSize: 12 }}>
                    {r.comment ? `${r.comment} · ` : ''}
                    {r.created_at}
                  </span>
                }
              />
            ))}
          </Steps>
        </Card>
      )}

      {canAct && (
        <div style={{ padding: 16 }}>
          <Space block>
            <Button block color="primary" loading={acting} onClick={doApprove}>
              通过
            </Button>
            <Button block color="danger" fill="outline" loading={acting} onClick={doReject}>
              驳回
            </Button>
          </Space>
        </div>
      )}

      {/* 撤回(审批中、且非待我审批时显示;后端校验发起人身份) */}
      {(detail.approval_status === 'PENDING' || detail.approval_status === 'APPROVING') && !canAct && (
        <div style={{ padding: 16 }}>
          <Button block color="warning" fill="outline" loading={acting} onClick={doRevoke}>
            撤回审批
          </Button>
        </div>
      )}

      {/* 驳回原因输入 */}
      <Popup
        visible={showReject}
        onMaskClick={() => setShowReject(false)}
        bodyStyle={{ borderTopLeftRadius: 12, borderTopRightRadius: 12, padding: 16 }}
        destroyOnClose
      >
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>驳回原因</div>
        <TextArea
          placeholder="请填写驳回原因(必填)"
          rows={3}
          value={rejectReason}
          onChange={setRejectReason}
          maxLength={200}
          showCount
        />
        <Button block color="danger" size="large" style={{ marginTop: 12 }} loading={acting} onClick={confirmReject}>
          确认驳回
        </Button>
      </Popup>
    </div>
  )
}
