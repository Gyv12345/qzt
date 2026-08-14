import { useEffect, useMemo, useState } from 'react'
import { Button, Card, DatePicker, Empty, Select, Space, Table } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import { getPurchaseSummary, getSalesRanking, listEnabledWarehouses } from '../../../services/psi'
import type { PsiPurchaseSummaryItem, PsiSalesRankItem, PsiWarehouse } from '../../../types/psi'

const { RangePicker } = DatePicker

type DateRange = [Dayjs, Dayjs]

const formatRange = (range: DateRange) => ({
  start_date: range[0].format('YYYY-MM-DD'),
  end_date: range[1].format('YYYY-MM-DD'),
})

export default function PsiReportPage() {
  // 采购汇总
  const [summaryRange, setSummaryRange] = useState<DateRange>([dayjs().startOf('month'), dayjs()])
  const [summary, setSummary] = useState<PsiPurchaseSummaryItem[]>([])
  const [summaryLoading, setSummaryLoading] = useState(false)

  // 商品销量排行
  const [rankRange, setRankRange] = useState<DateRange>([dayjs().startOf('month'), dayjs()])
  const [rankWarehouseId, setRankWarehouseId] = useState<number | undefined>(undefined)
  const [ranking, setRanking] = useState<PsiSalesRankItem[]>([])
  const [rankLoading, setRankLoading] = useState(false)
  const [warehouses, setWarehouses] = useState<PsiWarehouse[]>([])
  const warehouseOptions = useMemo(
    () => warehouses.map((w) => ({ label: w.name, value: w.id })),
    [warehouses],
  )

  const loadSummary = async () => {
    setSummaryLoading(true)
    try {
      const res = await getPurchaseSummary(formatRange(summaryRange))
      setSummary(res ?? [])
    } catch {
      // 拦截器已提示错误
    } finally {
      setSummaryLoading(false)
    }
  }

  const loadRanking = async () => {
    setRankLoading(true)
    try {
      const res = await getSalesRanking({
        warehouse_id: rankWarehouseId,
        ...formatRange(rankRange),
      })
      setRanking(res ?? [])
    } catch {
      // 拦截器已提示错误
    } finally {
      setRankLoading(false)
    }
  }

  useEffect(() => {
    loadSummary().catch(() => {})
    loadRanking().catch(() => {})
    listEnabledWarehouses().then(setWarehouses).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const summaryColumns = [
    {
      title: '日期',
      dataIndex: 'date',
      width: 160,
      // 后端聚合返回 DATE 类型被序列化成 ISO 串(2026-08-04T00:00:00+08:00),截日期部分展示
      render: (v: string) => (v ? v.slice(0, 10) : '-'),
    },
    { title: '单数', dataIndex: 'count', width: 120 },
    { title: '金额', dataIndex: 'amount', width: 160 },
  ]

  const totalCount = summary.reduce((sum, it) => sum + (it.count ?? 0), 0)
  const totalAmount = summary.reduce((sum, it) => sum + Number(it.amount ?? 0), 0)

  const rankColumns = [
    {
      title: '排名',
      width: 80,
      render: (_: unknown, __: PsiSalesRankItem, index: number) => index + 1,
    },
    {
      title: '商品',
      dataIndex: 'product_name',
      width: 220,
      render: (_: unknown, record: PsiSalesRankItem) => record.product_name ?? record.product_id ?? '-',
    },
    { title: '数量', dataIndex: 'quantity', width: 120, render: (v?: string) => v ?? '-' },
    { title: '金额', dataIndex: 'amount', width: 160, render: (v?: string) => v ?? '-' },
  ]

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card
        title="采购汇总"
        extra={
          <Space>
            <RangePicker
              value={summaryRange}
              onChange={(v) => {
                if (v?.[0] && v[1]) setSummaryRange([v[0], v[1]])
              }}
              allowClear={false}
            />
            <Button type="primary" onClick={() => loadSummary()}>
              查询
            </Button>
          </Space>
        }
      >
        <Table<PsiPurchaseSummaryItem>
          rowKey="date"
          size="small"
          loading={summaryLoading}
          columns={summaryColumns}
          dataSource={summary}
          pagination={false}
          scroll={{ x: 'max-content' }}
          locale={{ emptyText: <Empty description="暂无采购数据" /> }}
          summary={() =>
            summary.length > 0 ? (
              <Table.Summary.Row>
                <Table.Summary.Cell index={0}>合计</Table.Summary.Cell>
                <Table.Summary.Cell index={1}>{totalCount}</Table.Summary.Cell>
                <Table.Summary.Cell index={2}>{totalAmount.toFixed(2)}</Table.Summary.Cell>
              </Table.Summary.Row>
            ) : null
          }
        />
      </Card>
      <Card
        title="商品销量排行"
        extra={
          <Space>
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="全部仓库"
              style={{ width: 180 }}
              options={warehouseOptions}
              value={rankWarehouseId}
              onChange={setRankWarehouseId}
            />
            <RangePicker
              value={rankRange}
              onChange={(v) => {
                if (v?.[0] && v[1]) setRankRange([v[0], v[1]])
              }}
              allowClear={false}
            />
            <Button type="primary" onClick={() => loadRanking()}>
              查询
            </Button>
          </Space>
        }
      >
        <Table<PsiSalesRankItem>
          rowKey={(r) => `${r.product_id ?? ''}-${r.product_name ?? ''}`}
          size="small"
          loading={rankLoading}
          columns={rankColumns}
          dataSource={ranking}
          pagination={false}
          scroll={{ x: 'max-content' }}
          locale={{ emptyText: <Empty description="暂无销量数据" /> }}
        />
      </Card>
    </Space>
  )
}
