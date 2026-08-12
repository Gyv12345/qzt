import { useRef, useState } from 'react'
import {
  Alert,
  App,
  Button,
  Col,
  DatePicker,
  Form,
  InputNumber,
  Popconfirm,
  Radio,
  Select,
  Space,
  Switch,
  Tag,
  Typography,
} from 'antd'
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons'
import {
  ProForm,
  ModalForm,
  ProFormDependency,
  ProFormText,
  ProTable,
  type ActionType,
  type ProColumns,
} from '@ant-design/pro-components'
import type { Dayjs } from 'dayjs'
import Auth from '../../../components/Auth'
import {
  createLeadPool,
  deleteLeadPool,
  listLeadPools,
  recycleLeadPool,
  setLeadPoolPickRule,
  setLeadPoolRecycleRule,
  updateLeadPool,
} from '../../../services/lead'
import type { CrmLeadPool } from '../../../types/lead'
import type { CrmPoolPayload, CrmRecycleCondition } from '../../../types/crm'

const { RangePicker } = DatePicker

interface PoolFormValues {
  name: string
  scope_dept_ids?: string[]
  scope_role_ids?: string[]
  admin_user_ids?: string[]
  enabled: boolean
  auto_recycle: boolean
}

interface PickRuleFormValues {
  limit_daily: boolean
  daily_limit?: number
  limit_prev_owner: boolean
  prev_owner_interval?: number
  limit_new_data: boolean
  new_data_interval?: number
}

interface RecycleConditionFormValue {
  timeField: 'LAST_FOLLOW_TIME' | 'STORAGE_TIME'
  operator: 'DYNAMIC' | 'FIXED'
  days?: number
  range?: [Dayjs, Dayjs] | null
  nullSatisfied?: boolean
}

interface RecycleRuleFormValues {
  operator: 'AND' | 'OR'
  conditions?: RecycleConditionFormValue[]
}

const parseIdTags = (json: string): string[] => {
  if (!json) return []
  try {
    const arr: unknown = JSON.parse(json)
    return Array.isArray(arr) ? arr.map((v) => String(v)) : []
  } catch {
    return []
  }
}

const tagsToJson = (tags?: string[]): string => {
  const nums = (tags ?? [])
    .map((t) => Number(t))
    .filter((n) => Number.isInteger(n) && n >= 0)
  return nums.length ? JSON.stringify(nums) : ''
}

const idTagsSelectProps = {
  mode: 'tags' as const,
  open: false,
  placeholder: '输入数字 ID 后回车',
}

export default function LeadPoolPage() {
  const { message } = App.useApp()
  const actionRef = useRef<ActionType>(null)
  const [form] = Form.useForm<PoolFormValues>()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<CrmLeadPool | null>(null)
  const [currentPool, setCurrentPool] = useState<CrmLeadPool | null>(null)
  const [pickRuleOpen, setPickRuleOpen] = useState(false)
  const [recycleRuleOpen, setRecycleRuleOpen] = useState(false)

  const openCreate = () => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({ enabled: true, auto_recycle: false } as Partial<PoolFormValues>)
    setModalOpen(true)
  }

  const openEdit = (record: CrmLeadPool) => {
    setEditing(record)
    form.setFieldsValue({
      name: record.name,
      scope_dept_ids: parseIdTags(record.scope_dept_ids),
      scope_role_ids: parseIdTags(record.scope_role_ids),
      admin_user_ids: parseIdTags(record.admin_user_ids),
      enabled: record.enabled === 1,
      auto_recycle: record.auto_recycle === 1,
    })
    setModalOpen(true)
  }

  const handleSubmit = async (values: PoolFormValues) => {
    const payload: CrmPoolPayload = {
      name: values.name,
      scope_dept_ids: tagsToJson(values.scope_dept_ids),
      scope_role_ids: tagsToJson(values.scope_role_ids),
      admin_user_ids: tagsToJson(values.admin_user_ids),
      enabled: values.enabled ? 1 : 0,
      auto_recycle: values.auto_recycle ? 1 : 0,
    }
    if (editing) {
      await updateLeadPool(editing.id, payload)
      message.success('线索池已更新')
    } else {
      await createLeadPool(payload)
      message.success('线索池已创建')
    }
    actionRef.current?.reload()
    return true
  }

  const handleDelete = async (record: CrmLeadPool) => {
    await deleteLeadPool(record.id)
    message.success('线索池已删除')
    actionRef.current?.reload()
  }

  const handlePickRule = async (values: PickRuleFormValues) => {
    if (!currentPool) return false
    await setLeadPoolPickRule(currentPool.id, {
      limit_daily: values.limit_daily ? 1 : 0,
      daily_limit: values.daily_limit ?? 0,
      limit_prev_owner: values.limit_prev_owner ? 1 : 0,
      prev_owner_interval: values.prev_owner_interval ?? 0,
      limit_new_data: values.limit_new_data ? 1 : 0,
      new_data_interval: values.new_data_interval ?? 0,
    })
    message.success('领取规则已保存')
    actionRef.current?.reload()
    return true
  }

  const handleRecycleRule = async (values: RecycleRuleFormValues) => {
    if (!currentPool) return false
    const conditions: CrmRecycleCondition[] = (values.conditions ?? []).map((c) => ({
      timeField: c.timeField,
      operator: c.operator,
      value:
        c.operator === 'FIXED'
          ? [c.range?.[0], c.range?.[1]].map((d) => d?.format('YYYY-MM-DD') ?? '').join(',')
          : String(c.days ?? 0),
      nullSatisfied: c.nullSatisfied ?? false,
    }))
    await setLeadPoolRecycleRule(currentPool.id, {
      operator: values.operator,
      conditions: JSON.stringify(conditions),
    })
    message.success('回收规则已保存')
    actionRef.current?.reload()
    return true
  }

  const handleRecycle = async (record: CrmLeadPool) => {
    await recycleLeadPool(record.id)
    message.success('已按回收规则执行回收')
    actionRef.current?.reload()
  }

  const columns: ProColumns<CrmLeadPool>[] = [
    { title: '编号', valueType: 'indexBorder', width: 70 },
    {
      title: '名称',
      dataIndex: 'name',
      width: 160,
      render: (_, r) => (
        <Space size={4}>
          {r.name}
          {r.is_default === 1 ? <Tag color="blue">默认</Tag> : null}
        </Space>
      ),
    },
    {
      title: '适用范围',
      key: 'scope',
      width: 220,
      render: (_, r) => {
        const parts: string[] = []
        if (r.scope_dept_ids) parts.push(`部门 ${r.scope_dept_ids}`)
        if (r.scope_role_ids) parts.push(`角色 ${r.scope_role_ids}`)
        return parts.length ? parts.join(' ') : '全部'
      },
    },
    {
      title: '管理员',
      dataIndex: 'admin_user_ids',
      width: 180,
      render: (_, r) => r.admin_user_ids || '-',
    },
    {
      title: '启用',
      dataIndex: 'enabled',
      width: 80,
      render: (_, r) => (r.enabled === 1 ? <Tag color="green">启用</Tag> : <Tag>禁用</Tag>),
    },
    {
      title: '自动回收',
      dataIndex: 'auto_recycle',
      width: 90,
      render: (_, r) => (r.auto_recycle === 1 ? <Tag color="green">开启</Tag> : <Tag>关闭</Tag>),
    },
    { title: '创建时间', dataIndex: 'created_at', valueType: 'dateTime', width: 170 },
    {
      title: '操作',
      valueType: 'option',
      width: 260,
      fixed: 'right',
      render: (_, record) => (
        <Space size={4} wrap>
          <Auth perm="crm:lead-pool:edit">
            <Button type="link" size="small" onClick={() => openEdit(record)}>
              编辑
            </Button>
          </Auth>
          <Auth perm="crm:lead-pool:edit">
            <Button
              type="link"
              size="small"
              onClick={() => {
                setCurrentPool(record)
                setPickRuleOpen(true)
              }}
            >
              领取规则
            </Button>
          </Auth>
          <Auth perm="crm:lead-pool:edit">
            <Button
              type="link"
              size="small"
              onClick={() => {
                setCurrentPool(record)
                setRecycleRuleOpen(true)
              }}
            >
              回收规则
            </Button>
          </Auth>
          <Auth perm="crm:lead-pool:recycle">
            <Popconfirm
              title="立即按回收规则执行一次回收?"
              okText="执行"
              cancelText="取消"
              onConfirm={() => handleRecycle(record)}
            >
              <Button type="link" size="small">
                手动回收
              </Button>
            </Popconfirm>
          </Auth>
          {record.is_default !== 1 && (
            <Auth perm="crm:lead-pool:delete">
              <Popconfirm
                title="确认删除该线索池?"
                okText="删除"
                okButtonProps={{ danger: true }}
                cancelText="取消"
                onConfirm={() => handleDelete(record)}
              >
                <Button type="link" size="small" danger>
                  删除
                </Button>
              </Popconfirm>
            </Auth>
          )}
        </Space>
      ),
    },
  ]

  return (
    <>
      <ProTable<CrmLeadPool>
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        scroll={{ x: 'max-content' }}
        search={false}
        pagination={false}
        request={async () => ({ data: await listLeadPools(), success: true })}
        toolBarRender={() => [
          <Auth perm="crm:lead-pool:add" key="add">
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              新增线索池
            </Button>
          </Auth>,
        ]}
        headerTitle="线索池列表"
      />
      <ModalForm<PoolFormValues>
        title={editing ? '编辑线索池' : '新增线索池'}
        form={form}
        open={modalOpen}
        onOpenChange={setModalOpen}
        modalProps={{ destroyOnHidden: true, maskClosable: false }}
        onFinish={handleSubmit}
        width={640}
        grid
      >
        <ProFormText
          name="name"
          label="名称"
          rules={[{ required: true, message: '请输入线索池名称' }]}
          colProps={{ span: 12 }}
        />
        <Col span={12}>
          <ProForm.Item name="scope_dept_ids" label="适用部门">
            <Select {...idTagsSelectProps} />
          </ProForm.Item>
        </Col>
        <Col span={12}>
          <ProForm.Item name="scope_role_ids" label="适用角色">
            <Select {...idTagsSelectProps} />
          </ProForm.Item>
        </Col>
        <Col span={12}>
          <ProForm.Item name="admin_user_ids" label="管理员">
            <Select {...idTagsSelectProps} />
          </ProForm.Item>
        </Col>
        <Col span={12}>
          <ProForm.Item name="enabled" label="启用" valuePropName="checked">
            <Switch checkedChildren="启用" unCheckedChildren="禁用" />
          </ProForm.Item>
        </Col>
        <Col span={12}>
          <ProForm.Item name="auto_recycle" label="自动回收" valuePropName="checked">
            <Switch checkedChildren="开启" unCheckedChildren="关闭" />
          </ProForm.Item>
        </Col>
      </ModalForm>
      <ModalForm<PickRuleFormValues>
        title={`领取规则${currentPool ? ` - ${currentPool.name}` : ''}`}
        open={pickRuleOpen}
        onOpenChange={setPickRuleOpen}
        modalProps={{ destroyOnHidden: true, maskClosable: false }}
        initialValues={{
          limit_daily: false,
          daily_limit: 0,
          limit_prev_owner: false,
          prev_owner_interval: 0,
          limit_new_data: false,
          new_data_interval: 0,
        }}
        onFinish={handlePickRule}
        width={480}
      >
        <Alert
          type="warning"
          showIcon
          message="规则保存后即覆盖,当前已存规则不可回显"
          style={{ marginBottom: 16 }}
        />
        <ProForm.Item name="limit_daily" label="限制每日领取" valuePropName="checked">
          <Switch checkedChildren="限制" unCheckedChildren="不限" />
        </ProForm.Item>
        <ProForm.Item name="daily_limit" label="每日领取上限">
          <InputNumber min={0} precision={0} style={{ width: '100%' }} placeholder="每人每日最多领取数" />
        </ProForm.Item>
        <ProForm.Item name="limit_prev_owner" label="限制前归属人" valuePropName="checked">
          <Switch checkedChildren="限制" unCheckedChildren="不限" />
        </ProForm.Item>
        <ProForm.Item name="prev_owner_interval" label="前归属人冷却天数">
          <InputNumber min={0} precision={0} style={{ width: '100%' }} placeholder="原负责人多少天内不可领回" />
        </ProForm.Item>
        <ProForm.Item name="limit_new_data" label="限制新数据" valuePropName="checked">
          <Switch checkedChildren="限制" unCheckedChildren="不限" />
        </ProForm.Item>
        <ProForm.Item name="new_data_interval" label="新数据冷却天数">
          <InputNumber min={0} precision={0} style={{ width: '100%' }} placeholder="入库多少天内不可领取" />
        </ProForm.Item>
      </ModalForm>
      <ModalForm<RecycleRuleFormValues>
        title={`回收规则${currentPool ? ` - ${currentPool.name}` : ''}`}
        open={recycleRuleOpen}
        onOpenChange={setRecycleRuleOpen}
        modalProps={{ destroyOnHidden: true, maskClosable: false }}
        initialValues={{ operator: 'AND', conditions: [] }}
        onFinish={handleRecycleRule}
        width={900}
      >
        <Alert
          type="warning"
          showIcon
          message="规则保存后即覆盖,当前已存规则不可回显"
          style={{ marginBottom: 16 }}
        />
        <ProForm.Item name="operator" label="条件关系" rules={[{ required: true, message: '请选择条件关系' }]}>
          <Radio.Group>
            <Radio.Button value="AND">AND 全部满足</Radio.Button>
            <Radio.Button value="OR">OR 任一满足</Radio.Button>
          </Radio.Group>
        </ProForm.Item>
        <ProForm.Item label="回收条件">
          <Form.List name="conditions">
            {(fields, { add, remove }) => (
              <>
                {fields.map((field) => (
                  <Space key={field.key} align="baseline" wrap style={{ display: 'flex', marginBottom: 8 }}>
                    <ProForm.Item
                      name={[field.name, 'timeField']}
                      rules={[{ required: true, message: '请选择时间字段' }]}
                    >
                      <Select
                        style={{ width: 160 }}
                        placeholder="时间字段"
                        options={[
                          { label: '最近跟进时间', value: 'LAST_FOLLOW_TIME' },
                          { label: '领取入库时间', value: 'STORAGE_TIME' },
                        ]}
                      />
                    </ProForm.Item>
                    <ProForm.Item
                      name={[field.name, 'operator']}
                      rules={[{ required: true, message: '请选择条件类型' }]}
                    >
                      <Select
                        style={{ width: 160 }}
                        placeholder="条件类型"
                        options={[
                          { label: 'N 天未跟进', value: 'DYNAMIC' },
                          { label: '固定日期区间', value: 'FIXED' },
                        ]}
                      />
                    </ProForm.Item>
                    <ProFormDependency name={['conditions']}>
                      {(values) => {
                        const cond = values?.conditions?.[field.name]
                        return cond?.operator === 'FIXED' ? (
                          <ProForm.Item
                            name={[field.name, 'range']}
                            rules={[{ required: true, message: '请选择日期区间' }]}
                          >
                            <RangePicker />
                          </ProForm.Item>
                        ) : (
                          <ProForm.Item
                            name={[field.name, 'days']}
                            rules={[{ required: true, message: '请输入天数' }]}
                          >
                            <InputNumber min={1} precision={0} placeholder="天数" style={{ width: 100 }} />
                          </ProForm.Item>
                        )
                      }}
                    </ProFormDependency>
                    <Space size={4}>
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        为空也算满足
                      </Typography.Text>
                      <ProForm.Item name={[field.name, 'nullSatisfied']} valuePropName="checked" noStyle>
                        <Switch size="small" />
                      </ProForm.Item>
                    </Space>
                    <MinusCircleOutlined onClick={() => remove(field.name)} />
                  </Space>
                ))}
                <Button
                  type="dashed"
                  block
                  icon={<PlusOutlined />}
                  onClick={() =>
                    add({
                      timeField: 'LAST_FOLLOW_TIME',
                      operator: 'DYNAMIC',
                      days: 30,
                      nullSatisfied: false,
                    })
                  }
                >
                  添加条件
                </Button>
              </>
            )}
          </Form.List>
        </ProForm.Item>
      </ModalForm>
    </>
  )
}
