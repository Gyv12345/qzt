import { useEffect, useState } from 'react'
import { Card, Col, Row, Statistic } from 'antd'
import Chart, { lineOption } from '../../../components/Chart'
import { getFinanceSummary, getFinanceTrend } from '../../../services/dashboard'

function useData<T>(loader: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    setLoading(true)
    loader().then(setData).catch(() => setData(null)).finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return { data, loading }
}

const money = (v: string | undefined) => `¥${Number(v ?? 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export default function FinanceAnalysis() {
  const summary = useData(() => getFinanceSummary())
  const trend = useData(() => getFinanceTrend(6))

  return (
    <Row gutter={[16, 16]}>
      {/* 核心指标 */}
      <Col xs={24}>
        <Card title="核心指标">
          <Row gutter={24}>
            <Col xs={12} sm={6}><Statistic title="采购总额" value={money(summary.data?.purchase_amount)} /></Col>
            <Col xs={12} sm={6}><Statistic title="销售总额" value={money(summary.data?.sales_amount)} /></Col>
            <Col xs={12} sm={6}><Statistic title="回款总额" value={money(summary.data?.received_amount)} valueStyle={{ color: '#52c41a' }} /></Col>
            <Col xs={12} sm={6}><Statistic title="库存总值" value={money(summary.data?.stock_value)} /></Col>
          </Row>
        </Card>
      </Col>
      {/* 收支趋势 */}
      <Col xs={24}>
        <Card title="近 6 月收支趋势">
          <Chart loading={trend.loading} height={360} option={lineOption('收支趋势',
            (trend.data ?? []).map((t) => t.month),
            [
              { name: '收入', data: (trend.data ?? []).map((t) => Number(t.income)) },
              { name: '支出', data: (trend.data ?? []).map((t) => Number(t.expense)) },
            ],
          )} />
        </Card>
      </Col>
    </Row>
  )
}
