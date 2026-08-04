import { useEffect, useState, type ReactNode } from 'react'
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Calendar,
  Card,
  Col,
  Empty,
  List,
  Row,
  Space,
  Spin,
  Statistic,
  Tag,
  Typography,
} from 'antd'
import { UserOutlined } from '@ant-design/icons'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../../stores/auth'
import ProfileCenter from '../../components/layout/ProfileCenter'
import { menuHasPath } from '../../utils/menu'
import {
  getCustomerDistribution,
  getDashboardOverview,
  getFinanceSummary,
  getOpportunityFunnel,
  getSalesTrend,
} from '../../services/dashboard'
import { listMyTodos } from '../../services/approval'
import { getNoticeFeed, getUnreadCount, listInbox } from '../../services/enterprise'
import type {
  DashboardDistributionPoint,
  DashboardFinanceSummary,
  DashboardFunnelPoint,
  DashboardTrendPoint,
} from '../../types/dashboard'

// 金额字段后端以字符串(decimal)返回
const toAmount = (value?: string) => Number(value) || 0

const formatAmount = (value?: string) =>
  toAmount(value).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// 商机阶段英文 code → 中文,未知阶段原样显示
const STAGE_LABELS: Record<string, string> = {
  LEAD: '线索',
  NEGOTIATION: '洽谈',
  PROPOSAL: '方案',
  WON: '赢单',
  LOST: '输单',
}

const stageLabel = (stage: string) => STAGE_LABELS[stage] ?? stage

/** 公告类型:1 通知 2 公告 */
const NOTICE_TYPE_LABELS: Record<number, string> = { 1: '通知', 2: '公告' }

/** 时间字符串截取到分钟,空值原样返回 */
const formatTime = (value?: string) => (value ? value.slice(0, 16) : '')

interface SectionState<T> {
  data: T | null
  loading: boolean
  failed: boolean
}

/** 单个统计区块的数据加载:失败只影响本区块,不阻塞页面其他部分 */
function useSectionData<T>(loader: () => Promise<T>): SectionState<T> {
  const [state, setState] = useState<SectionState<T>>({ data: null, loading: true, failed: false })

  useEffect(() => {
    let mounted = true
    loader()
      .then((data) => {
        if (mounted) setState({ data, loading: false, failed: false })
      })
      .catch(() => {
        if (mounted) setState({ data: null, loading: false, failed: true })
      })
    return () => {
      mounted = false
    }
    // 只挂载时拉取一次,不做自动刷新
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return state
}

interface SectionCardProps {
  title: ReactNode
  loading: boolean
  failed: boolean
  empty?: boolean
  extra?: ReactNode
  children: ReactNode
}

function SectionCard({ title, loading, failed, empty, extra, children }: SectionCardProps) {
  return (
    <Card title={title} extra={extra}>
      {loading ? (
        <div style={{ padding: '48px 0', textAlign: 'center' }}>
          <Spin />
        </div>
      ) : failed ? (
        <Typography.Text type="secondary">加载失败,请稍后重试</Typography.Text>
      ) : empty ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无数据" />
      ) : (
        children
      )}
    </Card>
  )
}

interface BarRowProps {
  label: string
  /** 0-100 的宽度百分比 */
  percent: number
  value: ReactNode
}

/** 无图表库,用 div 宽度百分比实现简单条形图 */
function BarRow({ label, percent, value }: BarRowProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
      <span
        style={{
          width: 88,
          flexShrink: 0,
          textAlign: 'right',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
        title={label}
      >
        {label}
      </span>
      <div style={{ flex: 1, height: 18, background: '#f5f5f5', borderRadius: 4 }}>
        <div
          style={{
            width: `${Math.min(percent, 100)}%`,
            minWidth: percent > 0 ? 4 : 0,
            height: '100%',
            background: '#1677ff',
            borderRadius: 4,
          }}
        />
      </div>
      <span style={{ width: 120, flexShrink: 0 }}>{value}</span>
    </div>
  )
}

const TREND_DAYS = 30

export default function Dashboard() {
  const { profile, menus } = useAuthStore()
  const [profileOpen, setProfileOpen] = useState(false)

  // 个人区块(仅 JWT 鉴权,所有登录用户可用)
  const todos = useSectionData(() => listMyTodos({ page: 1, page_size: 5 }))
  const notices = useSectionData(() => getNoticeFeed(5))
  const unread = useSectionData(getUnreadCount)
  const inbox = useSectionData(() => listInbox({ page: 1, page_size: 5 }))

  // 统计区块(独立容错,失败的区块整体隐藏)
  const overview = useSectionData(getDashboardOverview)
  const trend = useSectionData(() => getSalesTrend(TREND_DAYS))
  const funnel = useSectionData(getOpportunityFunnel)
  const distribution = useSectionData(() => getCustomerDistribution('level'))
  const finance = useSectionData(() => getFinanceSummary())

  const ov = overview.data
  const overviewItems: { title: string; value: number; isAmount?: boolean }[] = ov
    ? [
        { title: '客户总数', value: ov.customer_total },
        { title: '公海客户', value: ov.customer_public },
        { title: '商机总数', value: ov.opportunity_total },
        { title: '赢单商机', value: ov.opportunity_won },
        { title: '合同总数', value: ov.contract_total },
        { title: '合同金额', value: toAmount(ov.contract_amount), isAmount: true },
        { title: '回款金额', value: toAmount(ov.received_amount), isAmount: true },
        { title: '待审批', value: ov.approval_pending },
        { title: '库存预警', value: ov.stock_warning },
        { title: '未读消息', value: ov.unread_message },
      ]
    : []

  const trendPoints: DashboardTrendPoint[] = trend.data ?? []
  const trendMax = Math.max(...trendPoints.map((p) => toAmount(p.amount)), 0)

  const funnelPoints: DashboardFunnelPoint[] = funnel.data ?? []
  const funnelMax = Math.max(...funnelPoints.map((p) => p.count), 0)

  const distributionPoints: DashboardDistributionPoint[] = distribution.data ?? []
  const distributionMax = Math.max(...distributionPoints.map((p) => p.count), 0)

  const fin: DashboardFinanceSummary | null = finance.data

  const todoList = todos.data?.list ?? []
  const noticeList = notices.data ?? []
  const inboxList = inbox.data?.list ?? []
  const unreadCount = unread.data?.unread_count ?? 0

  // 「查看全部」链接仅在菜单树中存在对应页面时显示,避免无角色用户看到死链
  const showApprovalLink = menuHasPath(menus, '/approval/todo')
  const showMessageLink = menuHasPath(menus, '/enterprise/message')

  return (
    <div>
      <Row gutter={[16, 16]}>
        {/* 左侧:个人信息 + 日历 */}
        <Col xs={24} lg={8}>
          <Card>
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              <Avatar
                size={64}
                src={profile?.avatar || undefined}
                icon={<UserOutlined />}
              >
                {profile?.nickname?.[0] || profile?.username?.[0]}
              </Avatar>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Typography.Title level={5} style={{ marginTop: 0, marginBottom: 4 }}>
                  {profile?.nickname || profile?.username}
                </Typography.Title>
                <Typography.Text type="secondary">@{profile?.username}</Typography.Text>
                <div style={{ marginTop: 8 }}>
                  {profile?.email && (
                    <div>
                      <Typography.Text type="secondary">邮箱:{profile.email}</Typography.Text>
                    </div>
                  )}
                  {profile?.phone && (
                    <div>
                      <Typography.Text type="secondary">手机:{profile.phone}</Typography.Text>
                    </div>
                  )}
                </div>
              </div>
              <Button icon={<UserOutlined />} onClick={() => setProfileOpen(true)}>
                个人中心
              </Button>
            </div>
            <div style={{ marginTop: 12 }}>
              <Space size={[4, 4]} wrap>
                {profile?.roles?.map((r) => (
                  <Tag color="blue" key={r.id}>
                    {r.name}
                  </Tag>
                ))}
                {profile?.wecom_user_id ? (
                  <Tag color="green">企微已绑定</Tag>
                ) : (
                  <Tag>企微未绑定</Tag>
                )}
              </Space>
              {!profile?.roles?.length && (
                <Alert
                  type="warning"
                  showIcon
                  message="暂未分配角色,请联系管理员分配权限"
                  style={{ marginTop: 12 }}
                />
              )}
            </div>
          </Card>

          <Card title="日历" style={{ marginTop: 16 }}>
            <Calendar fullscreen={false} />
          </Card>
        </Col>

        {/* 右侧:审批待办 / 公告 / 未读消息 */}
        <Col xs={24} lg={16}>
          <SectionCard
            title="我的审批待办"
            loading={todos.loading}
            failed={todos.failed}
            empty={todoList.length === 0}
            extra={showApprovalLink ? <Link to="/approval/todo">查看全部</Link> : undefined}
          >
            <List
              size="small"
              dataSource={todoList}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    title={`${item.instance?.type ?? '审批'} #${item.instance_id}`}
                    description={formatTime(item.created_at)}
                  />
                </List.Item>
              )}
            />
          </SectionCard>

          <div style={{ marginTop: 16 }}>
            <SectionCard
              title="公告"
              loading={notices.loading}
              failed={notices.failed}
              empty={noticeList.length === 0}
            >
              <List
                size="small"
                dataSource={noticeList}
                renderItem={(item) => (
                  <List.Item>
                    <List.Item.Meta
                      title={
                        <Space size={8}>
                          <Tag>{NOTICE_TYPE_LABELS[item.type] ?? '公告'}</Tag>
                          {item.title}
                        </Space>
                      }
                      description={formatTime(item.publish_time)}
                    />
                  </List.Item>
                )}
              />
            </SectionCard>
          </div>

          <div style={{ marginTop: 16 }}>
            <SectionCard
              title={
                <Space size={8}>
                  未读消息
                  {unreadCount > 0 && <Badge count={unreadCount} size="small" />}
                </Space>
              }
              loading={inbox.loading}
              failed={inbox.failed}
              empty={inboxList.length === 0}
              extra={showMessageLink ? <Link to="/enterprise/message">查看全部</Link> : undefined}
            >
              <List
                size="small"
                dataSource={inboxList}
                renderItem={(item) => (
                  <List.Item>
                    <List.Item.Meta
                      title={
                        <span style={{ fontWeight: item.is_read === 0 ? 600 : 400 }}>
                          {item.title}
                        </span>
                      }
                      description={formatTime(item.created_at)}
                    />
                  </List.Item>
                )}
              />
            </SectionCard>
          </div>
        </Col>
      </Row>

      {/* 统计区块:失败的区块整体隐藏不渲染 */}
      {!overview.failed && (
        <div style={{ marginTop: 16 }}>
          <SectionCard title="核心指标" loading={overview.loading} failed={overview.failed} empty={!ov}>
            <Row gutter={[16, 16]}>
              {overviewItems.map((item) => (
                <Col xs={12} sm={8} lg={4} key={item.title}>
                  <Statistic
                    title={item.title}
                    value={item.value}
                    precision={item.isAmount ? 2 : 0}
                    prefix={item.isAmount ? '¥' : undefined}
                  />
                </Col>
              ))}
            </Row>
          </SectionCard>
        </div>
      )}

      {(!trend.failed || !funnel.failed) && (
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          {!trend.failed && (
            <Col xs={24} lg={12}>
              <SectionCard
                title={`近 ${TREND_DAYS} 天回款趋势`}
                loading={trend.loading}
                failed={trend.failed}
                empty={trendPoints.length === 0}
              >
                <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                  {trendPoints.map((p) => {
                    const amount = toAmount(p.amount)
                    return (
                      <BarRow
                        key={p.date}
                        label={p.date.slice(5)}
                        percent={trendMax > 0 ? (amount / trendMax) * 100 : 0}
                        value={`¥${formatAmount(p.amount)} / ${p.count}笔`}
                      />
                    )
                  })}
                </div>
              </SectionCard>
            </Col>
          )}
          {!funnel.failed && (
            <Col xs={24} lg={12}>
              <SectionCard
                title="商机漏斗"
                loading={funnel.loading}
                failed={funnel.failed}
                empty={funnelPoints.length === 0}
              >
                {funnelPoints.map((p) => (
                  <BarRow
                    key={p.stage}
                    label={stageLabel(p.stage)}
                    percent={funnelMax > 0 ? (p.count / funnelMax) * 100 : 0}
                    value={`${p.count}个 / ¥${formatAmount(p.amount)}`}
                  />
                ))}
              </SectionCard>
            </Col>
          )}
        </Row>
      )}

      {(!distribution.failed || !finance.failed) && (
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          {!distribution.failed && (
            <Col xs={24} lg={12}>
              <SectionCard
                title="客户分布(按等级)"
                loading={distribution.loading}
                failed={distribution.failed}
                empty={distributionPoints.length === 0}
              >
                {distributionPoints.map((p) => (
                  <BarRow
                    key={p.label}
                    label={p.label}
                    percent={distributionMax > 0 ? (p.count / distributionMax) * 100 : 0}
                    value={`${p.count}家`}
                  />
                ))}
              </SectionCard>
            </Col>
          )}
          {!finance.failed && (
            <Col xs={24} lg={12}>
              <SectionCard title="财务概览" loading={finance.loading} failed={finance.failed} empty={!fin}>
                {fin && (
                  <Row gutter={[16, 16]}>
                    <Col span={12}>
                      <Statistic title="采购金额" value={toAmount(fin.purchase_amount)} precision={2} prefix="¥" />
                    </Col>
                    <Col span={12}>
                      <Statistic title="销售金额" value={toAmount(fin.sales_amount)} precision={2} prefix="¥" />
                    </Col>
                    <Col span={12}>
                      <Statistic title="回款金额" value={toAmount(fin.received_amount)} precision={2} prefix="¥" />
                    </Col>
                    <Col span={12}>
                      <Statistic title="库存货值" value={toAmount(fin.stock_value)} precision={2} prefix="¥" />
                    </Col>
                  </Row>
                )}
              </SectionCard>
            </Col>
          )}
        </Row>
      )}

      <ProfileCenter open={profileOpen} onClose={() => setProfileOpen(false)} />
    </div>
  )
}
