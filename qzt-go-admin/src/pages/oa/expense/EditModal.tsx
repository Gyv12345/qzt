import { useEffect } from 'react'
import { App, Button, Col, DatePicker, Form, Input, InputNumber, Popconfirm, Table } from 'antd'
import { ModalForm, ProForm, ProFormText, ProFormTextArea } from '@ant-design/pro-components'
import DictSelect from '../../../components/DictSelect'
import { createExpense, getExpense, updateExpense } from '../../../services/oa'
import type { OaExpenseItem } from '../../../types/oa'
import dayjs from 'dayjs'

interface EditModalProps {
  open: boolean
  editingId: number | null
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

interface FormValues {
  title: string
  expense_type: string
  amount?: string
  occur_date?: dayjs.Dayjs
  description?: string
  items: OaExpenseItem[]
}

export default function ExpenseEditModal({ open, editingId, onOpenChange, onSuccess }: EditModalProps) {
  const { message } = App.useApp()
  const [form] = Form.useForm<FormValues>()

  useEffect(() => {
    if (!open) return
    if (editingId) {
      // 编辑:拉详情回填
      getExpense(editingId)
        .then((detail) => {
          const e = detail.expense
          form.setFieldsValue({
            title: e.title,
            expense_type: e.expense_type,
            amount: e.amount,
            occur_date: e.occur_date ? dayjs(e.occur_date) : undefined,
            description: e.description,
            items: detail.items.map((it) => ({
              id: it.id,
              item_type: it.item_type,
              amount: it.amount,
              occur_date: it.occur_date,
              invoice_no: it.invoice_no,
              remark: it.remark,
            })),
          })
        })
    } else {
      form.resetFields()
      form.setFieldsValue({ items: [] })
    }
  }, [open, editingId, form])

  const handleSubmit = async (values: FormValues) => {
    const items = (values.items || []).map((it) => ({
      item_type: it.item_type || '',
      amount: String(it.amount || '0'),
      occur_date: it.occur_date || null,
      invoice_no: it.invoice_no || '',
      remark: it.remark || '',
    }))
    // 计算总额
    const total = items.reduce((sum, it) => sum + Number(it.amount || 0), 0)
    // 明细至少一行且总金额大于 0(0 元报销单无业务意义,也过不了后端校验)
    if (items.length === 0) {
      message.error('请至少添加一行费用明细')
      return false
    }
    if (total <= 0) {
      message.error('报销总金额必须大于 0,请填写明细金额')
      return false
    }
    const payload = {
      title: values.title,
      expense_type: values.expense_type,
      amount: String(total.toFixed(2)),
      occur_date: values.occur_date ? values.occur_date.format('YYYY-MM-DD') : undefined,
      description: values.description || '',
      items,
    }
    if (editingId) {
      await updateExpense(editingId, payload)
      message.success('已更新')
    } else {
      await createExpense(payload)
      message.success('已创建')
    }
    onSuccess()
    return true
  }

  const itemColumns = [
    {
      title: '类型',
      dataIndex: 'item_type',
      width: 120,
      render: (_: unknown, _r: OaExpenseItem, idx: number) => (
        <Input
          value={form.getFieldValue(['items', idx, 'item_type'])}
          onChange={(e) => updateItemField(form, idx, 'item_type', e.target.value)}
          placeholder="如 机票/酒店"
          size="small"
        />
      ),
    },
    {
      title: '金额',
      dataIndex: 'amount',
      width: 120,
      render: (_: unknown, _r: OaExpenseItem, idx: number) => (
        <InputNumber
          value={form.getFieldValue(['items', idx, 'amount'])}
          onChange={(v) => updateItemField(form, idx, 'amount', v)}
          min={0}
          precision={2}
          size="small"
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: '日期',
      dataIndex: 'occur_date',
      width: 150,
      render: (_: unknown, _r: OaExpenseItem, idx: number) => (
        <DatePicker
          value={form.getFieldValue(['items', idx, 'occur_date']) ? dayjs(form.getFieldValue(['items', idx, 'occur_date'])) : undefined}
          onChange={(_, ds) => updateItemField(form, idx, 'occur_date', ds as string)}
          size="small"
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: '发票号',
      dataIndex: 'invoice_no',
      width: 120,
      render: (_: unknown, _r: OaExpenseItem, idx: number) => (
        <Input
          value={form.getFieldValue(['items', idx, 'invoice_no'])}
          onChange={(e) => updateItemField(form, idx, 'invoice_no', e.target.value)}
          size="small"
        />
      ),
    },
    {
      title: '备注',
      dataIndex: 'remark',
      render: (_: unknown, _r: OaExpenseItem, idx: number) => (
        <Input
          value={form.getFieldValue(['items', idx, 'remark'])}
          onChange={(e) => updateItemField(form, idx, 'remark', e.target.value)}
          size="small"
        />
      ),
    },
    {
      title: '操作',
      width: 60,
      render: (_: unknown, _r: OaExpenseItem, idx: number) => (
        <Popconfirm
          title="删除该行?"
          onConfirm={() => {
            const items = form.getFieldValue('items') || []
            items.splice(idx, 1)
            form.setFieldsValue({ items: [...items] })
          }}
        >
          <Button type="link" size="small" danger>
            删
          </Button>
        </Popconfirm>
      ),
    },
  ]

  return (
    <ModalForm<FormValues>
      title={editingId ? '编辑报销单' : '新增报销单'}
      form={form}
      open={open}
      onOpenChange={onOpenChange}
      modalProps={{ destroyOnHidden: true, maskClosable: false }}
      onFinish={handleSubmit}
      width={900}
      initialValues={{ items: [] }}
      grid
    >
      <ProFormText
        name="title"
        label="报销标题"
        rules={[{ required: true, message: '请输入标题' }]}
        colProps={{ span: 12 }}
      />
      <Col span={12}>
        <ProForm.Item name="expense_type" label="费用类型" rules={[{ required: true, message: '请选择' }]}>
          <DictSelect code="EXPENSE_TYPE" placeholder="选择费用类型" />
        </ProForm.Item>
      </Col>
      <Col span={12}>
        <ProForm.Item name="occur_date" label="发生日期">
          <DatePicker style={{ width: '100%' }} />
        </ProForm.Item>
      </Col>
      <ProFormTextArea name="description" label="说明" colProps={{ span: 24 }} />

      {/* 明细行 */}
      <Col span={24}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontWeight: 500 }}>费用明细</span>
          <Button
            size="small"
            type="dashed"
            onClick={() => {
              const items = form.getFieldValue('items') || []
              form.setFieldsValue({ items: [...items, { item_type: '', amount: '', occur_date: null, invoice_no: '', remark: '' }] })
            }}
          >
            + 添加明细
          </Button>
        </div>
        <Form.List name="items">
          {(fields) => (
            <Table
              size="small"
              rowKey={(_, idx) => String(idx)}
              dataSource={fields.map((f) => ({ ...form.getFieldValue(['items', f.name]), key: f.name }))}
              columns={itemColumns}
              pagination={false}
              scroll={{ x: 'max-content' }}
            />
          )}
        </Form.List>
      </Col>
    </ModalForm>
  )
}

// 辅助:更新明细行某字段(触发 form 重新渲染)
function updateItemField(form: ReturnType<typeof Form.useForm<FormValues>>[0], idx: number, field: string, value: unknown) {
  const items = form.getFieldValue('items') || []
  items[idx] = { ...items[idx], [field]: value }
  form.setFieldsValue({ items: [...items] })
}
