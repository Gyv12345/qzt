import { useEffect, useState } from 'react'
import { Card, Col, Row, Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import Chart, { barOption } from '../../../components/Chart'
import { getSalesVsPurchase, getStockValueByWarehouse } from '../../../services/dashboard'
import type { StockValueItem } from '../../../types/dashboard'

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

export default function PsiAnalysis() {
  const stock = useData(getStockValueByWarehouse)
  const svp = useData(() => getSalesVsPurchase(6))

  const stockCols: ColumnsType<StockValueItem> = [
    { title: '仓库', dataIndex: 'warehouse' },
    { title: '库存数量', dataIndex: 'quantity', align: 'right' },
    { title: '库存总值', dataIndex: 'stock_value', align: 'right', render: money },
  ]

  return (
    <Row gutter={[16, 16]}>
      {/* 仓库库存总值 */}
      <Col xs={24} lg={12}>
        <Card title="各仓库库存总值">
          <Chart loading={stock.loading} option={barOption('库存总值',
            (stock.data ?? []).map((s) => s.warehouse),
            [{ name: '库存总值', data: (stock.data ?? []).map((s) => Number(s.stock_value)) }],
            true,
          )} />
        </Card>
      </Col>
      {/* 采购vs销售 */}
      <Col xs={24} lg={12}>
        <Card title="近 6 月采购 vs 销售">
          <Chart loading={svp.loading} option={barOption('采购vs销售',
            (svp.data ?? []).map((s) => s.month),
            [
              { name: '采购额', data: (svp.data ?? []).map((s) => Number(s.purchase_amount)) },
              { name: '销售额', data: (svp.data ?? []).map((s) => Number(s.sales_amount)) },
            ],
          )} />
        </Card>
      </Col>
      {/* 仓库明细表 */}
      <Col xs={24}>
        <Card title="仓库库存明细">
          <Table<StockValueItem> rowKey="warehouse" size="small" loading={stock.loading}
            columns={stockCols} dataSource={stock.data ?? []} pagination={false} />
        </Card>
      </Col>
    </Row>
  )
}
