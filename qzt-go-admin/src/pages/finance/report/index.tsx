import { useState } from 'react'
import { App, Button, Card, DatePicker, Descriptions, Space, Spin } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import { getBalanceSheet, getIncomeStatement } from '../../../services/finance'
import type { BalanceSheet, IncomeStatement } from '../../../types/finance'

const { RangePicker } = DatePicker

export default function ReportPage() {
  const { message } = App.useApp()
  const [range, setRange] = useState<[Dayjs, Dayjs]>([
    dayjs().startOf('month'),
    dayjs().endOf('month'),
  ])
  const [loading, setLoading] = useState(false)
  const [income, setIncome] = useState<IncomeStatement | null>(null)
  const [balance, setBalance] = useState<BalanceSheet | null>(null)

  const fetchData = async () => {
    if (!range || range.length < 2) {
      message.warning('请选择日期范围')
      return
    }
    setLoading(true)
    try {
      const start = range[0].format('YYYY-MM-DD')
      const end = range[1].format('YYYY-MM-DD')
      const [inc, bal] = await Promise.all([
        getIncomeStatement({ start_date: start, end_date: end }),
        getBalanceSheet({ end_date: end }),
      ])
      setIncome(inc)
      setBalance(bal)
    } catch {
      // 拦截器已弹错误提示
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <Card
        title="财务报表"
        extra={
          <Space>
            <RangePicker
              value={range}
              onChange={(vals) => {
                if (vals && vals[0] && vals[1]) setRange([vals[0], vals[1]])
              }}
              allowClear={false}
            />
            <Button type="primary" loading={loading} onClick={fetchData}>
              查询
            </Button>
          </Space>
        }
      >
        <Spin spinning={loading}>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Card type="inner" title={`利润表(${range[0].format('YYYY-MM-DD')} 至 ${range[1].format('YYYY-MM-DD')})`}>
              <Descriptions column={2} bordered size="small">
                <Descriptions.Item label="营业收入">{income?.revenue ?? '-'}</Descriptions.Item>
                <Descriptions.Item label="营业成本">{income?.cogs ?? '-'}</Descriptions.Item>
                <Descriptions.Item label="毛利润">{income?.gross_profit ?? '-'}</Descriptions.Item>
                <Descriptions.Item label="净利润">{income?.net_profit ?? '-'}</Descriptions.Item>
              </Descriptions>
            </Card>
            <Card type="inner" title={`资产负债表(截至 ${range[1].format('YYYY-MM-DD')})`}>
              <Descriptions column={2} bordered size="small">
                <Descriptions.Item label="资产总额">{balance?.total_assets ?? '-'}</Descriptions.Item>
                <Descriptions.Item label="负债总额">{balance?.total_liabilities ?? '-'}</Descriptions.Item>
                <Descriptions.Item label="所有者权益">{balance?.total_equity ?? '-'}</Descriptions.Item>
              </Descriptions>
            </Card>
          </Space>
        </Spin>
      </Card>
    </div>
  )
}
