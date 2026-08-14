import { useEffect, useRef, useState } from 'react'
import { App, Button, Col, Descriptions, Drawer, Form, Input, Popconfirm, Select, Space, Tabs, Tag } from 'antd'
import { MailOutlined, PlusOutlined } from '@ant-design/icons'
import AttachmentsPanel from '../../../components/AttachmentsPanel'
import FollowPanel from '../customer/FollowPanel'
import Auth from '../../../components/Auth'
import MailComposeModal from '../../../components/MailComposeModal'
import {
  ProForm,
  ModalForm,
  ProFormText,
  ProTable,
  type ActionType,
  type ProColumns,
} from '@ant-design/pro-components'
import DedupAlert from '../../../components/DedupAlert'
import DictSelect, { DictTag } from '../../../components/DictSelect'
import ExportButtons from '../../../components/ExportButtons'
import UserSelect from '../../../components/UserSelect'
import {
  convertLead,
  createLead,
  deleteLead,
  getLead,
  getLeadOwnerHistory,
  listEnabledLeadPools,
  listLeads,
  releaseLead,
  transferLead,
  updateLead,
  type LeadQuery,
} from '../../../services/lead'
import { useUserStore } from '../../../stores/users'
import { listCustomFields } from '../../../services/crm'
import type { CrmCustomField } from '../../../types/crm'
import type { CrmLead, CrmLeadOwnerHistory, CrmLeadPayload } from '../../../types/lead'
import CustomFieldItem, { buildFieldValueMap, serializeFieldValues } from '../customer/CustomFields'

interface LeadFormValues {
  name: string
  lead_no?: string
  contact_name?: string
  phone?: string
  email?: string
  company?: string
  level?: string
  source?: string
  industry?: string
  status?: number
  owner_id?: number
}

const STATUS_OPTIONS = [
  { label: '新建', value: 1 },
  { label: '跟进中', value: 2 },
  { label: '已转化', value: 3 },
  { label: '无效', value: 4 },
]

const ACTION_TEXT: Record<string, string> = {
  TAKE: '领取',
  RELEASE: '释放',
  TRANSFER: '转移',
  RECYCLE: '自动回收',
}

export default function LeadPage() {
  const { message } = App.useApp()
  const actionRef = useRef<ActionType>(null)
  const nickname = useUserStore((s) => s.nickname)
  const [form] = Form.useForm<LeadFormValues>()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<CrmLead | null>(null)
  // 表单内名称/电话(查重提示联动)
  const watchName = Form.useWatch('name', form)
  const watchPhone = Form.useWatch('phone', form)
  const [releaseTarget, setReleaseTarget] = useState<CrmLead | null>(null)
  const [transferTarget, setTransferTarget] = useState<CrmLead | null>(null)
  const [historyTarget, setHistoryTarget] = useState<CrmLead | null>(null)
  const [history, setHistory] = useState<CrmLeadOwnerHistory[]>([])
  const [poolOptions, setPoolOptions] = useState<{ label: string; value: number }[]>([])
  const [detailTarget, setDetailTarget] = useState<CrmLead | null>(null)
  const [mailOpen, setMailOpen] = useState(false)
  // 自定义字段定义与值(field_id -> value)
  const [customFields, setCustomFields] = useState<CrmCustomField[]>([])
  const [fieldValues, setFieldValues] = useState<Map<string, unknown>>(new Map())
  const [detailFields, setDetailFields] = useState<Record<string, string>>({})

  const ensureCustomFields = async () => {
    if (customFields.length) return customFields
    const defs = await listCustomFields('LEAD')
    setCustomFields(defs)
    return defs
  }

  // 详情抽屉打开时加载自定义字段值
  useEffect(() => {
    if (!detailTarget) {
      setDetailFields({})
      return
    }
    ensureCustomFields()
    getLead(detailTarget.id)
      .then((d) => setDetailFields(d.fields ?? {}))
      .catch(() => setDetailFields({}))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailTarget])

  const loadPools = async () => {
    const pools = await listEnabledLeadPools()
    setPoolOptions(pools.map((p) => ({ label: p.name, value: p.id })))
  }

  const openCreate = () => {
    setEditing(null)
    form.resetFields()
    setFieldValues(new Map())
    ensureCustomFields()
    setModalOpen(true)
  }

  const openEdit = async (record: CrmLead) => {
    const defs = await ensureCustomFields()
    const detail = await getLead(record.id)
    setEditing(detail.lead)
    form.setFieldsValue({
      name: detail.lead.name,
      lead_no: detail.lead.lead_no || undefined,
      contact_name: detail.lead.contact_name || undefined,
      phone: detail.lead.phone || undefined,
      email: detail.lead.email || undefined,
      company: detail.lead.company || undefined,
      level: detail.lead.level || undefined,
      source: detail.lead.source || undefined,
      industry: detail.lead.industry || undefined,
      status: detail.lead.status,
    })
    setFieldValues(buildFieldValueMap(defs, detail.fields ?? {}))
    setModalOpen(true)
  }

  const handleSubmit = async (values: LeadFormValues) => {
    const payload: CrmLeadPayload = {
      name: values.name,
      lead_no: values.lead_no || undefined,
      contact_name: values.contact_name || undefined,
      phone: values.phone || undefined,
      email: values.email || undefined,
      company: values.company || undefined,
      level: values.level,
      source: values.source,
      industry: values.industry,
      fields: serializeFieldValues(fieldValues),
    }
    if (editing) {
      await updateLead(editing.id, { ...payload, status: values.status })
      message.success('线索已更新')
    } else {
      await createLead({ ...payload, owner_id: values.owner_id })
      message.success('线索已创建')
    }
    actionRef.current?.reload()
    return true
  }

  const handleDelete = async (record: CrmLead) => {
    await deleteLead(record.id)
    message.success('线索已删除')
    actionRef.current?.reload()
  }

  const handleConvert = async (record: CrmLead) => {
    const customer = await convertLead(record.id)
    message.success(`已转化,客户ID:${customer.id}`)
    actionRef.current?.reload()
  }

  const openHistory = async (record: CrmLead) => {
    setHistoryTarget(record)
    const list = await getLeadOwnerHistory(record.id)
    setHistory(list)
  }

  const columns: ProColumns<CrmLead>[] = [
    { title: '编号', valueType: 'indexBorder', width: 70, search: false },
    { title: '线索名称', dataIndex: 'keyword', hideInTable: true },
    {
      title: '级别',
      dataIndex: 'level',
      hideInTable: true,
      renderFormItem: () => <DictSelect code="LEAD_LEVEL" />,
    },
    {
      title: '来源',
      dataIndex: 'source',
      hideInTable: true,
      renderFormItem: () => <DictSelect code="LEAD_SOURCE" />,
    },
    {
      title: '状态',
      dataIndex: 'status',
      hideInTable: true,
      valueType: 'select',
      valueEnum: {
        1: { text: '新建' },
        2: { text: '跟进中' },
        3: { text: '已转化' },
        4: { text: '无效' },
      },
    },
    {
      title: '行业',
      dataIndex: 'industry',
      hideInTable: true,
      renderFormItem: () => <DictSelect code="INDUSTRY" />,
    },
    // 可见列
    {
      title: '编号',
      dataIndex: 'lead_no',
      width: 140,
      search: false,
      render: (v, r) => (
        <Button type="link" size="small" style={{ padding: 0 }} onClick={() => setDetailTarget(r)}>
          {v || '-'}
        </Button>
      ),
    },
    {
      title: '线索名称',
      dataIndex: 'name',
      width: 200,
      search: false,
      render: (_, r) => (
        <Space size={4}>
          <Button type="link" size="small" style={{ padding: 0 }} onClick={() => setDetailTarget(r)}>
            {r.name}
          </Button>
          {r.status === 3 && <Tag color="green">已转化</Tag>}
        </Space>
      ),
    },
    { title: '联系人', dataIndex: 'contact_name', width: 100, search: false },
    { title: '电话', dataIndex: 'phone', width: 130, search: false },
    { title: '公司', dataIndex: 'company', width: 140, search: false, ellipsis: true },
    {
      title: '级别',
      dataIndex: 'level',
      search: false,
      width: 80,
      render: (_, r) => <DictTag code="LEAD_LEVEL" value={r.level} />,
    },
    {
      title: '来源',
      dataIndex: 'source',
      search: false,
      width: 90,
      render: (_, r) => <DictTag code="LEAD_SOURCE" value={r.source} />,
    },
    {
      title: '状态',
      dataIndex: 'status',
      search: false,
      width: 80,
      valueEnum: {
        1: { text: '新建', status: 'Processing' },
        2: { text: '跟进中', status: 'Warning' },
        3: { text: '已转化', status: 'Success' },
        4: { text: '无效', status: 'Default' },
      },
    },
    {
      title: '负责人',
      dataIndex: 'owner_id',
      search: false,
      width: 90,
      render: (_, r) => nickname(r.owner_id) || '-',
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      search: false,
      valueType: 'dateTime',
      width: 160,
    },
    {
      title: '操作',
      valueType: 'option',
      width: 280,
      fixed: 'right',
      render: (_, record) => (
        <Space size={0} wrap>
          <Button type="link" size="small" onClick={() => openHistory(record)}>
            记录
          </Button>
          <Auth perm="crm:lead:edit">
            <Button type="link" size="small" onClick={() => openEdit(record)}>
              编辑
            </Button>
          </Auth>
          <Auth perm="crm:lead:release">
            <Button type="link" size="small" onClick={() => setReleaseTarget(record)}>
              释放
            </Button>
          </Auth>
          <Auth perm="crm:lead:transfer">
            <Button type="link" size="small" onClick={() => setTransferTarget(record)}>
              转移
            </Button>
          </Auth>
          {record.converted_customer_id === null && record.status !== 3 && (
            <Auth perm="crm:lead:convert">
              <Popconfirm
                title="确认将该线索转化为客户?"
                okText="转化"
                cancelText="取消"
                onConfirm={() => handleConvert(record)}
              >
                <Button type="link" size="small">
                  转客户
                </Button>
              </Popconfirm>
            </Auth>
          )}
          <Auth perm="crm:lead:delete">
            <Popconfirm
              title="确认删除该线索?"
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
      <ProTable<CrmLead>
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        scroll={{ x: 'max-content' }}
        request={async (params) => {
          const { current, pageSize, ...rest } = params
          const res = await listLeads({
            page: current,
            page_size: pageSize,
            pool_filter: 'PRIVATE',
            ...(rest as LeadQuery),
          })
          return { data: res.list, total: res.total, success: true }
        }}
        pagination={{ defaultPageSize: 10, showSizeChanger: true }}
        toolBarRender={() => [
          <Auth perm="crm:lead:add" key="add">
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              新增线索
            </Button>
          </Auth>,
          <ExportButtons
            key="export"
            fileName="线索列表"
            columns={columns}
            fetchAll={async () => {
              const res = await listLeads({ page: 1, page_size: 1000, pool_filter: 'PRIVATE' })
              return res.list
            }}
          />,
        ]}
        headerTitle="线索列表"
      />

      {/* 新增/编辑线索 */}
      <ModalForm<LeadFormValues>
        title={editing ? '编辑线索' : '新增线索'}
        form={form}
        open={modalOpen}
        onOpenChange={setModalOpen}
        modalProps={{ destroyOnHidden: true, maskClosable: false }}
        onFinish={handleSubmit}
        width={640}
        grid
      >
        <Col span={24}>
          <DedupAlert
            name={watchName}
            phone={watchPhone}
            excludeType="LEAD"
            excludeId={editing?.id}
            excludeCustomerIds={editing?.converted_customer_id ? [editing.converted_customer_id] : undefined}
          />
        </Col>
        <ProFormText
          name="name"
          label="线索名称"
          rules={[{ required: true, message: '请输入线索名称' }]}
          colProps={{ span: 12 }}
        />
        <ProFormText name="lead_no" label="线索编号" placeholder="留空则自动生成" colProps={{ span: 12 }} />
        <ProFormText name="contact_name" label="联系人" colProps={{ span: 12 }} />
        <ProFormText name="phone" label="电话" colProps={{ span: 12 }} />
        <ProFormText name="email" label="邮箱" colProps={{ span: 12 }} />
        <ProFormText name="company" label="公司" colProps={{ span: 12 }} />
        <Col span={12}>
          <ProForm.Item name="level" label="级别">
            <DictSelect code="LEAD_LEVEL" placeholder="选择级别" />
          </ProForm.Item>
        </Col>
        <Col span={12}>
          <ProForm.Item name="source" label="来源">
            <DictSelect code="LEAD_SOURCE" placeholder="选择来源" />
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
              <UserSelect placeholder="选择负责人,留空则进公海" />
            </ProForm.Item>
          </Col>
        )}
        {customFields.map((f) => (
          <Col span={12} key={f.id}>
            <ProForm.Item label={f.name}>
              <CustomFieldItem
                field={f}
                value={fieldValues.get(f.id)}
                onChange={(v) => {
                  const next = new Map(fieldValues)
                  if (v === undefined || v === null || v === '') next.delete(f.id)
                  else next.set(f.id, v)
                  setFieldValues(next)
                }}
              />
            </ProForm.Item>
          </Col>
        ))}
      </ModalForm>

      {/* 释放到公海 */}
      <ModalForm<{ pool_id: number; reason?: string }>
        title={releaseTarget ? `释放线索:${releaseTarget.name}` : '释放线索'}
        open={!!releaseTarget}
        onOpenChange={(open) => {
          if (!open) setReleaseTarget(null)
          else loadPools()
        }}
        modalProps={{ destroyOnHidden: true, maskClosable: false }}
        onFinish={async (values) => {
          if (!releaseTarget) return false
          await releaseLead(releaseTarget.id, { pool_id: values.pool_id, reason: values.reason })
          message.success('线索已释放到公海')
          actionRef.current?.reload()
          return true
        }}
        width={420}
      >
        <ProForm.Item
          name="pool_id"
          label="线索池"
          rules={[{ required: true, message: '请选择线索池' }]}
        >
          <Select showSearch optionFilterProp="label" options={poolOptions} placeholder="选择线索池" />
        </ProForm.Item>
        <ProForm.Item name="reason" label="释放原因">
          <Input.TextArea rows={3} placeholder="选填" />
        </ProForm.Item>
      </ModalForm>

      {/* 转移线索 */}
      <ModalForm<{ to_user_id: number }>
        title={transferTarget ? `转移线索:${transferTarget.name}` : '转移线索'}
        open={!!transferTarget}
        onOpenChange={(open) => {
          if (!open) setTransferTarget(null)
        }}
        modalProps={{ destroyOnHidden: true, maskClosable: false }}
        onFinish={async (values) => {
          if (!transferTarget) return false
          await transferLead(transferTarget.id, values.to_user_id)
          message.success('线索已转移')
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

      {/* 归属历史 */}
      <ModalForm
        title={historyTarget ? `归属历史:${historyTarget.name}` : '归属历史'}
        open={!!historyTarget}
        onOpenChange={(open) => {
          if (!open) {
            setHistoryTarget(null)
            setHistory([])
          }
        }}
        onFinish={async () => true}
        width={560}
        submitter={false}
      >
        {history.length === 0 ? (
          <div style={{ color: '#999', textAlign: 'center', padding: 24 }}>暂无记录</div>
        ) : (
          <div>
            {history.map((h) => (
              <div key={h.id} style={{ padding: '6px 0', borderBottom: '1px solid #f0f0f0' }}>
                <Space>
                  <Tag color="blue">{ACTION_TEXT[h.action] || h.action}</Tag>
                  <span>{h.owner_id !== null ? nickname(h.owner_id) : '公海'}</span>
                  <span style={{ color: '#999', fontSize: 12 }}>{h.created_at}</span>
                </Space>
                {h.reason && <div style={{ color: '#666', fontSize: 12, marginTop: 2 }}>{h.reason}</div>}
              </div>
            ))}
          </div>
        )}
      </ModalForm>

      {/* 线索详情抽屉 */}
      <Drawer
        title="线索详情"
        open={!!detailTarget}
        onClose={() => setDetailTarget(null)}
        width={560}
        extra={
          detailTarget && (
            <Space>
              {detailTarget.email && (
                <Auth perm="mail:send">
                  <Button size="small" icon={<MailOutlined />} onClick={() => setMailOpen(true)}>
                    发邮件
                  </Button>
                </Auth>
              )}
              <Auth perm="crm:lead:edit">
                <Button
                  type="primary"
                  size="small"
                  onClick={() => {
                    openEdit(detailTarget)
                    setDetailTarget(null)
                  }}
                >
                  编辑
                </Button>
              </Auth>
            </Space>
          )
        }
      >
        {detailTarget && (
          <Tabs
            items={[
              {
                key: 'info',
                label: '基本信息',
                children: (
                  <Descriptions column={2} bordered size="small">
                    <Descriptions.Item label="线索编号">{detailTarget.lead_no || '-'}</Descriptions.Item>
                    <Descriptions.Item label="状态">
                      {(() => {
                        const m: Record<number, { text: string; color: string }> = {
                          1: { text: '新建', color: 'blue' },
                          2: { text: '跟进中', color: 'orange' },
                          3: { text: '已转化', color: 'green' },
                          4: { text: '无效', color: 'default' },
                        }
                        const s = m[detailTarget.status]
                        return s ? <Tag color={s.color}>{s.text}</Tag> : '-'
                      })()}
                    </Descriptions.Item>
                    <Descriptions.Item label="线索名称" span={2}>
                      <Space size={4}>
                        {detailTarget.name}
                        {detailTarget.in_pool === 1 && <Tag color="orange">公海</Tag>}
                      </Space>
                    </Descriptions.Item>
                    <Descriptions.Item label="联系人">{detailTarget.contact_name || '-'}</Descriptions.Item>
                    <Descriptions.Item label="电话">{detailTarget.phone || '-'}</Descriptions.Item>
                    <Descriptions.Item label="邮箱" span={2}>{detailTarget.email || '-'}</Descriptions.Item>
                    <Descriptions.Item label="公司" span={2}>{detailTarget.company || '-'}</Descriptions.Item>
                    <Descriptions.Item label="级别">
                      <DictTag code="LEAD_LEVEL" value={detailTarget.level} />
                    </Descriptions.Item>
                    <Descriptions.Item label="来源">
                      <DictTag code="LEAD_SOURCE" value={detailTarget.source} />
                    </Descriptions.Item>
                    <Descriptions.Item label="行业">
                      <DictTag code="INDUSTRY" value={detailTarget.industry} />
                    </Descriptions.Item>
                    <Descriptions.Item label="负责人">
                      {detailTarget.in_pool === 1 ? '公海' : nickname(detailTarget.owner_id)}
                    </Descriptions.Item>
                    <Descriptions.Item label="所属">{detailTarget.in_pool === 1 ? '公海池' : '私海'}</Descriptions.Item>
                    <Descriptions.Item label="转化客户">
                      {detailTarget.converted_customer_id ? `#${detailTarget.converted_customer_id}` : '-'}
                    </Descriptions.Item>
                    {detailTarget.follow_time && (
                      <Descriptions.Item label="最近跟进" span={2}>
                        {detailTarget.follow_time}
                      </Descriptions.Item>
                    )}
                    {detailTarget.converted_at && (
                      <Descriptions.Item label="转化时间" span={2}>
                        {detailTarget.converted_at}
                      </Descriptions.Item>
                    )}
                    <Descriptions.Item label="创建时间" span={2}>
                      {detailTarget.created_at}
                    </Descriptions.Item>
                    <Descriptions.Item label="更新时间" span={2}>
                      {detailTarget.updated_at}
                    </Descriptions.Item>
                    {customFields.map((f) => (
                      <Descriptions.Item label={f.name} key={f.id}>
                        {detailFields[f.id] || '-'}
                      </Descriptions.Item>
                    ))}
                  </Descriptions>
                ),
              },
              {
                key: 'follow',
                label: '跟进记录',
                children: <FollowPanel leadId={detailTarget.id} />,
              },
              {
                key: 'attachments',
                label: '附件',
                children: (
                  <AttachmentsPanel
                    bizType="LEAD"
                    resourceId={detailTarget.id}
                    uploadPerm="crm:lead:edit"
                    deletePerm="crm:lead:edit"
                  />
                ),
              },
            ]}
          />
        )}
      </Drawer>

      {/* 写邮件 */}
      <MailComposeModal
        open={mailOpen}
        onClose={() => setMailOpen(false)}
        defaultTo={detailTarget?.email || ''}
        defaultToName={detailTarget?.name}
      />
    </>
  )
}
