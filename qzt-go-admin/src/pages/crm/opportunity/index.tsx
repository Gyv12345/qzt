import { useEffect, useMemo, useRef, useState } from 'react'
import {
  App,
  Button,
  Card,
  Col,
  DatePicker,
  Drawer,
  Dropdown,
  Empty,
  Form,
  InputNumber,
  Popconfirm,
  Row,
  Segmented,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  type TableProps,
} from 'antd'
import { AppstoreOutlined, PlusOutlined, UnorderedListOutlined } from '@ant-design/icons'
import {
  ProForm,
  ModalForm,
  ProFormSelect,
  ProFormText,
  ProFormTextArea,
  ProTable,
  type ActionType,
  type ProColumns,
} from '@ant-design/pro-components'
import dayjs, { type Dayjs } from 'dayjs'
import Auth from '../../../components/Auth'
import CustomerSelect from '../../../components/CustomerSelect'
import { DictTag } from '../../../components/DictSelect'
import UserSelect from '../../../components/UserSelect'
import {
  changeOpportunityStage,
  createOpportunity,
  deleteOpportunity,
  getOpportunityBoard,
  getOpportunityStageHistory,
  getStageConfig,
  listCustomers,
  listOpportunities,
  updateOpportunity,
} from '../../../services/crm'
import { useUserStore } from '../../../stores/users'
import type {
  CrmOpportunity,
  CrmOpportunityPayload,
  CrmStageRecord,
  StageDef,
} from '../../../types/crm'

interface OpportunityFormValues {
  name: string
  opportunity_no?: string
  customer_id: number
  expected_amount?: number
  expected_close_date?: Dayjs
  stage?: string
  probability?: number
  owner_id?: number
  description?: string
}

interface StageFormValues {
  stage: string
  reason?: string
}

export default function OpportunityPage() {
  const { message } = App.useApp()
  const nickname = useUserStore((s) => s.nickname)
  const actionRef = useRef<ActionType>(null)
  const [form] = Form.useForm<OpportunityFormValues>()
  const [stageForm] = Form.useForm<StageFormValues>()

  const [view, setView] = useState<'list' | 'board'>('list')
  const [stageDefs, setStageDefs] = useState<StageDef[]>([])
  const [customerMap, setCustomerMap] = useState<Record<number, string>>({})

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<CrmOpportunity | null>(null)

  const [stageModalOpen, setStageModalOpen] = useState(false)
  const [stageTarget, setStageTarget] = useState<CrmOpportunity | null>(null)

  const [historyOpen, setHistoryOpen] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyList, setHistoryList] = useState<CrmStageRecord[]>([])
  const [historyFor, setHistoryFor] = useState<CrmOpportunity | null>(null)

  const [board, setBoard] = useState<Record<string, CrmOpportunity[]>>({})
  const [boardLoading, setBoardLoading] = useState(false)

  // 阶段配置挂载时加载一次,列表搜索/表单/看板共用
  useEffect(() => {
    getStageConfig('OPPORTUNITY')
      .then((res) => setStageDefs(res.stages ?? []))
      .catch(() => {})
  }, [])

  // 客户 id -> 名称 map(自建,同跟进页)
  useEffect(() => {
    listCustomers({ page: 1, page_size: 100 })
      .then((res) => {
        const map: Record<number, string> = {}
        ;(res.list ?? []).forEach((c) => {
          map[c.id] = c.name
        })
        setCustomerMap(map)
      })
      .catch(() => {})
  }, [])

  const sortedStages = useMemo(() => [...stageDefs].sort((a, b) => a.sort - b.sort), [stageDefs])
  const stageOptions = useMemo(
    () => stageDefs.map((s) => ({ label: s.label, value: s.key })),
    [stageDefs],
  )

  const loadBoard = () => {
    setBoardLoading(true)
    getOpportunityBoard()
      .then((res) => setBoard(res ?? {}))
      .catch(() => {})
      .finally(() => setBoardLoading(false))
  }

  useEffect(() => {
    if (view === 'board') loadBoard()
  }, [view])

  /** 按当前视图刷新列表或看板 */
  const refreshActive = () => {
    if (view === 'board') loadBoard()
    else actionRef.current?.reload()
  }

  const openCreate = () => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({ stage: sortedStages[0]?.key })
    setModalOpen(true)
  }

  const openEdit = (record: CrmOpportunity) => {
    setEditing(record)
    form.setFieldsValue({
      name: record.name,
      opportunity_no: record.opportunity_no || undefined,
      customer_id: record.customer_id,
      expected_amount: record.expected_amount ? Number(record.expected_amount) : undefined,
      expected_close_date: record.expected_close_date ? dayjs(record.expected_close_date) : undefined,
      stage: record.stage,
      probability: record.probability ?? undefined,
      owner_id: record.owner_id ?? undefined,
      description: record.description,
    })
    setModalOpen(true)
  }

  const handleSubmit = async (values: OpportunityFormValues) => {
    const payload: CrmOpportunityPayload = {
      name: values.name,
      opportunity_no: values.opportunity_no,
      customer_id: values.customer_id,
      expected_amount: values.expected_amount,
      expected_close_date: values.expected_close_date
        ? values.expected_close_date.format('YYYY-MM-DD')
        : undefined,
      stage: values.stage,
      probability: values.probability,
      owner_id: values.owner_id,
      description: values.description,
    }
    if (editing) {
      await updateOpportunity(editing.id, payload)
      message.success('商机已更新')
    } else {
      await createOpportunity(payload)
      message.success('商机已创建')
    }
    refreshActive()
    return true
  }

  const handleDelete = async (record: CrmOpportunity) => {
    await deleteOpportunity(record.id)
    message.success('商机已删除')
    actionRef.current?.reload()
  }

  const openStageChange = (record: CrmOpportunity) => {
    setStageTarget(record)
    stageForm.resetFields()
    stageForm.setFieldsValue({ stage: record.stage, reason: undefined })
    setStageModalOpen(true)
  }

  const handleStageSubmit = async (values: StageFormValues) => {
    if (!stageTarget) return false
    await changeOpportunityStage(stageTarget.id, values.stage, values.reason)
    message.success('阶段已流转')
    refreshActive()
    return true
  }

  const openHistory = (record: CrmOpportunity) => {
    setHistoryFor(record)
    setHistoryOpen(true)
    setHistoryLoading(true)
    getOpportunityStageHistory(record.id)
      .then((res) => setHistoryList(res ?? []))
      .catch(() => {})
      .finally(() => setHistoryLoading(false))
  }

  /** 看板卡片快捷流转 */
  const handleBoardStageChange = async (record: CrmOpportunity, stage: string) => {
    await changeOpportunityStage(record.id, stage)
    message.success('阶段已流转')
    loadBoard()
  }

  const columns: ProColumns<CrmOpportunity>[] = [
    { title: '编号', valueType: 'indexBorder', width: 70, search: false },
    { title: '关键词', dataIndex: 'keyword', hideInTable: true },
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
      renderFormItem: () => <Select allowClear placeholder="选择阶段" options={stageOptions} />,
    },
    { title: '商机编号', dataIndex: 'opportunity_no', width: 140, search: false, render: (v) => v || '-' },
    { title: '商机名称', dataIndex: 'name', width: 220, search: false },
    {
      title: '客户',
      key: 'customer_name',
      dataIndex: 'customer_id',
      width: 140,
      search: false,
      render: (_, r) => customerMap[r.customer_id] ?? `#${r.customer_id}`,
    },
    {
      title: '预期金额',
      dataIndex: 'expected_amount',
      width: 110,
      search: false,
      render: (_, r) => (r.expected_amount ? `¥${r.expected_amount}` : '-'),
    },
    {
      title: '阶段',
      key: 'stage_tag',
      dataIndex: 'stage',
      search: false,
      width: 100,
      render: (_, r) => <DictTag code="OPPORTUNITY_STAGE" value={r.stage} />,
    },
    {
      title: '成交概率',
      dataIndex: 'probability',
      search: false,
      width: 90,
      render: (_, r) => (r.probability !== null && r.probability !== undefined ? `${r.probability}%` : '-'),
    },
    {
      title: '预计成交日',
      dataIndex: 'expected_close_date',
      valueType: 'date',
      search: false,
      width: 110,
    },
    {
      title: '负责人',
      dataIndex: 'owner_id',
      search: false,
      width: 100,
      render: (_, r) => nickname(r.owner_id),
    },
    { title: '创建时间', dataIndex: 'created_at', valueType: 'dateTime', search: false, width: 170 },
    {
      title: '操作',
      valueType: 'option',
      width: 220,
      fixed: 'right',
      render: (_, record) => (
        <Space size={0}>
          <Auth perm="crm:opportunity:edit">
            <Button type="link" size="small" onClick={() => openEdit(record)}>
              编辑
            </Button>
          </Auth>
          <Auth perm="crm:opportunity:edit">
            <Button type="link" size="small" onClick={() => openStageChange(record)}>
              阶段流转
            </Button>
          </Auth>
          <Button type="link" size="small" onClick={() => openHistory(record)}>
            阶段历史
          </Button>
          <Auth perm="crm:opportunity:delete">
            <Popconfirm
              title="确认删除该商机?"
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

  const historyColumns: TableProps<CrmStageRecord>['columns'] = [
    {
      title: '原阶段',
      dataIndex: 'from_stage',
      render: (v: string) => (v ? <DictTag code="OPPORTUNITY_STAGE" value={v} /> : '新建'),
    },
    {
      title: '新阶段',
      dataIndex: 'to_stage',
      render: (v: string) => <DictTag code="OPPORTUNITY_STAGE" value={v} />,
    },
    {
      title: '操作人',
      dataIndex: 'operator_id',
      render: (v: number) => nickname(v),
    },
    { title: '原因', dataIndex: 'reason', render: (v: string) => v || '-' },
  ]

  const boardView = (
    <Spin spinning={boardLoading}>
      <Row gutter={12} wrap={false} style={{ overflowX: 'auto', paddingBottom: 8 }}>
        {sortedStages.map((stage) => {
          const items = board[stage.key] ?? []
          return (
            <Col key={stage.key} flex="0 0 280px">
              <Card
                size="small"
                title={
                  <Space size={8}>
                    <Tag color={stage.color}>{stage.label}</Tag>
                    <span style={{ color: '#999' }}>{items.length}</span>
                  </Space>
                }
              >
                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                  {items.map((o) => (
                    <Card key={o.id} size="small" hoverable onClick={() => openEdit(o)}>
                      <div style={{ fontWeight: 600, marginBottom: 4 }}>{o.name}</div>
                      <div style={{ color: '#666', fontSize: 12, marginBottom: 8 }}>
                        {customerMap[o.customer_id] ?? `#${o.customer_id}`}
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <span>{o.expected_amount ? `¥${o.expected_amount}` : '-'}</span>
                        <span style={{ color: '#666', fontSize: 12 }}>
                          {o.probability !== null && o.probability !== undefined
                            ? `${o.probability}%`
                            : '-'}
                        </span>
                        <Dropdown
                          menu={{
                            items: sortedStages
                              .filter((s) => s.key !== o.stage)
                              .map((s) => ({ key: s.key, label: `流转到 ${s.label}` })),
                            onClick: ({ key, domEvent }) => {
                              domEvent.stopPropagation()
                              handleBoardStageChange(o, key)
                            },
                          }}
                        >
                          <Button
                            type="link"
                            size="small"
                            style={{ padding: 0 }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            流转
                          </Button>
                        </Dropdown>
                      </div>
                    </Card>
                  ))}
                  {items.length === 0 && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />}
                </Space>
              </Card>
            </Col>
          )
        })}
      </Row>
    </Spin>
  )

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <Segmented
          value={view}
          onChange={(v) => setView(v as 'list' | 'board')}
          options={[
            { label: '列表', value: 'list', icon: <UnorderedListOutlined /> },
            { label: '看板', value: 'board', icon: <AppstoreOutlined /> },
          ]}
        />
      </div>
      {view === 'list' ? (
        <ProTable<CrmOpportunity>
          rowKey="id"
          actionRef={actionRef}
          columns={columns}
          scroll={{ x: 'max-content' }}
          headerTitle="商机列表"
          request={async ({ current, pageSize, ...rest }) => {
            const res = await listOpportunities({ page: current, page_size: pageSize, ...rest })
            return { data: res.list, total: res.total, success: true }
          }}
          pagination={{ defaultPageSize: 10, showSizeChanger: true }}
          toolBarRender={() => [
            <Auth perm="crm:opportunity:add" key="add">
              <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                新增商机
              </Button>
            </Auth>,
          ]}
        />
      ) : (
        boardView
      )}
      <ModalForm<OpportunityFormValues>
        title={editing ? '编辑商机' : '新增商机'}
        form={form}
        open={modalOpen}
        onOpenChange={setModalOpen}
        modalProps={{ destroyOnHidden: true, maskClosable: false }}
        onFinish={handleSubmit}
        width={640}
        grid
      >
        <ProFormText
          name="name"
          label="商机名称"
          rules={[{ required: true, message: '请输入商机名称' }]}
          colProps={{ span: 12 }}
        />
        <ProFormText
          name="opportunity_no"
          label="商机编号"
          placeholder="留空则自动生成"
          colProps={{ span: 12 }}
        />
        <ProForm.Item
          name="customer_id"
          label="客户"
          rules={[{ required: true, message: '请选择客户' }]}
          colProps={{ span: 12 }}
        >
          <CustomerSelect />
        </ProForm.Item>
        <ProForm.Item name="expected_amount" label="预期金额" colProps={{ span: 12 }}>
          <InputNumber min={0} precision={2} style={{ width: '100%' }} placeholder="金额" />
        </ProForm.Item>
        <ProForm.Item name="expected_close_date" label="预计成交日" colProps={{ span: 12 }}>
          <DatePicker style={{ width: '100%' }} />
        </ProForm.Item>
        <ProFormSelect
          name="stage"
          label="阶段"
          options={stageOptions}
          placeholder="选择阶段"
          colProps={{ span: 12 }}
        />
        <ProForm.Item name="probability" label="成交概率(%)" colProps={{ span: 12 }}>
          <InputNumber min={0} max={100} style={{ width: '100%' }} placeholder="0-100" />
        </ProForm.Item>
        <ProForm.Item name="owner_id" label="负责人" colProps={{ span: 12 }}>
          <UserSelect />
        </ProForm.Item>
        <ProFormTextArea
          name="description"
          label="描述"
          fieldProps={{ rows: 3 }}
          colProps={{ span: 24 }}
        />
      </ModalForm>
      <ModalForm<StageFormValues>
        title={stageTarget ? `阶段流转 - ${stageTarget.name}` : '阶段流转'}
        form={stageForm}
        open={stageModalOpen}
        onOpenChange={setStageModalOpen}
        modalProps={{ destroyOnHidden: true, maskClosable: false }}
        onFinish={handleStageSubmit}
        width={640}
        grid
      >
        <ProFormSelect
          name="stage"
          label="目标阶段"
          options={stageOptions}
          rules={[{ required: true, message: '请选择目标阶段' }]}
          colProps={{ span: 12 }}
        />
        <ProFormText name="reason" label="流转原因" colProps={{ span: 12 }} />
      </ModalForm>
      <Drawer
        title={historyFor ? `阶段历史 - ${historyFor.name}` : '阶段历史'}
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        width={560}
      >
        <Table<CrmStageRecord>
          rowKey="id"
          size="small"
          loading={historyLoading}
          dataSource={historyList}
          columns={historyColumns}
          pagination={false}
        />
      </Drawer>
    </>
  )
}
