import { useEffect, useMemo, useRef, useState } from 'react'
import { Tag } from 'antd'
import { ProTable, type ActionType, type ProColumns } from '@ant-design/pro-components'
import { listEnabledWarehouses, listStockMovements } from '../../../services/psi'
import type { PsiStockMovement, PsiWarehouse } from '../../../types/psi'

const BIZ_TYPE_MAP: Record<string, { label: string; color: string }> = {
  PURCHASE_IN: { label: '采购入库', color: 'green' },
  SALE_OUT: { label: '销售出库', color: 'red' },
  RETURN_OUT: { label: '采购退货', color: 'orange' },
  RETURN_IN: { label: '销售退货', color: 'blue' },
  OTHER_IN: { label: '其他入库', color: 'cyan' },
  OTHER_OUT: { label: '其他出库', color: 'purple' },
}

export default function MovementPage() {
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

  const columns: ProColumns<PsiStockMovement>[] = [
    { title: '编号', valueType: 'indexBorder', width: 70, search: false },
    { title: '单号', dataIndex: 'biz_order_no', width: 180, search: false },
    {
      title: '业务类型',
      dataIndex: 'biz_type',
      width: 110,
      valueType: 'select',
      fieldProps: {
        allowClear: true,
        placeholder: '选择业务类型',
        options: Object.entries(BIZ_TYPE_MAP).map(([value, v]) => ({
          label: v.label,
          value,
        })),
      },
      render: (_, record) => {
        const conf = BIZ_TYPE_MAP[record.biz_type]
        return conf ? <Tag color={conf.color}>{conf.label}</Tag> : record.biz_type
      },
    },
    { title: '商品', dataIndex: 'product_id', width: 100, search: false },
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
      title: '入库',
      dataIndex: 'in_qty',
      width: 100,
      search: false,
      render: (_, record) =>
        Number(record.in_qty) > 0 ? (
          <span style={{ color: '#52c41a' }}>+{record.in_qty}</span>
        ) : (
          '-'
        ),
    },
    {
      title: '出库',
      dataIndex: 'out_qty',
      width: 100,
      search: false,
      render: (_, record) =>
        Number(record.out_qty) > 0 ? (
          <span style={{ color: '#f5222d' }}>-{record.out_qty}</span>
        ) : (
          '-'
        ),
    },
    { title: '结余', dataIndex: 'balance_after', width: 100, search: false },
    { title: '单价', dataIndex: 'unit_cost', width: 100, search: false },
    { title: '备注', dataIndex: 'remark', width: 160, search: false },
    {
      title: '时间',
      dataIndex: 'created_at',
      valueType: 'dateTime',
      width: 170,
      search: false,
    },
  ]

  return (
    <ProTable<PsiStockMovement>
      rowKey="id"
      actionRef={actionRef}
      columns={columns}
      scroll={{ x: 'max-content' }}
      request={async ({ current, pageSize, ...rest }) => {
        const res = await listStockMovements({ page: current, page_size: pageSize, ...rest })
        return { data: res.list, total: res.total, success: true }
      }}
      pagination={{ defaultPageSize: 10, showSizeChanger: true }}
      headerTitle="库存收发明细"
    />
  )
}
