import { useEffect, useState } from 'react'
import { Card, ErrorBlock, NavBar, Selector, SpinLoading, Tabs } from 'antd-mobile'
import { useNavigate } from 'react-router-dom'
import {
  getCustomerDistribution,
  getDashboardOverview,
  getEmployeeDistribution,
  getFinanceSummary,
  getFinanceTrend,
  getHeadcountTrend,
  getOpportunityFunnel,
  getSalesRanking,
  getSalesTrend,
  getStockValueByWarehouse,
} from '../../services/dashboard'
import type {
  DashboardDistItem,
  DashboardFunnelStage,
  DashboardOverview,
  DashboardSalesRankingItem,
  DashboardTrendPoint,
} from '../../types/dashboard'
import { BarChart, FunnelChart, LineChart, PieChart } from '../../components/Chart'

const STAGE_LABEL: Record<string, string> = {
  PROSPECTING: '初步接触', QUALIFIED: '需求确认', PROPOSAL: '方案报价',
  NEGOTIATION: '谈判', WON: '赢单', LOST: '输单',
}

const DIM_OPTIONS = [
  { label: '级别', value: 'level' }, { label: '来源', value: 'source' },
  { label: '行业', value: 'industry' }, { label: '状态', value: 'status' },
]

const fmtMoney = (v?: string | number) => {
  const n = Number(v || 0)
  return n.toLocaleString('zh-CN', { notation: 'compact', maximumFractionDigits: 1 })
}

type TabKey = 'crm' | 'finance' | 'hrm' | 'psi'

export default function DashboardPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<TabKey>('crm')

  // CRM
  const [loading, setLoading] = useState(true)
  const [overview, setOverview] = useState<DashboardOverview | null>(null)
  const [trend, setTrend] = useState<DashboardTrendPoint[]>([])
  const [funnel, setFunnel] = useState<DashboardFunnelStage[]>([])
  const [dist, setDist] = useState<DashboardDistItem[]>([])
  const [ranking, setRanking] = useState<DashboardSalesRankingItem[]>([])
  const [dim, setDim] = useState('level')

  // 财务/人事/进销存
  const [financeTrend, setFinanceTrend] = useState<any[]>([])
  const [financeSummary, setFinanceSummary] = useState<Record<string, any> | null>(null)
  const [empDist, setEmpDist] = useState<DashboardDistItem[]>([])
  const [headcount, setHeadcount] = useState<any[]>([])
  const [stockValue, setStockValue] = useState<DashboardDistItem[]>([])

  // CRM 数据
  useEffect(() => {
    setLoading(true)
    Promise.all([
      getDashboardOverview().catch(() => null),
      getSalesTrend(30).catch(() => []),
      getOpportunityFunnel().catch(() => []),
      getSalesRanking(10).catch(() => []),
    ]).then(([ov, tr, fn, rk]) => {
      if (ov) setOverview(ov)
      setTrend(tr || [])
      setFunnel(fn || [])
      setRanking(rk || [])
    }).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    getCustomerDistribution(dim as 'level' | 'source' | 'industry' | 'status').then((r) => setDist(r || [])).catch(() => {})
  }, [dim])

  // 财务
  useEffect(() => {
    if (tab !== 'finance') return
    getFinanceTrend(6).then((r) => setFinanceTrend(r || [])).catch(() => {})
    if (!financeSummary) getFinanceSummary().then(setFinanceSummary).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  // 人事
  useEffect(() => {
    if (tab !== 'hrm') return
    getEmployeeDistribution('dept').then((r) => setEmpDist(r || [])).catch(() => {})
    getHeadcountTrend(6).then((r) => setHeadcount(r || [])).catch(() => {})
  }, [tab])

  // 进销存
  useEffect(() => {
    if (tab !== 'psi') return
    getStockValueByWarehouse().then((r) => setStockValue(r || [])).catch(() => {})
  }, [tab])

  const kpis = overview
    ? [
        { label: '客户总数', value: String(overview.customer_total) },
        { label: '公海客户', value: String(overview.customer_public) },
        { label: '商机总数', value: String(overview.opportunity_total) },
        { label: '赢单商机', value: String(overview.opportunity_won) },
        { label: '合同金额', value: fmtMoney(overview.contract_amount) },
        { label: '回款金额', value: fmtMoney(overview.received_amount) },
        { label: '待审批', value: String(overview.approval_pending) },
        { label: '库存预警', value: String(overview.stock_warning) },
      ]
    : []

  const Empty = () => <div style={{ color: 'var(--text-tertiary)', fontSize: 13, padding: 16 }}>暂无数据</div>

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%', paddingBottom: 24 }}>
      <NavBar onBack={() => navigate(-1)}>数据看板</NavBar>
      <Tabs activeKey={tab} onChange={(k) => setTab(k as TabKey)}>
        <Tabs.Tab title="销售" key="crm" />
        <Tabs.Tab title="财务" key="finance" />
        <Tabs.Tab title="人事" key="hrm" />
        <Tabs.Tab title="进销存" key="psi" />
      </Tabs>

      {tab === 'crm' && (
        loading ? (
          <div style={{ textAlign: 'center', padding: 60 }}><SpinLoading style={{ '--size': '36px' }} /></div>
        ) : (
          <>
            {kpis.length > 0 && (
              <div style={{ margin: 8, padding: 12, background: 'var(--bg-card)', borderRadius: 12, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {kpis.map((k) => (
                  <div key={k.label} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--brand)' }}>{k.value}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{k.label}</div>
                  </div>
                ))}
              </div>
            )}
            <Card title="回款趋势(近30天)" style={{ margin: 8 }}>
              {trend.length === 0 ? <Empty /> : (
                <LineChart categories={trend.map((t) => t.date.slice(5))} series={[{ name: '回款额', data: trend.map((t) => Number(t.amount || 0)) }]} />
              )}
            </Card>
            <Card title="商机漏斗" style={{ margin: 8 }}>
              {funnel.length === 0 ? <Empty /> : (
                <FunnelChart data={funnel.map((f) => ({ name: STAGE_LABEL[f.stage] || f.stage, value: f.count }))} />
              )}
            </Card>
            <Card title="客户分布" style={{ margin: 8 }} extra={
              <Selector options={DIM_OPTIONS} value={[dim]} onChange={(arr) => arr[0] && setDim(arr[0] as string)} style={{ '--color': 'var(--brand)' } as any} />
            }>
              {dist.length === 0 ? <Empty /> : <PieChart data={dist.map((d) => ({ name: d.label, value: d.count }))} />}
            </Card>
            <Card title="销售业绩排行 TOP10" style={{ margin: 8 }}>
              {ranking.length === 0 ? <Empty /> : (
                <BarChart horizontal height={Math.max(240, ranking.length * 32)} categories={ranking.map((r) => r.owner_name || `用户${r.owner_id}`)} series={[{ name: '销售额', data: ranking.map((r) => Number(r.amount || 0)) }]} />
              )}
            </Card>
            {kpis.length === 0 && trend.length === 0 && <div style={{ paddingTop: 60 }}><ErrorBlock status="empty" description="暂无数据" /></div>}
          </>
        )
      )}

      {tab === 'finance' && (
        <>
          {financeSummary && (
            <div style={{ margin: 8, padding: 12, background: 'var(--bg-card)', borderRadius: 12, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {Object.entries(financeSummary).slice(0, 6).map(([k, v]) => (
                <div key={k} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--brand)' }}>{fmtMoney(v as any)}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{k}</div>
                </div>
              ))}
            </div>
          )}
          <Card title="财务趋势(近6月)" style={{ margin: 8 }}>
            {financeTrend.length === 0 ? <Empty /> : (
              <LineChart
                categories={financeTrend.map((t) => (t.month || '').toString())}
                series={[
                  { name: '收入', data: financeTrend.map((t) => Number(t.income || t.amount || 0)) },
                  { name: '支出', data: financeTrend.map((t) => Number(t.expense || 0)) },
                ].filter((s) => s.data.some((d) => d > 0))}
              />
            )}
          </Card>
        </>
      )}

      {tab === 'hrm' && (
        <>
          <Card title="员工分布(按部门)" style={{ margin: 8 }}>
            {empDist.length === 0 ? <Empty /> : <PieChart data={empDist.map((d) => ({ name: d.label, value: d.count }))} />}
          </Card>
          <Card title="人数趋势(近6月)" style={{ margin: 8 }}>
            {headcount.length === 0 ? <Empty /> : (
              <LineChart categories={headcount.map((t) => (t.month || '').toString())} series={[{ name: '人数', data: headcount.map((t) => Number(t.count || t.amount || 0)) }]} />
            )}
          </Card>
        </>
      )}

      {tab === 'psi' && (
        <Card title="各仓库库存价值" style={{ margin: 8 }}>
          {stockValue.length === 0 ? <Empty /> : (
            <BarChart horizontal height={Math.max(240, stockValue.length * 36)} categories={stockValue.map((s) => s.label)} series={[{ name: '库存价值', data: stockValue.map((s) => Number(s.count || 0)) }]} />
          )}
        </Card>
      )}
    </div>
  )
}
