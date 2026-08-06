import { useEffect, useRef, useState } from 'react'
import { App, Button, Form, Popconfirm } from 'antd'
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
import { confirmVoucher, createVoucher, listAccounts, listVouchers } from '../../../services/finance'
import type { CreateVoucherPayload, FinAccount, FinVoucher } from '../../../types/finance'

const DIRECTION_OPTIONS = [
  { label: '借方', value: 'DEBIT' },
  { label: '贷方', value: 'CREDIT' },
]

const STATUS_TEXT: Record<string, string> = { DRAFT: '草稿', CONFIRMED: '已确认' }

interface VoucherFormValues {
  account_id: number
  voucher_date: string
  description: string
  direction: string
  amount: number
  biz_type?: string
  biz_id?: number
  remark?: string
}

export default function VoucherPage() {
  const { message } = App.useApp()
  const actionRef = useRef<ActionType>(null)
  const [form] = Form.useForm<VoucherFormValues>()
  const [modalOpen, setModalOpen] = useState(false)
  const [accountOptions, setAccountOptions] = useState<{ label: string; value: number }[]>([])

  // 预载科目下拉(凭证/列表展示都需要)
  useEffect(() => {
    listAccounts()
      .then((list: FinAccount[]) =>
        setAccountOptions(list.map((a) => ({ label: `${a.code} ${a.name}`, value: a.id }))),
      )
      .catch(() => {})
  }, [])

  const accountName = (id: number) => {
    const opt = accountOptions.find((o) => o.value === id)
    return opt ? opt.label : String(id)
  }

  const openCreate = () => {
    form.resetFields()
    form.setFieldsValue({ direction: 'DEBIT', voucher_date: undefined })
    setModalOpen(true)
  }

  const handleSubmit = async (values: VoucherFormValues) => {
    const payload: CreateVoucherPayload = {
      account_id: values.account_id,
      voucher_date: values.voucher_date,
      description: values.description,
      direction: values.direction,
      amount: String(values.amount),
      biz_type: values.biz_type || undefined,
      biz_id: values.biz_id || undefined,
      remark: values.remark || undefined,
    }
    await createVoucher(payload)
    message.success('凭证已创建')
    actionRef.current?.reload()
    return true
  }

  const handleConfirm = async (record: FinVoucher) => {
    await confirmVoucher(record.id)
    message.success('凭证已确认')
    actionRef.current?.reload()
  }

  const columns: ProColumns<FinVoucher>[] = [
    { title: '编号', valueType: 'indexBorder', width: 70, search: false },
    { title: '凭证号', dataIndex: 'voucher_no', width: 150, search: false },
    {
      title: '凭证日期',
      dataIndex: 'voucher_date',
      valueType: 'date',
      width: 130,
      search: false,
      render: (_, r) => (r.voucher_date ? r.voucher_date.slice(0, 10) : '-'),
    },
    {
      title: '科目',
      dataIndex: 'account_id',
      width: 200,
      search: false,
      render: (_, r) => accountName(r.account_id),
    },
    { title: '摘要', dataIndex: 'description', width: 180, search: false, ellipsis: true },
    {
      title: '借贷',
      dataIndex: 'direction',
      width: 80,
      search: false,
      valueEnum: { DEBIT: { text: '借' }, CREDIT: { text: '贷' } },
    },
    { title: '金额', dataIndex: 'amount', width: 130, search: false, align: 'right' },
    { title: '币种', dataIndex: 'currency', width: 80, search: false },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      valueType: 'select',
      fieldProps: { allowClear: true, placeholder: '全部状态' },
      valueEnum: {
        DRAFT: { text: '草稿', status: 'Default' },
        CONFIRMED: { text: '已确认', status: 'Success' },
      },
      render: (_, r) => STATUS_TEXT[r.status] || r.status,
    },
    { title: '备注', dataIndex: 'remark', width: 150, search: false, ellipsis: true },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      valueType: 'dateTime',
      width: 170,
      search: false,
    },
    {
      title: '操作',
      valueType: 'option',
      width: 100,
      fixed: 'right',
      render: (_, record) =>
        record.status === 'DRAFT' ? (
          <Auth perm="finance:voucher:confirm">
            <Popconfirm
              title="确认该凭证?确认后不可修改"
              okText="确认"
              cancelText="取消"
              onConfirm={() => handleConfirm(record)}
            >
              <Button type="link" size="small">
                确认
              </Button>
            </Popconfirm>
          </Auth>
        ) : (
          <span style={{ color: '#999' }}>—</span>
        ),
    },
  ]

  return (
    <>
      <ProTable<FinVoucher>
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        scroll={{ x: 'max-content' }}
        request={async ({ current, pageSize, ...rest }) => {
          const res = await listVouchers({ page: current, page_size: pageSize, ...rest })
          return { data: res.list, total: res.total, success: true }
        }}
        pagination={{ defaultPageSize: 10, showSizeChanger: true }}
        toolBarRender={() => [
          <Auth perm="finance:voucher:add" key="add">
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              新增凭证
            </Button>
          </Auth>,
          <ExportButtons
            key="export"
            fileName="记账凭证"
            columns={columns}
            fetchAll={async () => {
              const res = await listVouchers({ page: 1, page_size: 1000 })
              return res.list
            }}
          />,
        ]}
        headerTitle="记账凭证"
      />
      <ModalForm<VoucherFormValues>
        title="新增凭证"
        form={form}
        open={modalOpen}
        onOpenChange={setModalOpen}
        modalProps={{ destroyOnHidden: true, maskClosable: false }}
        onFinish={handleSubmit}
        width={720}
        grid
      >
        <ProFormSelect
          name="account_id"
          label="会计科目"
          rules={[{ required: true, message: '请选择科目' }]}
          options={accountOptions}
          showSearch
          fieldProps={{ optionFilterProp: 'label' }}
          colProps={{ span: 12 }}
        />
        <ProFormDatePicker
          name="voucher_date"
          label="凭证日期"
          rules={[{ required: true, message: '请选择日期' }]}
          fieldProps={{ style: { width: '100%' } }}
          colProps={{ span: 12 }}
        />
        <ProFormText
          name="description"
          label="摘要"
          rules={[{ required: true, message: '请输入摘要' }]}
          colProps={{ span: 12 }}
        />
        <ProFormRadio.Group
          name="direction"
          label="借贷方向"
          rules={[{ required: true, message: '请选择' }]}
          options={DIRECTION_OPTIONS}
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
        <ProFormText name="biz_type" label="业务类型" placeholder="如 PURCHASE/SALES" colProps={{ span: 12 }} />
        <ProFormDigit name="biz_id" label="业务ID" min={0} colProps={{ span: 12 }} />
        <ProFormTextArea name="remark" label="备注" colProps={{ span: 12 }} />
      </ModalForm>
    </>
  )
}
