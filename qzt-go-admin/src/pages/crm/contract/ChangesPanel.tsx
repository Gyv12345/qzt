import { useEffect, useState } from 'react'
import { App, Button, Table, Tag, Typography } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { ModalForm, ProFormDatePicker, ProFormDigit, ProFormTextArea } from '@ant-design/pro-components'
import type { Dayjs } from 'dayjs'
import { createContractChange, listContractChanges } from '../../../services/crm'
import type { CrmContract, CrmContractChange } from '../../../types/crm'
import { money } from './constants'

/** 仅已签订/执行中的合同允许发起变更(金额/结束日期) */
const CHANGEABLE_STAGES = ['SIGNED', 'EXECUTING']

interface ChangesPanelProps {
  contract: CrmContract
  /** 发起变更成功后回调(父级刷新合同详情/列表) */
  onChanged: () => void
}

interface ChangeFormValues {
  after_amount?: number
  after_end_date?: Dayjs
  reason: string
}

/** 合同变更记录面板:变更时间线列表 + 发起变更入口 */
export default function ChangesPanel({ contract, onChanged }: ChangesPanelProps) {
  const { message } = App.useApp()
  const [changes, setChanges] = useState<CrmContractChange[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)

  const canChange = CHANGEABLE_STAGES.includes(contract.stage || '')

  const load = async () => {
    setLoading(true)
    try {
      const list = await listContractChanges(contract.id)
      setChanges(list ?? [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load().catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contract.id])

  const handleSubmit = async (values: ChangeFormValues) => {
    // 表单金额预填了当前值,只把真正改动的字段发给后端(契约:至少变更一项)
    const newEndDate = values.after_end_date ? values.after_end_date.format('YYYY-MM-DD') : undefined
    const amountChanged =
      values.after_amount !== undefined &&
      values.after_amount !== null &&
      Number(values.after_amount) !== Number(contract.total_amount)
    const endDateChanged = !!newEndDate && newEndDate !== (contract.end_date ?? '').slice(0, 10)
    if (!amountChanged && !endDateChanged) {
      message.warning('请至少变更金额或结束日期中的一项')
      return false
    }
    await createContractChange(contract.id, {
      after_amount: amountChanged ? String(values.after_amount) : undefined,
      after_end_date: endDateChanged ? newEndDate : undefined,
      reason: values.reason,
    })
    message.success('变更已提交')
    await load()
    onChanged()
    return true
  }

  /** 前后值对比展示:old → new,值相同则只显示一个 */
  const renderDiff = (before: string | null | undefined, after: string | null | undefined, isAmount: boolean) => {
    const fmt = (v?: string | null) => {
      if (!v) return '-'
      return isAmount ? money(v) : v
    }
    if ((before ?? '') === (after ?? '')) return <span>{fmt(after)}</span>
    return (
      <span>
        <Typography.Text delete type="secondary">
          {fmt(before)}
        </Typography.Text>
        <span style={{ margin: '0 6px' }}>→</span>
        <Typography.Text type="warning" strong>
          {fmt(after)}
        </Typography.Text>
      </span>
    )
  }

  const columns = [
    { title: '变更时间', dataIndex: 'created_at', width: 160, render: (v: string) => (v ? v.slice(0, 16).replace('T', ' ') : '-') },
    { title: '变更人', dataIndex: 'created_by_name', width: 110, render: (v: string) => v || '-' },
    {
      title: '金额变更',
      key: 'amount',
      width: 220,
      render: (_: unknown, r: CrmContractChange) => renderDiff(r.before_amount, r.after_amount, true),
    },
    {
      title: '结束日期变更',
      key: 'end_date',
      width: 220,
      render: (_: unknown, r: CrmContractChange) => renderDiff(r.before_end_date, r.after_end_date, false),
    },
    { title: '变更原因', dataIndex: 'reason', ellipsis: true, render: (v: string) => v || '-' },
  ]

  return (
    <div>
      <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography.Text type="secondary">合同金额 / 结束日期的历史变更记录</Typography.Text>
        {canChange && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
            发起变更
          </Button>
        )}
        {!canChange && (
          <Tag>仅「已签订 / 执行中」阶段可发起变更</Tag>
        )}
      </div>
      <Table<CrmContractChange>
        rowKey="id"
        size="small"
        loading={loading}
        columns={columns}
        dataSource={changes}
        pagination={false}
        scroll={{ x: 'max-content' }}
        locale={{ emptyText: '暂无变更记录' }}
      />

      <ModalForm<ChangeFormValues>
        title="发起合同变更"
        open={modalOpen}
        onOpenChange={setModalOpen}
        modalProps={{ destroyOnHidden: true, maskClosable: false }}
        onFinish={handleSubmit}
        width={520}
        grid
        initialValues={{
          after_amount: contract.total_amount ? Number(contract.total_amount) : undefined,
        }}
      >
        <ProFormDigit
          name="after_amount"
          label="新金额"
          placeholder={`当前 ${money(contract.total_amount)}`}
          min={0}
          precision={2}
          fieldProps={{ style: { width: '100%' } }}
          colProps={{ span: 12 }}
        />
        <ProFormDatePicker
          name="after_end_date"
          label="新结束日期"
          placeholder={contract.end_date ? `当前 ${contract.end_date}` : '当前无结束日期'}
          fieldProps={{ style: { width: '100%' } }}
          colProps={{ span: 12 }}
        />
        <ProFormTextArea
          name="reason"
          label="变更原因"
          placeholder="请说明变更原因(必填)"
          rules={[{ required: true, message: '请填写变更原因' }]}
          colProps={{ span: 24 }}
          fieldProps={{ rows: 3 }}
        />
      </ModalForm>
    </div>
  )
}
