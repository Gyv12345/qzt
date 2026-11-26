import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from 'antd'
import dayjs from 'dayjs'
import { LogoutOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import Chart from '../../components/Chart'
import CountUp from '../../components/reactbits/CountUp'
import { useDictStore } from '../../stores/dict'
import { getContractStats } from '../../services/crm'
import { getDashboardOverview, getOpportunityFunnel, getSalesTrend } from '../../services/dashboard'
import type {
  DashboardFunnelPoint,
  DashboardOverview,
  DashboardTrendPoint,
} from '../../types/dashboard'
import type { CrmContractStats } from '../../types/crm'
import { funnelDarkOption, stageBarOption, trendOption } from './charts'
import './bigscreen.css'

// 金额字段后端以字符串(decimal)返回
const toAmount = (value?: string) => Number(value) || 0

// 商机阶段英文 code → 中文(与工作台 /dashboard 口径一致)
const STAGE_LABELS: Record<string, string> = {
  LEAD: '线索',
  NEGOTIATION: '洽谈',
  PROPOSAL: '方案',
  WON: '赢单',
  LOST: '输单',
}

// 设计稿 1920×1080,等比缩放适配视口(1440+ 宽整屏无裁切)
const DESIGN_W = 1920
const DESIGN_H = 1080

// 各面板高度(设计稿像素)。画布固定 1080 高,body 内容高 = 1080-68(顶栏)-30(上下留白) = 982
const TREND_PANEL_H = 556
const FUNNEL_PANEL_H = 982 - TREND_PANEL_H - 14 // 412
const STAGE_PANEL_H = 440
const EXPIRE_PANEL_H = 982 - STAGE_PANEL_H - 14 // 528
// 面板头(约 37px)+ 面板体内边距(14px) = 图表高度扣减
const CHART_H = 51

const WEEK_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

/** 到期合同行(来自 /crm/contracts/stats 的 expiring) */
interface ExpiringRow {
  id: number
  name: string
  customer_name: string
  end_date: string
  days_left: number
}

function daysClass(daysLeft: number) {
  if (daysLeft < 7) return 'bs-days danger'
  if (daysLeft <= 30) return 'bs-days warn'
  return 'bs-days'
}

function daysText(daysLeft: number) {
  if (daysLeft < 0) return '已过期'
  return `剩 ${daysLeft} 天`
}

export default function BigScreen() {
  const navigate = useNavigate()
  const dictLabel = useDictStore((s) => s.label)

  // ── 视口等比缩放 ──
  const [scale, setScale] = useState(1)
  useEffect(() => {
    const update = () => setScale(Math.min(window.innerWidth / DESIGN_W, window.innerHeight / DESIGN_H))
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  // ── 实时时钟(每秒) ──
  const [now, setNow] = useState(() => dayjs())
  useEffect(() => {
    const timer = setInterval(() => setNow(dayjs()), 1000)
    return () => clearInterval(timer)
  }, [])

  // ── 数据(60 秒自动刷新;失败保留旧值,不弹 toast) ──
  const [overview, setOverview] = useState<DashboardOverview | null>(null)
  const [trend, setTrend] = useState<DashboardTrendPoint[]>([])
  const [funnel, setFunnel] = useState<DashboardFunnelPoint[]>([])
  const [stats, setStats] = useState<CrmContractStats | null>(null)
  const [ready, setReady] = useState(false)

  const loadAll = useCallback(() => {
    Promise.allSettled([
      getDashboardOverview().then(setOverview),
      getSalesTrend(30).then(setTrend),
      getOpportunityFunnel().then(setFunnel),
      getContractStats(true).then(setStats),
    ]).finally(() => setReady(true))
  }, [])

  useEffect(() => {
    loadAll()
    const timer = setInterval(loadAll, 60_000)
    return () => clearInterval(timer)
  }, [loadAll])

  // ── 派生数据 ──
  const kpis = useMemo(() => {
    if (!overview) return []
    return [
      { label: '合同总额', value: toAmount(overview.contract_amount), amount: true },
      { label: '累计回款', value: toAmount(overview.received_amount), amount: true },
      { label: '客户总数', value: overview.customer_total, amount: false },
      { label: '商机总数', value: overview.opportunity_total, amount: false },
      { label: '赢单商机', value: overview.opportunity_won, amount: false },
      { label: '合同总数', value: overview.contract_total, amount: false },
      { label: '待办审批', value: overview.approval_pending, amount: false },
      { label: '公海客户', value: overview.customer_public, amount: false },
    ]
  }, [overview])

  const stageBar = useMemo(() => {
    const rows = stats?.by_stage ?? []
    return {
      categories: rows.map((s) => dictLabel('CONTRACT_STAGE', s.stage)),
      values: rows.map((s) => toAmount(s.amount)),
    }
  }, [stats, dictLabel])

  // 到期合同:取前 8 条;条数较多时滚动播放
  const expiring: ExpiringRow[] = useMemo(() => (stats?.expiring ?? []).slice(0, 8), [stats])
  const expiringScrolling = expiring.length >= 6

  const trendChartOption = useMemo(() => trendOption(trend), [trend])
  const funnelChartOption = useMemo(
    () => funnelDarkOption(funnel, (stage) => STAGE_LABELS[stage] ?? stage),
    [funnel],
  )
  const stageBarChartOption = useMemo(
    () => stageBarOption(stageBar.categories, stageBar.values),
    [stageBar],
  )

  const clockDate = now.format('YYYY-MM-DD')
  const clockTime = now.format('HH:mm:ss')
  const clockWeek = WEEK_LABELS[now.day()]

  return (
    <div className="bs-viewport">
      <div className="bs-canvas" style={{ transform: `scale(${scale})` }}>
        {/* 顶部标题栏 */}
        <header className="bs-header">
          <div className="bs-header-left">
            <span className="bs-clock">
              {clockDate} {clockWeek}
              <strong>{clockTime}</strong>
            </span>
          </div>
          <h1 className="bs-title">行简 · 经营数据大屏</h1>
          <div className="bs-header-right">
            <Button
              className="bs-exit-btn"
              size="small"
              icon={<LogoutOutlined />}
              onClick={() => navigate('/dashboard')}
            >
              退出
            </Button>
          </div>
        </header>

        {/* 三列主体 */}
        <div className="bs-body">
          {/* 左列:核心 KPI */}
          <div className="bs-col">
            <div className="bs-kpi-grid">
              {kpis.length === 0 && <div className="bs-empty">{ready ? '暂无数据' : '数据加载中…'}</div>}
              {kpis.map((k) => (
                <div className="bs-kpi" key={k.label}>
                  <span className="bs-kpi-label">{k.label}</span>
                  <div className={`bs-kpi-value${k.amount ? ' is-amount' : ''}`}>
                    {k.amount ? '¥' : ''}
                    <CountUp to={k.value} decimals={k.amount ? 2 : 0} duration={1.6} />
                    {k.amount && <span className="bs-kpi-unit">元</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 中列:销售趋势 + 商机漏斗 */}
          <div className="bs-col">
            <section className="bs-panel" style={{ height: TREND_PANEL_H }}>
              <div className="bs-panel-head">近 30 天销售趋势</div>
              <div className="bs-panel-body">
                {trend.length === 0 ? (
                  <div className="bs-empty">{ready ? '暂无数据' : '数据加载中…'}</div>
                ) : (
                  <Chart option={trendChartOption} height={TREND_PANEL_H - CHART_H} />
                )}
              </div>
            </section>
            <section className="bs-panel" style={{ height: FUNNEL_PANEL_H }}>
              <div className="bs-panel-head">商机漏斗</div>
              <div className="bs-panel-body">
                {funnel.length === 0 ? (
                  <div className="bs-empty">{ready ? '暂无数据' : '数据加载中…'}</div>
                ) : (
                  <Chart option={funnelChartOption} height={FUNNEL_PANEL_H - CHART_H} />
                )}
              </div>
            </section>
          </div>

          {/* 右列:阶段合同金额 + 到期合同 */}
          <div className="bs-col">
            <section className="bs-panel" style={{ height: STAGE_PANEL_H }}>
              <div className="bs-panel-head">各阶段合同金额</div>
              <div className="bs-panel-body">
                {stageBar.values.length === 0 ? (
                  <div className="bs-empty">{ready ? '暂无数据' : '数据加载中…'}</div>
                ) : (
                  <Chart option={stageBarChartOption} height={STAGE_PANEL_H - CHART_H} />
                )}
              </div>
            </section>
            <section className="bs-panel" style={{ height: EXPIRE_PANEL_H }}>
              <div className="bs-panel-head">到期合同提醒</div>
              <div className="bs-panel-body">
                {expiring.length === 0 ? (
                  <div className="bs-empty">{ready ? '暂无到期合同' : '数据加载中…'}</div>
                ) : (
                  <div className="bs-list">
                    <div className={`bs-list-track${expiringScrolling ? ' is-scrolling' : ''}`}>
                      {expiring.concat(expiringScrolling ? expiring : []).map((item, idx) => (
                        <div className="bs-row" key={`${item.id}-${idx}`}>
                          <div className="bs-row-name">
                            <b>{item.name}</b>
                            <span>{item.customer_name}</span>
                          </div>
                          <div className="bs-row-date">{item.end_date?.slice(0, 10) || '-'}</div>
                          <div style={{ textAlign: 'center' }}>
                            <span className={daysClass(item.days_left)}>{daysText(item.days_left)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
