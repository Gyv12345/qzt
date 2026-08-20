import { useRef, useState } from 'react'
import { App, Button, Descriptions, Drawer, Popconfirm, Space, Table, Tag } from 'antd'
import { ProTable, type ActionType, type ProColumns, ModalForm, ProFormSelect } from '@ant-design/pro-components'
import Auth from '../../../components/Auth'
import { listMallOrders, getMallOrder, updateMallOrderStatus, generateMallSalesOrder } from '../../../services/mall'
import { listEnabledWarehouses } from '../../../services/psi'
import { MALL_STATUS_TEXT, type MallOrder, type MallOrderDetail, type MallOrderStatus } from '../../../types/mall'
import { pageIndexColumn } from '../../../components/IndexTag'

const statusColor: Record<MallOrderStatus, string> = { 1: 'warning', 2: 'processing', 3: 'success', 4: 'default' }

/** 商城订单管理:列表 + 详情抽屉(状态流转/生成销售单)。商品维护走现有 CRM 产品管理页。 */
export default function MallOrderPage() {
  const { message } = App.useApp()
  const actionRef = useRef<ActionType>(null)
  const [detail, setDetail] = useState<MallOrderDetail | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [genOpen, setGenOpen] = useState(false)
  const [warehouses, setWarehouses] = useState<{ label: string; value: number }[]>([])

  const loadDetail = async (id: number) => {
    const d = await getMallOrder(id)
    setDetail(d)
    setDetailOpen(true)
  }

  const handleStatus = async (record: MallOrder, status: MallOrderStatus, tip: string) => {
    await updateMallOrderStatus(record.id, status)
    message.success(`订单已${tip}`)
    actionRef.current?.reload()
    if (detail?.id === record.id) loadDetail(record.id)
  }

  const openGenerate = async () => {
    if (warehouses.length === 0) {
      const list = await listEnabledWarehouses()
      setWarehouses(list.map((w) => ({ label: w.name, value: w.id })))
    }
    setGenOpen(true)
  }

  const columns: ProColumns<MallOrder>[] = [
    pageIndexColumn(actionRef, { width: 60 }),
    { title: '订单号', dataIndex: 'order_no', width: 200, render: (_, r) => <a onClick={() => loadDetail(r.id)}>{r.order_no}</a> },
    { title: '收货人', dataIndex: 'contact_name', width: 100, search: false },
    { title: '联系电话', dataIndex: 'contact_phone', width: 130 },
    {
      title: '状态', dataIndex: 'status', width: 90, valueType: 'select',
      valueEnum: Object.fromEntries(Object.entries(MALL_STATUS_TEXT).map(([k, v]) => [k, { text: v }])),
      render: (_, r) => <Tag color={statusColor[r.status]}>{MALL_STATUS_TEXT[r.status]}</Tag>,
    },
    {
      title: '金额', dataIndex: 'total_amount', width: 110, search: false,
      render: (_, r) => <span style={{ fontWeight: 600 }}>¥{Number(r.total_amount).toFixed(2)}</span>,
    },
    { title: '数量', dataIndex: 'total_quantity', width: 80, search: false },
    {
      title: '关联销售单', dataIndex: 'psi_order_id', width: 110, search: false,
      render: (_, r) => (r.psi_order_id ? <Tag color="blue">已生成</Tag> : <Tag>未生成</Tag>),
    },
    { title: '下单时间', dataIndex: 'created_at', valueType: 'dateTime', width: 160, search: false },
    {
      title: '操作', valueType: 'option', width: 240,
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" onClick={() => loadDetail(record.id)}>详情</Button>
          {record.status === 1 && (
            <Auth perm="mall:order:confirm">
              <Button type="link" size="small" onClick={() => handleStatus(record, 2, '确认')}>确认</Button>
            </Auth>
          )}
          {record.status === 2 && (
            <Auth perm="mall:order:finish">
              <Button type="link" size="small" onClick={() => handleStatus(record, 3, '完成')}>完成</Button>
            </Auth>
          )}
          {(record.status === 1 || record.status === 2) && (
            <Auth perm="mall:order:cancel">
              <Popconfirm title="确认取消该订单?" description="取消后未出库的关联销售单将同步关闭" okText="取消订单" okButtonProps={{ danger: true }} cancelText="再想想"
                onConfirm={() => handleStatus(record, 4, '取消')}>
                <Button type="link" size="small" danger>取消</Button>
              </Popconfirm>
            </Auth>
          )}
        </Space>
      ),
    },
  ]

  return (
    <>
      <ProTable<MallOrder>
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        scroll={{ x: 'max-content' }}
        request={async (params) => {
          const { current, pageSize, ...rest } = params
          const data = await listMallOrders({ page: current || 1, page_size: pageSize || 10, ...rest })
          return { data: data.list, total: data.total, success: true }
        }}
        headerTitle="商城订单"
      />

      <Drawer title={`订单详情 ${detail?.order_no ?? ''}`} width={640} open={detailOpen} onClose={() => setDetailOpen(false)}>
        {detail && (
          <>
            <Descriptions column={2} size="small" bordered>
              <Descriptions.Item label="状态" span={1}>
                <Tag color={statusColor[detail.status]}>{detail.status_label}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="下单时间">{detail.created_at}</Descriptions.Item>
              <Descriptions.Item label="收货人">{detail.contact_name}</Descriptions.Item>
              <Descriptions.Item label="联系电话">{detail.contact_phone}</Descriptions.Item>
              <Descriptions.Item label="收货地址" span={2}>{detail.address}</Descriptions.Item>
              <Descriptions.Item label="关联客户">{detail.customer_name || '—'}</Descriptions.Item>
              <Descriptions.Item label="关联销售单">{detail.sales_order_no || '未生成'}</Descriptions.Item>
              <Descriptions.Item label="总金额"><b>¥{Number(detail.total_amount).toFixed(2)}</b></Descriptions.Item>
              <Descriptions.Item label="总数量">{Number(detail.total_quantity)}</Descriptions.Item>
              {detail.remark && <Descriptions.Item label="备注" span={2}>{detail.remark}</Descriptions.Item>}
            </Descriptions>

            <div style={{ margin: '16px 0 8px', fontWeight: 600 }}>商品明细</div>
            <Table<MallOrderDetail['items'][number]> rowKey="id" size="small" pagination={false}
              dataSource={detail.items}
              columns={[
                { title: '商品', dataIndex: 'product_name' },
                { title: '单价', dataIndex: 'unit_price', width: 100, render: (v) => `¥${Number(v).toFixed(2)}` },
                { title: '数量', dataIndex: 'quantity', width: 80, render: (v) => Number(v) },
                { title: '金额', dataIndex: 'amount', width: 110, render: (v) => `¥${Number(v).toFixed(2)}` },
              ]} />

            <Space style={{ marginTop: 16 }}>
              {!detail.psi_order_id && detail.status !== 4 && (
                <Auth perm="mall:order:generate">
                  <Button type="primary" onClick={openGenerate}>生成销售单</Button>
                </Auth>
              )}
              {detail.status === 1 && (
                <Auth perm="mall:order:confirm"><Button onClick={() => handleStatus(detail, 2, '确认')}>确认订单</Button></Auth>
              )}
              {detail.status === 2 && (
                <Auth perm="mall:order:finish"><Button onClick={() => handleStatus(detail, 3, '完成')}>完成订单</Button></Auth>
              )}
            </Space>
          </>
        )}
      </Drawer>

      <ModalForm<{ warehouse_id: number }>
        title="生成 PSI 销售单"
        open={genOpen}
        onOpenChange={setGenOpen}
        modalProps={{ destroyOnHidden: true }}
        onFinish={async (values) => {
          if (!detail) return false
          const res = await generateMallSalesOrder(detail.id, values.warehouse_id)
          message.success(`销售单 ${res.sales_order_no} 已生成`)
          setGenOpen(false)
          actionRef.current?.reload()
          loadDetail(detail.id)
          return true
        }}
      >
        <ProFormSelect name="warehouse_id" label="出库仓库" rules={[{ required: true, message: '请选择仓库' }]}
          request={async () => warehouses} />
      </ModalForm>
    </>
  )
}
