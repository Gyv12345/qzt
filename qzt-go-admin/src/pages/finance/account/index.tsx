import { useRef, useState } from 'react'
import { App, Button, Form } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import {
  ModalForm,
  ProFormDigit,
  ProFormSelect,
  ProFormSwitch,
  ProFormText,
  ProFormTextArea,
  ProTable,
  type ActionType,
  type ProColumns,
} from '@ant-design/pro-components'
import Auth from '../../../components/Auth'
import { createAccount, listAccounts } from '../../../services/finance'
import type { CreateAccountPayload, FinAccount } from '../../../types/finance'

/** 科目类型选项 */
const ACCOUNT_TYPE_OPTIONS = [
  { label: '资产', value: 'ASSET' },
  { label: '负债', value: 'LIABILITY' },
  { label: '权益', value: 'EQUITY' },
  { label: '收入', value: 'INCOME' },
  { label: '支出', value: 'EXPENSE' },
]

const ACCOUNT_TYPE_TEXT: Record<string, string> = {
  ASSET: '资产',
  LIABILITY: '负债',
  EQUITY: '权益',
  INCOME: '收入',
  EXPENSE: '支出',
}

const BALANCE_DIR_OPTIONS = [
  { label: '借', value: 'DEBIT' },
  { label: '贷', value: 'CREDIT' },
]

interface AccountFormValues {
  code: string
  name: string
  type: string
  parent_id?: number
  balance_dir: string
  level?: number
  is_leaf: boolean
  sort?: number
  remark?: string
}

export default function AccountPage() {
  const { message } = App.useApp()
  const actionRef = useRef<ActionType>(null)
  const [form] = Form.useForm<AccountFormValues>()
  const [modalOpen, setModalOpen] = useState(false)
  const [accountOptions, setAccountOptions] = useState<{ label: string; value: number }[]>([])

  const openCreate = async () => {
    form.resetFields()
    form.setFieldsValue({ is_leaf: true, level: 1, sort: 0, balance_dir: 'DEBIT', type: 'ASSET' })
    // 预载父科目下拉
    try {
      const list = await listAccounts()
      setAccountOptions(
        list.map((a) => ({ label: `${a.code} ${a.name}`, value: a.id })),
      )
    } catch {
      // 忽略
    }
    setModalOpen(true)
  }

  const handleSubmit = async (values: AccountFormValues) => {
    const payload: CreateAccountPayload = {
      code: values.code,
      name: values.name,
      type: values.type,
      parent_id: values.parent_id || undefined,
      balance_dir: values.balance_dir,
      level: values.level ?? 1,
      is_leaf: values.is_leaf,
      sort: values.sort ?? 0,
      remark: values.remark || undefined,
    }
    await createAccount(payload)
    message.success('科目已创建')
    actionRef.current?.reload()
    return true
  }

  const columns: ProColumns<FinAccount>[] = [
    { title: '编号', valueType: 'indexBorder', width: 70, search: false },
    { title: '科目编码', dataIndex: 'code', width: 120, search: false },
    { title: '科目名称', dataIndex: 'name', width: 180, search: false },
    {
      title: '类型',
      dataIndex: 'type',
      width: 100,
      valueType: 'select',
      fieldProps: { allowClear: true, placeholder: '全部类型' },
      valueEnum: {
        ASSET: { text: '资产' },
        LIABILITY: { text: '负债' },
        EQUITY: { text: '权益' },
        INCOME: { text: '收入' },
        EXPENSE: { text: '支出' },
      },
      render: (_, record) => ACCOUNT_TYPE_TEXT[record.type] || record.type,
    },
    {
      title: '余额方向',
      dataIndex: 'balance_dir',
      width: 100,
      search: false,
      valueEnum: { DEBIT: { text: '借' }, CREDIT: { text: '贷' } },
    },
    { title: '层级', dataIndex: 'level', width: 80, search: false },
    {
      title: '末级',
      dataIndex: 'is_leaf',
      width: 80,
      search: false,
      render: (_, record) => (record.is_leaf ? '是' : '否'),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      search: false,
      valueEnum: {
        1: { text: '启用', status: 'Success' },
        0: { text: '停用', status: 'Default' },
      },
    },
    { title: '备注', dataIndex: 'remark', width: 160, search: false, ellipsis: true },
  ]

  return (
    <>
      <ProTable<FinAccount>
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        scroll={{ x: 'max-content' }}
        // 后端返回数组(非分页),这里做前端分页
        request={async (params) => {
          const res = await listAccounts({ type: params.type as string | undefined })
          return { data: res, total: res.length, success: true }
        }}
        pagination={{ defaultPageSize: 10, showSizeChanger: true }}
        toolBarRender={() => [
          <Auth perm="finance:account:add" key="add">
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              新增科目
            </Button>
          </Auth>,
        ]}
        headerTitle="会计科目"
      />
      <ModalForm<AccountFormValues>
        title="新增科目"
        form={form}
        open={modalOpen}
        onOpenChange={setModalOpen}
        modalProps={{ destroyOnHidden: true, maskClosable: false }}
        onFinish={handleSubmit}
        width={720}
        grid
      >
        <ProFormText
          name="code"
          label="科目编码"
          rules={[{ required: true, message: '请输入科目编码' }]}
          placeholder="如 1001"
          colProps={{ span: 12 }}
        />
        <ProFormText
          name="name"
          label="科目名称"
          rules={[{ required: true, message: '请输入科目名称' }]}
          placeholder="科目名称"
          colProps={{ span: 12 }}
        />
        <ProFormSelect
          name="type"
          label="科目类型"
          rules={[{ required: true, message: '请选择类型' }]}
          options={ACCOUNT_TYPE_OPTIONS}
          colProps={{ span: 12 }}
        />
        <ProFormSelect
          name="balance_dir"
          label="余额方向"
          rules={[{ required: true, message: '请选择余额方向' }]}
          options={BALANCE_DIR_OPTIONS}
          colProps={{ span: 12 }}
        />
        <ProFormSelect
          name="parent_id"
          label="父科目"
          options={accountOptions}
          placeholder="顶级科目留空"
          allowClear
          colProps={{ span: 12 }}
        />
        <ProFormDigit name="level" label="层级" min={1} colProps={{ span: 12 }} />
        <ProFormDigit name="sort" label="排序" min={0} colProps={{ span: 12 }} />
        <ProFormSwitch name="is_leaf" label="末级科目" colProps={{ span: 12 }} />
        <ProFormTextArea name="remark" label="备注" colProps={{ span: 12 }} />
      </ModalForm>
    </>
  )
}
