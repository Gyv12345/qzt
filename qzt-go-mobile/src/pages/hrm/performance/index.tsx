import { useCallback, useEffect, useRef, useState } from 'react'
import { Button, DatePicker, Dialog, FloatingBubble, InfiniteScroll, Input, List, NavBar, Popup, PullToRefresh, Tabs, Tag, Toast } from 'antd-mobile'
import { AddOutline } from 'antd-mobile-icons'
import { useNavigate } from 'react-router-dom'
import { createPerformance, deletePerformance, listPerformances } from '../../../services/hrm'
import type { HrmPerformance } from '../../../types/hrm'
import { PERF_STATUS } from '../../../types/hrm'
import { useInfiniteList } from '../../../hooks/useInfiniteList'
import EmployeePicker from '../../../components/EmployeePicker'

const STATUS_TABS = [
  { key: '', label: '全部' },
  ...Object.entries(PERF_STATUS).map(([k, v]) => ({ key: k, label: v.text })),
]

function pad(n: number) {
  return String(n).padStart(2, '0')
}
function fmtDate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export default function PerformanceList() {
  const navigate = useNavigate()
  const [status, setStatus] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [title, setTitle] = useState('')
  const [emp, setEmp] = useState<{ id: number; name: string } | null>(null)
  const [showEmp, setShowEmp] = useState(false)
  const [period, setPeriod] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fetcher = useCallback(
    (params: { page: number; page_size: number }) => listPerformances({ ...params, status: status ? Number(status) : undefined }),
    [status],
  )
  const { list, hasMore, loadMore, refresh } = useInfiniteList<HrmPerformance>(fetcher, { page_size: 20 })

  const firstRef = useRef(true)
  useEffect(() => {
    if (firstRef.current) {
      firstRef.current = false
      return
    }
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  const resetForm = () => {
    setTitle('')
    setEmp(null)
    setPeriod('')
    setStartDate('')
    setEndDate('')
  }

  const pickDate = async (which: 'start' | 'end') => {
    const d = await DatePicker.prompt({ precision: 'day' })
    if (d) {
      if (which === 'start') setStartDate(fmtDate(d))
      else setEndDate(fmtDate(d))
    }
  }

  const submit = async () => {
    if (!title) {
      Toast.show('请输入考核标题')
      return
    }
    if (!emp) {
      Toast.show('请选择被考核人')
      return
    }
    if (!startDate || !endDate) {
      Toast.show('请选择考核周期')
      return
    }
    setSubmitting(true)
    try {
      await createPerformance({
        title,
        employee_id: emp.id,
        employee_name: emp.name,
        period: period || undefined,
        start_date: startDate,
        end_date: endDate,
      })
      Toast.show({ icon: 'success', content: '已发起' })
      resetForm()
      setShowNew(false)
      refresh()
    } catch {
    } finally {
      setSubmitting(false)
    }
  }

  const onDelete = async (p: HrmPerformance) => {
    const ok = await Dialog.confirm({ content: `确定删除考核「${p.title}」?` })
    if (!ok) return
    try {
      await deletePerformance(p.id)
      Toast.show({ icon: 'success', content: '已删除' })
      refresh()
    } catch {
    }
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%' }}>
      <NavBar onBack={() => navigate(-1)}>绩效考核</NavBar>
      <Tabs activeKey={status} onChange={setStatus}>
        {STATUS_TABS.map((t) => (
          <Tabs.Tab key={t.key} title={t.label} />
        ))}
      </Tabs>
      <PullToRefresh onRefresh={refresh}>
        <List>
          {list.map((p) => {
            const st = PERF_STATUS[p.status] || PERF_STATUS[1]
            return (
              <List.Item
                key={p.id}
                onClick={() => navigate(`/hrm/performance/${p.id}`)}
                description={<span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{p.perf_no} · {p.employee_name} · {p.period || '-'}</span>}
                extra={
                  <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    <Tag color={st.color} fill="outline">{st.text}</Tag>
                    {p.final_score ? <span style={{ fontSize: 12, color: 'var(--brand)' }}>{p.final_score}分 {p.grade}</span> : null}
                    <a style={{ color: '#ff4d4f', fontSize: 12 }} onClick={(e) => { e.stopPropagation(); onDelete(p) }}>删除</a>
                  </span>
                }
              >
                {p.title}
              </List.Item>
            )
          })}
          {list.length === 0 && <List.Item><span style={{ color: 'var(--text-tertiary)' }}>暂无考核</span></List.Item>}
        </List>
        <InfiniteScroll loadMore={loadMore} hasMore={hasMore} />
      </PullToRefresh>

      <FloatingBubble style={{ '--size': '48px' } as any} onClick={() => setShowNew(true)}>
        <AddOutline fontSize={24} />
      </FloatingBubble>

      <Popup
        visible={showNew}
        onMaskClick={() => setShowNew(false)}
        position="bottom"
        destroyOnClose
        bodyStyle={{ borderTopLeftRadius: 12, borderTopRightRadius: 12, maxHeight: '88vh', overflowY: 'auto' }}
      >
        <div style={{ padding: '16px 16px 24px' }}>
          <div style={{ fontSize: 17, fontWeight: 600, textAlign: 'center', marginBottom: 16 }}>发起考核</div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 14, color: 'var(--text-tertiary)', marginBottom: 6 }}>考核标题</div>
            <Input placeholder="请输入" value={title} onChange={setTitle} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 14, color: 'var(--text-tertiary)', marginBottom: 6 }}>被考核人</div>
            <div onClick={() => setShowEmp(true)} style={{ padding: '8px 0', fontSize: 15, color: emp ? 'var(--text-primary)' : 'var(--text-tertiary)', borderBottom: '1px solid var(--divider)' }}>
              {emp?.name || '请选择员工'}
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 14, color: 'var(--text-tertiary)', marginBottom: 6 }}>考核周期(如 2026-Q3)</div>
            <Input placeholder="选填" value={period} onChange={setPeriod} />
          </div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, color: 'var(--text-tertiary)', marginBottom: 6 }}>开始日期</div>
              <div onClick={() => pickDate('start')} style={{ padding: '8px 0', fontSize: 15, color: startDate ? 'var(--text-primary)' : 'var(--text-tertiary)', borderBottom: '1px solid var(--divider)' }}>
                {startDate || '选择'}
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, color: 'var(--text-tertiary)', marginBottom: 6 }}>结束日期</div>
              <div onClick={() => pickDate('end')} style={{ padding: '8px 0', fontSize: 15, color: endDate ? 'var(--text-primary)' : 'var(--text-tertiary)', borderBottom: '1px solid var(--divider)' }}>
                {endDate || '选择'}
              </div>
            </div>
          </div>
          <Button block color="primary" size="large" loading={submitting} onClick={submit}>发起</Button>
        </div>
      </Popup>

      <EmployeePicker visible={showEmp} onClose={() => setShowEmp(false)} onPick={setEmp} />
    </div>
  )
}
