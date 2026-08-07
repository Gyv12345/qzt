import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  App,
  Button,
  Col,
  DatePicker,
  Descriptions,
  Drawer,
  Form,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Spin,
  Statistic,
  Table,
  Tabs,
  Tag,
  type TableProps,
} from 'antd'
import { PaperClipOutlined, PlusOutlined, PrinterOutlined } from '@ant-design/icons'
import {
  ProForm,
  ModalForm,
  ProFormDigit,
  ProFormText,
  ProFormTextArea,
  ProTable,
  type ActionType,
  type ProColumns,
} from '@ant-design/pro-components'
import dayjs, { type Dayjs } from 'dayjs'
import Auth from '../../../components/Auth'
import AttachmentsPanel from '../../../components/AttachmentsPanel'
import CustomerSelect from '../../../components/CustomerSelect'
import DictSelect, { DictTag } from '../../../components/DictSelect'
import ExportButtons from '../../../components/ExportButtons'
import OpportunitySelect from '../../../components/OpportunitySelect'
import UserSelect from '../../../components/UserSelect'
import { pushApproval } from '../../../services/approval'
import CustomerDetailDrawer from '../customer/DetailDrawer'
import OpportunityDetailDrawer from '../opportunity/DetailDrawer'
import { formatMoney } from '../../../utils/format'
import {
  createContract,
  createContractItem,
  deleteContractItem,
  createPaymentPlan,
  createPaymentRecord,
  deleteContract,
  deletePaymentPlan,
  deletePaymentRecord,
  getContractPaymentSummary,
  listContracts,
  listContractItems,
  listContractTemplates,
  listCustomers,
  listPaymentRecords,
  printContractDocument,
  updateContract,
  updateContractItem,
  updatePaymentPlan,
  updatePaymentRecord,
} from '../../../services/crm'
import { useUserStore } from '../../../stores/users'
import type {
  CrmContract,
  CrmContractItem,
  CrmContractPayload,
  CrmContractTemplate,
  CrmCustomer,
  CrmPaymentPlan,
  CrmPaymentRecord,
  CrmPaymentSummary,
} from '../../../types/crm'

interface ContractFormValues {
  name: string
  contract_no?: string
  customer_id: number
  opportunity_id?: number
  total_amount?: number
  signed_date?: Dayjs
  start_date?: Dayjs
  end_date?: Dayjs
  stage?: string
  owner_id?: number
  content?: string
}

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

/** 回款计划状态: 0未回款 1部分回款 2已回款 */
const PLAN_STATUS: Record<number, { text: string; color: string }> = {
  0: { text: '未回款', color: 'default' },
  1: { text: '部分回款', color: 'warning' },
  2: { text: '已回款', color: 'success' },
}

/** 合同审批状态 */
const APPROVAL_STATUS: Record<string, { text: string; color: string }> = {
  NONE: { text: '未审批', color: 'default' },
  PROCESSING: { text: '审批中', color: 'processing' },
  APPROVED: { text: '已通过', color: 'success' },
  REJECTED: { text: '已驳回', color: 'error' },
  REVOKED: { text: '已撤回', color: 'warning' },
}

/** 金额显示:复用全站 formatMoney(¥ + 千分位 + 两位小数) */
const money = formatMoney

const formatDate = (v: Dayjs | undefined) => (v ? v.format('YYYY-MM-DD') : undefined)

export default function ContractPage() {
  const { message } = App.useApp()
  const actionRef = useRef<ActionType>(null)
  const nickname = useUserStore((s) => s.nickname)

  // 合同新增/编辑
  const [form] = Form.useForm<ContractFormValues>()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<CrmContract | null>(null)
  // 表单内已选客户(联动商机下拉过滤)
  const selectedCustomerId = Form.useWatch('customer_id', form)

  // 客户 id -> 名称(列表展示)
  const [customers, setCustomers] = useState<CrmCustomer[]>([])
  const customerMap = useMemo(() => new Map(customers.map((c) => [c.id, c.name])), [customers])

  // 客户/商机详情抽屉(点击关联对象打开)
  const [viewCustomer, setViewCustomer] = useState<CrmCustomer | null>(null)
  const [viewOpportunityId, setViewOpportunityId] = useState<number | null>(null)

  // 详情抽屉 + 回款数据
  const [detail, setDetail] = useState<CrmContract | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [summary, setSummary] = useState<CrmPaymentSummary | null>(null)
  const [records, setRecords] = useState<CrmPaymentRecord[]>([])
  const [paymentLoading, setPaymentLoading] = useState(false)

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

  // 产品明细
  const [items, setItems] = useState<CrmContractItem[]>([])
  const [itemLoading, setItemLoading] = useState(false)
  const [itemForm] = Form.useForm<{ product_name: string; quantity: number; unit: string; unit_price: number; remark: string }>()
  const [itemModalOpen, setItemModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<CrmContractItem | null>(null)

  // 套打文档
  const [printOpen, setPrintOpen] = useState(false)
  const [printTemplates, setPrintTemplates] = useState<CrmContractTemplate[]>([])
  const [printTplId, setPrintTplId] = useState<number | undefined>()
  const [printMarkdown, setPrintMarkdown] = useState('')
  const [printLoading, setPrintLoading] = useState(false)
  const printPreviewRef = useRef<HTMLDivElement>(null)

  const plans = summary?.plans ?? []

  useEffect(() => {
    listCustomers({ page: 1, page_size: 100 })
      .then((res) => setCustomers(res.list ?? []))
      .catch(() => {})
  }, [])

  const loadPayments = async (contractId: number) => {
    setPaymentLoading(true)
    try {
      const [s, r] = await Promise.all([
        getContractPaymentSummary(contractId),
        listPaymentRecords(contractId),
      ])
      setSummary(s)
      setRecords(r ?? [])
    } finally {
      setPaymentLoading(false)
    }
  }

  const loadItems = async (contractId: number) => {
    setItemLoading(true)
    try {
      const list = await listContractItems(contractId)
      setItems(list ?? [])
    } finally {
      setItemLoading(false)
    }
  }

  const handleItemSubmit = async (values: { product_name: string; quantity: number; unit: string; unit_price: number; remark: string }) => {
    if (!detail) return false
    const payload = { product_name: values.product_name, quantity: values.quantity || 1, unit: values.unit, unit_price: values.unit_price || 0, remark: values.remark }
    if (editingItem) {
      await updateContractItem(editingItem.id, payload)
      message.success('明细已更新')
    } else {
      await createContractItem(detail.id, payload)
      message.success('明细已添加')
    }
    await loadItems(detail.id)
    return true
  }

  // 抽屉打开时加载回款数据
  useEffect(() => {
    if (drawerOpen && detail) {
      loadPayments(detail.id).catch(() => {})
      loadItems(detail.id).catch(() => {})
    }
  }, [drawerOpen, detail])

  /** 回款增删改后重新拉取,并刷新合同列表(已回款金额会变化) */
  const refreshPayments = async () => {
    if (!detail) return
    await loadPayments(detail.id)
    actionRef.current?.reload()
  }

  // ---------- 合同 CRUD ----------

  const openCreate = () => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({ stage: 'DRAFT' } as Partial<ContractFormValues>)
    setModalOpen(true)
  }

  const openEdit = (record: CrmContract) => {
    setEditing(record)
    form.setFieldsValue({
      name: record.name,
      contract_no: record.contract_no || undefined,
      customer_id: record.customer_id,
      opportunity_id: record.opportunity_id ?? undefined,
      total_amount: Number(record.total_amount),
      signed_date: record.signed_date ? dayjs(record.signed_date) : undefined,
      start_date: record.start_date ? dayjs(record.start_date) : undefined,
      end_date: record.end_date ? dayjs(record.end_date) : undefined,
      stage: record.stage || undefined,
      owner_id: record.owner_id ?? undefined,
      content: record.content,
    })
    setModalOpen(true)
  }

  const handleSubmit = async (values: ContractFormValues) => {
    const payload: CrmContractPayload = {
      name: values.name,
      contract_no: values.contract_no,
      customer_id: values.customer_id,
      opportunity_id: values.opportunity_id,
      total_amount: values.total_amount,
      signed_date: formatDate(values.signed_date),
      start_date: formatDate(values.start_date),
      end_date: formatDate(values.end_date),
      stage: values.stage,
      owner_id: values.owner_id,
      content: values.content,
    }
    if (editing) {
      await updateContract(editing.id, payload)
      message.success('合同已更新')
    } else {
      await createContract(payload)
      message.success('合同已创建')
    }
    actionRef.current?.reload()
    return true
  }

  const handleDelete = async (record: CrmContract) => {
    await deleteContract(record.id)
    message.success('合同已删除')
    actionRef.current?.reload()
  }

  const openDetail = (record: CrmContract) => {
    setDetail(record)
    setSummary(null)
    setRecords([])
    setDrawerOpen(true)
  }

  /** 提交审批:走审批模块 CONTRACT 流程(需先在审批中心启用流程) */
  const handlePushApproval = async (record: CrmContract) => {
    await pushApproval({ form_type: 'CONTRACT', resource_id: record.id })
    message.success('已提交审批')
    actionRef.current?.reload()
  }

  // 打开套打弹窗:先拉启用模板列表
  const openPrint = async () => {
    if (!detail) return
    setPrintOpen(true)
    setPrintTplId(undefined)
    setPrintMarkdown('')
    try {
      const res = await listContractTemplates({ page: 1, page_size: 50, enabled: 1 })
      setPrintTemplates(res.list ?? [])
    } catch {
      // ignore
    }
  }

  // 选模板后调后端渲染
  const handlePrintRender = async (templateId: number) => {
    if (!detail) return
    setPrintTplId(templateId)
    setPrintLoading(true)
    try {
      const res = await printContractDocument(detail.id, templateId)
      setPrintMarkdown(res.markdown || '')
    } catch {
      setPrintMarkdown('')
    } finally {
      setPrintLoading(false)
    }
  }

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
    if (!detail) return false
    const payload = {
      plan_date: values.plan_date.format('YYYY-MM-DD'),
      plan_amount: values.plan_amount,
      remark: values.remark,
    }
    if (editingPlan) {
      await updatePaymentPlan(editingPlan.id, payload)
      message.success('回款计划已更新')
    } else {
      await createPaymentPlan(detail.id, payload)
      message.success('回款计划已创建')
    }
    await refreshPayments()
    return true
  }

  const handlePlanDelete = async (record: CrmPaymentPlan) => {
    await deletePaymentPlan(record.id)
    message.success('回款计划已删除')
    await refreshPayments()
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
    if (!detail) return false
    const payload = {
      received_date: values.received_date.format('YYYY-MM-DD'),
      amount: values.amount,
      method: values.method,
      plan_id: values.plan_id,
      remark: values.remark,
    }
    if (editingRecord) {
      await updatePaymentRecord(editingRecord.id, payload)
      message.success('回款记录已更新')
    } else {
      await createPaymentRecord(detail.id, payload)
      message.success('回款记录已创建')
    }
    await refreshPayments()
    return true
  }

  const handleRecordDelete = async (record: CrmPaymentRecord) => {
    await deletePaymentRecord(record.id)
    message.success('回款记录已删除')
    await refreshPayments()
  }

  // ---------- 列表 ----------

  const columns: ProColumns<CrmContract>[] = [
    { title: '编号', valueType: 'indexBorder', width: 70, search: false },
    { title: '合同名称', dataIndex: 'keyword', hideInTable: true },
    {
      title: '客户',
      dataIndex: 'customer_id',
      hideInTable: true,
      renderFormItem: () => <CustomerSelect />,
    },
    {
      title: '阶段',
      dataIndex: 'stage',
      hideInTable: true,
      renderFormItem: () => <DictSelect code="CONTRACT_STAGE" placeholder="选择阶段" />,
    },
    {
      title: '合同编号',
      dataIndex: 'contract_no',
      width: 140,
      search: false,
      render: (_, r) => (
        <Button type="link" size="small" style={{ padding: 0 }} onClick={() => openDetail(r)}>
          {r.contract_no || '-'}
        </Button>
      ),
    },
    {
      title: '合同名称',
      dataIndex: 'name',
      width: 240,
      search: false,
      ellipsis: true,
      render: (_, r) => (
        <Button type="link" size="small" style={{ padding: 0 }} onClick={() => openDetail(r)}>
          {r.name}
        </Button>
      ),
    },
    {
      title: '客户',
      dataIndex: 'customer_id',
      width: 140,
      search: false,
      render: (_, r) => (
        <Button
          type="link"
          size="small"
          style={{ padding: 0 }}
          onClick={() =>
            setViewCustomer({ id: r.customer_id, name: customerMap.get(r.customer_id) ?? '' } as CrmCustomer)
          }
        >
          {customerMap.get(r.customer_id) ?? `#${r.customer_id}`}
        </Button>
      ),
    },
    {
      title: '合同金额',
      dataIndex: 'total_amount',
      width: 120,
      search: false,
      align: 'right',
      render: (_, r) => money(r.total_amount),
    },
    {
      title: '已回款',
      dataIndex: 'received_amount',
      width: 120,
      search: false,
      align: 'right',
      render: (_, r) => <span style={{ color: '#52c41a' }}>{money(r.received_amount)}</span>,
    },
    {
      title: '阶段',
      dataIndex: 'stage',
      width: 120,
      search: false,
      render: (_, r) => <DictTag code="CONTRACT_STAGE" value={r.stage} />,
    },
    {
      title: '审批状态',
      dataIndex: 'approval_status',
      width: 100,
      search: false,
      render: (_, r) => {
        const s = APPROVAL_STATUS[r.approval_status] ?? APPROVAL_STATUS.NONE
        return <Tag color={s.color}>{s.text}</Tag>
      },
    },
    {
      title: '签订日期',
      dataIndex: 'signed_date',
      width: 110,
      search: false,
      render: (_, r) => r.signed_date ?? '-',
    },
    {
      title: '负责人',
      dataIndex: 'owner_id',
      width: 100,
      search: false,
      render: (_, r) => nickname(r.owner_id),
    },
    {
      title: '操作',
      valueType: 'option',
      width: 220,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          {record.approval_status !== 'PROCESSING' && record.approval_status !== 'APPROVED' && (
            <Auth perm="crm:contract:edit">
              <Popconfirm
                title="提交审批?"
                description="将按审批中心的合同流程发起审批"
                okText="提交"
                cancelText="取消"
                onConfirm={() => handlePushApproval(record)}
              >
                <Button type="link" size="small">
                  提交审批
                </Button>
              </Popconfirm>
            </Auth>
          )}
          <Auth perm="crm:contract:edit">
            <Button type="link" size="small" onClick={() => openEdit(record)}>
              编辑
            </Button>
          </Auth>
          <Auth perm="crm:contract:delete">
            <Popconfirm
              title="确认删除该合同?"
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
        </Space>
      ),
    },
  ]

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
      <ProTable<CrmContract>
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        scroll={{ x: 'max-content' }}
        request={async ({ current, pageSize, ...rest }) => {
          const res = await listContracts({ page: current, page_size: pageSize, ...rest })
          return { data: res.list, total: res.total, success: true }
        }}
        pagination={{ defaultPageSize: 10, showSizeChanger: true }}
        toolBarRender={() => [
          <Auth perm="crm:contract:add" key="add">
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              新增合同
            </Button>
          </Auth>,
          <ExportButtons
            key="export"
            fileName="合同列表"
            columns={columns}
            fetchAll={async () => {
              const res = await listContracts({ page: 1, page_size: 1000 })
              return res.list
            }}
          />,
        ]}
        headerTitle="合同列表"
      />

      {/* 新增/编辑合同 */}
      <ModalForm<ContractFormValues>
        title={editing ? '编辑合同' : '新增合同'}
        form={form}
        open={modalOpen}
        onOpenChange={setModalOpen}
        modalProps={{ destroyOnHidden: true, maskClosable: false }}
        onFinish={handleSubmit}
        onValuesChange={(changed) => {
          // 换客户后清空已选商机(商机下拉按客户过滤)
          if ('customer_id' in changed) form.setFieldsValue({ opportunity_id: undefined })
        }}
        width={720}
        grid
      >
        <ProFormText
          name="name"
          label="合同名称"
          rules={[{ required: true, message: '请输入合同名称' }]}
          placeholder="合同名称"
          colProps={{ span: 12 }}
        />
        <ProFormText
          name="contract_no"
          label="合同编号"
          placeholder="留空则自动生成"
          colProps={{ span: 12 }}
        />
        <Col span={12}>
          <ProForm.Item
            name="customer_id"
            label="客户"
            rules={[{ required: true, message: '请选择客户' }]}
          >
            <CustomerSelect />
          </ProForm.Item>
        </Col>
        <Col span={12}>
          <ProForm.Item name="opportunity_id" label="关联商机">
            <OpportunitySelect customerId={selectedCustomerId} />
          </ProForm.Item>
        </Col>
        <Col span={12}>
          <ProForm.Item name="total_amount" label="合同金额">
            <InputNumber min={0} precision={2} style={{ width: '100%' }} placeholder="合同金额" />
          </ProForm.Item>
        </Col>
        <Col span={12}>
          <ProForm.Item name="signed_date" label="签订日期">
            <DatePicker style={{ width: '100%' }} placeholder="选择日期" />
          </ProForm.Item>
        </Col>
        <Col span={12}>
          <ProForm.Item name="start_date" label="开始日期">
            <DatePicker style={{ width: '100%' }} placeholder="选择日期" />
          </ProForm.Item>
        </Col>
        <Col span={12}>
          <ProForm.Item name="end_date" label="结束日期">
            <DatePicker style={{ width: '100%' }} placeholder="选择日期" />
          </ProForm.Item>
        </Col>
        <Col span={12}>
          <ProForm.Item name="stage" label="阶段">
            <DictSelect code="CONTRACT_STAGE" placeholder="选择阶段" />
          </ProForm.Item>
        </Col>
        <Col span={12}>
          <ProForm.Item name="owner_id" label="负责人">
            <UserSelect />
          </ProForm.Item>
        </Col>
        <ProFormTextArea
          name="content"
          label="合同内容"
          placeholder="合同内容"
          colProps={{ span: 24 }}
        />
      </ModalForm>

      {/* 合同详情抽屉 */}
      <Drawer
        width={860}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={detail ? `合同详情:${detail.name}` : '合同详情'}
        extra={
          <Auth perm="crm:contractTemplate:list">
            <Button icon={<PrinterOutlined />} onClick={openPrint}>
              打印文档
            </Button>
          </Auth>
        }
      >
        {detail && (
          <Tabs
            items={[
              {
                key: 'info',
                label: '基本信息',
                children: (
                  <Descriptions
                    bordered
                    column={2}
                    size="small"
                    items={[
                      { key: 'contract_no', label: '合同编号', children: detail.contract_no || '-' },
                      { key: 'name', label: '合同名称', children: detail.name },
                      {
                        key: 'customer',
                        label: '客户',
                        children: (
                          <Button
                            type="link"
                            size="small"
                            style={{ padding: 0 }}
                            onClick={() =>
                              setViewCustomer({
                                id: detail.customer_id,
                                name: customerMap.get(detail.customer_id) ?? '',
                              } as CrmCustomer)
                            }
                          >
                            {customerMap.get(detail.customer_id) ?? `#${detail.customer_id}`}
                          </Button>
                        ),
                      },
                      {
                        key: 'opportunity_id',
                        label: '关联商机',
                        children: detail.opportunity_id ? (
                          <Button
                            type="link"
                            size="small"
                            style={{ padding: 0 }}
                            onClick={() => setViewOpportunityId(detail.opportunity_id!)}
                          >
                            #{detail.opportunity_id}
                          </Button>
                        ) : (
                          '-'
                        ),
                      },
                      {
                        key: 'total_amount',
                        label: '合同金额',
                        children: money(detail.total_amount),
                      },
                      {
                        key: 'received_amount',
                        label: '已回款',
                        children: (
                          <span style={{ color: '#52c41a' }}>{money(detail.received_amount)}</span>
                        ),
                      },
                      {
                        key: 'stage',
                        label: '阶段',
                        children: <DictTag code="CONTRACT_STAGE" value={detail.stage} />,
                      },
                      {
                        key: 'approval_status',
                        label: '审批状态',
                        children: (
                          <Tag color={(APPROVAL_STATUS[detail.approval_status] ?? APPROVAL_STATUS.NONE).color}>
                            {(APPROVAL_STATUS[detail.approval_status] ?? APPROVAL_STATUS.NONE).text}
                          </Tag>
                        ),
                      },
                      {
                        key: 'owner',
                        label: '负责人',
                        children: nickname(detail.owner_id),
                      },
                      { key: 'signed_date', label: '签订日期', children: detail.signed_date ?? '-' },
                      { key: 'start_date', label: '开始日期', children: detail.start_date ?? '-' },
                      { key: 'end_date', label: '结束日期', children: detail.end_date ?? '-' },
                      { key: 'title_id', label: '标题ID', children: detail.title_id ?? '-' },
                      {
                        key: 'content',
                        label: '合同内容',
                        span: 2,
                        children: detail.content || '-',
                      },
                      { key: 'created_at', label: '创建时间', children: detail.created_at },
                      { key: 'updated_at', label: '更新时间', children: detail.updated_at },
                    ]}
                  />
                ),
              },
              {
                key: 'payment',
                label: '回款管理',
                children: (
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
                      loading={paymentLoading}
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
                      loading={paymentLoading}
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
                ),
              },
              {
                key: 'items',
                label: '产品明细',
                children: (
                  <Space direction="vertical" size={16} style={{ width: '100%' }}>
                    <div style={{ textAlign: 'right' }}>
                      <Button type="primary" size="small" icon={<PlusOutlined />}
                        onClick={() => { setEditingItem(null); itemForm.resetFields(); setItemModalOpen(true) }}>
                        新增明细
                      </Button>
                    </div>
                    <Table<CrmContractItem>
                      rowKey="id"
                      size="small"
                      loading={itemLoading}
                      dataSource={items}
                      pagination={false}
                      columns={[
                        { title: '产品名称', dataIndex: 'product_name' },
                        { title: '数量', dataIndex: 'quantity', width: 80, align: 'right' },
                        { title: '单位', dataIndex: 'unit', width: 70 },
                        { title: '单价', dataIndex: 'unit_price', width: 100, align: 'right', render: (v: string) => `¥${v}` },
                        { title: '小计', dataIndex: 'amount', width: 100, align: 'right', render: (v: string) => `¥${v}` },
                        { title: '备注', dataIndex: 'remark', ellipsis: true },
                        {
                          title: '操作', width: 120, render: (_: unknown, r: CrmContractItem) => (
                            <Space>
                              <Button type="link" size="small" onClick={() => {
                                setEditingItem(r)
                                itemForm.setFieldsValue({ product_name: r.product_name, quantity: Number(r.quantity), unit: r.unit, unit_price: Number(r.unit_price), remark: r.remark })
                                setItemModalOpen(true)
                              }}>编辑</Button>
                              <Popconfirm title="确认删除?" onConfirm={async () => { await deleteContractItem(r.id); message.success('已删除'); if (detail) await loadItems(detail.id) }}>
                                <Button type="link" size="small" danger>删除</Button>
                              </Popconfirm>
                            </Space>
                          ),
                        },
                      ]}
                    />
                  </Space>
                ),
              },
              {
                key: 'attachments',
                label: '附件',
                children: (
                  <AttachmentsPanel
                    bizType="CONTRACT"
                    resourceId={detail.id}
                    uploadPerm="crm:contract:edit"
                    deletePerm="crm:contract:edit"
                  />
                ),
              },
            ]}
          />
        )}
      </Drawer>

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

      {/* 新增/编辑产品明细 */}
      <ModalForm<{ product_name: string; quantity: number; unit: string; unit_price: number; remark: string }>
        title={editingItem ? '编辑明细' : '新增明细'}
        form={itemForm}
        open={itemModalOpen}
        onOpenChange={setItemModalOpen}
        modalProps={{ destroyOnHidden: true, maskClosable: false }}
        onFinish={handleItemSubmit}
        width={640}
        grid
      >
        <ProFormText name="product_name" label="产品名称" rules={[{ required: true, message: '请输入产品名称' }]} colProps={{ span: 24 }} />
        <ProFormDigit name="quantity" label="数量" min={0} fieldProps={{ precision: 2 }} colProps={{ span: 8 }} />
        <ProFormText name="unit" label="单位" placeholder="如 套/个/月" colProps={{ span: 4 }} />
        <ProFormDigit name="unit_price" label="单价" min={0} fieldProps={{ precision: 2 }} colProps={{ span: 6 }} />
        <ProFormText name="remark" label="备注" colProps={{ span: 6 }} />
      </ModalForm>

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
        <Col span={12}>
          <ProForm.Item
            name="plan_date"
            label="计划日期"
            rules={[{ required: true, message: '请选择计划日期' }]}
          >
            <DatePicker style={{ width: '100%' }} placeholder="选择日期" />
          </ProForm.Item>
        </Col>
        <Col span={12}>
          <ProForm.Item
            name="plan_amount"
            label="计划金额"
            rules={[{ required: true, message: '请输入计划金额' }]}
          >
            <InputNumber min={0} precision={2} style={{ width: '100%' }} placeholder="计划金额" />
          </ProForm.Item>
        </Col>
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
        <Col span={12}>
          <ProForm.Item
            name="received_date"
            label="回款日期"
            rules={[{ required: true, message: '请选择回款日期' }]}
          >
            <DatePicker style={{ width: '100%' }} placeholder="选择日期" />
          </ProForm.Item>
        </Col>
        <Col span={12}>
          <ProForm.Item
            name="amount"
            label="回款金额"
            rules={[{ required: true, message: '请输入回款金额' }]}
          >
            <InputNumber min={0} precision={2} style={{ width: '100%' }} placeholder="回款金额" />
          </ProForm.Item>
        </Col>
        <Col span={12}>
          <ProForm.Item name="method" label="回款方式">
            <DictSelect code="PAYMENT_METHOD" placeholder="选择回款方式" />
          </ProForm.Item>
        </Col>
        <Col span={12}>
          <ProForm.Item name="plan_id" label="关联回款计划">
            <Select
              allowClear
              placeholder="选择回款计划(可选)"
              options={plans.map((p) => ({
                label: `${p.plan_date ?? '-'} ¥${p.plan_amount}`,
                value: p.id,
              }))}
            />
          </ProForm.Item>
        </Col>
        <ProFormTextArea name="remark" label="备注" placeholder="备注" colProps={{ span: 24 }} />
      </ModalForm>

      {/* 套打文档预览 */}
      <Modal
        title="打印合同文档"
        open={printOpen}
        onCancel={() => setPrintOpen(false)}
        width={860}
        footer={[
          <Button key="close" onClick={() => setPrintOpen(false)}>
            关闭
          </Button>,
          <Button
            key="print"
            type="primary"
            icon={<PrinterOutlined />}
            disabled={!printMarkdown}
            onClick={() => {
              const html = printPreviewRef.current?.innerHTML ?? ''
              const w = window.open('', '_blank', 'width=900,height=700')
              if (!w) return
              w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>打印合同</title>
                <style>
                  body{font-family:-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;line-height:1.8;padding:40px;color:#222;}
                  h1,h2,h3{margin:1.2em 0 .5em;} table{border-collapse:collapse;width:100%;margin:12px 0;}
                  th,td{border:1px solid #ddd;padding:8px 12px;text-align:left;} th{background:#f5f5f5;}
                  hr{border:none;border-top:1px solid #ddd;margin:16px 0;} img{max-width:100%;}
                </style></head><body>${html}</body></html>`)
              w.document.close()
              w.focus()
              setTimeout(() => w.print(), 300)
            }}
          >
            打印
          </Button>,
        ]}
      >
        <Space style={{ width: '100%', marginBottom: 16 }}>
          <span>选择模板:</span>
          <Select
            style={{ width: 360 }}
            placeholder="选择合同模板"
            value={printTplId}
            options={printTemplates.map((t) => ({ label: t.name, value: t.id }))}
            onChange={handlePrintRender}
          />
        </Space>
        <Spin spinning={printLoading}>
          {printMarkdown ? (
            <div
              ref={printPreviewRef}
              className="prose-content max-w-none"
              style={{
                minHeight: 200,
                lineHeight: 1.8,
                color: '#222',
              }}
            >
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ children }: { children?: ReactNode }) => (
                    <h1 style={{ fontSize: 20, margin: '1.2em 0 .5em' }}>{children}</h1>
                  ),
                  h2: ({ children }: { children?: ReactNode }) => (
                    <h2 style={{ fontSize: 17, margin: '1.2em 0 .5em' }}>{children}</h2>
                  ),
                  table: ({ children }: { children?: ReactNode }) => (
                    <table style={{ borderCollapse: 'collapse', width: '100%', margin: '12px 0' }}>{children}</table>
                  ),
                  th: ({ children }: { children?: ReactNode }) => (
                    <th style={{ border: '1px solid #ddd', padding: '8px 12px', background: '#f5f5f5', textAlign: 'left' }}>
                      {children}
                    </th>
                  ),
                  td: ({ children }: { children?: ReactNode }) => (
                    <td style={{ border: '1px solid #ddd', padding: '8px 12px', textAlign: 'left' }}>{children}</td>
                  ),
                }}
              >
                {printMarkdown}
              </ReactMarkdown>
            </div>
          ) : (
            <div style={{ color: '#999', textAlign: 'center', padding: 40 }}>
              请选择模板预览渲染结果
            </div>
          )}
        </Spin>
      </Modal>

      {/* 客户详情抽屉(点击列表/详情中的客户名打开) */}
      <CustomerDetailDrawer
        customer={viewCustomer}
        open={!!viewCustomer}
        onClose={() => setViewCustomer(null)}
      />
      {/* 商机详情抽屉(点击详情中的关联商机打开) */}
      <OpportunityDetailDrawer
        opportunityId={viewOpportunityId}
        customerName={detail ? customerMap.get(detail.customer_id) : undefined}
        open={!!viewOpportunityId}
        onClose={() => setViewOpportunityId(null)}
      />
    </>
  )
}
