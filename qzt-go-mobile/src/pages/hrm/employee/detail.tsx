import { useEffect, useState } from 'react'
import { Card, ErrorBlock, List, NavBar, SpinLoading, Tag } from 'antd-mobile'
import { useParams, useNavigate } from 'react-router-dom'
import { getEmployee } from '../../../services/hrm'
import type { HrmEmployee } from '../../../types/hrm'
import { EMPLOYEE_STATUS } from '../../../types/hrm'

export default function EmployeeDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [emp, setEmp] = useState<HrmEmployee | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    getEmployee(Number(id)).then(setEmp).catch(() => setError(true)).finally(() => setLoading(false))
  }, [id])

  if (loading) return <div style={{ paddingTop: '40vh', textAlign: 'center' }}><SpinLoading style={{ '--size': '40px' }} /></div>
  if (error || !emp) return <ErrorBlock status="default" title="加载失败" />

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%' }}>
      <NavBar onBack={() => navigate(-1)}>员工详情</NavBar>
      <Card title="基本信息" style={{ margin: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 18, fontWeight: 600 }}>{emp.name}</span>
          <Tag color={emp.status === 1 ? 'success' : 'default'} fill="outline">{EMPLOYEE_STATUS[emp.status] || '未知'}</Tag>
        </div>
        <List>
          <List.Item extra={emp.emp_no}>工号</List.Item>
          <List.Item extra={emp.department_name || '-'}>部门</List.Item>
          <List.Item extra={emp.position_name || '-'}>岗位</List.Item>
          {emp.phone && <List.Item extra={emp.phone}>电话</List.Item>}
          {emp.email && <List.Item extra={emp.email}>邮箱</List.Item>}
          {emp.hire_date && <List.Item extra={emp.hire_date?.slice(0, 10)}>入职日期</List.Item>}
        </List>
      </Card>
    </div>
  )
}
