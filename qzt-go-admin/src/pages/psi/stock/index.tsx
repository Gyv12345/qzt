import { useEffect, useMemo, useRef, useState } from 'react'
import { ProTable, type ActionType, type ProColumns } from '@ant-design/pro-components'
import { listEnabledWarehouses, listStock } from '../../../services/psi'
import type { PsiStock, PsiWarehouse } from '../../../types/psi'
import { pageIndexColumn } from '../../../components/IndexTag'

export default function StockPage() {
  const actionRef = useRef<ActionType>(null)
  const [warehouses, setWarehouses] = useState<PsiWarehouse[]>([])

  useEffect(() => {
    listEnabledWarehouses()
      .then(setWarehouses)
      .catch(() => {})
  }, [])

  const warehouseMap = useMemo(
    () => new Map(warehouses.map((w) => [w.id, w.name])),
    [warehouses],
  )

  const columns: ProColumns<PsiStock>[] = [
    pageIndexColumn(actionRef),
    {
      title: '商品',
      dataIndex: 'product_name',
      width: 180,
      search: false,
      render: (_, record) => record.product_name || `#${record.product_id}`,
    },
    { title: '商品编号', dataIndex: 'product_no', width: 140, search: false },
    { title: '分类', dataIndex: 'category', width: 120, search: false },
    { title: '单位', dataIndex: 'unit', width: 80, search: false },
    {
      title: '仓库',
      dataIndex: 'warehouse_id',
      width: 140,
      valueType: 'select',
      fieldProps: {
        allowClear: true,
        placeholder: '选择仓库',
        options: warehouses.map((w) => ({ label: w.name, value: w.id })),
      },
      render: (_, record) => warehouseMap.get(record.warehouse_id) ?? `#${record.warehouse_id}`,
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      width: 110,
      search: false,
      render: (_, record) =>
        Number(record.quantity) < Number(record.safety_stock) ? (
          <span style={{ color: '#f5222d', fontWeight: 600 }}>{record.quantity}</span>
        ) : (
          record.quantity
        ),
    },
    { title: '安全库存', dataIndex: 'safety_stock', width: 100, search: false },
    {
      title: '关键词',
      dataIndex: 'keyword',
      hideInTable: true,
      fieldProps: { placeholder: '商品名称/编号' },
    },
    {
      title: '只看低库存',
      dataIndex: 'low_stock',
      valueType: 'switch',
      hideInTable: true,
    },
  ]

  return (
    <ProTable<PsiStock>
      rowKey="id"
      actionRef={actionRef}
      columns={columns}
      scroll={{ x: 'max-content' }}
      request={async ({ current, pageSize, low_stock, ...rest }) => {
        const res = await listStock({
          page: current,
          page_size: pageSize,
          low_stock: low_stock ? true : undefined,
          ...rest,
        })
        return { data: res.list, total: res.total, success: true }
      }}
      pagination={{ defaultPageSize: 10, showSizeChanger: true }}
      headerTitle="库存结余"
    />
  )
}
