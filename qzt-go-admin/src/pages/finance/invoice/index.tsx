import { useRef, useState } from 'react'
import { Alert, App, Button, Col, Form, Space, Upload } from 'antd'
import { PlusOutlined, ScanOutlined } from '@ant-design/icons'
import dayjs, { type Dayjs } from 'dayjs'
import {
  ModalForm,
  ProForm,
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
import type { UploadFile } from 'antd'
import Auth from '../../../components/Auth'
import ExportButtons from '../../../components/ExportButtons'
import { createInvoice, listInvoices, ocrInvoice } from '../../../services/finance'
import type { CreateInvoicePayload, FinInvoice, InvoiceOcrResult } from '../../../types/finance'
import { pageIndexColumn } from '../../../components/IndexTag'

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

/** OCR 返回的中文发票类型 → 表单枚举(「其他」不回填类型) */
const OCR_TYPE_MAP: Record<string, string> = {
  专票: 'VAT_SPECIAL',
  普票: 'VAT_NORMAL',
  电子专票: 'ELECTRONIC',
  电子普票: 'ELECTRONIC',
}

interface InvoiceFormValues {
  invoice_no: string
  invoice_type: string
  direction: string
  invoice_date: string | Dayjs
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
  // OCR 上传识别状态
  const [ocrFileList, setOcrFileList] = useState<UploadFile[]>([])
  const [ocrLoading, setOcrLoading] = useState(false)
  const [needsReview, setNeedsReview] = useState(false)

  const openCreate = () => {
    form.resetFields()
    form.setFieldsValue({ invoice_type: 'VAT_NORMAL', direction: 'ISSUED', tax_rate: '0.13' })
    setOcrFileList([])
    setNeedsReview(false)
    setModalOpen(true)
  }

  const handleSubmit = async (values: InvoiceFormValues) => {
    const payload: CreateInvoicePayload = {
      invoice_no: values.invoice_no,
      invoice_type: values.invoice_type,
      direction: values.direction,
      invoice_date: values.invoice_date ? dayjs(values.invoice_date).format('YYYY-MM-DD') : '',
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

  /** OCR 图片前置校验:类型 + 大小;返回 false 阻断自动上传(仅加入列表) */
  const beforeOcrUpload = (file: File) => {
    const okType = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type)
    if (!okType) {
      message.error('仅支持 jpg/png/webp 图片')
      return Upload.LIST_IGNORE
    }
    if (file.size > 10 * 1024 * 1024) {
      message.error('图片不能超过 10MB')
      return Upload.LIST_IGNORE
    }
    return false
  }

  /** 开始识别:调 OCR 接口,成功后回填表单(不自动保存,由用户确认) */
  const handleOcr = async () => {
    const raw = ocrFileList[0]?.originFileObj as File | undefined
    if (!raw) {
      message.warning('请先上传发票图片')
      return
    }
    setOcrLoading(true)
    try {
      const r: InvoiceOcrResult = await ocrInvoice(raw)
      const values: Partial<InvoiceFormValues> = {}
      if (r.invoice_no) values.invoice_no = r.invoice_no
      if (r.invoice_type && OCR_TYPE_MAP[r.invoice_type]) {
        values.invoice_type = OCR_TYPE_MAP[r.invoice_type]
      }
      if (r.invoice_date) values.invoice_date = dayjs(r.invoice_date)
      if (r.amount && Number(r.amount) > 0) {
        values.amount = Number(r.amount)
        // 表单没有税额字段(税额由后端按税率计算),用 税额/金额 反推税率
        const tax = Number(r.tax_amount)
        if (tax > 0) values.tax_rate = String(Math.round((tax / Number(r.amount)) * 10000) / 10000)
      }
      // 对方名称/税号:按当前方向取对应主体(开出→买方,收到→卖方)
      const party =
        form.getFieldValue('direction') === 'RECEIVED'
          ? { name: r.seller_name, taxNo: r.seller_tax_no }
          : { name: r.buyer_name, taxNo: r.buyer_tax_no }
      if (party.name) values.party_name = party.name
      if (party.taxNo) values.party_tax_no = party.taxNo
      form.setFieldsValue(values)
      setNeedsReview(Boolean(r.needs_review))
      const pct = r.confidence > 0 ? `${Math.round(r.confidence * 100)}%` : '-'
      message.success(`识别完成(置信度 ${pct}),已回填表单,请确认后保存`)
    } catch {
      // 报错文案(含每日限额超限)已由请求拦截器透传
    } finally {
      setOcrLoading(false)
    }
  }

  const columns: ProColumns<FinInvoice>[] = [
    pageIndexColumn(actionRef),
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
        {/* 发票图片 OCR 识别:仅回填表单,不自动保存 */}
        <ProForm.Item label="图片识别" colProps={{ span: 24 }}>
          <Space align="start" wrap size={16}>
            <Upload
              listType="picture-card"
              maxCount={1}
              accept="image/jpeg,image/png,image/webp"
              fileList={ocrFileList}
              beforeUpload={beforeOcrUpload}
              onChange={({ fileList }) => setOcrFileList(fileList)}
              onRemove={() => setNeedsReview(false)}
            >
              {ocrFileList.length === 0 && (
                <div>
                  <PlusOutlined />
                  <div style={{ marginTop: 8 }}>上传发票图片</div>
                </div>
              )}
            </Upload>
            <div>
              <Button
                type="primary"
                icon={<ScanOutlined />}
                loading={ocrLoading}
                disabled={ocrFileList.length === 0}
                onClick={handleOcr}
                style={{ marginBottom: 8 }}
              >
                开始识别
              </Button>
              <div style={{ fontSize: 12, color: '#999', maxWidth: 220, lineHeight: 1.6 }}>
                支持 jpg/png/webp,单张 ≤10MB;识别结果仅回填表单,请核对后手动保存(每日限
                50 次)
              </div>
            </div>
          </Space>
        </ProForm.Item>
        {needsReview && (
          <Col span={24} style={{ marginBottom: 8 }}>
            <Alert
              type="warning"
              showIcon
              message="置信度较低,请人工核对回填结果"
              description="本次识别置信度低于 60%,关键字段可能不准确,保存前请逐项核对。"
            />
          </Col>
        )}
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
