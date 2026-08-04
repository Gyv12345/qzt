import { useEffect, useState } from 'react'
import { Grid, NavBar } from 'antd-mobile'
import {
  CheckCircleOutline,
  FileOutline,
  GlobalOutline,
  UserCircleOutline,
} from 'antd-mobile-icons'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/auth'
import { getDashboardOverview } from '../../services/dashboard'
import { listTodos } from '../../services/approval'
import type { DashboardOverview } from '../../types/dashboard'

interface StatCard {
  label: string
  value: string
}

export default function Home() {
  const profile = useAuthStore((s) => s.profile)
  const navigate = useNavigate()
  const [overview, setOverview] = useState<DashboardOverview | null>(null)
  const [todoCount, setTodoCount] = useState<number | null>(null)

  useEffect(() => {
    getDashboardOverview()
      .then(setOverview)
      .catch(() => {})
    listTodos({ page: 1, page_size: 1 })
      .then((res) => setTodoCount(res.total))
      .catch(() => {})
  }, [])

  const stats: StatCard[] = overview
    ? [
        { label: '客户总数', value: String(overview.customer_total) },
        { label: '商机数', value: String(overview.opportunity_total) },
        { label: '合同总额', value: overview.contract_amount },
        { label: '已回款', value: overview.received_amount },
      ]
    : []

  const entries = [
    { icon: <UserCircleOutline />, text: '我的客户', path: '/customer' },
    {
      icon: <CheckCircleOutline />,
      text: `审批待办${todoCount ? `(${todoCount})` : ''}`,
      path: '/approval',
    },
    { icon: <GlobalOutline />, text: '资讯公告', path: '/news' },
    { icon: <FileOutline />, text: '消息', path: '/messages' },
  ]

  return (
    <div>
      <NavBar back={null}>工作台</NavBar>
      {/* 问候区 */}
      <div style={{ padding: '20px 16px', background: 'linear-gradient(135deg,#1677ff,#0958d9)', color: '#fff' }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>
          你好,{profile?.nickname || profile?.username || '用户'}
        </h2>
        <p style={{ margin: '6px 0 0', opacity: 0.85, fontSize: 13 }}>
          欢迎使用企业级业务管理平台移动端
        </p>
      </div>

      {/* 核心指标 */}
      {stats.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 1,
            background: '#f0f0f0',
            margin: '12px 0',
          }}
        >
          {stats.map((s) => (
            <div key={s.label} style={{ background: '#fff', padding: '16px 12px', textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 600, color: '#1677ff' }}>{s.value}</div>
              <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* 快捷入口 */}
      <div style={{ background: '#fff', margin: '0 0 12px' }}>
        <Grid columns={4} gap={0}>
          {entries.map((e) => (
            <Grid.Item
              key={e.path}
              onClick={() => navigate(e.path)}
              style={{ padding: '20px 0', textAlign: 'center' }}
            >
              <div style={{ fontSize: 28, color: '#1677ff' }}>{e.icon}</div>
              <div style={{ fontSize: 12, marginTop: 6, color: '#333' }}>{e.text}</div>
            </Grid.Item>
          ))}
        </Grid>
      </div>
    </div>
  )
}
