import { useEffect, useMemo, useRef, useState } from 'react'
import { App, Button, Descriptions, Drawer, Form, Popconfirm, Space, Table } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import {
  ModalForm,
  ProFormDatePicker,
  ProFormDigit,
  ProFormGroup,
  ProFormList,
  ProFormSelect,
  ProFormText,
  ProTable,
  type ActionType,
  type ProColumns,
} from '@ant-design/pro-components'
import Auth from '../../../components/Auth'
import {
  createPurchaseReturn,
  getPurchaseReturn,
  listEnabledSuppliers,
  listEnabledWarehouses,
  listPurchaseReturns,
  stockOutPurchaseReturn,
  type PurchaseReturnQuery,
} from '../../../services/psi'
import { listProducts } from '../../../services/crm'
import type {
  PsiPurchaseOrderPayload,
  PsiReturnOrder,
  PsiReturnOrderItem,
  PsiSupplier,
  PsiWarehouse,
} from '../../../types/psi'
import type { CrmProduct } from '../../../types/crm'

interface ReturnFormValues {
  supplier_id: number
  warehouse_id: number
  order_date?: string
  discount_amount?: number
  items: {
    product_id: number
    quantity: number
    unit_price?: number
    remark?: string
  }[]
}

export default function PurchaseReturnPage() {
  const { message } = App.useApp()
  const actionRef = useRef<ActionType>(null)
  const [form] = Form.useForm<ReturnFormValues>()
  const [modalOpen, setModalOpen] = useState(false)

  // 下拉数据与 id -> 名称映射
  const [suppliers, setSuppliers] = useState<PsiSupplier[]>([])
  const [warehouses, setWarehouses] = useState<PsiWarehouse[]>([])
  const [products, setProducts] = useState<CrmProduct[]>([])
  const supplierMap = useMemo(() => new Map(suppliers.map((s) => [s.id, s.name])), [suppliers])
  const warehouseMap = useMemo(() => new Map(warehouses.map((w) => [w.id, w.name])), [warehouses])
  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p.name])), [products])
  const supplierOptions = useMemo(
    () => suppliers.map((s) => ({ label: s.name, value: s.id })),
    [suppliers],
  )
  const warehouseOptions = useMemo(
    () => warehouses.map((w) => ({ label: w.name, value: w.id })),
    [warehouses],
  )
  const productOptions = useMemo(
    () => products.map((p) => ({ label: p.name, value: p.id })),
    [products],
  )

  // 详情抽屉
  const [detail, setDetail] = useState<PsiReturnOrder | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    listEnabledSuppliers().then(setSuppliers).catch(() => {})
    listEnabledWarehouses().then(setWarehouses).catch(() => {})
    listProducts({ page: 1, page_size: 100 })
      .then((res) => setProducts(res.list ?? []))
      .catch(() => {})
  }, [])

  const openCreate = () => {
    form.resetFields()
    form.setFieldsValue({ items: [{}] } as ReturnFormValues)
    setModalOpen(true)
  }

  const handleSubmit = async (values: ReturnFormValues) => {
    const payload: PsiPurchaseOrderPayload = {
      supplier_id: values.supplier_id,
      warehouse_id: values.warehouse_id,
      order_date: values.order_date || undefined,
      discount_amount: values.discount_amount ?? undefined,
      items: (values.items ?? []).map((it) => ({
        product_id: it.product_id,
        quantity: it.quantity,
        unit_price: it.unit_price ?? undefined,
        remark: it.remark || undefined,
      })),
    }
    await createPurchaseReturn(payload)
    message.success('采购退货单已创建')
    actionRef.current?.reload()
    return true
  }

  const handleStockOut = async (record: PsiReturnOrder) => {
    await stockOutPurchaseReturn(record.id)
    message.success('退货出库已执行')
    actionRef.current?.reload()
  }

  const openDetail = async (record: PsiReturnOrder) => {
    setDrawerOpen(true)
    setDetailLoading(true)
    try {
      setDetail(await getPurchaseReturn(record.id))
    } finally {
      setDetailLoading(false)
    }
  }

  const columns: ProColumns<PsiReturnOrder>[] = [
    { title: '编号', valueType: 'indexBorder', width: 70, search: false },
    { title: '单号', dataIndex: 'order_no', width: 180, search: false },
    {
      title: '供应商',
      dataIndex: 'supplier_id',
      width: 160,
      search: false,
      render: (_, record) =>
        record.supplier_id != null ? (supplierMap.get(record.supplier_id) ?? record.supplier_id) : '-',
    },
    {
      title: '仓库',
      dataIndex: 'warehouse_id',
      width: 140,
      search: false,
      render: (_, record) => warehouseMap.get(record.warehouse_id) ?? record.warehouse_id,
    },
    { title: '退货日期', dataIndex: 'order_date', valueType: 'date', width: 110, search: false },
    { title: '总数量', dataIndex: 'total_quantity', width: 100, search: false },
    { title: '总金额', dataIndex: 'total_amount', width: 110, search: false },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      valueType: 'dateTime',
      width: 170,
      search: false,
    },
    { title: '关键词', dataIndex: 'keyword', hideInTable: true },
    {
      title: '供应商',
      dataIndex: 'supplier_id',
      hideInTable: true,
      valueType: 'select',
      fieldProps: {
        options: supplierOptions,
        showSearch: true,
        optionFilterProp: 'label',
        allowClear: true,
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      hideInTable: true,
      valueType: 'select',
      valueEnum: {
        1: { text: '正常' },
        0: { text: '已作废' },
      },
    },
    {
      title: '操作',
      valueType: 'option',
      width: 180,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Auth perm="psi:purchase-return:stock-out">
            <Popconfirm
              title="确认执行退货出库?将按明细数量减少库存"
              okText="执行"
              cancelText="取消"
              onConfirm={() => handleStockOut(record)}
            >
              <Button type="link" size="small">
                执行出库
              </Button>
            </Popconfirm>
          </Auth>
          <Button type="link" size="small" onClick={() => openDetail(record)}>
            详情
          </Button>
        </Space>
      ),
    },
  ]

  const itemColumns = [
    {
      title: '商品',
      dataIndex: 'product_id',
      width: 180,
      render: (v: number) => productMap.get(v) ?? v,
    },
    { title: '数量', dataIndex: 'quantity', width: 90 },
    { title: '单价', dataIndex: 'unit_price', width: 100, render: (v?: string) => v ?? '-' },
    { title: '金额', dataIndex: 'amount', width: 110, render: (v?: string) => v ?? '-' },
    { title: '备注', dataIndex: 'remark', width: 160, render: (v: string) => v || '-' },
  ]

  return (
    <>
      <ProTable<PsiReturnOrder, PurchaseReturnQuery>
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        scroll={{ x: 'max-content' }}
        request={async ({ current, pageSize, ...rest }) => {
          const res = await listPurchaseReturns({ page: current, page_size: pageSize, ...rest })
          return { data: res.list, total: res.total, success: true }
        }}
        pagination={{ defaultPageSize: 10, showSizeChanger: true }}
        toolBarRender={() => [
          <Auth perm="psi:purchase-return:add" key="add">
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              新增采购退货
            </Button>
          </Auth>,
        ]}
        headerTitle="采购退货列表"
      />
      <ModalForm<ReturnFormValues>
        title="新增采购退货"
        form={form}
        open={modalOpen}
        onOpenChange={setModalOpen}
        modalProps={{ destroyOnHidden: true, maskClosable: false }}
        onFinish={handleSubmit}
        width={900}
        grid
      >
        <ProFormSelect
          name="supplier_id"
          label="供应商"
          rules={[{ required: true, message: '请选择供应商' }]}
          options={supplierOptions}
          fieldProps={{ showSearch: true, optionFilterProp: 'label' }}
          placeholder="选择供应商"
          colProps={{ span: 12 }}
        />
        <ProFormSelect
          name="warehouse_id"
          label="仓库"
          rules={[{ required: true, message: '请选择仓库' }]}
          options={warehouseOptions}
          fieldProps={{ showSearch: true, optionFilterProp: 'label' }}
          placeholder="选择仓库"
          colProps={{ span: 12 }}
        />
        <ProFormDatePicker name="order_date" label="退货日期" colProps={{ span: 12 }} />
        <ProFormDigit
          name="discount_amount"
          label="优惠金额"
          min={0}
          fieldProps={{ precision: 2 }}
          colProps={{ span: 12 }}
        />
        <ProFormList
          name="items"
          label="退货明细"
          colProps={{ span: 24 }}
          creatorButtonProps={{ creatorButtonText: '添加明细' }}
          min={1}
          rules={[
            {
              validator: async (_, value) => {
                if (!value || value.length === 0) {
                  throw new Error('请至少添加一行明细')
                }
              },
            },
          ]}
        >
          <ProFormGroup grid>
            <ProFormSelect
              name="product_id"
              label="商品"
              rules={[{ required: true, message: '请选择商品' }]}
              options={productOptions}
              fieldProps={{ showSearch: true, optionFilterProp: 'label' }}
              placeholder="选择商品"
              colProps={{ span: 6 }}
            />
            <ProFormDigit
              name="quantity"
              label="数量"
              rules={[{ required: true, message: '请输入数量' }]}
              min={1}
              fieldProps={{ precision: 0 }}
              colProps={{ span: 6 }}
            />
            <ProFormDigit
              name="unit_price"
              label="单价"
              min={0}
              fieldProps={{ precision: 2 }}
              colProps={{ span: 6 }}
            />
            <ProFormText name="remark" label="备注" colProps={{ span: 6 }} />
          </ProFormGroup>
        </ProFormList>
      </ModalForm>
      <Drawer
        title="采购退货详情"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={720}
        loading={detailLoading}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="单号">{detail.order_no}</Descriptions.Item>
              <Descriptions.Item label="供应商">
                {detail.supplier_id != null
                  ? (supplierMap.get(detail.supplier_id) ?? detail.supplier_id)
                  : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="仓库">
                {warehouseMap.get(detail.warehouse_id) ?? detail.warehouse_id}
              </Descriptions.Item>
              <Descriptions.Item label="退货日期">{detail.order_date}</Descriptions.Item>
              <Descriptions.Item label="总数量">{detail.total_quantity}</Descriptions.Item>
              <Descriptions.Item label="总金额">{detail.total_amount}</Descriptions.Item>
              <Descriptions.Item label="创建时间">{detail.created_at}</Descriptions.Item>
              <Descriptions.Item label="备注">{detail.remark || '-'}</Descriptions.Item>
            </Descriptions>
            <Table<PsiReturnOrderItem>
              style={{ marginTop: 16 }}
              rowKey="id"
              size="small"
              columns={itemColumns}
              dataSource={detail.items ?? []}
              pagination={false}
              scroll={{ x: 'max-content' }}
            />
          </>
        )}
      </Drawer>
    </>
  )
}
