import { useRef, useState } from 'react'
import { App, Button, Popconfirm, Segmented, Space, Tag } from 'antd'
import type { Rule } from 'antd/es/form'
import dayjs from 'dayjs'
import {
  ModalForm,
  ProForm,
  ProFormDateTimeRangePicker,
  ProFormDigit,
  ProFormText,
  ProTable,
  type ActionType,
  type ProColumns,
} from '@ant-design/pro-components'
import Auth from '../../../components/Auth'
import { pageIndexColumn } from '../../../components/IndexTag'
import { createMallCoupon, deleteMallCoupon, listMallCoupons, updateMallCoupon } from '../../../services/mall'
import { MALL_ENABLE_STATUS_TEXT, type MallCoupon, type MallCouponPayload, type MallEnableStatus } from '../../../types/mall'

const STATUS_COLOR: Record<MallEnableStatus, string> = { 1: 'success', 2: 'default' }

/** RangePicker 提交值兼容 dayjs 与字符串两种形态,统一转 'YYYY-MM-DD HH:mm:ss' */
const fmtTime = (v: unknown) => {
  if (dayjs.isDayjs(v)) return (v as dayjs.Dayjs).format('YYYY-MM-DD HH:mm:ss')
  return v ? String(v) : ''
}

/** 金额两位小数 */
const fmtMoney = (v: number | string) => `¥${Number(v).toFixed(2)}`

interface CouponFormValues {
  name: string
  threshold: number
  discount: number
  total_count: number
  per_user_limit: number
  time_range?: [string | dayjs.Dayjs, string | dayjs.Dayjs] | null
  status: MallEnableStatus
}

/** 优惠金额校验:必须 > 0 且小于门槛金额 */
const discountRule: Rule = ({ getFieldValue }) => ({
  validator(_, value) {
    if (value == null || Number(value) <= 0) return Promise.reject(new Error('优惠金额需大于 0'))
    const threshold = getFieldValue('threshold')
    if (threshold != null && Number(value) >= Number(threshold)) return Promise.reject(new Error('优惠金额需小于门槛金额'))
    return Promise.resolve()
  },
})

/** 商城优惠券管理:满减券列表 + 新增/编辑 + 启停 + 删除 */
export default function MallCouponPage() {
  const { message } = App.useApp()
  const actionRef = useRef<ActionType>(null)
  const [editing, setEditing] = useState<MallCoupon | null>(null)
  const [formOpen, setFormOpen] = useState(false)

  const toggleStatus = async (record: MallCoupon) => {
    const next: MallEnableStatus = record.status === 1 ? 2 : 1
    await updateMallCoupon(record.id, { status: next })
    message.success(`已${MALL_ENABLE_STATUS_TEXT[next]}`)
    actionRef.current?.reload()
  }

  const handleDelete = async (record: MallCoupon) => {
    await deleteMallCoupon(record.id)
    message.success('已删除')
    actionRef.current?.reload()
  }

  const columns: ProColumns<MallCoupon>[] = [
    pageIndexColumn(actionRef, { width: 60 }),
    { title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '搜索优惠券名称' } },
    { title: '名称', dataIndex: 'name', width: 180, ellipsis: true, search: false },
    {
      title: '满减', dataIndex: 'threshold', width: 170, search: false,
      render: (_, r) => (
        <span>
          满<span style={{ fontWeight: 600 }}>{fmtMoney(r.threshold)}</span>减
          <span style={{ fontWeight: 600, color: 'var(--ant-color-error)' }}>{fmtMoney(r.discount)}</span>
        </span>
      ),
    },
    { title: '总量', dataIndex: 'total_count', width: 80, search: false },
    {
      title: '已领', dataIndex: 'claimed', width: 90, search: false,
      render: (_, r) => `${r.claimed}/${r.total_count}`,
    },
    { title: '每人限领', dataIndex: 'per_user_limit', width: 90, search: false },
    {
      title: '时间窗', dataIndex: 'start_at', width: 220, search: false,
      render: (_, r) =>
        r.start_at || r.end_at ? `${(r.start_at ?? '').slice(0, 10) || '—'} ~ ${(r.end_at ?? '').slice(0, 10) || '—'}` : <Tag>长期</Tag>,
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
          <Auth perm="mall:coupon:edit">
            <Button type="link" size="small" onClick={() => { setEditing(record); setFormOpen(true) }}>编辑</Button>
          </Auth>
          <Auth perm="mall:coupon:edit">
            <Button type="link" size="small" danger={record.status === 1} onClick={() => toggleStatus(record)}>
              {record.status === 1 ? '停用' : '启用'}
            </Button>
          </Auth>
          <Auth perm="mall:coupon:delete">
            <Popconfirm title="确认删除该优惠券?" description="删除后已领取的券不可再使用" okText="删除" okButtonProps={{ danger: true }} cancelText="再想想"
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
      <ProTable<MallCoupon>
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        scroll={{ x: 'max-content' }}
        request={async (params) => {
          const { current, pageSize, keyword } = params
          const data = await listMallCoupons({
            page: current || 1,
            page_size: pageSize || 10,
            keyword: keyword?.trim() || undefined,
          })
          return { data: data.list, total: data.total, success: true }
        }}
        headerTitle="商城优惠券"
        toolBarRender={() => [
          <Auth key="create" perm="mall:coupon:add">
            <Button type="primary" onClick={() => { setEditing(null); setFormOpen(true) }}>新增优惠券</Button>
          </Auth>,
        ]}
      />

      <ModalForm<CouponFormValues>
        key={editing?.id ?? 'new'}
        title={editing ? `编辑优惠券:${editing.name}` : '新增优惠券'}
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setEditing(null)
        }}
        modalProps={{ destroyOnHidden: true, width: 640 }}
        grid
        initialValues={{
          name: editing?.name,
          threshold: editing ? Number(editing.threshold) : undefined,
          discount: editing ? Number(editing.discount) : undefined,
          total_count: editing?.total_count ?? 100,
          per_user_limit: editing?.per_user_limit ?? 1,
          time_range: editing?.start_at || editing?.end_at ? [editing.start_at ?? '', editing.end_at ?? ''] : undefined,
          status: editing?.status ?? 1,
        }}
        onFinish={async (values) => {
          const [startAt, endAt] = (values.time_range ?? []).map(fmtTime)
          const payload: MallCouponPayload = {
            name: values.name.trim(),
            threshold: Number(values.threshold),
            discount: Number(values.discount),
            total_count: Number(values.total_count ?? 0),
            per_user_limit: Number(values.per_user_limit ?? 1),
            start_at: startAt || undefined,
            end_at: endAt || undefined,
          }
          if (editing) {
            await updateMallCoupon(editing.id, { ...payload, status: values.status })
            message.success('已保存')
          } else {
            await createMallCoupon(payload)
            message.success('已创建')
          }
          setFormOpen(false)
          setEditing(null)
          actionRef.current?.reload()
          return true
        }}
      >
        <ProFormText name="name" label="名称" rules={[{ required: true, message: '请填写优惠券名称' }]} colProps={{ span: 12 }} />
        {editing && (
          <ProForm.Item name="status" label="状态" colProps={{ span: 12 }}>
            <Segmented options={[{ label: '启用', value: 1 }, { label: '停用', value: 2 }]} />
          </ProForm.Item>
        )}
        <ProFormDigit name="threshold" label="门槛金额" tooltip="消费满该金额可用" min={0.01}
          rules={[{ required: true, message: '请填写门槛金额' }]}
          fieldProps={{ precision: 2, addonBefore: '¥' }} colProps={{ span: 12 }} />
        <ProFormDigit name="discount" label="优惠金额" min={0.01}
          rules={[
            { required: true, message: '请填写优惠金额' },
            discountRule,
          ]}
          fieldProps={{ precision: 2, addonBefore: '¥' }} colProps={{ span: 12 }} />
        <ProFormDigit name="total_count" label="发放总量" min={1}
          rules={[{ required: true, message: '请填写发放总量' }]}
          fieldProps={{ precision: 0 }} colProps={{ span: 12 }} />
        <ProFormDigit name="per_user_limit" label="每人限领" min={1}
          rules={[{ required: true, message: '请填写每人限领张数' }]}
          fieldProps={{ precision: 0 }} colProps={{ span: 12 }} />
        <ProFormDateTimeRangePicker
          name="time_range"
          label="时间窗"
          tooltip="留空 = 长期有效"
          fieldProps={{ style: { width: '100%' }, format: 'YYYY-MM-DD HH:mm:ss' }}
          colProps={{ span: 24 }}
        />
      </ModalForm>
    </>
  )
}
