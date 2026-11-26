import { useRef, useState } from 'react'
import { App, Button, Popconfirm, Segmented, Space, Tag } from 'antd'
import dayjs from 'dayjs'
import {
  ModalForm,
  ProForm,
  ProFormDateTimeRangePicker,
  ProFormDigit,
  ProFormSelect,
  ProFormText,
  ProTable,
  type ActionType,
  type ProColumns,
} from '@ant-design/pro-components'
import Auth from '../../../components/Auth'
import { pageIndexColumn } from '../../../components/IndexTag'
import { listProducts } from '../../../services/crm'
import { createMallPromotion, deleteMallPromotion, listMallPromotions, updateMallPromotion } from '../../../services/mall'
import { MALL_ENABLE_STATUS_TEXT, type MallEnableStatus, type MallPromotion, type MallPromotionPayload } from '../../../types/mall'

const STATUS_COLOR: Record<MallEnableStatus, string> = { 1: 'success', 2: 'default' }

/** RangePicker 提交值兼容 dayjs 与字符串两种形态,统一转 'YYYY-MM-DD HH:mm:ss' */
const fmtTime = (v: unknown) => {
  if (dayjs.isDayjs(v)) return (v as dayjs.Dayjs).format('YYYY-MM-DD HH:mm:ss')
  return v ? String(v) : ''
}

interface PromotionFormValues {
  name: string
  product_id: number
  promo_price: number
  time_range: [string | dayjs.Dayjs, string | dayjs.Dayjs]
  status: MallEnableStatus
}

/** 商城限时特价管理:活动列表 + 新增/编辑(选品) + 启停 + 删除 */
export default function MallPromotionPage() {
  const { message } = App.useApp()
  const actionRef = useRef<ActionType>(null)
  const [editing, setEditing] = useState<MallPromotion | null>(null)
  const [formOpen, setFormOpen] = useState(false)

  const toggleStatus = async (record: MallPromotion) => {
    const next: MallEnableStatus = record.status === 1 ? 2 : 1
    await updateMallPromotion(record.id, { status: next })
    message.success(`已${MALL_ENABLE_STATUS_TEXT[next]}`)
    actionRef.current?.reload()
  }

  const handleDelete = async (record: MallPromotion) => {
    await deleteMallPromotion(record.id)
    message.success('已删除')
    actionRef.current?.reload()
  }

  const columns: ProColumns<MallPromotion>[] = [
    pageIndexColumn(actionRef, { width: 60 }),
    { title: '活动名', dataIndex: 'name', width: 180, ellipsis: true, search: false },
    { title: '商品名', dataIndex: 'product_name', width: 200, ellipsis: true, search: false },
    {
      title: '促销价', dataIndex: 'promo_price', width: 110, search: false,
      render: (_, r) => <span style={{ fontWeight: 600, color: 'var(--ant-color-error)' }}>¥{Number(r.promo_price).toFixed(2)}</span>,
    },
    {
      title: '起止时间', dataIndex: 'start_at', width: 220, search: false,
      render: (_, r) => `${(r.start_at ?? '').slice(0, 10) || '—'} ~ ${(r.end_at ?? '').slice(0, 10) || '—'}`,
    },
    {
      title: '状态', dataIndex: 'status', width: 90, search: false,
      render: (_, r) => <Tag color={STATUS_COLOR[r.status]}>{MALL_ENABLE_STATUS_TEXT[r.status]}</Tag>,
    },
    { title: '创建时间', dataIndex: 'created_at', valueType: 'dateTime', width: 160, search: false },
    {
      title: '操作', valueType: 'option', width: 160, fixed: 'right',
      render: (_, record) => (
        <Space>
          <Auth perm="mall:promotion:edit">
            <Button type="link" size="small" onClick={() => { setEditing(record); setFormOpen(true) }}>编辑</Button>
          </Auth>
          <Auth perm="mall:promotion:edit">
            <Button type="link" size="small" danger={record.status === 1} onClick={() => toggleStatus(record)}>
              {record.status === 1 ? '停用' : '启用'}
            </Button>
          </Auth>
          <Auth perm="mall:promotion:delete">
            <Popconfirm title="确认删除该活动?" okText="删除" okButtonProps={{ danger: true }} cancelText="再想想"
              onConfirm={() => handleDelete(record)}>
              <Button type="link" size="small" danger>删除</Button>
            </Popconfirm>
          </Auth>
        </Space>
      ),
    },
  ]

  return (
    <>
      <ProTable<MallPromotion>
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        scroll={{ x: 'max-content' }}
        request={async (params) => {
          const { current, pageSize } = params
          const data = await listMallPromotions({ page: current || 1, page_size: pageSize || 10 })
          return { data: data.list, total: data.total, success: true }
        }}
        headerTitle="商城限时特价"
        toolBarRender={() => [
          <Auth key="create" perm="mall:promotion:add">
            <Button type="primary" onClick={() => { setEditing(null); setFormOpen(true) }}>新增活动</Button>
          </Auth>,
        ]}
      />

      <ModalForm<PromotionFormValues>
        key={editing?.id ?? 'new'}
        title={editing ? `编辑活动:${editing.name}` : '新增限时特价'}
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setEditing(null)
        }}
        modalProps={{ destroyOnHidden: true, width: 640 }}
        grid
        initialValues={{
          name: editing?.name,
          product_id: editing?.product_id,
          promo_price: editing ? Number(editing.promo_price) : undefined,
          time_range: editing ? [editing.start_at, editing.end_at] : undefined,
          status: editing?.status ?? 1,
        }}
        onFinish={async (values) => {
          const [startAt, endAt] = values.time_range.map(fmtTime)
          const payload: MallPromotionPayload = {
            name: values.name.trim(),
            product_id: values.product_id,
            promo_price: Number(values.promo_price),
            start_at: startAt,
            end_at: endAt,
          }
          if (editing) {
            await updateMallPromotion(editing.id, { ...payload, status: values.status })
            message.success('已保存')
          } else {
            await createMallPromotion(payload)
            message.success('已创建')
          }
          setFormOpen(false)
          setEditing(null)
          actionRef.current?.reload()
          return true
        }}
      >
        <ProFormText name="name" label="活动名" rules={[{ required: true, message: '请填写活动名称' }]} colProps={{ span: 12 }} />
        {editing && (
          <ProForm.Item name="status" label="状态" colProps={{ span: 12 }}>
            <Segmented options={[{ label: '启用', value: 1 }, { label: '停用', value: 2 }]} />
          </ProForm.Item>
        )}
        <ProFormSelect
          name="product_id"
          label="选择商品"
          rules={[{ required: true, message: '请选择商品' }]}
          request={async () => {
            const data = await listProducts({ page: 1, page_size: 100 })
            return data.list.map((p) => ({ label: `${p.name}(${p.product_no})`, value: p.id }))
          }}
          fieldProps={{ showSearch: true, optionFilterProp: 'label', placeholder: '搜索商品名选择,禁止手输 ID' }}
          colProps={{ span: 24 }}
        />
        <ProFormDigit name="promo_price" label="促销价" min={0.01}
          rules={[{ required: true, message: '请填写促销价' }]}
          fieldProps={{ precision: 2, addonBefore: '¥' }} colProps={{ span: 12 }} />
        <ProFormDateTimeRangePicker
          name="time_range"
          label="起止时间"
          rules={[{ required: true, message: '请选择活动起止时间' }]}
          fieldProps={{ style: { width: '100%' }, format: 'YYYY-MM-DD HH:mm:ss' }}
          colProps={{ span: 24 }}
        />
      </ModalForm>
    </>
  )
}
