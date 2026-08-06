import { useRef, useState } from 'react'
import { App, Button, Form } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import {
  ModalForm,
  ProFormDatePicker,
  ProFormDigit,
  ProFormRadio,
  ProFormSelect,
  ProFormText,
  ProFormTextArea,
  ProTable,
  type ActionType,
  type ProColumns,
} from '@ant-design/pro-components'
import Auth from '../../../components/Auth'
import ExportButtons from '../../../components/ExportButtons'
import { createInvoice, listInvoices } from '../../../services/finance'
import type { CreateInvoicePayload, FinInvoice } from '../../../types/finance'

const INVOICE_TYPE_OPTIONS = [
  { label: '增值税专用发票', value: 'VAT_SPECIAL' },
  { label: '增值税普通发票', value: 'VAT_NORMAL' },
  { label: '电子发票', value: 'ELECTRONIC' },
]

const INVOICE_TYPE_TEXT: Record<string, string> = {
  VAT_SPECIAL: '专票',
  VAT_NORMAL: '普票',
  ELECTRONIC: '电子',
}

const DIRECTION_OPTIONS = [
  { label: '收到(进项)', value: 'RECEIVED' },
  { label: '开出(销项)', value: 'ISSUED' },
]

const DIRECTION_TEXT: Record<string, string> = { RECEIVED: '收到', ISSUED: '开出' }

interface InvoiceFormValues {
  invoice_no: string
  invoice_type: string
  direction: string
  invoice_date: string
  amount: number
  tax_rate?: string
  party_name?: string
  party_tax_no?: string
  biz_type?: string
  biz_id?: number
  remark?: string
}

export default function InvoicePage() {
  const { message } = App.useApp()
  const actionRef = useRef<ActionType>(null)
  const [form] = Form.useForm<InvoiceFormValues>()
  const [modalOpen, setModalOpen] = useState(false)

  const openCreate = () => {
    form.resetFields()
    form.setFieldsValue({ invoice_type: 'VAT_NORMAL', direction: 'ISSUED', tax_rate: '0.13' })
    setModalOpen(true)
  }

  const handleSubmit = async (values: InvoiceFormValues) => {
    const payload: CreateInvoicePayload = {
      invoice_no: values.invoice_no,
      invoice_type: values.invoice_type,
      direction: values.direction,
      invoice_date: values.invoice_date,
      amount: String(values.amount),
      tax_rate: values.tax_rate || undefined,
      party_name: values.party_name || undefined,
      party_tax_no: values.party_tax_no || undefined,
      biz_type: values.biz_type || undefined,
      biz_id: values.biz_id || undefined,
      remark: values.remark || undefined,
    }
    await createInvoice(payload)
    message.success('发票已创建')
    actionRef.current?.reload()
    return true
  }

  const columns: ProColumns<FinInvoice>[] = [
    { title: '编号', valueType: 'indexBorder', width: 70, search: false },
    { title: '发票号', dataIndex: 'invoice_no', width: 170, search: false },
    {
      title: '方向',
      dataIndex: 'direction',
      width: 100,
      valueType: 'select',
      fieldProps: { allowClear: true, placeholder: '全部方向' },
      valueEnum: {
        RECEIVED: { text: '收到' },
        ISSUED: { text: '开出' },
      },
      render: (_, r) => DIRECTION_TEXT[r.direction] || r.direction,
    },
    {
      title: '类型',
      dataIndex: 'invoice_type',
      width: 90,
      search: false,
      render: (_, r) => INVOICE_TYPE_TEXT[r.invoice_type] || r.invoice_type,
    },
    {
      title: '开票日期',
      dataIndex: 'invoice_date',
      valueType: 'date',
      width: 130,
      search: false,
      render: (_, r) => (r.invoice_date ? r.invoice_date.slice(0, 10) : '-'),
    },
    { title: '金额', dataIndex: 'amount', width: 130, search: false, align: 'right' },
    { title: '税率', dataIndex: 'tax_rate', width: 90, search: false },
    { title: '税额', dataIndex: 'tax_amount', width: 130, search: false, align: 'right' },
    { title: '价税合计', dataIndex: 'total_amount', width: 140, search: false, align: 'right' },
    { title: '对方名称', dataIndex: 'party_name', width: 180, search: false, ellipsis: true },
    { title: '对方税号', dataIndex: 'party_tax_no', width: 180, search: false },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      valueType: 'dateTime',
      width: 170,
      search: false,
    },
  ]

  return (
    <>
      <ProTable<FinInvoice>
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        scroll={{ x: 'max-content' }}
        request={async ({ current, pageSize, ...rest }) => {
          const res = await listInvoices({ page: current, page_size: pageSize, ...rest })
          return { data: res.list, total: res.total, success: true }
        }}
        pagination={{ defaultPageSize: 10, showSizeChanger: true }}
        toolBarRender={() => [
          <Auth perm="finance:invoice:add" key="add">
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              新增发票
            </Button>
          </Auth>,
          <ExportButtons
            key="export"
            fileName="发票列表"
            columns={columns}
            fetchAll={async () => {
              const res = await listInvoices({ page: 1, page_size: 1000 })
              return res.list
            }}
          />,
        ]}
        headerTitle="发票管理"
      />
      <ModalForm<InvoiceFormValues>
        title="新增发票"
        form={form}
        open={modalOpen}
        onOpenChange={setModalOpen}
        modalProps={{ destroyOnHidden: true, maskClosable: false }}
        onFinish={handleSubmit}
        width={720}
        grid
      >
        <ProFormText
          name="invoice_no"
          label="发票号"
          rules={[{ required: true, message: '请输入发票号' }]}
          colProps={{ span: 12 }}
        />
        <ProFormSelect
          name="invoice_type"
          label="发票类型"
          rules={[{ required: true, message: '请选择类型' }]}
          options={INVOICE_TYPE_OPTIONS}
          colProps={{ span: 12 }}
        />
        <ProFormRadio.Group
          name="direction"
          label="方向"
          rules={[{ required: true, message: '请选择' }]}
          options={DIRECTION_OPTIONS}
          colProps={{ span: 12 }}
        />
        <ProFormDatePicker
          name="invoice_date"
          label="开票日期"
          rules={[{ required: true, message: '请选择日期' }]}
          fieldProps={{ style: { width: '100%' } }}
          colProps={{ span: 12 }}
        />
        <ProFormDigit
          name="amount"
          label="金额"
          rules={[{ required: true, message: '请输入金额' }]}
          min={0}
          precision={2}
          fieldProps={{ style: { width: '100%' } }}
          colProps={{ span: 12 }}
        />
        <ProFormText name="tax_rate" label="税率" placeholder="如 0.13" colProps={{ span: 12 }} />
        <ProFormText name="party_name" label="对方名称" colProps={{ span: 12 }} />
        <ProFormText name="party_tax_no" label="对方税号" colProps={{ span: 12 }} />
        <ProFormText name="biz_type" label="业务类型" colProps={{ span: 12 }} />
        <ProFormDigit name="biz_id" label="业务ID" min={0} colProps={{ span: 12 }} />
        <ProFormTextArea name="remark" label="备注" colProps={{ span: 12 }} />
      </ModalForm>
    </>
  )
}
