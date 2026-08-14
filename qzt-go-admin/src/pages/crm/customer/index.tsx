import { useRef, useState } from 'react'
import { App, Button, Col, Form, Input, Popconfirm, Select, Space } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import {
  ProForm,
  ModalForm,
  ProFormText,
  ProTable,
  type ActionType,
  type ProColumns,
} from '@ant-design/pro-components'
import Auth from '../../../components/Auth'
import DedupAlert from '../../../components/DedupAlert'
import DictSelect, { DictTag } from '../../../components/DictSelect'
import ExportButtons from '../../../components/ExportButtons'
import ImportButton from '../../../components/ImportButton'
import UserSelect from '../../../components/UserSelect'
import { usePageGuide } from '../../../components/guide/usePageGuide'
import { GuideHelpButton } from '../../../components/guide/GuideHelpButton'
import {
  createCustomer,
  deleteCustomer,
  getCustomer,
  listCustomers,
  listCustomFields,
  listEnabledPools,
  releaseCustomer,
  transferCustomer,
  updateCustomer,
  type CustomerQuery,
} from '../../../services/crm'
import { useUserStore } from '../../../stores/users'
import type { CrmCustomField, CrmCustomer, CrmCustomerPayload } from '../../../types/crm'
import CustomFieldItem, { buildFieldValueMap, serializeFieldValues } from './CustomFields'
import DetailDrawer from './DetailDrawer'

interface CustomerFormValues {
  name: string
  customer_no?: string
  level?: string
  source?: string
  industry?: string
  status?: number
  owner_id?: number
}

const STATUS_OPTIONS = [
  { label: '正常', value: 1 },
  { label: '冻结', value: 2 },
  { label: '流失', value: 3 },
]

export default function CustomerPage() {
  usePageGuide('crm.customer')
  const { message } = App.useApp()
  const actionRef = useRef<ActionType>(null)
  const nickname = useUserStore((s) => s.nickname)
  const [form] = Form.useForm<CustomerFormValues>()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<CrmCustomer | null>(null)
  // 表单内客户名称(查重提示联动)
  const watchName = Form.useWatch('name', form)
  // 自定义字段定义与值(field_id -> value)
  const [customFields, setCustomFields] = useState<CrmCustomField[]>([])
  const [fieldValues, setFieldValues] = useState<Map<string, unknown>>(new Map())
  // 释放/转移/详情
  const [releaseTarget, setReleaseTarget] = useState<CrmCustomer | null>(null)
  const [transferTarget, setTransferTarget] = useState<CrmCustomer | null>(null)
  const [detailCustomer, setDetailCustomer] = useState<CrmCustomer | null>(null)
  const [poolOptions, setPoolOptions] = useState<{ label: string; value: number }[]>([])

  const ensureCustomFields = async () => {
    if (customFields.length) return customFields
    const defs = await listCustomFields('CUSTOMER')
    setCustomFields(defs)
    return defs
  }

  const loadPools = async () => {
    const pools = await listEnabledPools()
    setPoolOptions(pools.map((p) => ({ label: p.name, value: p.id })))
  }

  const openCreate = () => {
    setEditing(null)
    form.resetFields()
    setFieldValues(new Map())
    ensureCustomFields()
    setModalOpen(true)
  }

  const openEdit = async (record: CrmCustomer) => {
    const defs = await ensureCustomFields()
    const detail = await getCustomer(record.id)
    setEditing(detail.customer)
    form.setFieldsValue({
      name: detail.customer.name,
      customer_no: detail.customer.customer_no || undefined,
      level: detail.customer.level || undefined,
      source: detail.customer.source || undefined,
      industry: detail.customer.industry || undefined,
      status: detail.customer.status,
    })
    setFieldValues(buildFieldValueMap(defs, detail.fields ?? {}))
    setModalOpen(true)
  }

  const handleSubmit = async (values: CustomerFormValues) => {
    const payload: CrmCustomerPayload = {
      name: values.name,
      customer_no: values.customer_no,
      level: values.level,
      source: values.source,
      industry: values.industry,
      fields: serializeFieldValues(fieldValues),
    }
    if (editing) {
      await updateCustomer(editing.id, { ...payload, status: values.status })
      message.success('客户已更新')
    } else {
      await createCustomer({ ...payload, owner_id: values.owner_id })
      message.success('客户已创建')
    }
    actionRef.current?.reload()
    // React 19 下 ModalForm onFinish 返回 true 的自动关闭链路失效,显式关闭
    setModalOpen(false)
    return true
  }

  const handleDelete = async (record: CrmCustomer) => {
    await deleteCustomer(record.id)
    message.success('客户已删除')
    actionRef.current?.reload()
  }

  const setFieldValue = (fieldId: string, value: unknown) => {
    setFieldValues((prev) => {
      const next = new Map(prev)
      if (value === undefined) next.delete(fieldId)
      else next.set(fieldId, value)
      return next
    })
  }

  const columns: ProColumns<CrmCustomer>[] = [
    // ---- 隐藏搜索列 ----
    { title: '编号', valueType: 'indexBorder', width: 70, search: false },
    { title: '客户名称', dataIndex: 'keyword', hideInTable: true },
    {
      title: '等级',
      dataIndex: 'level',
      hideInTable: true,
      renderFormItem: () => <DictSelect code="CUSTOMER_LEVEL" />,
    },
    {
      title: '来源',
      dataIndex: 'source',
      hideInTable: true,
      renderFormItem: () => <DictSelect code="CUSTOMER_SOURCE" />,
    },
    {
      title: '状态',
      dataIndex: 'status',
      hideInTable: true,
      valueType: 'select',
      valueEnum: {
        1: { text: '正常' },
        2: { text: '冻结' },
        3: { text: '流失' },
      },
    },
    {
      title: '行业',
      dataIndex: 'industry',
      hideInTable: true,
      renderFormItem: () => <DictSelect code="INDUSTRY" />,
    },
    // ---- 可见列 ----
    {
      title: '编号',
      dataIndex: 'customer_no',
      width: 150,
      search: false,
      render: (_, r) => (
        <Button type="link" size="small" style={{ padding: 0 }} onClick={() => setDetailCustomer(r)}>
          {r.customer_no || '-'}
        </Button>
      ),
    },
    {
      title: '客户名称',
      dataIndex: 'name',
      width: 220,
      search: false,
      render: (_, r) => (
        <Button type="link" size="small" style={{ padding: 0 }} onClick={() => setDetailCustomer(r)}>
          {r.name}
        </Button>
      ),
    },
    {
      title: '等级',
      dataIndex: 'level',
      search: false,
      width: 90,
      render: (_, r) => <DictTag code="CUSTOMER_LEVEL" value={r.level} />,
    },
    {
      title: '来源',
      dataIndex: 'source',
      search: false,
      width: 100,
      render: (_, r) => <DictTag code="CUSTOMER_SOURCE" value={r.source} />,
    },
    {
      title: '行业',
      dataIndex: 'industry',
      search: false,
      width: 110,
      render: (_, r) => <DictTag code="INDUSTRY" value={r.industry} />,
    },
    {
      title: '状态',
      dataIndex: 'status',
      search: false,
      width: 80,
      valueEnum: {
        1: { text: '正常', status: 'Success' },
        2: { text: '冻结', status: 'Warning' },
        3: { text: '流失', status: 'Default' },
      },
    },
    {
      title: '负责人',
      dataIndex: 'owner_id',
      search: false,
      width: 100,
      render: (_, r) => nickname(r.owner_id) || '-',
    },
    {
      title: '最新跟进时间',
      dataIndex: 'follow_time',
      search: false,
      valueType: 'dateTime',
      width: 160,
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      search: false,
      valueType: 'dateTime',
      width: 160,
    },
    {
      title: <span data-guide="action-column">操作</span>,
      valueType: 'option',
      width: 260,
      fixed: 'right',
      render: (_, record) => (
        <Space size={0} wrap>
          <Button type="link" size="small" onClick={() => setDetailCustomer(record)}>
            详情
          </Button>
          <Auth perm="crm:customer:edit">
            <Button type="link" size="small" onClick={() => openEdit(record)}>
              编辑
            </Button>
          </Auth>
          <Auth perm="crm:customer:release">
            <Button type="link" size="small" onClick={() => setReleaseTarget(record)}>
              释放
            </Button>
          </Auth>
          <Auth perm="crm:customer:transfer">
            <Button type="link" size="small" onClick={() => setTransferTarget(record)}>
              转移
            </Button>
          </Auth>
          <Auth perm="crm:customer:delete">
            <Popconfirm
              title="确认删除该客户?"
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

  return (
    <>
      <ProTable<CrmCustomer>
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        scroll={{ x: 'max-content' }}
        request={async (params) => {
          const { current, pageSize, ...rest } = params
          const res = await listCustomers({
            page: current,
            page_size: pageSize,
            pool_filter: 'PRIVATE',
            ...(rest as CustomerQuery),
          })
          return { data: res.list, total: res.total, success: true }
        }}
        pagination={{ defaultPageSize: 10, showSizeChanger: true }}
        toolBarRender={() => [
          <Auth perm="crm:customer:add" key="add">
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate} data-guide="add">
              新增客户
            </Button>
          </Auth>,
          <ExportButtons
            key="export"
            fileName="客户列表"
            columns={columns}
            fetchAll={async () => {
              const res = await listCustomers({ page: 1, page_size: 1000, pool_filter: 'PRIVATE' })
              return res.list
            }}
          />,
          <ImportButton key="import" bizType="customer" onImported={() => actionRef.current?.reload()} data-guide="import" />,
          <GuideHelpButton key="guide-help" />,
        ]}
        headerTitle="客户列表"
      />

      {/* 新增/编辑客户 */}
      <ModalForm<CustomerFormValues>
        title={editing ? '编辑客户' : '新增客户'}
        form={form}
        open={modalOpen}
        onOpenChange={setModalOpen}
        modalProps={{ destroyOnHidden: true, maskClosable: false }}
        onFinish={handleSubmit}
        width={640}
        grid
      >
        <Col span={24}>
          <DedupAlert name={watchName} excludeType="CUSTOMER" excludeId={editing?.id} />
        </Col>
        <ProFormText
          name="name"
          label="客户名称"
          rules={[{ required: true, message: '请输入客户名称' }]}
          colProps={{ span: 12 }}
        />
        <ProFormText
          name="customer_no"
          label="客户编号"
          placeholder="留空则自动生成"
          colProps={{ span: 12 }}
        />
        <Col span={12}>
          <ProForm.Item name="level" label="等级">
            <DictSelect code="CUSTOMER_LEVEL" placeholder="选择等级" />
          </ProForm.Item>
        </Col>
        <Col span={12}>
          <ProForm.Item name="source" label="来源">
            <DictSelect code="CUSTOMER_SOURCE" placeholder="选择来源" />
          </ProForm.Item>
        </Col>
        <Col span={12}>
          <ProForm.Item name="industry" label="行业">
            <DictSelect code="INDUSTRY" placeholder="选择行业" />
          </ProForm.Item>
        </Col>
        {editing && (
          <Col span={12}>
            <ProForm.Item name="status" label="状态">
              <Select options={STATUS_OPTIONS} placeholder="选择状态" />
            </ProForm.Item>
          </Col>
        )}
        {!editing && (
          <Col span={12}>
            <ProForm.Item name="owner_id" label="负责人">
              <UserSelect placeholder="选择负责人,留空则由您负责" />
            </ProForm.Item>
          </Col>
        )}
        {customFields.map((f) => (
          <Col span={12} key={f.id}>
            <ProForm.Item label={f.name}>
              <CustomFieldItem
                field={f}
                value={fieldValues.get(f.id)}
                onChange={(v) => setFieldValue(f.id, v)}
              />
            </ProForm.Item>
          </Col>
        ))}
      </ModalForm>

      {/* 释放到公海 */}
      <ModalForm<{ pool_id: number; reason?: string }>
        title={releaseTarget ? `释放客户:${releaseTarget.name}` : '释放客户'}
        open={!!releaseTarget}
        onOpenChange={(open) => {
          if (!open) setReleaseTarget(null)
          else loadPools()
        }}
        modalProps={{ destroyOnHidden: true, maskClosable: false }}
        onFinish={async (values) => {
          if (!releaseTarget) return false
          await releaseCustomer(releaseTarget.id, { pool_id: values.pool_id, reason: values.reason })
          message.success('客户已释放到公海')
          actionRef.current?.reload()
          return true
        }}
        width={420}
      >
        <ProForm.Item
          name="pool_id"
          label="公海池"
          rules={[{ required: true, message: '请选择公海池' }]}
        >
          <Select
            showSearch
            optionFilterProp="label"
            options={poolOptions}
            placeholder="选择公海池"
          />
        </ProForm.Item>
        <ProForm.Item name="reason" label="释放原因">
          <Input.TextArea rows={3} placeholder="选填" />
        </ProForm.Item>
      </ModalForm>

      {/* 转移客户 */}
      <ModalForm<{ to_user_id: number }>
        title={transferTarget ? `转移客户:${transferTarget.name}` : '转移客户'}
        open={!!transferTarget}
        onOpenChange={(open) => {
          if (!open) setTransferTarget(null)
        }}
        modalProps={{ destroyOnHidden: true, maskClosable: false }}
        onFinish={async (values) => {
          if (!transferTarget) return false
          await transferCustomer(transferTarget.id, values.to_user_id)
          message.success('客户已转移')
          actionRef.current?.reload()
          return true
        }}
        width={420}
      >
        <ProForm.Item
          name="to_user_id"
          label="新负责人"
          rules={[{ required: true, message: '请选择新负责人' }]}
        >
          <UserSelect placeholder="选择新负责人" />
        </ProForm.Item>
      </ModalForm>

      {/* 客户详情抽屉 */}
      <DetailDrawer
        customer={detailCustomer}
        open={!!detailCustomer}
        onClose={() => setDetailCustomer(null)}
      />
    </>
  )
}
