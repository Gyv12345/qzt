import { Popup, Form, Input, TextArea, Button, Toast, DatePicker, SearchBar, List, SpinLoading, Selector } from 'antd-mobile'
import { useEffect, useState } from 'react'
import { createContract, updateContract, listCustomers } from '../services/crm'
import type { CrmContract } from '../types/crm'

interface Props {
  visible: boolean
  onClose: () => void
  /** 编辑时传入合同;不传为新建 */
  contract?: CrmContract | null
  onSubmitted?: () => void
}

const STAGE_OPTIONS = [
  { label: '草稿', value: 'DRAFT' },
  { label: '执行中', value: 'EXECUTING' },
  { label: '已完成', value: 'COMPLETED' },
  { label: '已终止', value: 'TERMINATED' },
]

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** 合同新建/编辑表单(含客户搜索选择 + 日期选择) */
export default function ContractFormSheet({ visible, onClose, contract, onSubmitted }: Props) {
  const [form] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)
  const [customer, setCustomer] = useState<{ id: number; name: string } | null>(null)
  const [showCustomer, setShowCustomer] = useState(false)
  const [kw, setKw] = useState('')
  const [custList, setCustList] = useState<{ id: number; name: string; customer_no: string }[]>([])
  const [custLoading, setCustLoading] = useState(false)
  const [dates, setDates] = useState<{ signed: string; start: string; end: string }>({ signed: '', start: '', end: '' })
  const [dateField, setDateField] = useState<null | 'signed' | 'start' | 'end'>(null)
  const isEdit = !!contract

  useEffect(() => {
    if (!visible) return
    if (contract) {
      setCustomer({ id: contract.customer_id, name: contract.customer_name || `客户#${contract.customer_id}` })
      setDates({ signed: contract.signed_date || '', start: contract.start_date || '', end: contract.end_date || '' })
      form.setFieldsValue({
        name: contract.name,
        total_amount: contract.total_amount,
        stage: contract.stage ? [contract.stage] : ['DRAFT'],
        content: contract.content,
      })
    } else {
      setCustomer(null)
      setDates({ signed: '', start: '', end: '' })
      form.resetFields()
    }
  }, [visible, contract, form])

  const searchCustomers = (keyword: string) => {
    setCustLoading(true)
    listCustomers({ page: 1, page_size: 20, keyword: keyword || undefined })
      .then((r) => setCustList(r.list || []))
      .catch(() => setCustList([]))
      .finally(() => setCustLoading(false))
  }

  useEffect(() => {
    if (showCustomer) searchCustomers('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showCustomer])

  const handleFinish = async (vals: Record<string, any>) => {
    if (!customer) {
      Toast.show('请选择客户')
      return
    }
    const stage = Array.isArray(vals.stage) ? vals.stage[0] : vals.stage
    setSubmitting(true)
    try {
      const payload = {
        name: vals.name,
        customer_id: customer.id,
        total_amount: Number(vals.total_amount),
        signed_date: dates.signed || undefined,
        start_date: dates.start || undefined,
        end_date: dates.end || undefined,
        stage: stage || 'DRAFT',
        content: vals.content,
      }
      if (isEdit && contract) await updateContract(contract.id, payload)
      else await createContract(payload as Parameters<typeof createContract>[0])
      Toast.show({ icon: 'success', content: isEdit ? '已保存' : '已创建' })
      onSubmitted?.()
      onClose()
    } catch {
      // 拦截器已 toast
    } finally {
      setSubmitting(false)
    }
  }

  const dateValue = dateField && dates[dateField] ? new Date(dates[dateField]!.replace(' ', 'T')) : undefined

  const renderDateField = (field: 'signed' | 'start' | 'end', label: string) => (
    <Form.Item label={label}>
      <div
        onClick={() => setDateField(field)}
        style={{ fontSize: 15, color: dates[field] ? 'var(--text-primary)' : 'var(--text-tertiary)', padding: '4px 0' }}
      >
        {dates[field] || '请选择'}
      </div>
    </Form.Item>
  )

  return (
    <>
      <Popup
        visible={visible}
        onMaskClick={onClose}
        position="bottom"
        destroyOnClose
        bodyStyle={{ borderTopLeftRadius: 12, borderTopRightRadius: 12, maxHeight: '85vh', overflowY: 'auto' }}
      >
        <div style={{ padding: '16px 16px 24px' }}>
          <div style={{ fontSize: 17, fontWeight: 600, textAlign: 'center', marginBottom: 16 }}>
            {isEdit ? '编辑合同' : '新建合同'}
          </div>
          <Form
            form={form}
            layout="horizontal"
            onFinish={handleFinish}
            footer={
              <Button block color="primary" size="large" loading={submitting} onClick={() => form.submit()}>
                {isEdit ? '保存' : '创建'}
              </Button>
            }
          >
            <Form.Item label="关联客户" required>
              <div
                onClick={() => setShowCustomer(true)}
                style={{ fontSize: 15, color: customer ? 'var(--text-primary)' : 'var(--text-tertiary)', padding: '4px 0' }}
              >
                {customer?.name || '请选择客户'}
              </div>
            </Form.Item>
            <Form.Item name="name" label="合同名称" rules={[{ required: true, message: '请输入合同名称' }]}>
              <Input placeholder="请输入合同名称" />
            </Form.Item>
            <Form.Item name="total_amount" label="合同金额" rules={[{ required: true, message: '请输入金额' }]}>
              <Input type="number" placeholder="0.00" />
            </Form.Item>
            {renderDateField('signed', '签订日期')}
            {renderDateField('start', '开始日期')}
            {renderDateField('end', '结束日期')}
            <Form.Item name="stage" label="合同阶段">
              <Selector options={STAGE_OPTIONS} columns={2} />
            </Form.Item>
            <Form.Item name="content" label="备注">
              <TextArea placeholder="选填" rows={2} />
            </Form.Item>
          </Form>
        </div>
      </Popup>

      <DatePicker
        visible={!!dateField}
        precision="day"
        value={dateValue}
        onClose={() => setDateField(null)}
        onConfirm={(d) => {
          if (dateField) setDates((prev) => ({ ...prev, [dateField]: toDateStr(d) }))
          setDateField(null)
        }}
      />

      {/* 客户搜索选择 */}
      <Popup
        visible={showCustomer}
        onMaskClick={() => setShowCustomer(false)}
        position="bottom"
        destroyOnClose
        bodyStyle={{ borderTopLeftRadius: 12, borderTopRightRadius: 12, maxHeight: '70vh', display: 'flex', flexDirection: 'column' }}
      >
        <div style={{ padding: '12px 16px', fontSize: 16, fontWeight: 600, textAlign: 'center' }}>选择客户</div>
        <div style={{ padding: '0 12px' }}>
          <SearchBar
            placeholder="搜索客户名称"
            value={kw}
            onChange={(v) => {
              setKw(v)
              searchCustomers(v)
            }}
            onClear={() => {
              setKw('')
              searchCustomers('')
            }}
          />
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {custLoading ? (
            <div style={{ textAlign: 'center', padding: 24 }}>
              <SpinLoading />
            </div>
          ) : custList.length === 0 ? (
            <div style={{ color: 'var(--text-tertiary)', textAlign: 'center', padding: 24 }}>无匹配客户</div>
          ) : (
            <List>
              {custList.map((c) => (
                <List.Item
                  key={c.id}
                  description={c.customer_no}
                  onClick={() => {
                    setCustomer({ id: c.id, name: c.name })
                    setShowCustomer(false)
                  }}
                >
                  {c.name}
                </List.Item>
              ))}
            </List>
          )}
        </div>
      </Popup>
    </>
  )
}
