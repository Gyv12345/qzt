import { useEffect, useState } from 'react'
import {
  ActionSheet,
  Card,
  Dialog,
  ErrorBlock,
  FloatingBubble,
  NavBar,
  PullToRefresh,
  SpinLoading,
  Tag,
  Toast,
} from 'antd-mobile'
import { AddOutline } from 'antd-mobile-icons'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import {
  convertFollowPlan,
  deleteFollowPlan,
  listMyFollowPlans,
  skipFollowPlan,
} from '../../services/crm'
import type { CrmFollowPlan } from '../../types/crm'
import { FOLLOW_TYPE_TEXT } from '../../types/crm'
import FollowPlanSheet from '../../components/FollowPlanSheet'

const nowStr = () => dayjs().format('YYYY-MM-DD HH:mm:ss')

/** 我的跟进计划(待办) */
export default function FollowPlanList() {
  const navigate = useNavigate()
  const [plans, setPlans] = useState<CrmFollowPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [actingId, setActingId] = useState<number | null>(null)

  const load = () => {
    setLoading(true)
    setFailed(false)
    return listMyFollowPlans()
      .then((res) => {
        // 按计划时间升序(最近优先)
        const sorted = (res || []).slice().sort((a, b) => (a.plan_time > b.plan_time ? 1 : -1))
        setPlans(sorted)
      })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  // 完成(转跟进记录):用计划本身的 type+content+当前时间
  const onConvert = async (p: CrmFollowPlan) => {
    setActingId(p.id)
    try {
      await convertFollowPlan(p.id, { type: p.type, content: p.content, follow_time: nowStr() })
      Toast.show({ icon: 'success', content: '已完成' })
      load()
    } catch {
    } finally {
      setActingId(null)
    }
  }

  const onSkip = async (p: CrmFollowPlan) => {
    const ok = await Dialog.confirm({ content: '确定跳过此计划?' })
    if (!ok) return
    setActingId(p.id)
    try {
      await skipFollowPlan(p.id)
      Toast.show({ icon: 'success', content: '已跳过' })
      load()
    } catch {
    } finally {
      setActingId(null)
    }
  }

  const onDelete = async (p: CrmFollowPlan) => {
    const ok = await Dialog.confirm({ content: '确定删除此计划?' })
    if (!ok) return
    setActingId(p.id)
    try {
      await deleteFollowPlan(p.id)
      Toast.show({ icon: 'success', content: '已删除' })
      load()
    } catch {
    } finally {
      setActingId(null)
    }
  }

  // 更多操作:跳过 / 删除
  const onMore = (p: CrmFollowPlan) => {
    ActionSheet.show({
      actions: [
        { text: '跳过计划', key: 'skip' },
        { text: '删除计划', key: 'delete', danger: true },
      ],
      cancelText: '取消',
      onAction: (item) => {
        if (item.key === 'skip') onSkip(p)
        else if (item.key === 'delete') onDelete(p)
      },
    })
  }

  // 计划时间是否已过(高亮提醒)
  const isOverdue = (p: CrmFollowPlan) => dayjs(p.plan_time).isBefore(dayjs())

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%' }}>
      <NavBar onBack={() => navigate(-1)}>跟进计划</NavBar>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <SpinLoading />
        </div>
      ) : failed ? (
        <div style={{ paddingTop: 60 }}>
          <ErrorBlock status="empty" description="加载失败" />
        </div>
      ) : (
        <PullToRefresh onRefresh={load}>
          {plans.length === 0 ? (
            <div style={{ paddingTop: 60 }}>
              <ErrorBlock status="empty" title="暂无待办计划" description="真棒 🎉" />
            </div>
          ) : (
            <div style={{ padding: 8 }}>
              {plans.map((p) => (
                <Card key={p.id} style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <Tag color="primary" fill="outline">
                          {FOLLOW_TYPE_TEXT[p.type] || p.type}
                        </Tag>
                        <span
                          style={{
                            fontSize: 12,
                            color: isOverdue(p) ? 'var(--bin-color-danger, #ff4d4f)' : 'var(--text-tertiary)',
                            fontWeight: isOverdue(p) ? 600 : 400,
                          }}
                        >
                          📅 {p.plan_time?.slice(5, 16)}
                        </span>
                        {isOverdue(p) && (
                          <Tag color="danger" fill="outline" style={{ fontSize: 11 }}>
                            已逾期
                          </Tag>
                        )}
                      </div>
                      <div style={{ fontSize: 14, lineHeight: 1.5 }}>{p.content}</div>
                      {p.remind_time && (
                        <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>
                          ⏰ 提醒 {p.remind_time.slice(5, 16)}
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 10, justifyContent: 'flex-end' }}>
                    <span
                      style={{
                        fontSize: 13,
                        color: 'var(--text-tertiary)',
                        alignSelf: 'center',
                        cursor: 'pointer',
                      }}
                      onClick={() => onMore(p)}
                    >
                      更多
                    </span>
                    <button
                      onClick={() => onConvert(p)}
                      disabled={actingId === p.id}
                      style={{
                        border: 'none',
                        borderRadius: 6,
                        padding: '4px 14px',
                        fontSize: 13,
                        color: '#fff',
                        background: 'var(--brand)',
                      }}
                    >
                      {actingId === p.id ? '处理中' : '完成'}
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </PullToRefresh>
      )}

      <FloatingBubble style={{ '--size': '48px' } as any} onClick={() => setShowNew(true)}>
        <AddOutline fontSize={24} />
      </FloatingBubble>

      <FollowPlanSheet
        visible={showNew}
        onClose={() => setShowNew(false)}
        onSubmitted={load}
      />
    </div>
  )
}
