import { useEffect, useState } from 'react'
import { Badge, ErrorBlock } from 'antd-mobile'
import {
  CheckCircleFill,
  FileOutline,
  GlobalOutline,
  SetOutline,
  TeamOutline,
  CheckShieldOutline,
  MessageOutline,
  SoundOutline,
  FlagOutline,
  ReceiptOutline,
  CompassOutline,
  PayCircleOutline,
  AppstoreOutline,
  BankcardOutline,
  UserOutline,
  CheckOutline,
  ShopbagOutline,
  FileWrongOutline,
  UnorderedListOutline,
  GiftOutline,
  UploadOutline,
} from 'antd-mobile-icons'
import type { CSSProperties, ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/auth'
import { getDashboardOverview } from '../../services/dashboard'
import { listTodos } from '../../services/approval'
import type { DashboardOverview } from '../../types/dashboard'
import './home.css'

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

interface GridEntry {
  key: string
  label: string
  icon: ReactNode
  iconBg: string
  path: string
  badge?: number
}

export default function Home() {
  const profile = useAuthStore((s) => s.profile)
  const navigate = useNavigate()
  const [overview, setOverview] = useState<DashboardOverview | null>(null)
  const [todoCount, setTodoCount] = useState(0)
  const [todoList, setTodoList] = useState<{ id: number; title: string; created_at: string }[]>([])
  const [todoFailed, setTodoFailed] = useState(false)

  useEffect(() => {
    getDashboardOverview()
      .then(setOverview)
      .catch(() => {})
    listTodos({ page: 1, page_size: 3 })
      .then((res) => {
        setTodoCount(res.total)
        setTodoList(
          (res.list ?? []).map((t) => ({
            id: t.id,
            title: t.type ? `${t.type} #${t.id}` : `审批 #${t.id}`,
            created_at: t.created_at,
          })),
        )
      })
      .catch(() => setTodoFailed(true))
  }, [])

  const now = new Date()
  const dateStr = `${now.getMonth() + 1}月${now.getDate()}日 星期${WEEKDAYS[now.getDay()]}`

  const ov = overview
  const stats = ov
    ? [
        { label: '客户', value: String(ov.customer_total) },
        { label: '商机', value: String(ov.opportunity_total) },
        { label: '合同', value: String(ov.contract_total) },
        {
          label: '回款',
          value: Number(ov.received_amount || '0').toLocaleString('zh-CN', { notation: 'compact' }),
        },
      ]
    : []

  // 常用业务宫格
  const primaryEntries: GridEntry[] = [
    { key: 'customer', label: '客户', icon: <TeamOutline />, iconBg: 'var(--icon-bg-crm)', path: '/customer' },
    { key: 'lead', label: '线索', icon: <FlagOutline />, iconBg: 'var(--icon-bg-crm)', path: '/lead' },
    { key: 'opp', label: '商机', icon: <CheckShieldOutline />, iconBg: 'var(--icon-bg-opp)', path: '/opportunity' },
    { key: 'contract', label: '合同', icon: <FileOutline />, iconBg: 'var(--icon-bg-contract)', path: '/contract' },
    {
      key: 'approval',
      label: '审批',
      icon: <CheckCircleFill />,
      iconBg: 'var(--icon-bg-approval)',
      path: '/approval',
      badge: todoCount || undefined,
    },
    { key: 'ticket', label: '工单', icon: <FileWrongOutline />, iconBg: 'var(--icon-bg-crm)', path: '/ticket' },
    { key: 'product', label: '产品', icon: <ShopbagOutline />, iconBg: 'var(--icon-bg-opp)', path: '/product' },
  ]

  // 进销存宫格
  const psiEntries: GridEntry[] = [
    { key: 'purchase', label: '采购', icon: <UnorderedListOutline />, iconBg: 'var(--icon-bg-contract)', path: '/psi/purchase' },
    { key: 'sales', label: '销售', icon: <ShopbagOutline />, iconBg: 'var(--icon-bg-opp)', path: '/psi/sales' },
    { key: 'stock', label: '库存', icon: <UnorderedListOutline />, iconBg: 'var(--icon-bg-crm)', path: '/psi/stock' },
    { key: 'asset', label: '资产', icon: <GiftOutline />, iconBg: 'var(--icon-bg-settings)', path: '/psi/asset' },
  ]

  // OA 办公宫格
  const oaEntries: GridEntry[] = [
    { key: 'expense', label: '报销', icon: <ReceiptOutline />, iconBg: 'var(--icon-bg-approval)', path: '/expense' },
    { key: 'trip', label: '出差', icon: <CompassOutline />, iconBg: 'var(--icon-bg-crm)', path: '/trip' },
    { key: 'loan', label: '借款', icon: <PayCircleOutline />, iconBg: 'var(--icon-bg-contract)', path: '/loan' },
    { key: 'leave', label: '请假', icon: <CheckOutline />, iconBg: 'var(--icon-bg-approval)', path: '/hrm/leave' },
    { key: 'worklog', label: '日志', icon: <FileOutline />, iconBg: 'var(--icon-bg-crm)', path: '/work-log' },
    { key: 'schedule', label: '日程', icon: <SetOutline />, iconBg: 'var(--icon-bg-opp)', path: '/schedule' },
    { key: 'meeting', label: '会议', icon: <CheckCircleFill />, iconBg: 'var(--icon-bg-approval)', path: '/meeting' },
  ]

  // 财务+项目+知识宫格
  const bizEntries: GridEntry[] = [
    { key: 'receivable', label: '应收应付', icon: <BankcardOutline />, iconBg: 'var(--icon-bg-contract)', path: '/finance/receivable' },
    { key: 'project', label: '项目', icon: <AppstoreOutline />, iconBg: 'var(--icon-bg-opp)', path: '/project' },
    { key: 'kb', label: '知识库', icon: <FileOutline />, iconBg: 'var(--icon-bg-crm)', path: '/kb' },
    { key: 'cloud', label: '网盘', icon: <UploadOutline />, iconBg: 'var(--icon-bg-opp)', path: '/cloud' },
  ]

  // 人事宫格
  const hrmEntries: GridEntry[] = [
    { key: 'employee', label: '员工', icon: <UserOutline />, iconBg: 'var(--icon-bg-crm)', path: '/hrm/employee' },
    { key: 'leave', label: '请假', icon: <CheckOutline />, iconBg: 'var(--icon-bg-approval)', path: '/hrm/leave' },
  ]

  // 更多宫格
  const moreEntries: GridEntry[] = [
    { key: 'msg', label: '消息', icon: <MessageOutline />, iconBg: 'var(--icon-bg-msg)', path: '/messages' },
    { key: 'news', label: '资讯', icon: <GlobalOutline />, iconBg: 'var(--icon-bg-news)', path: '/news' },
    { key: 'notice', label: '公告', icon: <SoundOutline />, iconBg: 'var(--icon-bg-notice)', path: '/mine' },
    { key: 'settings', label: '设置', icon: <SetOutline />, iconBg: 'var(--icon-bg-settings)', path: '/mine' },
  ]

  const renderGrid = (entries: GridEntry[]) =>
    entries.map((e) => (
      <div key={e.key} className="home-grid-item" onClick={() => navigate(e.path)}>
        <div className="home-grid-icon" style={{ background: e.iconBg, color: 'var(--brand)' }}>
          {e.icon}
          {e.badge ? <span className="home-grid-badge">{e.badge > 99 ? '99+' : e.badge}</span> : null}
        </div>
        <span className="home-grid-label">{e.label}</span>
      </div>
    ))

  return (
    <div className="home-page">
      {/* 顶部品牌区 */}
      <div className="home-header">
        <div className="home-brand-row">
          <div>
            <div className="home-greet">
              你好,{profile?.nickname || profile?.username || '用户'}
            </div>
            <div className="home-date">{dateStr}</div>
          </div>
          <div
            className="home-avatar"
            style={{
              background: 'rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 16,
              fontWeight: 600,
            }}
            onClick={() => navigate('/mine')}
          >
            {profile?.nickname?.[0] || profile?.username?.[0] || 'U'}
          </div>
        </div>
      </div>

      {/* 核心指标 */}
      {stats.length > 0 && (
        <div className="home-stats">
          {stats.map((s) => (
            <div className="home-stat" key={s.label}>
              <div className="home-stat-value">{s.value}</div>
              <div className="home-stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* 常用业务 */}
      <div className="home-section">
        <div className="home-section-title">常用业务</div>
        <div className="home-grid">{renderGrid(primaryEntries)}</div>
      </div>

      {/* OA 办公 */}
      <div className="home-section">
        <div className="home-section-title">OA 办公</div>
        <div className="home-grid">{renderGrid(oaEntries)}</div>
      </div>

      {/* 财务·项目 */}
      <div className="home-section">
        <div className="home-section-title">财务 · 项目</div>
        <div className="home-grid">{renderGrid(bizEntries)}</div>
      </div>

      {/* 人事 */}
      <div className="home-section">
        <div className="home-section-title">人事</div>
        <div className="home-grid">{renderGrid(hrmEntries)}</div>
      </div>

      {/* 进销存 */}
      <div className="home-section">
        <div className="home-section-title">进销存</div>
        <div className="home-grid">{renderGrid(psiEntries)}</div>
      </div>

      {/* 更多 */}
      <div className="home-section">
        <div className="home-section-title">更多</div>
        <div className="home-grid">{renderGrid(moreEntries)}</div>
      </div>

      {/* 审批待办预览 */}
      <div className="home-section">
        <div className="home-section-title">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            待办审批
            {todoCount > 0 && (
              <Badge content={todoCount > 99 ? '99+' : todoCount} style={{ '--right': '-8px' } as CSSProperties} />
            )}
          </span>
          <span
            style={{ float: 'right', fontSize: 13, fontWeight: 400, color: 'var(--brand)', cursor: 'pointer' }}
            onClick={() => navigate('/approval')}
          >
            全部 ›
          </span>
        </div>
        {todoFailed ? (
          <div className="home-empty">
            <ErrorBlock status="empty" description="加载失败" />
          </div>
        ) : todoList.length === 0 ? (
          <div className="home-empty">暂无待办,真棒 🎉</div>
        ) : (
          todoList.map((t) => (
            <div key={t.id} className="home-todo-item" onClick={() => navigate(`/approval/${t.id}`)}>
              <div className="home-todo-title">
                <span>{t.title}</span>
                <span className="home-todo-time">{t.created_at?.slice(5, 16) || ''}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
