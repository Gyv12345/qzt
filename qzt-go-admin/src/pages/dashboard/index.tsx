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
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/auth'

import Chart, { funnelOption, lineOption, pieOption } from '../../components/Chart'
import CountUp from '../../components/reactbits/CountUp'
import FadeContent from '../../components/reactbits/FadeContent'
import { menuHasPath } from '../../utils/menu'
import AiInsightCard from '../../components/ai/AiInsightCard'
import { useAiEnabled } from '../../components/ai/useAiEnabled'
import {
  getCustomerDistribution,
  getDashboardOverview,
  getFinanceSummary,
  getFollowTodos,
  getOpportunityFunnel,
  getSalesTrend,
} from '../../services/dashboard'
import { listMyTodos } from '../../services/approval'
import { listLeads } from '../../services/lead'
import { getUnreadCount, listInbox } from '../../services/oa'
import { getNoticeFeed } from '../../services/oa'
import type {
  DashboardDistributionPoint,
  DashboardFinanceSummary,
  DashboardFollowTodo,
  DashboardFunnelPoint,
  DashboardTrendPoint,
} from '../../types/dashboard'

// 金额字段后端以字符串(decimal)返回
const toAmount = (value?: string) => Number(value) || 0

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

const TREND_DAYS = 30

/** 待办计划关联主体名称:客户/线索名称;无权限或数据范围外时后端不带名称,回退显示 #id */
const followSubject = (item: DashboardFollowTodo) =>
  item.customer_name ||
  item.lead_name ||
  (item.customer_id ? `客户 #${item.customer_id}` : item.lead_id ? `线索 #${item.lead_id}` : '未关联客户')

export default function Dashboard() {
  const profile = useAuthStore((s) => s.profile)
  const menus = useAuthStore((s) => s.menus)
  const navigate = useNavigate()

  // 个人区块(仅 JWT 鉴权,所有登录用户可用)
  const todos = useSectionData(() => listMyTodos({ page: 1, page_size: 5 }))
  // 「今日跟进」:只统计本人待办计划;公海线索数复用线索公海页的同一接口,
  // 只在有线索公海菜单时才取(受角色权限约束,数字与公海页一致)
  const follow = useSectionData(getFollowTodos)
  const showFollowLink = menuHasPath(menus, '/crm/follow')
  const leadPool = useSectionData(() =>
    menuHasPath(menus, '/crm/lead-sea')
      ? listLeads({ page: 1, page_size: 1, pool_filter: 'PUBLIC' }).then((r) => r.total)
      : Promise.resolve(null),
  )
  const aiEnabled = useAiEnabled()
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
  // 核心 KPI(突出展示)+ 次要指标(折叠/小字),避免 10 个数字平铺成信息墙
  const coreKpis: { title: string; value: number; isAmount?: boolean }[] = ov
    ? [
        { title: '客户总数', value: ov.customer_total },
        { title: '商机总数', value: ov.opportunity_total },
        { title: '合同金额', value: toAmount(ov.contract_amount), isAmount: true },
        { title: '回款金额', value: toAmount(ov.received_amount), isAmount: true },
      ]
    : []
  const minorKpis: { title: string; value: number; isAmount?: boolean }[] = ov
    ? [
        { title: '公海客户', value: ov.customer_public },
        { title: '赢单商机', value: ov.opportunity_won },
        { title: '合同总数', value: ov.contract_total },
        { title: '待审批', value: ov.approval_pending },
        { title: '库存预警', value: ov.stock_warning },
        { title: '未读消息', value: ov.unread_message },
      ]
    : []

  const trendPoints: DashboardTrendPoint[] = trend.data ?? []
  const funnelPoints: DashboardFunnelPoint[] = funnel.data ?? []
  const distributionPoints: DashboardDistributionPoint[] = distribution.data ?? []

  const fin: DashboardFinanceSummary | null = finance.data

  const todoList = todos.data?.list ?? []
  const noticeList = notices.data ?? []
  const inboxList = inbox.data?.list ?? []
  const unreadCount = unread.data?.unread_count ?? 0

  // 「查看全部」链接仅在菜单树中存在对应页面时显示,避免无角色用户看到死链
  const showApprovalLink = menuHasPath(menus, '/approval/todo')
  const showMessageLink = menuHasPath(menus, '/oa/message')

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
              <Button icon={<UserOutlined />} onClick={() => navigate('/profile')}>
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
          {/* 今日跟进:每天打开先看今天该做什么,已逾期的排最前 */}
          {!follow.failed && (
            <SectionCard
              title="今日跟进"
              loading={follow.loading}
              failed={follow.failed}
              extra={
                (leadPool.data != null || showFollowLink) && (
                  <Space size={12}>
                    {leadPool.data != null && <Link to="/crm/lead-sea">公海线索 {leadPool.data}</Link>}
                    {showFollowLink && <Link to="/crm/follow">查看全部</Link>}
                  </Space>
                )
              }
            >
              {follow.data && (
                <>
                  <Row gutter={16}>
                    <Col span={8}>
                      <Statistic title="今日到期" value={follow.data.today} />
                    </Col>
                    <Col span={8}>
                      <Statistic
                        title="已逾期"
                        value={follow.data.overdue}
                        valueStyle={follow.data.overdue > 0 ? { color: 'var(--ant-color-error)' } : undefined}
                      />
                    </Col>
                    <Col span={8}>
                      <Statistic title="之后待办" value={follow.data.upcoming} />
                    </Col>
                  </Row>
                  {follow.data.list.length > 0 ? (
                    <List
                      size="small"
                      dataSource={follow.data.list}
                      renderItem={(item) => (
                        <List.Item
                          style={{ cursor: showFollowLink ? 'pointer' : 'default', padding: '6px 0' }}
                          onClick={() => showFollowLink && navigate('/crm/follow')}
                        >
                          <List.Item.Meta
                            avatar={
                              <Tag color={item.due === 'overdue' ? 'red' : 'blue'}>
                                {item.due === 'overdue' ? '逾期' : '今天'}
                              </Tag>
                            }
                            title={
                              <span style={{ fontSize: 13, fontWeight: item.due === 'overdue' ? 600 : 400 }}>
                                {item.content}
                              </span>
                            }
                            description={`${followSubject(item)} · ${formatTime(item.plan_time)}`}
                          />
                        </List.Item>
                      )}
                    />
                  ) : (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="今天没有到期的跟进" />
                  )}
                </>
              )}
            </SectionCard>
          )}

          <div style={{ marginTop: 16 }}>
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
          </div>

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

      {/* 核心 KPI:4 个突出展示的大卡片 */}
      {!overview.failed && coreKpis.length > 0 && (
        <FadeContent duration={600} css={{ marginTop: 16 }}>
          <Row gutter={[16, 16]}>
            {coreKpis.map((item) => (
              <Col xs={12} md={6} key={item.title}>
                <Card bodyStyle={{ padding: '20px 24px' }}>
                  <Statistic
                    title={<span style={{ fontSize: 13, color: '#8c8c8c' }}>{item.title}</span>}
                    value={item.value}
                    formatter={(v) => <CountUp to={Number(v)} decimals={item.isAmount ? 2 : 0} duration={1.6} />}
                    prefix={item.isAmount ? '¥' : undefined}
                    valueStyle={{ fontWeight: 600 }}
                  />
                </Card>
              </Col>
            ))}
          </Row>
        </FadeContent>
      )}

      {/* 次要指标:6 个小字 Statistic,紧凑排列 */}
      {!overview.failed && minorKpis.length > 0 && (
        <Card size="small" style={{ marginTop: 16 }}>
          <Row gutter={[16, 12]}>
            {minorKpis.map((item) => (
              <Col xs={12} sm={8} lg={4} key={item.title}>
                <Statistic
                  title={<span style={{ fontSize: 12 }}>{item.title}</span>}
                  value={item.value}
                  formatter={(v) => <CountUp to={Number(v)} decimals={item.isAmount ? 2 : 0} duration={1.6} />}
                  prefix={item.isAmount ? '¥' : undefined}
                  valueStyle={{ fontSize: 18 }}
                />
              </Col>
            ))}
          </Row>
        </Card>
      )}

      {/* AI 经营洞察:入口内嵌在指标下方,看完数字直接读分析。
          洞察是全公司口径,只对能加载出销售趋势图的用户显示(与公司级 BI 同一批角色,
          服务端同样校验);AI 总开关关闭时不出现 */}
      {aiEnabled && Array.isArray(trend.data) && !overview.failed && coreKpis.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <AiInsightCard />
        </div>
      )}

      {/* 图表区:回款趋势(折线)+ 商机漏斗(漏斗) */}
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
                <Chart
                  height={300}
                  option={lineOption('回款趋势', trendPoints.map((p) => p.date.slice(5)), [
                    { name: '回款金额', data: trendPoints.map((p) => toAmount(p.amount)) },
                  ])}
                />
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
                <Chart
                  height={300}
                  option={funnelOption('商机漏斗', funnelPoints.map((p) => ({ name: stageLabel(p.stage), value: p.count })))}
                />
              </SectionCard>
            </Col>
          )}
        </Row>
      )}

      {/* 图表区:客户分布(环形)+ 财务概览 */}
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
                <Chart
                  height={300}
                  option={pieOption('客户分布', distributionPoints.map((p) => ({ name: p.label || '未知', value: p.count })))}
                />
              </SectionCard>
            </Col>
          )}
          {!finance.failed && (
            <Col xs={24} lg={12}>
              {/* React Bits FadeContent: 财务卡入场显现 */}
              <FadeContent duration={600}>
                <SectionCard title="财务概览" loading={finance.loading} failed={finance.failed} empty={!fin}>
                  {fin && (
                    <Row gutter={[16, 16]}>
                      <Col span={12}>
                        <Statistic
                          title="采购金额"
                          value={toAmount(fin.purchase_amount)}
                          formatter={(v) => <CountUp to={Number(v)} decimals={2} duration={1.6} />}
                          prefix="¥"
                        />
                      </Col>
                      <Col span={12}>
                        <Statistic
                          title="销售金额"
                          value={toAmount(fin.sales_amount)}
                          formatter={(v) => <CountUp to={Number(v)} decimals={2} duration={1.6} />}
                          prefix="¥"
                        />
                      </Col>
                      <Col span={12}>
                        <Statistic
                          title="回款金额"
                          value={toAmount(fin.received_amount)}
                          formatter={(v) => <CountUp to={Number(v)} decimals={2} duration={1.6} />}
                          prefix="¥"
                        />
                      </Col>
                      <Col span={12}>
                        <Statistic
                          title="库存货值"
                          value={toAmount(fin.stock_value)}
                          formatter={(v) => <CountUp to={Number(v)} decimals={2} duration={1.6} />}
                          prefix="¥"
                        />
                      </Col>
                    </Row>
                  )}
                </SectionCard>
              </FadeContent>
            </Col>
          )}
        </Row>
      )}
    </div>
  )
}
