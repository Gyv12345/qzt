import { useEffect, useState } from 'react'
import { Button, Dialog, FloatingBubble, Input, List, NavBar, Popup, SpinLoading, Tag, Toast } from 'antd-mobile'
import { AddOutline } from 'antd-mobile-icons'
import { useNavigate } from 'react-router-dom'
import { confirmPayroll, generatePayroll, listPayroll, markPayrollPaid } from '../../../services/hrm'
import type { HrmPayroll } from '../../../types/hrm'
import { PAYROLL_STATUS } from '../../../types/hrm'
import EmployeePicker from '../../../components/EmployeePicker'

function curMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function PayrollList() {
  const navigate = useNavigate()
  const [month, setMonth] = useState(curMonth())
  const [list, setList] = useState<HrmPayroll[]>([])
  const [loading, setLoading] = useState(false)
  const [showGen, setShowGen] = useState(false)
  const [emp, setEmp] = useState<{ id: number; name: string } | null>(null)
  const [showEmp, setShowEmp] = useState(false)
  const [genMonth, setGenMonth] = useState(curMonth())
  const [submitting, setSubmitting] = useState(false)

  const reload = () => {
    setLoading(true)
    listPayroll({ year_month: month || undefined })
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
      await generatePayroll({ employee_id: emp.id, year_month: genMonth })
      Toast.show({ icon: 'success', content: '已生成' })
      setEmp(null)
      setShowGen(false)
      setMonth(genMonth)
    } catch {
    } finally {
      setSubmitting(false)
    }
  }

  const doAction = async (p: HrmPayroll, kind: 'confirm' | 'paid') => {
    const ok = await Dialog.confirm({ content: kind === 'confirm' ? '确认此工资条?' : '标记此工资条为已发放?' })
    if (!ok) return
    try {
      if (kind === 'confirm') await confirmPayroll(p.id)
      else await markPayrollPaid(p.id)
      Toast.show({ icon: 'success', content: '已处理' })
      reload()
    } catch {
    }
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%' }}>
      <NavBar onBack={() => navigate(-1)}>工资条</NavBar>
      <div style={{ padding: 8, background: 'var(--bg-card)', display: 'flex', gap: 8, alignItems: 'center' }}>
        <Input placeholder="年月 如 2026-08" value={month} onChange={setMonth} style={{ flex: 1 }} />
        <Button size="small" color="primary" onClick={reload}>查询</Button>
      </div>
      {loading ? (
        <div style={{ textAlign: 'center', padding: 24 }}><SpinLoading /></div>
      ) : (
        <List>
          {list.map((p) => {
            const st = PAYROLL_STATUS[p.status] || PAYROLL_STATUS.DRAFT
            return (
              <List.Item
                key={p.id}
                description={<span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{p.year_month} · 应发 ¥{Number(p.gross_pay || 0).toFixed(2)}</span>}
                extra={
                  <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    <span style={{ color: '#ff4d4f', fontWeight: 600 }}>¥{Number(p.net_pay || 0).toFixed(2)}</span>
                    <Tag color={st.color} fill="outline">{st.text}</Tag>
                    {p.status === 'DRAFT' && (
                      <a style={{ color: 'var(--brand)', fontSize: 12 }} onClick={(e) => { e.stopPropagation(); doAction(p, 'confirm') }}>确认</a>
                    )}
                    {p.status === 'CONFIRMED' && (
                      <a style={{ color: 'var(--brand)', fontSize: 12 }} onClick={(e) => { e.stopPropagation(); doAction(p, 'paid') }}>标记发放</a>
                    )}
                  </span>
                }
              >
                {p.employee_name || `员工#${p.employee_id}`}
              </List.Item>
            )
          })}
          {list.length === 0 && <List.Item><span style={{ color: 'var(--text-tertiary)' }}>暂无工资条</span></List.Item>}
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
          <div style={{ fontSize: 17, fontWeight: 600, textAlign: 'center', marginBottom: 16 }}>生成工资条</div>
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
