import { useState } from 'react'
import { App, Button, Drawer, Form, Popconfirm, Select, Space, Statistic, Table, Tag, type TableProps } from 'antd'
import { PaperClipOutlined, PlusOutlined } from '@ant-design/icons'
import { ModalForm, ProForm, ProFormDatePicker, ProFormDigit, ProFormTextArea } from '@ant-design/pro-components'
import dayjs, { type Dayjs } from 'dayjs'
import AttachmentsPanel from '../../../components/AttachmentsPanel'
import Auth from '../../../components/Auth'
import DictSelect, { DictTag } from '../../../components/DictSelect'
import {
  createPaymentPlan,
  createPaymentRecord,
  deletePaymentPlan,
  deletePaymentRecord,
  updatePaymentPlan,
  updatePaymentRecord,
} from '../../../services/crm'
import type {
  CrmContract,
  CrmPaymentPlan,
  CrmPaymentRecord,
  CrmPaymentSummary,
} from '../../../types/crm'
import { PLAN_STATUS, money } from './constants'

interface PlanFormValues {
  plan_date: Dayjs
  plan_amount: number
  remark?: string
}

interface RecordFormValues {
  received_date: Dayjs
  amount: number
  method?: string
  plan_id?: number
  remark?: string
}

interface PaymentPanelProps {
  contract: CrmContract
  summary: CrmPaymentSummary | null
  records: CrmPaymentRecord[]
  loading: boolean
  /** 回款增删改后重新拉取回款数据并刷新合同列表(已回款金额会变化) */
  onRefresh: () => Promise<void>
}

/** ProForm 在 Drawer+Tabs 场景下日期可能以字符串抵达 onFinish,统一归一化 */
const toDateStr = (v: Dayjs | string | undefined): string =>
  typeof v === 'string' ? v : v?.format('YYYY-MM-DD') ?? ''

/** 合同详情抽屉的「回款管理」Tab:统计 + 回款计划/回款记录表格与增删改弹窗、回款附件 */
export default function PaymentPanel({ contract, summary, records, loading, onRefresh }: PaymentPanelProps) {
  const { message } = App.useApp()

  // 回款计划新增/编辑
  const [planForm] = Form.useForm<PlanFormValues>()
  const [planModalOpen, setPlanModalOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<CrmPaymentPlan | null>(null)

  // 回款记录新增/编辑
  const [recordForm] = Form.useForm<RecordFormValues>()
  const [recordModalOpen, setRecordModalOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<CrmPaymentRecord | null>(null)

  // 回款记录附件
  const [paymentAttachTarget, setPaymentAttachTarget] = useState<CrmPaymentRecord | null>(null)

  const plans = summary?.plans ?? []

  // ---------- 回款计划 CRUD ----------

  const openPlanCreate = () => {
    setEditingPlan(null)
    planForm.resetFields()
    setPlanModalOpen(true)
  }

  const openPlanEdit = (record: CrmPaymentPlan) => {
    setEditingPlan(record)
    planForm.resetFields()
    planForm.setFieldsValue({
      plan_date: record.plan_date ? dayjs(record.plan_date) : undefined,
      plan_amount: Number(record.plan_amount),
      remark: record.remark,
    })
    setPlanModalOpen(true)
  }

  const handlePlanSubmit = async (values: PlanFormValues) => {
    const payload = {
      plan_date: toDateStr(values.plan_date),
      plan_amount: values.plan_amount,
      remark: values.remark,
    }
    if (editingPlan) {
      await updatePaymentPlan(editingPlan.id, payload)
      message.success('回款计划已更新')
    } else {
      await createPaymentPlan(contract.id, payload)
      message.success('回款计划已创建')
    }
    await onRefresh()
    return true
  }

  const handlePlanDelete = async (record: CrmPaymentPlan) => {
    await deletePaymentPlan(record.id)
    message.success('回款计划已删除')
    await onRefresh()
  }

  // ---------- 回款记录 CRUD ----------

  const openRecordCreate = () => {
    setEditingRecord(null)
    recordForm.resetFields()
    setRecordModalOpen(true)
  }

  const openRecordEdit = (record: CrmPaymentRecord) => {
    setEditingRecord(record)
    recordForm.resetFields()
    recordForm.setFieldsValue({
      received_date: record.received_date ? dayjs(record.received_date) : undefined,
      amount: Number(record.amount),
      method: record.method || undefined,
      plan_id: record.plan_id ?? undefined,
      remark: record.remark,
    })
    setRecordModalOpen(true)
  }

  const handleRecordSubmit = async (values: RecordFormValues) => {
    const payload = {
      received_date: toDateStr(values.received_date),
      amount: values.amount,
      method: values.method,
      plan_id: values.plan_id,
      remark: values.remark,
    }
    if (editingRecord) {
      await updatePaymentRecord(editingRecord.id, payload)
      message.success('回款记录已更新')
    } else {
      await createPaymentRecord(contract.id, payload)
      message.success('回款记录已创建')
    }
    await onRefresh()
    return true
  }

  const handleRecordDelete = async (record: CrmPaymentRecord) => {
    await deletePaymentRecord(record.id)
    message.success('回款记录已删除')
    await onRefresh()
  }

  // ---------- 回款计划/记录表格 ----------

  const planColumns: TableProps<CrmPaymentPlan>['columns'] = [
    { title: '计划日期', dataIndex: 'plan_date', render: (v: string | null) => v ?? '-' },
    { title: '计划金额', dataIndex: 'plan_amount', align: 'right', render: (v: string) => money(v) },
    {
      title: '已回款',
      dataIndex: 'received_amount',
      align: 'right',
      render: (v: string) => money(v),
    },
    {
      title: '状态',
      dataIndex: 'status',
      render: (v: number) => {
        const s = PLAN_STATUS[v] ?? { text: String(v), color: 'default' }
        return <Tag color={s.color}>{s.text}</Tag>
      },
    },
    { title: '备注', dataIndex: 'remark', render: (v: string) => v || '-' },
    {
      title: '操作',
      key: 'action',
      width: 130,
      render: (_, r) => (
        <Space>
          <Auth perm="crm:payment:edit">
            <Button type="link" size="small" onClick={() => openPlanEdit(r)}>
              编辑
            </Button>
          </Auth>
          <Auth perm="crm:payment:delete">
            <Popconfirm
              title="确认删除该回款计划?"
              okText="删除"
              okButtonProps={{ danger: true }}
              cancelText="取消"
              onConfirm={() => handlePlanDelete(r)}
            >
              <Button type="link" size="small" danger>
                删除
              </Button>
            </Popconfirm>
          </Auth>
        </Space>
      ),
    },
  ]

  const recordColumns: TableProps<CrmPaymentRecord>['columns'] = [
    { title: '回款日期', dataIndex: 'received_date', render: (v: string | null) => v ?? '-' },
    { title: '回款金额', dataIndex: 'amount', align: 'right', render: (v: string) => money(v) },
    {
      title: '回款方式',
      dataIndex: 'method',
      render: (v: string) => <DictTag code="PAYMENT_METHOD" value={v} />,
    },
    { title: '备注', dataIndex: 'remark', render: (v: string) => v || '-' },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_, r) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<PaperClipOutlined />}
            onClick={() => setPaymentAttachTarget(r)}
          >
            附件
          </Button>
          <Auth perm="crm:payment:edit">
            <Button type="link" size="small" onClick={() => openRecordEdit(r)}>
              编辑
            </Button>
          </Auth>
          <Auth perm="crm:payment:delete">
            <Popconfirm
              title="确认删除该回款记录?"
              okText="删除"
              okButtonProps={{ danger: true }}
              cancelText="取消"
              onConfirm={() => handleRecordDelete(r)}
            >
              <Button type="link" size="small" danger>
                删除
              </Button>
            </Popconfirm>
          </Auth>
        </Space>
      ),
    },
  ]

  const unreceived = summary
    ? Number((Number(summary.total_amount) - Number(summary.received_amount)).toFixed(2))
    : 0

  return (
    <>
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Space size={48}>
          <Statistic
            title="合同金额"
            value={Number(summary?.total_amount ?? 0)}
            precision={2}
            prefix="¥"
          />
          <Statistic
            title="已回款"
            value={Number(summary?.received_amount ?? 0)}
            precision={2}
            prefix="¥"
            valueStyle={{ color: '#52c41a' }}
          />
          <Statistic title="未回款" value={unreceived} precision={2} prefix="¥" />
        </Space>
        <Table<CrmPaymentPlan>
          rowKey="id"
          size="small"
          loading={loading}
          columns={planColumns}
          dataSource={plans}
          pagination={false}
          title={() => (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>回款计划</span>
              <Auth perm="crm:payment:add">
                <Button
                  type="primary"
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={openPlanCreate}
                >
                  新增回款计划
                </Button>
              </Auth>
            </div>
          )}
        />
        <Table<CrmPaymentRecord>
          rowKey="id"
          size="small"
          loading={loading}
          columns={recordColumns}
          dataSource={records}
          pagination={false}
          title={() => (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>回款记录</span>
              <Auth perm="crm:payment:add">
                <Button
                  type="primary"
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={openRecordCreate}
                >
                  新增回款记录
                </Button>
              </Auth>
            </div>
          )}
        />
      </Space>

      {/* 回款记录附件 */}
      <Drawer
        title={
          paymentAttachTarget
            ? `回款附件:¥${paymentAttachTarget.amount}(${paymentAttachTarget.received_date ?? '-'})`
            : '回款附件'
        }
        width={560}
        open={!!paymentAttachTarget}
        onClose={() => setPaymentAttachTarget(null)}
        destroyOnHidden
      >
        {paymentAttachTarget && (
          <AttachmentsPanel
            bizType="CONTRACT_PAYMENT"
            resourceId={paymentAttachTarget.id}
            uploadPerm="crm:payment:edit"
            deletePerm="crm:payment:edit"
          />
        )}
      </Drawer>

      {/* 新增/编辑回款计划 */}
      <ModalForm<PlanFormValues>
        title={editingPlan ? '编辑回款计划' : '新增回款计划'}
        form={planForm}
        open={planModalOpen}
        onOpenChange={setPlanModalOpen}
        modalProps={{ destroyOnHidden: true, maskClosable: false }}
        onFinish={handlePlanSubmit}
        width={640}
        grid
      >
        <ProFormDatePicker
          name="plan_date"
          label="计划日期"
          rules={[{ required: true, message: '请选择计划日期' }]}
          fieldProps={{ style: { width: '100%' }, placeholder: '选择日期' }}
          colProps={{ span: 12 }}
        />
        <ProFormDigit
          name="plan_amount"
          label="计划金额"
          rules={[{ required: true, message: '请输入计划金额' }]}
          min={0}
          fieldProps={{ precision: 2 }}
          placeholder="计划金额"
          colProps={{ span: 12 }}
        />
        <ProFormTextArea name="remark" label="备注" placeholder="备注" colProps={{ span: 24 }} />
      </ModalForm>

      {/* 新增/编辑回款记录 */}
      <ModalForm<RecordFormValues>
        title={editingRecord ? '编辑回款记录' : '新增回款记录'}
        form={recordForm}
        open={recordModalOpen}
        onOpenChange={setRecordModalOpen}
        modalProps={{ destroyOnHidden: true, maskClosable: false }}
        onFinish={handleRecordSubmit}
        width={640}
        grid
      >
        <ProFormDatePicker
          name="received_date"
          label="回款日期"
          rules={[{ required: true, message: '请选择回款日期' }]}
          fieldProps={{ style: { width: '100%' }, placeholder: '选择日期' }}
          colProps={{ span: 12 }}
        />
        <ProFormDigit
          name="amount"
          label="回款金额"
          rules={[{ required: true, message: '请输入回款金额' }]}
          min={0}
          fieldProps={{ precision: 2 }}
          placeholder="回款金额"
          colProps={{ span: 12 }}
        />
        <ProForm.Item name="method" label="回款方式" colProps={{ span: 12 }}>
          <DictSelect code="PAYMENT_METHOD" placeholder="选择回款方式" />
        </ProForm.Item>
        <ProForm.Item name="plan_id" label="关联回款计划" colProps={{ span: 12 }}>
          <Select
            allowClear
            placeholder="选择回款计划(可选)"
            options={plans.map((p) => ({
              label: `${p.plan_date ?? '-'} ¥${p.plan_amount}`,
              value: p.id,
            }))}
          />
        </ProForm.Item>
        <ProFormTextArea name="remark" label="备注" placeholder="备注" colProps={{ span: 24 }} />
      </ModalForm>
    </>
  )
}
