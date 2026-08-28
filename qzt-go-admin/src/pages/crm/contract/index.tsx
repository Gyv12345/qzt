import { useEffect, useMemo, useRef, useState } from 'react'
import { App, Button, Popconfirm, Space, Tag } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { ProTable, type ActionType, type ProColumns } from '@ant-design/pro-components'
import Auth from '../../../components/Auth'
import CustomerSelect from '../../../components/CustomerSelect'
import DictSelect, { DictTag } from '../../../components/DictSelect'
import ExportButtons from '../../../components/ExportButtons'
import ApprovalFlowSetup from '../../../components/ApprovalFlowSetup'
import { pushApproval } from '../../../services/approval'
import {
  deleteContract,
  listContracts,
  listCustomers,
} from '../../../services/crm'
import { useUserStore } from '../../../stores/users'
import type { CrmContract, CrmCustomer } from '../../../types/crm'
import CustomerDetailDrawer from '../customer/DetailDrawer'
import ContractEditModal from './EditModal'
import ContractDetailDrawer from './DetailDrawer'
import { APPROVAL_STATUS, money } from './constants'
import { pageIndexColumn } from '../../../components/IndexTag'

export default function ContractPage() {
  const { message } = App.useApp()
  const actionRef = useRef<ActionType>(null)
  const nickname = useUserStore((s) => s.nickname)

  // 合同新增/编辑
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<CrmContract | null>(null)

  // 客户 id -> 名称(列表展示)
  const [customers, setCustomers] = useState<CrmCustomer[]>([])
  const customerMap = useMemo(() => new Map(customers.map((c) => [c.id, c.name])), [customers])

  // 客户详情抽屉(点击关联对象打开)
  const [viewCustomer, setViewCustomer] = useState<CrmCustomer | null>(null)

  // 详情抽屉
  const [detail, setDetail] = useState<CrmContract | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    listCustomers({ page: 1, page_size: 100 })
      .then((res) => setCustomers(res.list ?? []))
      .catch(() => {})
  }, [])

  // ---------- 合同 CRUD ----------

  const openCreate = () => {
    setEditing(null)
    setModalOpen(true)
  }

  const openEdit = (record: CrmContract) => {
    setEditing(record)
    setModalOpen(true)
  }

  const handleDelete = async (record: CrmContract) => {
    await deleteContract(record.id)
    message.success('合同已删除')
    actionRef.current?.reload()
  }

  const openDetail = (record: CrmContract) => {
    setDetail(record)
    setDrawerOpen(true)
  }

  /** 提交审批:走审批模块 CONTRACT 流程(需先在审批中心启用流程) */
  const handlePushApproval = async (record: CrmContract) => {
    await pushApproval({ form_type: 'CONTRACT', resource_id: record.id })
    message.success('已提交审批')
    actionRef.current?.reload()
  }

  // ---------- 列表 ----------

  const columns: ProColumns<CrmContract>[] = [
    pageIndexColumn(actionRef),
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
          {!['APPROVING', 'PROCESSING', 'APPROVED'].includes(record.approval_status) && (
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
        headerTitle={
          <Space align="center">
            <span>合同列表</span>
            <ApprovalFlowSetup formType="CONTRACT" label="合同审批" />
          </Space>
        }
      />

      {/* 新增/编辑合同 */}
      <ContractEditModal
        open={modalOpen}
        editing={editing}
        onOpenChange={setModalOpen}
        onSuccess={() => actionRef.current?.reload()}
      />

      {/* 合同详情抽屉 */}
      <ContractDetailDrawer
        open={drawerOpen}
        contract={detail}
        customerMap={customerMap}
        onOpenChange={setDrawerOpen}
        onViewCustomer={setViewCustomer}
        onPaymentsChanged={() => actionRef.current?.reload()}
      />

      {/* 客户详情抽屉(点击列表/详情中的客户名打开) */}
      <CustomerDetailDrawer
        customer={viewCustomer}
        open={!!viewCustomer}
        onClose={() => setViewCustomer(null)}
      />
    </>
  )
}
