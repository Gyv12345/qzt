import { useRef, useState } from 'react'
import { App, Button, Form, Space, Tag } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import {
  ModalForm,
  ProFormDatePicker,
  ProFormDigit,
  ProFormRadio,
  ProFormSelect,
  ProFormText,
  ProTable,
  type ActionType,
  type ProColumns,
} from '@ant-design/pro-components'
import { Tabs } from 'antd'
import Auth from '../../../components/Auth'
import { pageIndexColumn } from '../../../components/IndexTag'
import {
  createInsurancePlan,
  createSalaryItem,
  deleteInsurancePlan,
  deleteSalaryItem,
  listInsurancePlans,
  listSalaryItems,
  updateInsurancePlan,
  updateSalaryItem,
  type SalaryItemPayload,
} from '../../../services/hrm'

// 薪酬设置(P16):社保方案 + 工资项(公式) 两 Tab。
// 工资项启用后,工资条生成自动切换公式引擎模式(停用全部即回退传统口径)。

interface PlanRow {
  id: number
  name: string
  pension_rate: string
  medical_rate: string
  unemployment_rate: string
  injury_rate: string
  maternity_rate: string
  fund_rate: string
  base_min: string | null
  base_max: string | null
  status: number
}

interface ItemRow {
  id: number
  code: string
  name: string
  kind: string
  formula: string
  fixed_amount: string
  sort: number
  status: number
}

const KIND_TEXT: Record<string, { t: string; c: string }> = {
  INCOME: { t: '收入', c: 'green' },
  DEDUCT: { t: '扣款', c: 'orange' },
  TAX: { t: '扣税', c: 'red' },
}

/** 社保方案面板 */
function PlanPanel() {
  const { message, modal } = App.useApp()
  const actionRef = useRef<ActionType>(null)
  const [formRef] = Form.useForm<Record<string, unknown>>()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<PlanRow | null>(null)

  const openForm = (row?: PlanRow) => {
    setEditing(row ?? null)
    formRef.resetFields()
    if (row) {
      formRef.setFieldsValue({
        name: row.name,
        pension_rate: Number(row.pension_rate),
        medical_rate: Number(row.medical_rate),
        unemployment_rate: Number(row.unemployment_rate),
        injury_rate: Number(row.injury_rate),
        maternity_rate: Number(row.maternity_rate),
        fund_rate: Number(row.fund_rate),
        base_min: row.base_min ? Number(row.base_min) : undefined,
        base_max: row.base_max ? Number(row.base_max) : undefined,
      })
    }
    setOpen(true)
  }

  const columns: ProColumns<PlanRow>[] = [
    pageIndexColumn(actionRef),
    { title: '方案名称', dataIndex: 'name', search: false },
    { title: '养老', dataIndex: 'pension_rate', width: 80, search: false, render: (v) => `${(Number(v) * 100).toFixed(1)}%` },
    { title: '医疗', dataIndex: 'medical_rate', width: 80, search: false, render: (v) => `${(Number(v) * 100).toFixed(1)}%` },
    { title: '失业', dataIndex: 'unemployment_rate', width: 80, search: false, render: (v) => `${(Number(v) * 100).toFixed(1)}%` },
    { title: '工伤', dataIndex: 'injury_rate', width: 80, search: false, render: (v) => `${(Number(v) * 100).toFixed(1)}%` },
    { title: '生育', dataIndex: 'maternity_rate', width: 80, search: false, render: (v) => `${(Number(v) * 100).toFixed(1)}%` },
    { title: '公积金', dataIndex: 'fund_rate', width: 80, search: false, render: (v) => `${(Number(v) * 100).toFixed(1)}%` },
    {
      title: '基数范围',
      width: 130,
      search: false,
      render: (_, r) => `${r.base_min ? Number(r.base_min) : '∞'} ~ ${r.base_max ? Number(r.base_max) : '∞'}`,
    },
    {
      title: '操作',
      valueType: 'option',
      width: 110,
      render: (_, r) => (
        <Space>
          <Auth perm="hrm:payroll-config:edit">
            <Button type="link" size="small" onClick={() => openForm(r)}>
              编辑
            </Button>
          </Auth>
          <Auth perm="hrm:payroll-config:delete">
            <Button
              type="link"
              size="small"
              danger
              onClick={() =>
                modal.confirm({
                  title: '删除方案',
                  content: '确认删除该社保方案?',
                  onOk: async () => {
                    await deleteInsurancePlan(r.id)
                    message.success('已删除')
                    actionRef.current?.reload()
                  },
                })
              }
            >
              删除
            </Button>
          </Auth>
        </Space>
      ),
    },
  ]

  return (
    <>
      <ProTable<PlanRow>
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        search={false}
        request={async ({ current, pageSize }) => {
          const res = await listInsurancePlans({ page: current, page_size: pageSize })
          return { data: res.list, total: res.total, success: true }
        }}
        pagination={{ defaultPageSize: 10 }}
        toolBarRender={() => [
          <Auth perm="hrm:payroll-config:add" key="add">
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openForm()}>
              新建方案
            </Button>
          </Auth>,
        ]}
        headerTitle="社保公积金方案(员工薪酬结构可挂载;生成工资条按方案比例+基数钳制)"
      />
      <ModalForm
        form={formRef}
        title={editing ? '编辑社保方案' : '新建社保方案'}
        open={open}
        onOpenChange={setOpen}
        modalProps={{ destroyOnHidden: true }}
        width={640}
        onFinish={async (values: Record<string, unknown>) => {
          const payload = {
            name: String(values.name),
            pension_rate: Number(values.pension_rate ?? 0),
            medical_rate: Number(values.medical_rate ?? 0),
            unemployment_rate: Number(values.unemployment_rate ?? 0),
            injury_rate: Number(values.injury_rate ?? 0),
            maternity_rate: Number(values.maternity_rate ?? 0),
            fund_rate: Number(values.fund_rate ?? 0),
            base_min: values.base_min != null ? Number(values.base_min) : undefined,
            base_max: values.base_max != null ? Number(values.base_max) : undefined,
            status: 1,
          }
          if (editing) {
            await updateInsurancePlan(editing.id, payload)
            message.success('方案已更新')
          } else {
            await createInsurancePlan(payload)
            message.success('方案已创建')
          }
          actionRef.current?.reload()
          return true
        }}
      >
        <ProFormText name="name" label="方案名称" rules={[{ required: true }]} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <ProFormDigit name="pension_rate" label="养老比例" min={0} max={1} fieldProps={{ step: 0.001, precision: 4 }} initialValue={0.08} />
          <ProFormDigit name="medical_rate" label="医疗比例" min={0} max={1} fieldProps={{ step: 0.001, precision: 4 }} initialValue={0.02} />
          <ProFormDigit name="unemployment_rate" label="失业比例" min={0} max={1} fieldProps={{ step: 0.001, precision: 4 }} initialValue={0.005} />
          <ProFormDigit name="injury_rate" label="工伤比例" min={0} max={1} fieldProps={{ step: 0.001, precision: 4 }} />
          <ProFormDigit name="maternity_rate" label="生育比例" min={0} max={1} fieldProps={{ step: 0.001, precision: 4 }} />
          <ProFormDigit name="fund_rate" label="公积金比例" min={0} max={1} fieldProps={{ step: 0.001, precision: 4 }} initialValue={0.07} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <ProFormDigit name="base_min" label="基数下限(可空)" min={0} fieldProps={{ precision: 2 }} />
          <ProFormDigit name="base_max" label="基数上限(可空)" min={0} fieldProps={{ precision: 2 }} />
        </div>
      </ModalForm>
    </>
  )
}

/** 工资项面板 */
function ItemPanel() {
  const { message, modal } = App.useApp()
  const actionRef = useRef<ActionType>(null)
  const [formRef] = Form.useForm<Record<string, unknown>>()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<ItemRow | null>(null)

  const openForm = (row?: ItemRow) => {
    setEditing(row ?? null)
    formRef.resetFields()
    if (row) {
      formRef.setFieldsValue({
        code: row.code,
        name: row.name,
        kind: row.kind,
        formula: row.formula,
        fixed_amount: row.fixed_amount ? Number(row.fixed_amount) : undefined,
        sort: row.sort,
      })
    }
    setOpen(true)
  }

  const columns: ProColumns<ItemRow>[] = [
    pageIndexColumn(actionRef),
    { title: '编码', dataIndex: 'code', width: 180, search: false },
    { title: '名称', dataIndex: 'name', width: 140, search: false },
    {
      title: '类别',
      dataIndex: 'kind',
      width: 90,
      search: false,
      render: (_, r) => <Tag color={KIND_TEXT[r.kind]?.c}>{KIND_TEXT[r.kind]?.t ?? r.kind}</Tag>,
    },
    {
      title: '公式/固定值',
      dataIndex: 'formula',
      search: false,
      ellipsis: true,
      render: (_, r) => (r.formula ? <code style={{ fontSize: 12 }}>{r.formula}</code> : Number(r.fixed_amount || 0)),
    },
    { title: '排序', dataIndex: 'sort', width: 70, search: false },
    {
      title: '操作',
      valueType: 'option',
      width: 110,
      render: (_, r) => (
        <Space>
          <Auth perm="hrm:payroll-config:edit">
            <Button type="link" size="small" onClick={() => openForm(r)}>
              编辑
            </Button>
          </Auth>
          <Auth perm="hrm:payroll-config:delete">
            <Button
              type="link"
              size="small"
              danger
              onClick={() =>
                modal.confirm({
                  title: '删除工资项',
                  content: '确认删除该工资项?(已有工资条快照不受影响)',
                  onOk: async () => {
                    await deleteSalaryItem(r.id)
                    message.success('已删除')
                    actionRef.current?.reload()
                  },
                })
              }
            >
              删除
            </Button>
          </Auth>
        </Space>
      ),
    },
  ]

  return (
    <>
      <ProTable<ItemRow>
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        search={false}
        request={async ({ current, pageSize }) => {
          const res = await listSalaryItems({ page: current, page_size: pageSize })
          return { data: res.list, total: res.total, success: true }
        }}
        pagination={{ defaultPageSize: 10 }}
        toolBarRender={() => [
          <Auth perm="hrm:payroll-config:add" key="add">
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openForm()}>
              新建工资项
            </Button>
          </Auth>,
        ]}
        headerTitle="工资项(启用≥1 项时工资条切换公式引擎模式;全部停用回退传统口径)"
      />
      <ModalForm
        form={formRef}
        title={editing ? '编辑工资项' : '新建工资项'}
        open={open}
        onOpenChange={setOpen}
        modalProps={{ destroyOnHidden: true }}
        width={560}
        onFinish={async (values: Record<string, unknown>) => {
          const payload: SalaryItemPayload = {
            code: String(values.code),
            name: String(values.name),
            kind: (values.kind as SalaryItemPayload['kind']) ?? 'INCOME',
            formula: values.formula ? String(values.formula) : undefined,
            fixed_amount: values.fixed_amount != null ? Number(values.fixed_amount) : undefined,
            sort: values.sort != null ? Number(values.sort) : 1,
            status: 1,
          }
          if (editing) {
            await updateSalaryItem(editing.id, payload)
            message.success('工资项已更新')
          } else {
            await createSalaryItem(payload)
            message.success('工资项已创建')
          }
          actionRef.current?.reload()
          return true
        }}
      >
        <ProFormText
          name="code"
          label="编码(公式引用,大写字母开头)"
          rules={[
            { required: true },
            { pattern: /^[A-Z][A-Z0-9_]*$/, message: '大写字母/数字/下划线' },
          ]}
        />
        <ProFormText name="name" label="名称" rules={[{ required: true }]} />
        <ProFormRadio.Group
          name="kind"
          label="类别"
          initialValue="INCOME"
          options={[
            { label: '收入', value: 'INCOME' },
            { label: '扣款', value: 'DEDUCT' },
            { label: '扣税', value: 'TAX' },
          ]}
        />
        <ProFormText
          name="formula"
          label="公式(数字/项编码/+ - * / 括号/round(x,n);留空用固定值)"
          placeholder="如 round(BASE_SALARY * 0.1, 2)"
        />
        <ProFormDigit name="fixed_amount" label="固定值(无公式时)" min={0} fieldProps={{ precision: 2 }} />
        <ProFormDigit name="sort" label="排序(求值顺序)" min={0} fieldProps={{ precision: 0 }} initialValue={1} />
      </ModalForm>
    </>
  )
}

/** 薪酬设置页(P16) */
export default function PayrollConfigPage() {
  return (
    <Tabs
      items={[
        { key: 'plan', label: '社保方案', children: <PlanPanel /> },
        { key: 'item', label: '工资项', children: <ItemPanel /> },
      ]}
    />
  )
}

// 防未使用(ProFormDatePicker/ProFormSelect 于后续版本扩展选用)
void ProFormDatePicker
void ProFormSelect
