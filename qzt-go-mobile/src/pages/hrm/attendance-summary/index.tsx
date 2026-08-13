import { useEffect, useState } from 'react'
import { Button, FloatingBubble, Input, List, NavBar, Popup, SpinLoading, Toast } from 'antd-mobile'
import { AddOutline } from 'antd-mobile-icons'
import { useNavigate } from 'react-router-dom'
import { generateAttendanceSummary, listAttendanceSummary } from '../../../services/hrm'
import type { HrmAttendanceSummary } from '../../../types/hrm'
import EmployeePicker from '../../../components/EmployeePicker'

function curMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function AttendanceSummaryList() {
  const navigate = useNavigate()
  const [month, setMonth] = useState(curMonth())
  const [list, setList] = useState<HrmAttendanceSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [showGen, setShowGen] = useState(false)
  const [emp, setEmp] = useState<{ id: number; name: string } | null>(null)
  const [showEmp, setShowEmp] = useState(false)
  const [genMonth, setGenMonth] = useState(curMonth())
  const [submitting, setSubmitting] = useState(false)

  const reload = () => {
    setLoading(true)
    listAttendanceSummary({ year_month: month || undefined })
      .then((r) => setList(r || []))
      .catch(() => setList([]))
      .finally(() => setLoading(false))
  }
  useEffect(reload, [month])

  const submitGen = async () => {
    if (!emp) {
      Toast.show('请选择员工')
      return
    }
    if (!genMonth) {
      Toast.show('请输入年月')
      return
    }
    setSubmitting(true)
    try {
      await generateAttendanceSummary(emp.id, genMonth)
      Toast.show({ icon: 'success', content: '已生成' })
      setEmp(null)
      setShowGen(false)
      setMonth(genMonth)
    } catch {
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%' }}>
      <NavBar onBack={() => navigate(-1)}>考勤汇总</NavBar>
      <div style={{ padding: 8, background: 'var(--bg-card)', display: 'flex', gap: 8, alignItems: 'center' }}>
        <Input placeholder="年月 如 2026-08" value={month} onChange={setMonth} style={{ flex: 1 }} />
        <Button size="small" color="primary" onClick={reload}>查询</Button>
      </div>
      {loading ? (
        <div style={{ textAlign: 'center', padding: 24 }}><SpinLoading /></div>
      ) : (
        <List>
          {list.map((s) => (
            <List.Item
              key={s.id}
              description={<span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{s.year_month} · 出勤 {s.actual_days}/{s.work_days} · 迟到 {s.late_count} · 早退 {s.early_count}</span>}
              extra={<span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>请假 {Number(s.leave_days || 0)}天 · 加班 {Number(s.overtime_hours || 0)}h</span>}
            >
              {s.employee_name || `员工#${s.employee_id}`}
            </List.Item>
          ))}
          {list.length === 0 && <List.Item><span style={{ color: 'var(--text-tertiary)' }}>暂无汇总</span></List.Item>}
        </List>
      )}

      <FloatingBubble style={{ '--size': '48px' } as any} onClick={() => { setEmp(null); setGenMonth(month || curMonth()); setShowGen(true) }}>
        <AddOutline fontSize={24} />
      </FloatingBubble>

      <Popup
        visible={showGen}
        onMaskClick={() => setShowGen(false)}
        position="bottom"
        destroyOnClose
        bodyStyle={{ borderTopLeftRadius: 12, borderTopRightRadius: 12 }}
      >
        <div style={{ padding: '16px 16px 24px' }}>
          <div style={{ fontSize: 17, fontWeight: 600, textAlign: 'center', marginBottom: 16 }}>生成月度汇总</div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 14, color: 'var(--text-tertiary)', marginBottom: 6 }}>员工</div>
            <div onClick={() => setShowEmp(true)} style={{ padding: '8px 0', fontSize: 15, color: emp ? 'var(--text-primary)' : 'var(--text-tertiary)', borderBottom: '1px solid var(--divider)' }}>
              {emp?.name || '请选择员工'}
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 14, color: 'var(--text-tertiary)', marginBottom: 6 }}>年月(如 2026-08)</div>
            <Input value={genMonth} onChange={setGenMonth} />
          </div>
          <Button block color="primary" size="large" loading={submitting} onClick={submitGen}>生成</Button>
        </div>
      </Popup>

      <EmployeePicker visible={showEmp} onClose={() => setShowEmp(false)} onPick={setEmp} />
    </div>
  )
}
