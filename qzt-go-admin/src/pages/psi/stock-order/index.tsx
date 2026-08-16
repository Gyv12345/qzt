import { Tabs } from 'antd'
import StockOrderTable from './StockOrderTable'

/** 其他出入库单:入库单/出库单双 Tab(列表 + 新增 + 详情见 StockOrderTable) */
export default function StockOrderPage() {
  return (
    <Tabs
      items={[
        { key: 'in', label: '入库单', children: <StockOrderTable direction="in" /> },
        { key: 'out', label: '出库单', children: <StockOrderTable direction="out" /> },
      ]}
    />
  )
}
