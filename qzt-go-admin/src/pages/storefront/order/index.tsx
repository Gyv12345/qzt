import { useRef, useState } from 'react'
import { Button, Descriptions, Drawer, Empty, Table, Tag } from 'antd'
import { ProTable, type ActionType, type ProColumns } from '@ant-design/pro-components'
import { pageIndexColumn } from '../../../components/IndexTag'
import { getStorefrontOrder, getStorefrontOrders } from '../../../services/storefront'
import {
  STOREFRONT_ORDER_STATUS_TEXT,
  type StorefrontOrder,
  type StorefrontOrderItem,
  type StorefrontOrderStatus,
} from '../../../types/storefront'

/** 状态配色:待支付橙 / 已支付绿 / 已取消·已过期灰 */
const STATUS_COLOR: Record<StorefrontOrderStatus, string> = {
  1: 'orange',
  2: 'green',
  3: 'default',
  4: 'default',
}

/** 金额展示:货币代码 + 两位小数,如 USD 100.00 */
const fmtAmount = (currency: string, v: string | number) => `${currency} ${Number(v).toFixed(2)}`

/** 订单商品总数量(items 行数量求和) */
const totalQuantity = (items?: StorefrontOrderItem[]) =>
  (items ?? []).reduce((sum, it) => sum + Number(it.quantity || 0), 0)

/** 商品列文本:首件商品名,多件追加「等 N 件」 */
const productSummary = (items?: StorefrontOrderItem[]) => {
  const first = items?.[0]?.product_name || '—'
  return items && items.length > 1 ? `${first} 等 ${items.length} 件` : first
}

/** 商品明细表(行展开与详情抽屉共用):商品/规格/数量/单价/小计 */
function ItemsTable({ items, currency }: { items: StorefrontOrderItem[]; currency: string }) {
  return (
    <Table<StorefrontOrderItem>
      rowKey="id"
      size="small"
      pagination={false}
      dataSource={items ?? []}
      locale={{ emptyText: <Empty description="暂无商品明细" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
      columns={[
        { title: '商品', dataIndex: 'product_name', render: (v: string) => v || '—' },
        { title: '规格', dataIndex: 'sku', width: 150, render: (v: string) => v || '默认规格' },
        { title: '数量', dataIndex: 'quantity', width: 80, render: (v) => Number(v) },
        { title: '单价', dataIndex: 'unit_amount', width: 120, render: (v) => fmtAmount(currency, v) },
        { title: '小计', dataIndex: 'amount', width: 120, render: (v) => fmtAmount(currency, v) },
      ]}
    />
  )
}

/** 独立站订单管理:列表 + 行展开明细 + 详情抽屉(只读,不含支付/取消等写操作) */
export default function StorefrontOrderPage() {
  const actionRef = useRef<ActionType>(null)
  const [detail, setDetail] = useState<StorefrontOrder | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const loadDetail = async (id: number) => {
    const d = await getStorefrontOrder(id)
    setDetail(d)
    setDetailOpen(true)
  }

  const columns: ProColumns<StorefrontOrder>[] = [
    pageIndexColumn(actionRef, { width: 60 }),
    { title: '订单号', dataIndex: 'order_no', width: 200, ellipsis: true, copyable: true, search: false },
    { title: '商品', dataIndex: 'items', width: 220, ellipsis: true, search: false, render: (_, r) => productSummary(r.items) },
    { title: '数量', dataIndex: 'quantity', width: 70, search: false, render: (_, r) => totalQuantity(r.items) },
    {
      title: '金额',
      dataIndex: 'total_amount',
      width: 130,
      search: false,
      render: (_, r) => <span style={{ fontWeight: 600 }}>{fmtAmount(r.currency, r.total_amount)}</span>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      valueType: 'select',
      valueEnum: Object.fromEntries(
        Object.entries(STOREFRONT_ORDER_STATUS_TEXT).map(([k, v]) => [k, { text: v }]),
      ),
      render: (_, r) => <Tag color={STATUS_COLOR[r.status]}>{STOREFRONT_ORDER_STATUS_TEXT[r.status]}</Tag>,
    },
    { title: '客户邮箱', dataIndex: 'customer_email', width: 220, ellipsis: true, search: false },
    { title: '支付时间', dataIndex: 'paid_at', width: 160, search: false, render: (_, r) => r.paid_at || '—' },
    {
      title: 'PSI 单号',
      dataIndex: 'psi_order_no',
      width: 150,
      ellipsis: true,
      search: false,
      render: (_, r) => (r.psi_order_no ? <Tag color="blue">{r.psi_order_no}</Tag> : <Tag>未生成</Tag>),
    },
    { title: '创建时间', dataIndex: 'created_at', valueType: 'dateTime', width: 160, search: false },
    {
      title: '操作',
      valueType: 'option',
      width: 80,
      fixed: 'right',
      render: (_, record) => (
        <Button type="link" size="small" onClick={() => loadDetail(record.id)}>
          详情
        </Button>
      ),
    },
  ]

  return (
    <>
      <ProTable<StorefrontOrder>
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        scroll={{ x: 'max-content' }}
        locale={{ emptyText: <Empty description="暂无订单" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
        expandable={{
          expandedRowRender: (r) => <ItemsTable items={r.items ?? []} currency={r.currency} />,
        }}
        request={async (params) => {
          const { current, pageSize, status } = params
          // valueEnum 下拉回传的是字符串键,后端状态为整型,这里统一转数字
          const statusNum =
            status !== undefined && status !== null && status !== '' ? (Number(status) as StorefrontOrderStatus) : undefined
          const data = await getStorefrontOrders({
            page: current || 1,
            page_size: pageSize || 10,
            status: statusNum,
          })
          return { data: data.list, total: data.total, success: true }
        }}
        headerTitle="独立站订单"
      />

      <Drawer title={`订单详情 ${detail?.order_no ?? ''}`} width={720} open={detailOpen} onClose={() => setDetailOpen(false)}>
        {detail && (
          <>
            <Descriptions column={2} size="small" bordered>
              <Descriptions.Item label="状态">
                <Tag color={STATUS_COLOR[detail.status]}>{STOREFRONT_ORDER_STATUS_TEXT[detail.status]}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="金额">
                <b>{fmtAmount(detail.currency, detail.total_amount)}</b>
              </Descriptions.Item>
              <Descriptions.Item label="客户邮箱" span={2}>{detail.customer_email || '—'}</Descriptions.Item>
              <Descriptions.Item label="客户姓名">{detail.customer_name || '—'}</Descriptions.Item>
              <Descriptions.Item label="客户国家">{detail.customer_country || '—'}</Descriptions.Item>
              <Descriptions.Item label="PSI 单号">
                {detail.psi_order_no ? <Tag color="blue">{detail.psi_order_no}</Tag> : '未生成'}
              </Descriptions.Item>
              <Descriptions.Item label="下单语言">{detail.locale || '—'}</Descriptions.Item>
              <Descriptions.Item label="支付时间">{detail.paid_at || '—'}</Descriptions.Item>
              <Descriptions.Item label="创建时间">{detail.created_at}</Descriptions.Item>
              <Descriptions.Item label="Stripe Session" span={2}>
                <span style={{ wordBreak: 'break-all' }}>{detail.stripe_session_id || '—'}</span>
              </Descriptions.Item>
              <Descriptions.Item label="Payment Intent" span={2}>
                <span style={{ wordBreak: 'break-all' }}>{detail.payment_intent_id || '—'}</span>
              </Descriptions.Item>
              <Descriptions.Item label="下单 IP">{detail.ip || '—'}</Descriptions.Item>
            </Descriptions>

            <div style={{ margin: '16px 0 8px', fontWeight: 600 }}>商品明细</div>
            <ItemsTable items={detail.items ?? []} currency={detail.currency} />

            <div style={{ marginTop: 16, color: '#999', fontSize: 12 }}>
              Stripe 会话与支付凭证以 Stripe 控制台为准
            </div>
          </>
        )}
      </Drawer>
    </>
  )
}
