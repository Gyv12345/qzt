import { useEffect, useState } from 'react'
import { Card, Col, DatePicker, Row, Select } from 'antd'
import dayjs from 'dayjs'
import Chart, { barOption, lineOption, pieOption } from '../../../components/Chart'
import {
  getAttendanceSummary,
  getEmployeeDistribution,
  getHeadcountTrend,
} from '../../../services/dashboard'

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

export default function HrmAnalysis() {
  const [dim, setDim] = useState<'department' | 'gender' | 'status'>('department')
  const [month, setMonth] = useState(dayjs().format('YYYY-MM'))

  const dist = useData(() => getEmployeeDistribution(dim), [dim])
  const trend = useData(() => getHeadcountTrend(6), [])
  const att = useData(() => getAttendanceSummary(month), [month])

  return (
    <Row gutter={[16, 16]}>
      {/* 员工分布 */}
      <Col xs={24} lg={12}>
        <Card title="员工分布" extra={
          <Select size="small" value={dim} onChange={setDim}
            options={[{value:'department',label:'按部门'},{value:'gender',label:'按性别'},{value:'status',label:'按状态'}]} />
        }>
          <Chart loading={dist.loading} option={pieOption('员工分布',
            (dist.data ?? []).map((d) => ({ name: d.label || '未知', value: Number(d.value) })),
          )} />
        </Card>
      </Col>
      {/* 入职趋势 */}
      <Col xs={24} lg={12}>
        <Card title="近 6 月入职趋势">
          <Chart loading={trend.loading} option={lineOption('入职趋势',
            (trend.data ?? []).map((t) => t.month),
            [{ name: '入职人数', data: (trend.data ?? []).map((t) => Number(t.count)) }],
          )} />
        </Card>
      </Col>
      {/* 考勤汇总 */}
      <Col xs={24}>
        <Card title="月度考勤汇总" extra={
          <DatePicker picker="month" size="small" value={dayjs(month)} onChange={(v) => v && setMonth(v.format('YYYY-MM'))} />
        }>
          <Chart loading={att.loading} height={360} option={barOption('考勤汇总',
            (att.data ?? []).map((a) => a.department),
            [
              { name: '请假天数', data: (att.data ?? []).map((a) => Number(a.leave_days)) },
              { name: '加班小时', data: (att.data ?? []).map((a) => Number(a.ot_hours)) },
            ],
          )} />
        </Card>
      </Col>
    </Row>
  )
}
