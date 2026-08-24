import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { App, Button, Col, Descriptions, Drawer, Form, Popconfirm, Space, Table, Tag } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import {
  ModalForm,
  ProForm,
  ProFormDatePicker,
  ProFormDependency,
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
import CustomerSelect from '../../../components/CustomerSelect'
import { GuideHelpButton } from '../../../components/guide/GuideHelpButton'
import { listEnabledSuppliers, listEnabledWarehouses, type PsiPageResult } from '../../../services/psi'
import { listCustomers, listProducts, listProductSkus } from '../../../services/crm'
import type { CrmProductSku } from '../../../types/crm'
import { pageIndexColumn } from '../../../components/IndexTag'

/** 四类购销单据(采购单/销售单/采购退货/销售退货)公共的列表行/明细行结构 */
export interface OrderDocRecord {
  id: number
  order_no?: string
  return_no?: string
  supplier_id?: number
  customer_id?: number
  warehouse_id: number
  order_date: string
  expected_date?: string | null
  total_quantity: string
  total_amount: string
  discount_amount?: string | null
  status: number
  approval_status?: string
  remark: string
  created_at: string
  items?: OrderDocItemRecord[]
}

export interface OrderDocItemRecord {
  id: number
  product_id: number
  /** 规格 SKU ID(0/缺省 = 历史数据未指定) */
  sku_id?: number
  /** 规格描述(后端详情接口回填,空 = 默认规格) */
  sku_spec?: string
  quantity: string
  received_quantity?: string
  shipped_quantity?: string
  unit_price?: string
  amount?: string
  remark: string
}

export interface OrderDocItemFormValues {
  product_id: number
  sku_id?: number
  quantity: number
  unit_price?: number
  remark?: string
}

/** 表单值:party_id 统一表示 supplier_id / customer_id,由各页映射成精确的 payload */
export interface OrderDocFormValues {
  party_id: number
  warehouse_id: number
  order_date?: string
  expected_date?: string
  discount_amount?: number
  items: OrderDocItemFormValues[]
}

export type PartyKind = 'supplier' | 'customer'

/** 详情抽屉描述字段(顺序即展示顺序) */
export type DetailFieldKey =
  | 'no'
  | 'party'
  | 'warehouse'
  | 'date'
  | 'expected'
  | 'approval'
  | 'totalQuantity'
  | 'totalAmount'
  | 'discount'
  | 'createdAt'
  | 'remark'

export interface DetailFieldDef {
  key: DetailFieldKey
  span?: number
}

export interface OrderDocStockAction {
  perm: string
  /** 按钮文案,如 执行入库 / 执行出库 */
  label: string
  /** 二次确认标题 */
  confirmTitle: string
  /** 成功提示 */
  success: string
  run: (id: number) => Promise<unknown>
}

export interface OrderDocPageProps<T extends OrderDocRecord> {
  /** 单据名称,如 采购单 / 采购退货(按钮、消息、弹窗标题共用) */
  docName: string
  /** 列表标题 */
  listTitle: string
  /** 新增按钮文案 */
  addLabel: string
  /** 日期字段文案:订单日期 / 退货日期 */
  dateLabel: string
  /** 明细列表单文案:单据明细 / 退货明细 */
  itemsLabel: string
  /** 往来对象类型:供应商 / 客户 */
  party: PartyKind
  /** 列表与搜索是否含 审批状态(采购单/销售单) */
  showApproval?: boolean
  /** 表单与列表是否含 预计到货(仅采购单) */
  showExpectedDate?: boolean
  /** 列表是否含 优惠 列(采购单/销售单) */
  showDiscountInList?: boolean
  /** 详情抽屉宽度,默认 760(退货单 720) */
  drawerWidth?: number
  /** 详情抽屉字段及顺序 */
  detailFields: DetailFieldDef[]
  /** 详情明细表额外数量列:采购单=已收数量,销售单=已发数量 */
  detailItemExtra?: 'received' | 'shipped'
  /** 创建成功提示(默认 `${docName}已创建`,如需 采购退货单已创建 传入覆盖) */
  createMessage?: string
  /** 页面引导(采购单启用:操作列/新增按钮打 data-guide 标记 + 工具栏帮助按钮) */
  guide?: boolean
  perms: {
    add: string
    edit?: string
    delete?: string
  }
  service: {
    list: (params: Record<string, unknown>) => Promise<PsiPageResult<T>>
    get: (id: number) => Promise<T>
    create: (values: OrderDocFormValues) => Promise<unknown>
    /** 传入即支持编辑 */
    update?: (id: number, values: OrderDocFormValues) => Promise<unknown>
    /** 传入即支持删除 */
    remove?: (id: number) => Promise<unknown>
    /** 入库/出库执行动作 */
    stock?: OrderDocStockAction
  }
}

/** 审批状态: NONE 无需审批 / PENDING 审批中 / APPROVED 已通过 / REJECTED 已驳回 */
const APPROVAL_STATUS: Record<string, { text: string; color: string }> = {
  NONE: { text: '无需审批', color: 'default' },
  PENDING: { text: '审批中', color: 'processing' },
  APPROVED: { text: '已通过', color: 'success' },
  REJECTED: { text: '已驳回', color: 'error' },
}

const STATUS_SEARCH_ENUM = {
  1: { text: '正常' },
  0: { text: '已作废' },
}

/**
 * PSI 购销单据公共页面:列表 + 新增/编辑表单 + 详情抽屉。
 * 采购单/销售单/采购退货/销售退货四个页面的骨架完全一致,差异全部收敛为配置:
 * 文案、往来对象类型(supplier/customer)、审批/预计到货/优惠等开关、详情字段顺序与 service 映射。
 */
export default function OrderDocPage<T extends OrderDocRecord>({
  docName,
  listTitle,
  addLabel,
  dateLabel,
  itemsLabel,
  party,
  showApproval,
  showExpectedDate,
  showDiscountInList,
  drawerWidth = 760,
  detailFields,
  detailItemExtra,
  createMessage,
  guide,
  perms,
  service,
}: OrderDocPageProps<T>) {
  const { message } = App.useApp()
  const actionRef = useRef<ActionType>(null)
  const [form] = Form.useForm<OrderDocFormValues>()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<T | null>(null)

  // 下拉数据与 id -> 名称映射
  const [parties, setParties] = useState<{ id: number; name: string }[]>([])
  const [warehouses, setWarehouses] = useState<{ id: number; name: string }[]>([])
  const [products, setProducts] = useState<{ id: number; name: string }[]>([])
  // 商品 -> 规格 SKU 列表(懒加载缓存;多于 1 条时明细行才出现「规格」选择)
  const [skuMap, setSkuMap] = useState<Record<number, CrmProductSku[]>>({})

  /** 加载并缓存某商品的规格列表(重复调用直接命中缓存) */
  const ensureSkus = (productId?: number) => {
    if (!productId || skuMap[productId]) return
    listProductSkus(productId)
      .then((res) => setSkuMap((prev) => ({ ...prev, [productId]: res.list ?? [] })))
      .catch(() => {})
  }
  const partyMap = useMemo(() => new Map(parties.map((p) => [p.id, p.name])), [parties])
  const warehouseMap = useMemo(() => new Map(warehouses.map((w) => [w.id, w.name])), [warehouses])
  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p.name])), [products])
  const warehouseOptions = useMemo(
    () => warehouses.map((w) => ({ label: w.name, value: w.id })),
    [warehouses],
  )
  const productOptions = useMemo(
    () => products.map((p) => ({ label: p.name, value: p.id })),
    [products],
  )
  const partyOptions = useMemo(
    () => parties.map((p) => ({ label: p.name, value: p.id })),
    [parties],
  )

  // 详情抽屉
  const [detail, setDetail] = useState<T | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    if (party === 'supplier') {
      listEnabledSuppliers().then(setParties).catch(() => {})
    } else {
      listCustomers({ page: 1, page_size: 100 })
        .then((res) => setParties(res.list ?? []))
        .catch(() => {})
    }
    listEnabledWarehouses().then(setWarehouses).catch(() => {})
    listProducts({ page: 1, page_size: 100 })
      .then((res) => setProducts(res.list ?? []))
      .catch(() => {})
  }, [party])

  const partyLabel = party === 'supplier' ? '供应商' : '客户'

  /** 往来对象显示:可空单据(退货)无 id 时显示 '-' */
  const renderParty = (record: T): ReactNode => {
    const id = record.supplier_id ?? record.customer_id
    if (id == null) return '-'
    return partyMap.get(id) ?? id
  }

  const openCreate = () => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({ items: [{}] } as OrderDocFormValues)
    setModalOpen(true)
  }

  const openEdit = async (record: T) => {
    const detail = await service.get(record.id)
    setEditing(detail)
    // 预载明细商品的规格列表(多规格商品编辑时回填「规格」选择)
    ;(detail.items ?? []).forEach((it) => ensureSkus(it.product_id))
    form.setFieldsValue({
      party_id: detail.supplier_id ?? detail.customer_id,
      warehouse_id: detail.warehouse_id,
      order_date: detail.order_date || undefined,
      expected_date: detail.expected_date || undefined,
      discount_amount: detail.discount_amount != null ? Number(detail.discount_amount) : 0,
      items: (detail.items ?? []).map((it) => ({
        product_id: it.product_id,
        sku_id: it.sku_id || undefined,
        quantity: Number(it.quantity),
        unit_price: it.unit_price != null ? Number(it.unit_price) : undefined,
        remark: it.remark || undefined,
      })),
    })
    setModalOpen(true)
  }

  const handleSubmit = async (values: OrderDocFormValues) => {
    // 明细行规范化:空单价/备注转 undefined,与各页原逻辑一致;
    // sku_id 校验归属(切换商品后残留的 sku 丢弃,由后端解析默认规格)
    const payload: OrderDocFormValues = {
      party_id: values.party_id,
      warehouse_id: values.warehouse_id,
      order_date: values.order_date || undefined,
      expected_date: values.expected_date || undefined,
      discount_amount: values.discount_amount ?? undefined,
      items: (values.items ?? []).map((it) => {
        const skuValid = it.sku_id && skuMap[it.product_id]?.some((s) => s.id === it.sku_id)
        return {
          product_id: it.product_id,
          sku_id: skuValid ? it.sku_id : undefined,
          quantity: it.quantity,
          unit_price: it.unit_price ?? undefined,
          remark: it.remark || undefined,
        }
      }),
    }
    if (editing) {
      await service.update?.(editing.id, payload)
      message.success(`${docName}已更新`)
    } else {
      await service.create(payload)
      message.success(createMessage ?? `${docName}已创建`)
    }
    actionRef.current?.reload()
    return true
  }

  const handleDelete = async (record: T) => {
    await service.remove?.(record.id)
    message.success(`${docName}已删除`)
    actionRef.current?.reload()
  }

  const handleStock = async (record: T) => {
    if (!service.stock) return
    await service.stock.run(record.id)
    message.success(service.stock.success)
    actionRef.current?.reload()
  }

  const openDetail = async (record: T) => {
    setDrawerOpen(true)
    setDetailLoading(true)
    try {
      setDetail(await service.get(record.id))
    } finally {
      setDetailLoading(false)
    }
  }

  const renderApproval = (v?: string) => {
    const s = APPROVAL_STATUS[v ?? ''] ?? { text: v ?? '-', color: 'default' }
    return <Tag color={s.color}>{s.text}</Tag>
  }

  const columns: ProColumns<T>[] = [
    pageIndexColumn(actionRef),
    {
      title: '单号',
      dataIndex: 'order_no',
      width: 180,
      search: false,
      render: (_, record) => (record as { return_no?: string }).return_no ?? record.order_no ?? '-',
    },
    {
      title: partyLabel,
      dataIndex: party === 'supplier' ? 'supplier_id' : 'customer_id',
      width: 160,
      search: false,
      render: (_, record) => renderParty(record),
    },
    {
      title: '仓库',
      dataIndex: 'warehouse_id',
      width: 140,
      search: false,
      render: (_, record) => warehouseMap.get(record.warehouse_id) ?? record.warehouse_id,
    },
    { title: dateLabel, dataIndex: 'order_date', valueType: 'date', width: 110, search: false },
    ...(showExpectedDate
      ? [
          {
            title: '预计到货',
            dataIndex: 'expected_date',
            valueType: 'date' as const,
            width: 110,
            search: false,
            render: (_: unknown, record: T) => record.expected_date ?? '-',
          },
        ]
      : []),
    { title: '总数量', dataIndex: 'total_quantity', width: 100, search: false },
    { title: '总金额', dataIndex: 'total_amount', width: 110, search: false },
    ...(showDiscountInList
      ? [{ title: '优惠', dataIndex: 'discount_amount', width: 90, search: false }]
      : []),
    ...(showApproval
      ? [
          {
            title: '审批状态',
            dataIndex: 'approval_status',
            width: 100,
            search: false,
            render: (_: unknown, record: T) => renderApproval(record.approval_status),
          },
        ]
      : []),
    {
      title: '创建时间',
      dataIndex: 'created_at',
      valueType: 'dateTime',
      width: 170,
      search: false,
    },
    { title: '关键词', dataIndex: 'keyword', hideInTable: true },
    ...(party === 'supplier'
      ? [
          {
            title: partyLabel,
            dataIndex: 'supplier_id',
            hideInTable: true,
            valueType: 'select' as const,
            fieldProps: {
              options: partyOptions,
              showSearch: true,
              optionFilterProp: 'label',
              allowClear: true,
            },
          },
        ]
      : [
          {
            title: partyLabel,
            dataIndex: 'customer_id',
            hideInTable: true,
            renderFormItem: () => <CustomerSelect />,
          },
        ]),
    {
      title: '状态',
      dataIndex: 'status',
      hideInTable: true,
      valueType: 'select',
      valueEnum: STATUS_SEARCH_ENUM,
    },
    ...(showApproval
      ? [
          {
            title: '审批状态',
            dataIndex: 'approval_status',
            hideInTable: true,
            valueType: 'select' as const,
            valueEnum: {
              NONE: { text: '无需审批' },
              PENDING: { text: '审批中' },
              APPROVED: { text: '已通过' },
              REJECTED: { text: '已驳回' },
            },
          },
        ]
      : []),
    {
      title: guide ? <span data-guide="action-column">操作</span> : '操作',
      valueType: 'option',
      width: service.update ? 240 : 180,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          {service.update && (
            <Auth perm={perms.edit ?? ''}>
              <Button type="link" size="small" onClick={() => openEdit(record)}>
                编辑
              </Button>
            </Auth>
          )}
          {service.remove && (
            <Auth perm={perms.delete ?? ''}>
              <Popconfirm
                title={`确认删除该${docName}?`}
                okText="删除"
                okButtonProps={{ danger: true }}
                cancelText="取消"
                onConfirm={() => handleDelete(record)}
              >
                <Button type="link" size="small" danger>
                  删除
                </Button>
              </Popconfirm>
            </Auth>
          )}
          {service.stock && (
            <Auth perm={service.stock.perm}>
              <Popconfirm
                title={service.stock.confirmTitle}
                okText="执行"
                cancelText="取消"
                onConfirm={() => handleStock(record)}
              >
                <Button type="link" size="small">
                  {service.stock.label}
                </Button>
              </Popconfirm>
            </Auth>
          )}
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
      width: 160,
      render: (v: number) => productMap.get(v) ?? v,
    },
    {
      title: '规格',
      dataIndex: 'sku_spec',
      width: 110,
      render: (v?: string) => v || '默认规格',
    },
    { title: '数量', dataIndex: 'quantity', width: 90 },
    ...(detailItemExtra === 'received'
      ? [{ title: '已收数量', dataIndex: 'received_quantity', width: 90, render: (v?: string) => v ?? '-' }]
      : []),
    ...(detailItemExtra === 'shipped'
      ? [{ title: '已发数量', dataIndex: 'shipped_quantity', width: 90, render: (v?: string) => v ?? '-' }]
      : []),
    { title: '单价', dataIndex: 'unit_price', width: 100, render: (v?: string) => v ?? '-' },
    { title: '金额', dataIndex: 'amount', width: 110, render: (v?: string) => v ?? '-' },
    { title: '备注', dataIndex: 'remark', width: 160, render: (v: string) => v || '-' },
  ]

  const detailDescriptions = (d: T) =>
    detailFields.map((f) => {
      switch (f.key) {
        case 'no':
          return { key: 'no', label: '单号', children: (d as { return_no?: string }).return_no ?? d.order_no ?? '-', span: f.span }
        case 'party':
          return { key: 'party', label: partyLabel, children: renderParty(d), span: f.span }
        case 'warehouse':
          return {
            key: 'warehouse',
            label: '仓库',
            children: warehouseMap.get(d.warehouse_id) ?? d.warehouse_id,
            span: f.span,
          }
        case 'date':
          return { key: 'date', label: dateLabel, children: d.order_date, span: f.span }
        case 'expected':
          return {
            key: 'expected',
            label: '预计到货',
            children: d.expected_date ?? '-',
            span: f.span,
          }
        case 'approval':
          return {
            key: 'approval',
            label: '审批状态',
            children: renderApproval(d.approval_status),
            span: f.span,
          }
        case 'totalQuantity':
          return { key: 'totalQuantity', label: '总数量', children: d.total_quantity, span: f.span }
        case 'totalAmount':
          return { key: 'totalAmount', label: '总金额', children: d.total_amount, span: f.span }
        case 'discount':
          return {
            key: 'discount',
            label: '优惠',
            children: d.discount_amount ?? '-',
            span: f.span,
          }
        case 'createdAt':
          return { key: 'createdAt', label: '创建时间', children: d.created_at, span: f.span }
        case 'remark':
          return { key: 'remark', label: '备注', children: d.remark || '-', span: f.span }
      }
    })

  return (
    <>
      <ProTable<T>
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        scroll={{ x: 'max-content' }}
        request={async ({ current, pageSize, ...rest }) => {
          const res = await service.list({ page: current, page_size: pageSize, ...rest })
          return { data: res.list, total: res.total, success: true }
        }}
        pagination={{ defaultPageSize: 10, showSizeChanger: true }}
        toolBarRender={() => [
          <Auth perm={perms.add} key="add">
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={openCreate}
              data-guide={guide ? 'add' : undefined}
            >
              {addLabel}
            </Button>
          </Auth>,
          ...(guide ? [<GuideHelpButton key="guide-help" />] : []),
        ]}
        headerTitle={listTitle}
      />
      <ModalForm<OrderDocFormValues>
        title={editing ? `编辑${docName}` : `新增${docName}`}
        form={form}
        open={modalOpen}
        onOpenChange={setModalOpen}
        modalProps={{ destroyOnHidden: true, maskClosable: false }}
        onFinish={handleSubmit}
        width={900}
        grid
      >
        {party === 'supplier' ? (
          <ProFormSelect
            name="party_id"
            label="供应商"
            rules={[{ required: true, message: '请选择供应商' }]}
            options={partyOptions}
            fieldProps={{ showSearch: true, optionFilterProp: 'label' }}
            placeholder="选择供应商"
            colProps={{ span: 12 }}
          />
        ) : (
          <Col span={12}>
            <ProForm.Item
              name="party_id"
              label="客户"
              rules={[{ required: true, message: '请选择客户' }]}
            >
              <CustomerSelect />
            </ProForm.Item>
          </Col>
        )}
        <ProFormSelect
          name="warehouse_id"
          label="仓库"
          rules={[{ required: true, message: '请选择仓库' }]}
          options={warehouseOptions}
          fieldProps={{ showSearch: true, optionFilterProp: 'label' }}
          placeholder="选择仓库"
          colProps={{ span: 12 }}
        />
        <ProFormDatePicker name="order_date" label={dateLabel} colProps={{ span: 12 }} />
        {showExpectedDate && (
          <ProFormDatePicker name="expected_date" label="预计到货" colProps={{ span: 12 }} />
        )}
        <ProFormDigit
          name="discount_amount"
          label="优惠金额"
          min={0}
          fieldProps={{ precision: 2 }}
          colProps={{ span: 12 }}
        />
        <ProFormList
          name="items"
          label={itemsLabel}
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
              fieldProps={{
                showSearch: true,
                optionFilterProp: 'label',
                onChange: (v) => ensureSkus(v as number),
              }}
              placeholder="选择商品"
              colProps={{ span: 6 }}
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
                    colProps={{ span: 5 }}
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
              colProps={{ span: 5 }}
            />
            <ProFormDigit
              name="unit_price"
              label="单价"
              min={0}
              fieldProps={{ precision: 2 }}
              colProps={{ span: 4 }}
            />
            <ProFormText name="remark" label="备注" colProps={{ span: 4 }} />
          </ProFormGroup>
        </ProFormList>
      </ModalForm>
      <Drawer
        title={`${docName}详情`}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={drawerWidth}
        loading={detailLoading}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" items={detailDescriptions(detail)} />
            <Table
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
