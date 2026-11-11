import { lazy, Suspense, useEffect, useState } from 'react'
import { Badge, ErrorBlock, Toast } from 'antd-mobile'
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
import { fetchPublicConfigs } from '../../services/auth'
import { getDashboardOverview } from '../../services/dashboard'
import { listTodos } from '../../services/approval'
import GradientText from '../../components/reactbits/GradientText'
import ShinyText from '../../components/reactbits/ShinyText'
import CountUp from '../../components/reactbits/CountUp'
import FadeContent from '../../components/reactbits/FadeContent'
// React Bits: Aurora(ogl) 用 lazy 拆独立 chunk, 不进主 bundle
const Aurora = lazy(() => import('../../components/reactbits/Aurora'))
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

/** React Bits FadeContent 包裹的分组宫格区(滚动到视口才显现); 模块级定义避免每次渲染重挂载 */
function FadeSection({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <FadeContent duration={500}>
      <div className="home-section">
        <div className="home-section-title">{title}</div>
        {children}
      </div>
    </FadeContent>
  )
}

export default function Home() {
  const profile = useAuthStore((s) => s.profile)
  const navigate = useNavigate()
  // 商城入口地址(后端公开配置 mall_url,私有化部署各自配置;不写死域名)
  const [mallUrl, setMallUrl] = useState('')

  useEffect(() => {
    fetchPublicConfigs().then((cfg) => setMallUrl(cfg.mall_url || ''))
  }, [])
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
  // num 有值时走 React Bits CountUp 数字滚动; 否则(如回款的 compact 格式)静态渲染
  const stats: { label: string; value: string; num?: number }[] = ov
    ? [
        { label: '客户', value: String(ov.customer_total), num: ov.customer_total },
        { label: '商机', value: String(ov.opportunity_total), num: ov.opportunity_total },
        { label: '合同', value: String(ov.contract_total), num: ov.contract_total },
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

  // 商城(外部独立站点,地址来自后端 mall_url 配置)
  const mallEntries: GridEntry[] = [
    { key: 'mall', label: '商城', icon: <ShoppingCartOutlined />, iconBg: 'var(--icon-bg-contract)', path: '/mall' },
  ]

  // 人事宫格
  const hrmEntries: GridEntry[] = [
    { key: 'employee', label: '员工', icon: <UserOutlined />, iconBg: 'var(--icon-bg-crm)', path: '/hrm/employee' },
    { key: 'leave', label: '请假', icon: <RestOutlined />, iconBg: 'var(--icon-bg-approval)', path: '/hrm/leave' },
    { key: 'clock', label: '打卡', icon: <ClockCircleOutlined />, iconBg: 'var(--icon-bg-success, var(--brand))', path: '/clock' },
    { key: 'department', label: '部门', icon: <ApartmentOutlined />, iconBg: 'var(--icon-bg-crm)', path: '/hrm/department' },
    { key: 'position', label: '岗位', icon: <IdcardOutlined />, iconBg: 'var(--icon-bg-opp)', path: '/hrm/position' },
    { key: 'performance', label: '绩效', icon: <TrophyOutlined />, iconBg: 'var(--icon-bg-opp)', path: '/hrm/performance' },
    { key: 'job', label: '招聘', icon: <UserAddOutlined />, iconBg: 'var(--icon-bg-contract)', path: '/hrm/job' },
    { key: 'attendance-summary', label: '考勤汇总', icon: <CarryOutOutlined />, iconBg: 'var(--icon-bg-approval)', path: '/hrm/attendance-summary' },
    { key: 'payroll', label: '薪资', icon: <PayCircleOutlined />, iconBg: 'var(--icon-bg-contract)', path: '/hrm/payroll' },
  ]

  // 宫格必须由 .home-grid(display:grid 4列) 包裹; 11-04 React Bits 改造时容器丢失导致图标竖排成一条线
  const renderGrid = (entries: GridEntry[]) => (
    <div className="home-grid">
      {entries.map((e) => (
        <div
          key={e.key}
          className="home-grid-item"
          onClick={() => {
            if (e.key === 'mall') {
              if (mallUrl) window.open(mallUrl, '_blank', 'noopener')
              else Toast.show('商城未开通,请联系管理员配置')
              return
            }
            navigate(e.path)
          }}
        >
          <div className="home-grid-icon" style={{ background: e.iconBg, color: 'var(--brand)' }}>
            {e.icon}
            {e.badge ? <span className="home-grid-badge">{e.badge > 99 ? '99+' : e.badge}</span> : null}
          </div>
          <span className="home-grid-label">{e.label}</span>
        </div>
      ))}
    </div>
  )

  return (
    <div className="home-page">
      {/* 顶部品牌区 */}
      <div className="home-header">
        {/* React Bits Aurora: 弱化极光叠在品牌渐变上(蓝系 hex 浅深主题通用; 无 WebGL 时为空) */}
        <div className="home-header-aurora" aria-hidden>
          <Suspense fallback={null}>
            <Aurora colorStops={['#597ef7', '#1d39c4', '#2f54eb']} amplitude={0.9} blend={0.5} speed={0.5} />
          </Suspense>
        </div>
        <div className="home-brand-row">
          <div>
            <div className="home-greet">
              <GradientText as="span" colors={['#ffffff', '#a9c9ff', '#ffffff']} animationSpeed={6}>
                你好,{profile?.nickname || profile?.username || '用户'}
              </GradientText>
            </div>
            <div className="home-date">
              <ShinyText text={dateStr} speed={3} delay={2} color="rgba(255,255,255,0.8)" shineColor="#ffffff" />
            </div>
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

      {/* 核心指标(React Bits: 数字走 CountUp 滚动, 非 number 回退静态文本) */}
      {stats.length > 0 && (
        <FadeContent duration={500}>
          <div className="home-stats">
            {stats.map((s) => (
              <div className="home-stat" key={s.label}>
                <div className="home-stat-value">
                  {typeof s.num === 'number' ? <CountUp to={s.num} duration={1.5} /> : s.value}
                </div>
                <div className="home-stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        </FadeContent>
      )}

      {/* 数据看板(移动端独有); FadeContent 滚动显现 */}
      <FadeSection title="数据看板">{renderGrid(dashboardEntries)}</FadeSection>

      {/* 客户管理 */}
      <FadeSection title="客户管理">{renderGrid(crmEntries)}</FadeSection>

      {/* 办公中心 */}
      <FadeSection title="办公中心">{renderGrid(oaEntries)}</FadeSection>

      {/* 知识库 */}
      <FadeSection title="知识库">{renderGrid(kbEntries)}</FadeSection>

      {/* 审批中心 */}
      <FadeSection title="审批中心">{renderGrid(approvalEntries)}</FadeSection>

      {/* 进销存 */}
      <FadeSection title="进销存">{renderGrid(psiEntries)}</FadeSection>

      {/* 人事管理 */}
      <FadeSection title="人事管理">{renderGrid(hrmEntries)}</FadeSection>

      {/* 财务管理 */}
      <FadeSection title="财务管理">{renderGrid(financeEntries)}</FadeSection>

      {/* 项目管理 */}
      <FadeSection title="项目管理">{renderGrid(projectEntries)}</FadeSection>

      {/* 网盘 */}
      <FadeSection title="网盘">{renderGrid(cloudEntries)}</FadeSection>

      {/* 商城 */}
      <FadeSection title="商城">{renderGrid(mallEntries)}</FadeSection>

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
