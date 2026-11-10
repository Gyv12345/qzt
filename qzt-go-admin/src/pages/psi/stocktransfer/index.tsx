import { useEffect, useMemo, useRef, useState } from 'react'
import { App, Button, Drawer, Descriptions, Form, Space, Table, Tag } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import {
  ModalForm,
  ProFormDatePicker,
  ProFormDependency,
  ProFormDigit,
  ProFormList,
  ProFormSelect,
  ProFormText,
  ProFormTextArea,
  ProTable,
  type ActionType,
  type ProColumns,
} from '@ant-design/pro-components'
import Auth from '../../../components/Auth'
import { listProducts, listProductSkus } from '../../../services/crm'
import {
  cancelStockTransferOrder,
  createStockTransferOrder,
  deleteStockTransferOrder,
  executeStockTransferOrder,
  getStockTransferOrder,
  listEnabledWarehouses,
  listStockTransferOrders,
} from '../../../services/psi'
import type {
  PsiOrderItemPayload,
  PsiStockTransfer,
  PsiStockTransferDetail,
  PsiStockTransferItem,
  PsiWarehouse,
} from '../../../types/psi'
import type { CrmProductSku } from '../../../types/crm'
import { STOCK_TRANSFER_STATUS } from '../../../types/psi'
import { pageIndexColumn } from '../../../components/IndexTag'

const STATUS = STOCK_TRANSFER_STATUS

interface TransferFormItem {
  product_id: number
  sku_id?: number
  quantity: number
  remark?: string
}

interface TransferFormValues {
  from_warehouse_id: number
  to_warehouse_id: number
  order_date?: string
  remark?: string
  items: TransferFormItem[]
}

/** 库存调拨:列表 + 新增(在途) + 详情(执行/作废/删除) */
export default function StockTransferPage() {
  const { message, modal } = App.useApp()
  const actionRef = useRef<ActionType>(null)
  const [form] = Form.useForm<TransferFormValues>()
  const [createOpen, setCreateOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [detail, setDetail] = useState<PsiStockTransferDetail | null>(null)
  const [warehouses, setWarehouses] = useState<PsiWarehouse[]>([])
  const [productOptions, setProductOptions] = useState<{ label: string; value: number }[]>([])
  // 商品 -> 规格 SKU 列表(懒加载缓存)
  const [skuMap, setSkuMap] = useState<Record<number, CrmProductSku[]>>({})

  const ensureSkus = (productId?: number) => {
    if (!productId || skuMap[productId]) return
    listProductSkus(productId)
      .then((res) => setSkuMap((prev) => ({ ...prev, [productId]: res.list ?? [] })))
      .catch(() => {})
  }

  useEffect(() => {
    listEnabledWarehouses().then(setWarehouses).catch(() => {})
    listProducts({ page: 1, page_size: 100 })
      .then((res) => setProductOptions(res.list.map((p) => ({ label: p.name, value: p.id }))))
      .catch(() => {})
  }, [])

  const productMap = useMemo(
    () => new Map(productOptions.map((o) => [o.value, o.label])),
    [productOptions],
  )

  const openCreate = () => {
    form.resetFields()
    form.setFieldsValue({ items: [{ quantity: 1 }] })
    setCreateOpen(true)
  }

  const handleSubmit = async (values: TransferFormValues) => {
    const items: PsiOrderItemPayload[] = (values.items ?? []).map((item) => {
      const skuValid = item.sku_id && skuMap[item.product_id]?.some((s) => s.id === item.sku_id)
      return {
        product_id: item.product_id,
        sku_id: skuValid ? item.sku_id : undefined,
        quantity: item.quantity,
        remark: item.remark || undefined,
      }
    })
    await createStockTransferOrder({
      from_warehouse_id: values.from_warehouse_id,
      to_warehouse_id: values.to_warehouse_id,
      order_date: values.order_date || undefined,
      remark: values.remark || undefined,
      items,
    })
    message.success('调拨单已创建(在途),执行后才动库存')
    actionRef.current?.reload()
    return true
  }

  const openDetail = async (record: PsiStockTransfer) => {
    const res = await getStockTransferOrder(record.id)
    setDetail(res)
    setDrawerOpen(true)
  }

  const withConfirm = (title: string, content: string, run: () => Promise<unknown>) => {
    modal.confirm({ title, content, okText: '确认', cancelText: '取消', onOk: run })
  }

  const handleExecute = (record: PsiStockTransfer) => {
    withConfirm('执行调拨', '将在同一事务内完成调出仓出库+调入仓入库,失败整单回滚。继续?', async () => {
      await executeStockTransferOrder(record.id)
      message.success('调拨已执行,库存已变动')
      actionRef.current?.reload()
    })
  }

  const handleCancel = (record: PsiStockTransfer) => {
    withConfirm('作废调拨', '作废不产生任何库存变动,作废后可删除。继续?', async () => {
      await cancelStockTransferOrder(record.id)
      message.success('已作废')
      actionRef.current?.reload()
    })
  }

  const handleDelete = (record: PsiStockTransfer) => {
    withConfirm('删除调拨单', '仅已作废的单可删除。继续?', async () => {
      await deleteStockTransferOrder(record.id)
      message.success('已删除')
      actionRef.current?.reload()
    })
  }

  const columns: ProColumns<PsiStockTransfer>[] = [
    pageIndexColumn(actionRef),
    { title: '调拨单号', dataIndex: 'transfer_no', width: 180, search: false },
    {
      title: '调出仓库',
      dataIndex: 'from_warehouse_id',
      width: 130,
      valueType: 'select',
      fieldProps: {
        allowClear: true,
        placeholder: '调出仓',
        options: warehouses.map((w) => ({ label: w.name, value: w.id })),
      },
      render: (_, r) => r.from_warehouse_name ?? `#${r.from_warehouse_id}`,
    },
    {
      title: '调入仓库',
      dataIndex: 'to_warehouse_id',
      width: 130,
      valueType: 'select',
      fieldProps: {
        allowClear: true,
        placeholder: '调入仓',
        options: warehouses.map((w) => ({ label: w.name, value: w.id })),
      },
      render: (_, r) => r.to_warehouse_name ?? `#${r.to_warehouse_id}`,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      valueType: 'select',
      fieldProps: {
        allowClear: true,
        placeholder: '选择状态',
        options: Object.entries(STATUS).map(([v, s]) => ({ label: s.text, value: Number(v) })),
      },
      render: (_, r) => {
        const s = STATUS[r.status]
        return s ? <Tag color={s.color}>{s.text}</Tag> : r.status
      },
    },
    { title: '调拨日期', dataIndex: 'transfer_date', valueType: 'date', width: 110, search: false },
    { title: '执行时间', dataIndex: 'execute_time', valueType: 'dateTime', width: 150, search: false },
    { title: '备注', dataIndex: 'remark', width: 140, search: false, ellipsis: true },
    {
      title: '操作',
      valueType: 'option',
      width: 210,
      fixed: 'right',
      render: (_, r) => (
        <Space>
          <Button type="link" size="small" onClick={() => openDetail(r)}>
            详情
          </Button>
          {r.status === 1 && (
            <Auth perm="psi:stocktransfer:execute">
              <Button type="link" size="small" onClick={() => handleExecute(r)}>
                执行
              </Button>
            </Auth>
          )}
          {r.status === 1 && (
            <Auth perm="psi:stocktransfer:cancel">
              <Button type="link" size="small" danger onClick={() => handleCancel(r)}>
                作废
              </Button>
            </Auth>
          )}
          {r.status === 3 && (
            <Auth perm="psi:stocktransfer:delete">
              <Button type="link" size="small" danger onClick={() => handleDelete(r)}>
                删除
              </Button>
            </Auth>
          )}
        </Space>
      ),
    },
  ]

  const detailItemColumns = [
    {
      title: '商品',
      dataIndex: 'product_id',
      width: 160,
      render: (v: number) => productMap.get(v) ?? `#${v}`,
    },
    {
      title: '规格',
      dataIndex: 'sku_spec',
      width: 110,
      render: (v?: string) => v || '默认规格',
    },
    { title: '数量', dataIndex: 'quantity', width: 100 },
    { title: '备注', dataIndex: 'remark' },
  ]

  return (
    <>
      <ProTable<PsiStockTransfer>
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        scroll={{ x: 'max-content' }}
        request={async ({ current, pageSize, ...rest }) => {
          const res = await listStockTransferOrders({ page: current, page_size: pageSize, ...rest })
          return { data: res.list, total: res.total, success: true }
        }}
        pagination={{ defaultPageSize: 10, showSizeChanger: true }}
        toolBarRender={() => [
          <Auth perm="psi:stocktransfer:add" key="add">
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={openCreate}
            >
              新增调拨
            </Button>
          </Auth>,
        ]}
        headerTitle="库存调拨"
      />
      <ModalForm<TransferFormValues>
        title="新增调拨单(创建后在途,执行时才动库存)"
        form={form}
        open={createOpen}
        onOpenChange={setCreateOpen}
        modalProps={{ destroyOnHidden: true, maskClosable: false }}
        onFinish={handleSubmit}
        width={860}
        grid
      >
        <ProFormSelect
          name="from_warehouse_id"
          label="调出仓库"
          rules={[{ required: true, message: '请选择调出仓库' }]}
          options={warehouses.map((w) => ({ label: w.name, value: w.id }))}
          placeholder="调出仓"
          colProps={{ span: 12 }}
        />
        <ProFormSelect
          name="to_warehouse_id"
          label="调入仓库"
          rules={[{ required: true, message: '请选择调入仓库' }]}
          options={warehouses.map((w) => ({ label: w.name, value: w.id }))}
          placeholder="调入仓"
          colProps={{ span: 12 }}
        />
        <ProFormDatePicker name="order_date" label="调拨日期" colProps={{ span: 12 }} />
        <ProFormTextArea name="remark" label="备注" colProps={{ span: 12 }} />
        <ProFormList
          name="items"
          label="明细"
          min={1}
          creatorRecord={{ quantity: 1 }}
          creatorButtonProps={{ creatorButtonText: '添加明细' }}
          colProps={{ span: 24 }}
        >
          <ProFormSelect
            name="product_id"
            label="商品"
            rules={[{ required: true, message: '请选择商品' }]}
            options={productOptions}
            showSearch
            fieldProps={{ optionFilterProp: 'label', onChange: (v) => ensureSkus(v as number) }}
            width="md"
          />
          <ProFormDependency name={['product_id']}>
            {({ product_id }) => {
              const skus = product_id ? skuMap[product_id] : undefined
              if (!skus || skus.length <= 1) return null
              return (
                <ProFormSelect
                  name="sku_id"
                  label="规格"
                  rules={[{ required: true, message: '请选择规格' }]}
                  options={skus.map((s) => ({ label: s.spec || '默认规格', value: s.id }))}
                  placeholder="选择规格"
                  width="sm"
                />
              )
            }}
          </ProFormDependency>
          <ProFormDigit
            name="quantity"
            label="数量"
            rules={[{ required: true, message: '请输入数量' }]}
            min={1}
            fieldProps={{ precision: 0 }}
            width="sm"
          />
          <ProFormText name="remark" label="备注" width="sm" />
        </ProFormList>
      </ModalForm>
      <Drawer
        width={720}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={detail ? `调拨详情:${detail.transfer_no}` : '调拨详情'}
      >
        {detail && (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Descriptions column={2} size="small" bordered>
              <Descriptions.Item label="调拨单号">{detail.transfer_no}</Descriptions.Item>
              <Descriptions.Item label="状态">
                {(() => {
                  const s = STATUS[detail.status]
                  return s ? <Tag color={s.color}>{s.text}</Tag> : detail.status
                })()}
              </Descriptions.Item>
              <Descriptions.Item label="调出仓库">
                {detail.from_warehouse_name ?? `#${detail.from_warehouse_id}`}
              </Descriptions.Item>
              <Descriptions.Item label="调入仓库">
                {detail.to_warehouse_name ?? `#${detail.to_warehouse_id}`}
              </Descriptions.Item>
              <Descriptions.Item label="调拨日期">{detail.transfer_date || '-'}</Descriptions.Item>
              <Descriptions.Item label="执行时间">{detail.execute_time || '-'}</Descriptions.Item>
              <Descriptions.Item label="备注" span={2}>
                {detail.remark || '-'}
              </Descriptions.Item>
            </Descriptions>
            <Table<PsiStockTransferItem>
              rowKey="id"
              size="small"
              columns={detailItemColumns}
              dataSource={detail.items ?? []}
              pagination={false}
            />
          </Space>
        )}
      </Drawer>
    </>
  )
}
