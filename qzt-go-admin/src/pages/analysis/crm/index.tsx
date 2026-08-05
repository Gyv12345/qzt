import { useEffect, useState } from 'react'
import { Card, Col, Row, Select } from 'antd'
import Chart, { barOption, funnelOption, lineOption, pieOption } from '../../../components/Chart'
import {
  getContractTrend,
  getCustomerDistribution,
  getLeadSourceDistribution,
  getOpportunityFunnel,
  getSalesRanking,
  getSalesTrend,
} from '../../../services/dashboard'

const STAGE_LABELS: Record<string, string> = {
  PROSPECTING: '初步接触',
  QUALIFIED: '需求确认',
  PROPOSAL: '方案报价',
  NEGOTIATION: '谈判',
  WON: '赢单',
  LOST: '输单',
}

/** 加载数据的 hook */
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

export default function CrmAnalysis() {
  const [dim, setDim] = useState<string>('level')

  const funnel = useData(getOpportunityFunnel)
  const trend = useData(() => getSalesTrend(30))
  const contractTrend = useData(() => getContractTrend(6))
  const ranking = useData(() => getSalesRanking(10))
  const leadSrc = useData(getLeadSourceDistribution)
  const dist = useData(() => getCustomerDistribution(dim), [dim])

  return (
    <Row gutter={[16, 16]}>
      {/* 客户分布 */}
      <Col xs={24} lg={12}>
        <Card title="客户分布" extra={<Select size="small" value={dim} onChange={setDim}
          options={[{value:'level',label:'按等级'},{value:'source',label:'按来源'},{value:'industry',label:'按行业'},{value:'status',label:'按状态'}]} />}>
          <Chart loading={dist.loading} option={pieOption('客户分布',
            (dist.data ?? []).map((d) => ({ name: d.label || '未知', value: d.count })),
          )} />
        </Card>
      </Col>
      {/* 商机漏斗 */}
      <Col xs={24} lg={12}>
        <Card title="商机漏斗">
          <Chart loading={funnel.loading} option={funnelOption('商机漏斗',
            (funnel.data ?? []).map((f) => ({ name: STAGE_LABELS[f.stage] || f.stage, value: Number(f.count) })),
          )} />
        </Card>
      </Col>
      {/* 回款趋势 */}
      <Col xs={24} lg={12}>
        <Card title="近 30 天回款趋势">
          <Chart loading={trend.loading} option={lineOption('回款趋势',
            (trend.data ?? []).map((t) => t.date.slice(5)),
            [{ name: '回款金额', data: (trend.data ?? []).map((t) => Number(t.amount)) }],
          )} />
        </Card>
      </Col>
      {/* 合同签约趋势 */}
      <Col xs={24} lg={12}>
        <Card title="近 6 月合同签约趋势">
          <Chart loading={contractTrend.loading} option={lineOption('合同趋势',
            (contractTrend.data ?? []).map((t) => t.month),
            [{ name: '签约金额', data: (contractTrend.data ?? []).map((t) => Number(t.amount)) }],
          )} />
        </Card>
      </Col>
      {/* 销售排行 */}
      <Col xs={24} lg={12}>
        <Card title="销售业绩排行 TOP10">
          <Chart loading={ranking.loading} option={barOption('销售排行',
            (ranking.data ?? []).map((r) => r.owner_name || `#${r.owner_id}`),
            [{ name: '合同总额', data: (ranking.data ?? []).map((r) => Number(r.amount)) }],
            true,
          )} />
        </Card>
      </Col>
      {/* 线索来源 */}
      <Col xs={24} lg={12}>
        <Card title="线索来源分布">
          <Chart loading={leadSrc.loading} option={pieOption('线索来源',
            (leadSrc.data ?? []).map((d) => ({ name: d.label || '未知', value: Number(d.value) })),
          )} />
        </Card>
      </Col>
    </Row>
  )
}
