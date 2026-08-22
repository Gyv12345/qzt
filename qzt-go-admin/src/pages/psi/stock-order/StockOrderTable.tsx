import { useEffect, useMemo, useRef, useState } from 'react'
import { App, Button, Descriptions, Drawer, Form, Space, Table, Tag } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import {
  ModalForm,
  ProFormDatePicker,
  ProFormDependency,
  ProFormDigit,
  ProFormList,
  ProFormRadio,
  ProFormSelect,
  ProFormText,
  ProFormTextArea,
  ProTable,
  type ActionType,
  type ProColumns,
} from '@ant-design/pro-components'
import Auth from '../../../components/Auth'
import { listProducts, listProductSkus } from '../../../services/crm'
import type { CrmProductSku } from '../../../types/crm'
import {
  createStockInOrder,
  createStockOutOrder,
  getStockInOrder,
  getStockOutOrder,
  listEnabledWarehouses,
  listStockInOrders,
  listStockOutOrders,
} from '../../../services/psi'
import type {
  PsiOrderItemPayload,
  PsiStockOrder,
  PsiStockOrderItem,
  PsiWarehouse,
} from '../../../types/psi'
import { pageIndexColumn } from '../../../components/IndexTag'

export type Direction = 'in' | 'out'

const BIZ_TYPE_OPTIONS: Record<Direction, { label: string; value: string }[]> = {
  in: [
    { label: '初始化', value: 'INIT' },
    { label: '盘盈', value: 'PROFIT' },
    { label: '赠品', value: 'GIFT' },
    { label: '其他', value: 'OTHER' },
  ],
  out: [
    { label: '盘亏', value: 'LOSS' },
    { label: '报废', value: 'SCRAP' },
    { label: '领用', value: 'USE' },
    { label: '其他', value: 'OTHER' },
  ],
}

const BIZ_TYPE_COLORS: Record<string, string> = {
  INIT: 'blue',
  PROFIT: 'green',
  GIFT: 'cyan',
  LOSS: 'orange',
  SCRAP: 'red',
  USE: 'purple',
  OTHER: 'default',
}

interface StockOrderFormItem {
  product_id: number
  sku_id?: number
  quantity: number
  unit_cost?: number
  remark?: string
}

interface StockOrderFormValues {
  warehouse_id: number
  biz_type: string
  order_date?: string
  remark?: string
  items: StockOrderFormItem[]
}

/** 其他出入库单列表 + 新增弹窗 + 详情抽屉(按 direction 区分入库/出库) */
export default function StockOrderTable({ direction }: { direction: Direction }) {
  const { message } = App.useApp()
  const actionRef = useRef<ActionType>(null)
  const [form] = Form.useForm<StockOrderFormValues>()
  const [modalOpen, setModalOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [detail, setDetail] = useState<PsiStockOrder | null>(null)
  const [warehouses, setWarehouses] = useState<PsiWarehouse[]>([])
  const [productOptions, setProductOptions] = useState<{ label: string; value: number }[]>([])
  // 商品 -> 规格 SKU 列表(懒加载缓存;多于 1 条时明细行才出现「规格」选择)
  const [skuMap, setSkuMap] = useState<Record<number, CrmProductSku[]>>({})

  /** 加载并缓存某商品的规格列表(重复调用直接命中缓存) */
  const ensureSkus = (productId?: number) => {
    if (!productId || skuMap[productId]) return
    listProductSkus(productId)
      .then((res) => setSkuMap((prev) => ({ ...prev, [productId]: res.list ?? [] })))
      .catch(() => {})
  }

  const directionName = direction === 'in' ? '入库' : '出库'
  const bizOptions = BIZ_TYPE_OPTIONS[direction]
  const bizLabelMap = useMemo(
    () => new Map(bizOptions.map((o) => [o.value, o.label])),
    [bizOptions],
  )

  useEffect(() => {
    listEnabledWarehouses()
      .then(setWarehouses)
      .catch(() => {})
    listProducts({ page: 1, page_size: 100 })
      .then((res) =>
        setProductOptions(res.list.map((p) => ({ label: p.name, value: p.id }))),
      )
      .catch(() => {})
  }, [])

  const warehouseMap = useMemo(
    () => new Map(warehouses.map((w) => [w.id, w.name])),
    [warehouses],
  )
  const productMap = useMemo(
    () => new Map(productOptions.map((o) => [o.value, o.label])),
    [productOptions],
  )

  const openCreate = () => {
    form.resetFields()
    form.setFieldsValue({ biz_type: bizOptions[0].value, items: [{ quantity: 1 }] })
    setModalOpen(true)
  }

  const handleSubmit = async (values: StockOrderFormValues) => {
    const items: PsiOrderItemPayload[] = (values.items ?? []).map((item) => {
      // sku_id 校验归属(切换商品后残留的 sku 丢弃,由后端解析默认规格)
      const skuValid = item.sku_id && skuMap[item.product_id]?.some((s) => s.id === item.sku_id)
      return {
        product_id: item.product_id,
        sku_id: skuValid ? item.sku_id : undefined,
        quantity: item.quantity,
        ...(direction === 'in' && item.unit_cost !== undefined && item.unit_cost !== null
          ? { unit_cost: item.unit_cost }
          : {}),
        remark: item.remark || undefined,
      }
    })
    const payload = {
      warehouse_id: values.warehouse_id,
      biz_type: values.biz_type,
      order_date: values.order_date || undefined,
      remark: values.remark || undefined,
      items,
    }
    if (direction === 'in') {
      await createStockInOrder(payload)
    } else {
      await createStockOutOrder(payload)
    }
    message.success(`${directionName}单已创建`)
    actionRef.current?.reload()
    return true
  }

  const openDetail = async (record: PsiStockOrder) => {
    const res =
      direction === 'in' ? await getStockInOrder(record.id) : await getStockOutOrder(record.id)
    setDetail(res)
    setDrawerOpen(true)
  }

  const columns: ProColumns<PsiStockOrder>[] = [
    pageIndexColumn(actionRef),
    { title: '单号', dataIndex: 'order_no', width: 180, search: false },
    {
      title: '业务类型',
      dataIndex: 'biz_type',
      width: 110,
      valueType: 'select',
      fieldProps: { allowClear: true, placeholder: '选择业务类型', options: bizOptions },
      render: (_, record) => (
        <Tag color={BIZ_TYPE_COLORS[record.biz_type] ?? 'default'}>
          {bizLabelMap.get(record.biz_type) ?? record.biz_type}
        </Tag>
      ),
    },
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
    { title: '日期', dataIndex: 'order_date', valueType: 'date', width: 110, search: false },
    { title: '总数量', dataIndex: 'total_quantity', width: 100, search: false },
    { title: '备注', dataIndex: 'remark', width: 160, search: false },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      valueType: 'dateTime',
      width: 170,
      search: false,
    },
    {
      title: '操作',
      valueType: 'option',
      width: 100,
      fixed: 'right',
      render: (_, record) => (
        <Button type="link" size="small" onClick={() => openDetail(record)}>
          详情
        </Button>
      ),
    },
  ]

  const detailItemColumns = [
    {
      title: '商品',
      dataIndex: 'product_id',
      width: 140,
      render: (v: number) => productMap.get(v) ?? `#${v}`,
    },
    {
      title: '规格',
      dataIndex: 'sku_spec',
      width: 100,
      render: (v?: string) => v || '默认规格',
    },
    { title: '数量', dataIndex: 'quantity', width: 100 },
    ...(direction === 'in'
      ? [{ title: '单价成本', dataIndex: 'unit_cost', width: 110 }]
      : []),
    { title: '备注', dataIndex: 'remark' },
  ]

  return (
    <>
      <ProTable<PsiStockOrder>
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        scroll={{ x: 'max-content' }}
        request={async ({ current, pageSize, ...rest }) => {
          const params = { page: current, page_size: pageSize, ...rest }
          const res =
            direction === 'in'
              ? await listStockInOrders(params)
              : await listStockOutOrders(params)
          return { data: res.list, total: res.total, success: true }
        }}
        pagination={{ defaultPageSize: 10, showSizeChanger: true }}
        toolBarRender={() => [
          <Auth perm="psi:stock-order:add" key="add">
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              新增{directionName}
            </Button>
          </Auth>,
        ]}
        headerTitle={`其他${directionName}单`}
      />
      <ModalForm<StockOrderFormValues>
        title={`新增${directionName}单`}
        form={form}
        open={modalOpen}
        onOpenChange={setModalOpen}
        modalProps={{ destroyOnHidden: true, maskClosable: false }}
        onFinish={handleSubmit}
        width={860}
        grid
      >
        <ProFormSelect
          name="warehouse_id"
          label="仓库"
          rules={[{ required: true, message: '请选择仓库' }]}
          options={warehouses.map((w) => ({ label: w.name, value: w.id }))}
          placeholder="选择仓库"
          colProps={{ span: 12 }}
        />
        <ProFormRadio.Group
          name="biz_type"
          label="业务类型"
          rules={[{ required: true, message: '请选择业务类型' }]}
          options={bizOptions}
          colProps={{ span: 12 }}
        />
        <ProFormDatePicker name="order_date" label="日期" colProps={{ span: 12 }} />
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
          {direction === 'in' && (
            <ProFormDigit
              name="unit_cost"
              label="单价成本"
              min={0}
              fieldProps={{ precision: 2 }}
              width="sm"
            />
          )}
          <ProFormText name="remark" label="备注" width="sm" />
        </ProFormList>
      </ModalForm>
      <Drawer
        width={720}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={detail ? `${directionName}单详情:${detail.order_no}` : `${directionName}单详情`}
      >
        {detail && (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Descriptions column={2} size="small" bordered>
              <Descriptions.Item label="单号">{detail.order_no}</Descriptions.Item>
              <Descriptions.Item label="业务类型">
                <Tag color={BIZ_TYPE_COLORS[detail.biz_type] ?? 'default'}>
                  {bizLabelMap.get(detail.biz_type) ?? detail.biz_type}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="仓库">
                {warehouseMap.get(detail.warehouse_id) ?? `#${detail.warehouse_id}`}
              </Descriptions.Item>
              <Descriptions.Item label="日期">{detail.order_date}</Descriptions.Item>
              <Descriptions.Item label="总数量">{detail.total_quantity}</Descriptions.Item>
              <Descriptions.Item label="创建时间">{detail.created_at}</Descriptions.Item>
              <Descriptions.Item label="备注" span={2}>
                {detail.remark || '-'}
              </Descriptions.Item>
            </Descriptions>
            <Table<PsiStockOrderItem>
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
