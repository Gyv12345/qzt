import { useEffect, useState } from 'react'
import { App, Button, Descriptions, Drawer, Popconfirm, Space, Tabs, Tag } from 'antd'
import { PrinterOutlined } from '@ant-design/icons'
import AttachmentsPanel from '../../../components/AttachmentsPanel'
import Auth from '../../../components/Auth'
import { DictTag } from '../../../components/DictSelect'
import OpportunityDetailDrawer from '../opportunity/DetailDrawer'
import {
  archiveContract,
  getContract,
  getContractPaymentSummary,
  listContractItems,
  listPaymentRecords,
  unarchiveContract,
} from '../../../services/crm'
import { useUserStore } from '../../../stores/users'
import type {
  CrmContract,
  CrmContractItem,
  CrmCustomer,
  CrmPaymentRecord,
  CrmPaymentSummary,
} from '../../../types/crm'
import { APPROVAL_STATUS, money } from './constants'
import PaymentPanel from './PaymentPanel'
import ItemsPanel from './ItemsPanel'
import ChangesPanel from './ChangesPanel'
import PrintModal from './PrintModal'

interface DetailDrawerProps {
  open: boolean
  contract: CrmContract | null
  /** 客户 id -> 名称(列表页加载,共享给基本信息 Tab) */
  customerMap: Map<number, string>
  onOpenChange: (open: boolean) => void
  /** 点击客户名打开客户详情抽屉 */
  onViewCustomer: (customer: CrmCustomer) => void
  /** 回款增删改后刷新合同列表(已回款金额会变化) */
  onPaymentsChanged: () => void
}

/** 仅已完结阶段可归档 */
const ARCHIVABLE_STAGES = ['COMPLETED', 'TERMINATED']

/** 合同详情抽屉:基本信息 / 回款管理 / 产品明细 / 附件,以及套打文档入口 */
export default function ContractDetailDrawer({
  open,
  contract,
  customerMap,
  onOpenChange,
  onViewCustomer,
  onPaymentsChanged,
}: DetailDrawerProps) {
  const { message } = App.useApp()
  const nickname = useUserStore((s) => s.nickname)

  // 变更/归档后从后端重拉的详情,优先于列表行数据展示
  const [fresh, setFresh] = useState<CrmContract | null>(null)
  const [archiving, setArchiving] = useState(false)

  // 回款数据
  const [summary, setSummary] = useState<CrmPaymentSummary | null>(null)
  const [records, setRecords] = useState<CrmPaymentRecord[]>([])
  const [paymentLoading, setPaymentLoading] = useState(false)

  // 产品明细
  const [items, setItems] = useState<CrmContractItem[]>([])
  const [itemLoading, setItemLoading] = useState(false)

  // 套打文档 / 关联商机详情
  const [printOpen, setPrintOpen] = useState(false)
  const [viewOpportunityId, setViewOpportunityId] = useState<number | null>(null)

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

  // 抽屉打开时加载回款数据与产品明细
  useEffect(() => {
    if (open && contract) {
      setFresh(null)
      loadPayments(contract.id).catch(() => {})
      loadItems(contract.id).catch(() => {})
    }
  }, [open, contract])

  /** 回款增删改后重新拉取,并刷新合同列表 */
  const refreshPayments = async () => {
    if (!contract) return
    await loadPayments(contract.id)
    onPaymentsChanged()
  }

  /** 变更/归档成功后:重拉详情 + 刷新合同列表 */
  const refreshAfterChange = async () => {
    if (!contract) return
    const latest = await getContract(contract.id)
    setFresh(latest)
    onPaymentsChanged()
  }

  const handleToggleArchive = async (record: CrmContract) => {
    setArchiving(true)
    try {
      if (record.archived_at) {
        await unarchiveContract(record.id)
        message.success('已取消归档')
      } else {
        await archiveContract(record.id)
        message.success('已归档')
      }
      await refreshAfterChange()
    } finally {
      setArchiving(false)
    }
  }

  // 列表行数据 + 变更/归档后重拉的数据,优先取后者
  const detail: CrmContract | null = fresh ?? contract
  const canArchive = !!detail && ARCHIVABLE_STAGES.includes(detail.stage || '')

  return (
    <>
      <Drawer
        width={860}
        open={open}
        onClose={() => onOpenChange(false)}
        title={detail ? `合同详情:${detail.name}` : '合同详情'}
        extra={
          detail && (
            <Space size={8}>
              {/* 归档:仅 COMPLETED/TERMINATED 可归档;已归档的合同任何状态都可取消归档 */}
              {canArchive && !detail.archived_at && (
                <Auth perm="crm:contract:edit">
                  <Popconfirm
                    title="归档该合同?"
                    description="归档后默认从合同列表隐藏,可在归档状态筛选中查看"
                    okText="归档"
                    cancelText="取消"
                    onConfirm={() => handleToggleArchive(detail)}
                  >
                    <Button loading={archiving}>归档</Button>
                  </Popconfirm>
                </Auth>
              )}
              {!!detail.archived_at && (
                <Auth perm="crm:contract:edit">
                  <Popconfirm
                    title="取消归档?"
                    description="取消后合同恢复为未归档状态"
                    okText="确认"
                    cancelText="不取消"
                    onConfirm={() => handleToggleArchive(detail)}
                  >
                    <Button loading={archiving}>取消归档</Button>
                  </Popconfirm>
                </Auth>
              )}
              <Auth perm="crm:contractTemplate:list">
                <Button icon={<PrinterOutlined />} onClick={() => setPrintOpen(true)}>
                  打印文档
                </Button>
              </Auth>
            </Space>
          )
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
                              onViewCustomer({
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
                      { key: 'category', label: '分类', children: detail.category || '-' },
                      {
                        key: 'archived',
                        label: '归档状态',
                        span: 2,
                        children: detail.archived_at ? (
                          <Space size={8}>
                            <Tag color="default">已归档</Tag>
                            <span>
                              {detail.archived_at.slice(0, 16).replace('T', ' ')}
                              {detail.archived_by_name ? ` · ${detail.archived_by_name}` : ''}
                            </span>
                          </Space>
                        ) : (
                          <Tag color="processing">未归档</Tag>
                        ),
                      },
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
                  <PaymentPanel
                    key={detail.id}
                    contract={detail}
                    summary={summary}
                    records={records}
                    loading={paymentLoading}
                    onRefresh={refreshPayments}
                  />
                ),
              },
              {
                key: 'items',
                label: '产品明细',
                children: (
                  <ItemsPanel
                    key={detail.id}
                    contract={detail}
                    items={items}
                    loading={itemLoading}
                    onReload={() => loadItems(detail.id)}
                  />
                ),
              },
              {
                key: 'changes',
                label: '变更记录',
                children: (
                  <ChangesPanel key={detail.id} contract={detail} onChanged={refreshAfterChange} />
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

      {/* 套打文档预览 */}
      {printOpen && detail && <PrintModal contractId={detail.id} onClose={() => setPrintOpen(false)} />}

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
