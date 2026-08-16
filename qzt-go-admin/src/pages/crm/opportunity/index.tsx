import { useEffect, useMemo, useRef, useState } from 'react'
import {
  App,
  Button,
  Drawer,
  Popconfirm,
  Segmented,
  Select,
  Space,
  Table,
  type TableProps,
} from 'antd'
import { AppstoreOutlined, PlusOutlined, UnorderedListOutlined } from '@ant-design/icons'
import { ProTable, type ActionType, type ProColumns } from '@ant-design/pro-components'
import Auth from '../../../components/Auth'
import CustomerSelect from '../../../components/CustomerSelect'
import { DictTag } from '../../../components/DictSelect'
import ExportButtons from '../../../components/ExportButtons'
import CustomerDetailDrawer from '../customer/DetailDrawer'
import OpportunityDetailDrawer from './DetailDrawer'
import OpportunityEditModal from './EditModal'
import StageChangeModal from './StageChangeModal'
import BoardView from './BoardView'
import {
  deleteOpportunity,
  getOpportunityBoard,
  getOpportunityStageHistory,
  getStageConfig,
  listCustomers,
  listOpportunities,
  changeOpportunityStage,
} from '../../../services/crm'
import { useUserStore } from '../../../stores/users'
import type {
  CrmCustomer,
  CrmOpportunity,
  CrmStageRecord,
  StageDef,
} from '../../../types/crm'

export default function OpportunityPage() {
  const { message } = App.useApp()
  const nickname = useUserStore((s) => s.nickname)
  const actionRef = useRef<ActionType>(null)

  const [view, setView] = useState<'list' | 'board'>('list')
  const [stageDefs, setStageDefs] = useState<StageDef[]>([])
  const [customerMap, setCustomerMap] = useState<Record<number, string>>({})

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<CrmOpportunity | null>(null)

  const [stageTarget, setStageTarget] = useState<CrmOpportunity | null>(null)

  const [historyOpen, setHistoryOpen] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyList, setHistoryList] = useState<CrmStageRecord[]>([])
  const [historyFor, setHistoryFor] = useState<CrmOpportunity | null>(null)

  const [board, setBoard] = useState<Record<string, CrmOpportunity[]>>({})
  const [boardLoading, setBoardLoading] = useState(false)

  // 客户详情抽屉(跨页面复用) / 商机详情抽屉
  const [viewCustomer, setViewCustomer] = useState<CrmCustomer | null>(null)
  const [viewOpportunity, setViewOpportunity] = useState<CrmOpportunity | null>(null)

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
    setModalOpen(true)
  }

  const openEdit = (record: CrmOpportunity) => {
    setEditing(record)
    setModalOpen(true)
  }

  const handleDelete = async (record: CrmOpportunity) => {
    await deleteOpportunity(record.id)
    message.success('商机已删除')
    actionRef.current?.reload()
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
    {
      title: '商机名称',
      dataIndex: 'name',
      width: 220,
      search: false,
      render: (_, r) => (
        <Button type="link" size="small" style={{ padding: 0 }} onClick={() => setViewOpportunity(r)}>
          {r.name}
        </Button>
      ),
    },
    {
      title: '客户',
      key: 'customer_name',
      dataIndex: 'customer_id',
      width: 140,
      search: false,
      render: (_, r) => (
        <Button
          type="link"
          size="small"
          style={{ padding: 0 }}
          onClick={() =>
            setViewCustomer({ id: r.customer_id, name: customerMap[r.customer_id] ?? '' } as CrmCustomer)
          }
        >
          {customerMap[r.customer_id] ?? `#${r.customer_id}`}
        </Button>
      ),
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
            <Button type="link" size="small" onClick={() => setStageTarget(record)}>
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
            <ExportButtons
              key="export"
              fileName="商机列表"
              columns={columns}
              fetchAll={async () => {
                const res = await listOpportunities({ page: 1, page_size: 1000 })
                return res.list
              }}
            />,
          ]}
        />
      ) : (
        <BoardView
          stages={sortedStages}
          board={board}
          loading={boardLoading}
          customerMap={customerMap}
          onEdit={openEdit}
          onStageChange={handleBoardStageChange}
        />
      )}

      {/* 新增/编辑商机 */}
      <OpportunityEditModal
        open={modalOpen}
        editing={editing}
        stageOptions={stageOptions}
        defaultStage={sortedStages[0]?.key}
        onOpenChange={setModalOpen}
        onSuccess={refreshActive}
      />

      {/* 阶段流转 */}
      <StageChangeModal
        target={stageTarget}
        stageOptions={stageOptions}
        onClose={() => setStageTarget(null)}
        onSuccess={refreshActive}
      />

      {/* 阶段历史 */}
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

      {/* 客户详情抽屉(点击列表客户名打开) */}
      <CustomerDetailDrawer
        customer={viewCustomer}
        open={!!viewCustomer}
        onClose={() => setViewCustomer(null)}
      />
      {/* 商机详情抽屉(点击列表商机名称打开) */}
      <OpportunityDetailDrawer
        opportunityId={viewOpportunity?.id ?? null}
        customerName={viewOpportunity ? customerMap[viewOpportunity.customer_id] : undefined}
        open={!!viewOpportunity}
        onClose={() => setViewOpportunity(null)}
      />
    </>
  )
}
