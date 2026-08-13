import { Popup, Form, Input, TextArea, Button, Toast, DatePicker, SearchBar, List, SpinLoading } from 'antd-mobile'
import { useEffect, useState } from 'react'
import { createOpportunity, updateOpportunity, listCustomers } from '../services/crm'
import type { CrmOpportunity } from '../types/crm'

interface Props {
  visible: boolean
  onClose: () => void
  /** 编辑时传入商机;不传为新建 */
  opportunity?: CrmOpportunity | null
  onSubmitted?: () => void
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

/** 商机新建/编辑表单(含客户搜索选择) */
export default function OpportunityFormSheet({ visible, onClose, opportunity, onSubmitted }: Props) {
  const [form] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)
  const [customer, setCustomer] = useState<{ id: number; name: string } | null>(null)
  const [showCustomer, setShowCustomer] = useState(false)
  const [kw, setKw] = useState('')
  const [custList, setCustList] = useState<{ id: number; name: string; customer_no: string }[]>([])
  const [custLoading, setCustLoading] = useState(false)
  const [closeDate, setCloseDate] = useState('')
  const [dateVisible, setDateVisible] = useState(false)
  const isEdit = !!opportunity

  useEffect(() => {
    if (!visible) return
    if (opportunity) {
      setCustomer({ id: opportunity.customer_id, name: opportunity.customer_name || `客户#${opportunity.customer_id}` })
      setCloseDate(opportunity.expected_close_date || '')
      form.setFieldsValue({
        name: opportunity.name,
        expected_amount: opportunity.expected_amount,
        description: opportunity.description,
      })
    } else {
      setCustomer(null)
      setCloseDate('')
      form.resetFields()
    }
  }, [visible, opportunity, form])

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
    setSubmitting(true)
    try {
      const payload = {
        name: vals.name,
        customer_id: customer.id,
        expected_amount: vals.expected_amount ? Number(vals.expected_amount) : undefined,
        expected_close_date: closeDate || undefined,
        description: vals.description,
      }
      if (isEdit && opportunity) await updateOpportunity(opportunity.id, payload)
      else await createOpportunity(payload as Parameters<typeof createOpportunity>[0])
      Toast.show({ icon: 'success', content: isEdit ? '已保存' : '已创建' })
      onSubmitted?.()
      onClose()
    } catch {
      // 拦截器已 toast
    } finally {
      setSubmitting(false)
    }
  }

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
            {isEdit ? '编辑商机' : '新建商机'}
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
            <Form.Item name="name" label="商机名称" rules={[{ required: true, message: '请输入商机名称' }]}>
              <Input placeholder="请输入商机名称" />
            </Form.Item>
            <Form.Item name="expected_amount" label="预计金额">
              <Input type="number" placeholder="选填" />
            </Form.Item>
            <Form.Item label="预计成交">
              <div
                onClick={() => setDateVisible(true)}
                style={{ fontSize: 15, color: closeDate ? 'var(--text-primary)' : 'var(--text-tertiary)', padding: '4px 0' }}
              >
                {closeDate || '请选择日期'}
              </div>
            </Form.Item>
            <Form.Item name="description" label="描述">
              <TextArea placeholder="选填" rows={2} />
            </Form.Item>
          </Form>
        </div>
      </Popup>

      <DatePicker
        visible={dateVisible}
        precision="day"
        value={closeDate ? new Date(closeDate.replace(' ', 'T')) : undefined}
        onClose={() => setDateVisible(false)}
        onConfirm={(d) => {
          setCloseDate(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`)
          setDateVisible(false)
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
