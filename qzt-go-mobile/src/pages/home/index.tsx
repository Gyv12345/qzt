import { useEffect, useState } from 'react'
import { Badge, ErrorBlock } from 'antd-mobile'
import {
  AccountBookOutlined,
  AimOutlined,
  ApartmentOutlined,
  AppstoreOutlined,
  AuditOutlined,
  BookOutlined,
  CalendarOutlined,
  CarryOutOutlined,
  ClockCircleOutlined,
  CloudOutlined,
  CompassOutlined,
  CustomerServiceOutlined,
  DashboardOutlined,
  DatabaseOutlined,
  EditOutlined,
  ExportOutlined,
  FileDoneOutlined,
  FileProtectOutlined,
  FileTextOutlined,
  GlobalOutlined,
  GoldOutlined,
  HomeOutlined,
  IdcardOutlined,
  ImportOutlined,
  MoneyCollectOutlined,
  PayCircleOutlined,
  ProfileOutlined,
  ProjectOutlined,
  ReadOutlined,
  RestOutlined,
  RiseOutlined,
  RollbackOutlined,
  ScheduleOutlined,
  ShopOutlined,
  ShoppingCartOutlined,
  SoundOutlined,
  SwapOutlined,
  TeamOutlined,
  TrophyOutlined,
  TruckOutlined,
  UserAddOutlined,
  UserOutlined,
  VideoCameraOutlined,
  WalletOutlined,
} from '@ant-design/icons'
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
          (res.list ?? [])
            .filter((t) => t.instance != null)
            .map((t) => ({
              id: t.instance!.id,
              title: t.instance!.resource_title || t.instance!.form_type_label || '审批单',
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

  // 数据看板(移动端独有,独立分组置顶)
  const dashboardEntries: GridEntry[] = [
    { key: 'dashboard', label: '数据看板', icon: <DashboardOutlined />, iconBg: 'var(--icon-bg-opp)', path: '/dashboard' },
  ]

  // 客户管理(对齐后台顶级目录,线索在客户前)
  const crmEntries: GridEntry[] = [
    { key: 'lead', label: '线索', icon: <AimOutlined />, iconBg: 'var(--icon-bg-crm)', path: '/lead' },
    { key: 'lead-pool', label: '线索公海', icon: <GlobalOutlined />, iconBg: 'var(--icon-bg-crm)', path: '/lead/pool' },
    { key: 'customer', label: '客户', icon: <TeamOutlined />, iconBg: 'var(--icon-bg-crm)', path: '/customer' },
    { key: 'customer-pool', label: '客户公海', icon: <GlobalOutlined />, iconBg: 'var(--icon-bg-crm)', path: '/customer/pool' },
    { key: 'opp', label: '商机', icon: <RiseOutlined />, iconBg: 'var(--icon-bg-opp)', path: '/opportunity' },
    { key: 'contract', label: '合同', icon: <FileProtectOutlined />, iconBg: 'var(--icon-bg-contract)', path: '/contract' },
    { key: 'follow-plan', label: '跟进计划', icon: <ScheduleOutlined />, iconBg: 'var(--icon-bg-opp)', path: '/follow-plan' },
    { key: 'ticket', label: '工单', icon: <CustomerServiceOutlined />, iconBg: 'var(--icon-bg-crm)', path: '/ticket' },
    { key: 'product', label: '产品', icon: <AppstoreOutlined />, iconBg: 'var(--icon-bg-opp)', path: '/product' },
  ]

  // 审批中心
  const approvalEntries: GridEntry[] = [
    {
      key: 'approval',
      label: '我的审批',
      icon: <AuditOutlined />,
      iconBg: 'var(--icon-bg-approval)',
      path: '/approval',
      badge: todoCount || undefined,
    },
  ]

  // 进销存宫格
  const psiEntries: GridEntry[] = [
    { key: 'purchase', label: '采购', icon: <ShoppingCartOutlined />, iconBg: 'var(--icon-bg-contract)', path: '/psi/purchase' },
    { key: 'sales', label: '销售', icon: <ShopOutlined />, iconBg: 'var(--icon-bg-opp)', path: '/psi/sales' },
    { key: 'stock', label: '库存', icon: <DatabaseOutlined />, iconBg: 'var(--icon-bg-crm)', path: '/psi/stock' },
    { key: 'movement', label: '流水', icon: <SwapOutlined />, iconBg: 'var(--icon-bg-approval)', path: '/psi/movement' },
    { key: 'supplier', label: '供应商', icon: <TruckOutlined />, iconBg: 'var(--icon-bg-crm)', path: '/psi/supplier' },
    { key: 'warehouse', label: '仓库', icon: <HomeOutlined />, iconBg: 'var(--icon-bg-contract)', path: '/psi/warehouse' },
    { key: 'asset', label: '资产', icon: <GoldOutlined />, iconBg: 'var(--icon-bg-settings)', path: '/psi/asset' },
    { key: 'purchase-return', label: '采购退货', icon: <RollbackOutlined />, iconBg: 'var(--icon-bg-contract)', path: '/psi/purchase-return' },
    { key: 'sales-return', label: '销售退货', icon: <RollbackOutlined />, iconBg: 'var(--icon-bg-opp)', path: '/psi/sales-return' },
    { key: 'stock-in', label: '入库', icon: <ImportOutlined />, iconBg: 'var(--icon-bg-approval)', path: '/psi/stock-in' },
    { key: 'stock-out', label: '出库', icon: <ExportOutlined />, iconBg: 'var(--icon-bg-crm)', path: '/psi/stock-out' },
  ]

  // OA 办公宫格
  const oaEntries: GridEntry[] = [
    { key: 'expense', label: '报销', icon: <MoneyCollectOutlined />, iconBg: 'var(--icon-bg-approval)', path: '/expense' },
    { key: 'trip', label: '出差', icon: <CompassOutlined />, iconBg: 'var(--icon-bg-crm)', path: '/trip' },
    { key: 'loan', label: '借款', icon: <WalletOutlined />, iconBg: 'var(--icon-bg-contract)', path: '/loan' },
    { key: 'worklog', label: '日志', icon: <EditOutlined />, iconBg: 'var(--icon-bg-crm)', path: '/work-log' },
    { key: 'schedule', label: '日程', icon: <CalendarOutlined />, iconBg: 'var(--icon-bg-opp)', path: '/schedule' },
    { key: 'meeting', label: '会议', icon: <VideoCameraOutlined />, iconBg: 'var(--icon-bg-approval)', path: '/meeting' },
    { key: 'news', label: '资讯', icon: <ReadOutlined />, iconBg: 'var(--icon-bg-news)', path: '/news' },
    { key: 'notice', label: '公告', icon: <SoundOutlined />, iconBg: 'var(--icon-bg-notice)', path: '/notice' },
  ]

  // 财务管理
  const financeEntries: GridEntry[] = [
    { key: 'receivable', label: '应收应付', icon: <AccountBookOutlined />, iconBg: 'var(--icon-bg-contract)', path: '/finance/receivable' },
    { key: 'account', label: '科目', icon: <ProfileOutlined />, iconBg: 'var(--icon-bg-contract)', path: '/finance/account' },
    { key: 'voucher', label: '凭证', icon: <FileDoneOutlined />, iconBg: 'var(--icon-bg-approval)', path: '/finance/voucher' },
    { key: 'invoice', label: '发票', icon: <FileTextOutlined />, iconBg: 'var(--icon-bg-opp)', path: '/finance/invoice' },
  ]

  // 项目管理
  const projectEntries: GridEntry[] = [
    { key: 'project', label: '项目', icon: <ProjectOutlined />, iconBg: 'var(--icon-bg-opp)', path: '/project' },
  ]

  // 知识库
  const kbEntries: GridEntry[] = [
    { key: 'kb', label: '知识库', icon: <BookOutlined />, iconBg: 'var(--icon-bg-crm)', path: '/kb' },
  ]

  // 网盘
  const cloudEntries: GridEntry[] = [
    { key: 'cloud', label: '网盘', icon: <CloudOutlined />, iconBg: 'var(--icon-bg-opp)', path: '/cloud' },
  ]

  // 人事宫格
  const hrmEntries: GridEntry[] = [
    { key: 'employee', label: '员工', icon: <UserOutlined />, iconBg: 'var(--icon-bg-crm)', path: '/hrm/employee' },
    { key: 'leave', label: '请假', icon: <RestOutlined />, iconBg: 'var(--icon-bg-approval)', path: '/hrm/leave' },
    { key: 'leave', label: '请假', icon: <RestOutlined />, iconBg: 'var(--icon-bg-approval)', path: '/hrm/leave' },
    { key: 'clock', label: '打卡', icon: <ClockCircleOutlined />, iconBg: 'var(--icon-bg-success, var(--brand))', path: '/clock' },
    { key: 'department', label: '部门', icon: <ApartmentOutlined />, iconBg: 'var(--icon-bg-crm)', path: '/hrm/department' },
    { key: 'position', label: '岗位', icon: <IdcardOutlined />, iconBg: 'var(--icon-bg-opp)', path: '/hrm/position' },
    { key: 'performance', label: '绩效', icon: <TrophyOutlined />, iconBg: 'var(--icon-bg-opp)', path: '/hrm/performance' },
    { key: 'job', label: '招聘', icon: <UserAddOutlined />, iconBg: 'var(--icon-bg-contract)', path: '/hrm/job' },
    { key: 'attendance-summary', label: '考勤汇总', icon: <CarryOutOutlined />, iconBg: 'var(--icon-bg-approval)', path: '/hrm/attendance-summary' },
    { key: 'payroll', label: '薪资', icon: <PayCircleOutlined />, iconBg: 'var(--icon-bg-contract)', path: '/hrm/payroll' },
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

      {/* 数据看板(移动端独有) */}
      <div className="home-section">
        <div className="home-section-title">数据看板</div>
        <div className="home-grid">{renderGrid(dashboardEntries)}</div>
      </div>

      {/* 客户管理 */}
      <div className="home-section">
        <div className="home-section-title">客户管理</div>
        <div className="home-grid">{renderGrid(crmEntries)}</div>
      </div>

      {/* 办公中心 */}
      <div className="home-section">
        <div className="home-section-title">办公中心</div>
        <div className="home-grid">{renderGrid(oaEntries)}</div>
      </div>

      {/* 知识库 */}
      <div className="home-section">
        <div className="home-section-title">知识库</div>
        <div className="home-grid">{renderGrid(kbEntries)}</div>
      </div>

      {/* 审批中心 */}
      <div className="home-section">
        <div className="home-section-title">审批中心</div>
        <div className="home-grid">{renderGrid(approvalEntries)}</div>
      </div>

      {/* 进销存 */}
      <div className="home-section">
        <div className="home-section-title">进销存</div>
        <div className="home-grid">{renderGrid(psiEntries)}</div>
      </div>

      {/* 人事管理 */}
      <div className="home-section">
        <div className="home-section-title">人事管理</div>
        <div className="home-grid">{renderGrid(hrmEntries)}</div>
      </div>

      {/* 财务管理 */}
      <div className="home-section">
        <div className="home-section-title">财务管理</div>
        <div className="home-grid">{renderGrid(financeEntries)}</div>
      </div>

      {/* 项目管理 */}
      <div className="home-section">
        <div className="home-section-title">项目管理</div>
        <div className="home-grid">{renderGrid(projectEntries)}</div>
      </div>

      {/* 网盘 */}
      <div className="home-section">
        <div className="home-section-title">网盘</div>
        <div className="home-grid">{renderGrid(cloudEntries)}</div>
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
