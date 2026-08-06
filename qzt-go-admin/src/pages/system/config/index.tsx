import { useRef, useState } from 'react'
import { App, Button, Col, Form, Input, Popconfirm, Select, Space, Switch, Tag } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import {
  ProForm,
  ModalForm,
  ProFormDigit,
  ProFormSelect,
  ProFormText,
  ProFormTextArea,
  ProTable,
  type ActionType,
  type ProColumns,
} from '@ant-design/pro-components'
import Auth from '../../../components/Auth'
import {
  batchUpdateConfigs,
  createConfig,
  deleteConfig,
  listConfigs,
  refreshConfigCache,
  updateConfig,
} from '../../../services/system'
import type { SysConfig } from '../../../types'

interface ConfigFormValues {
  name: string
  key: string
  value?: string
  type?: string
  group?: string
  options?: string
  is_public?: boolean
  sort?: number
  remark?: string
}

const typeOptions = ['string', 'number', 'boolean', 'json'].map((t) => ({ label: t, value: t }))

export default function ConfigPage() {
  const { message } = App.useApp()
  const actionRef = useRef<ActionType>(null)
  const [form] = Form.useForm<ConfigFormValues>()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<SysConfig | null>(null)
  const [currentGroup, setCurrentGroup] = useState('')
  const [groupOptions, setGroupOptions] = useState<{ label: string; value: string }[]>([])
  const groupsLoadedRef = useRef(false)
  const editedRef = useRef<Map<string, string>>(new Map())

  const openCreate = () => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({ type: 'string', is_public: false, sort: 0 } as Partial<ConfigFormValues>)
    setModalOpen(true)
  }

  const openEdit = (record: SysConfig) => {
    setEditing(record)
    form.setFieldsValue({
      name: record.name,
      key: record.key,
      value: record.value,
      type: record.type || 'string',
      group: record.group,
      options: record.options,
      is_public: record.is_public,
      sort: record.sort,
      remark: record.remark,
    })
    setModalOpen(true)
  }

  const handleSubmit = async (values: ConfigFormValues) => {
    const payload = {
      name: values.name,
      value: values.value,
      type: values.type,
      group: values.group,
      options: values.options,
      is_public: values.is_public,
      sort: values.sort,
      remark: values.remark,
    }
    if (editing) {
      await updateConfig(editing.id, payload)
      message.success('配置已更新')
    } else {
      await createConfig({ ...payload, key: values.key })
      message.success('配置已创建')
    }
    actionRef.current?.reload()
    return true
  }

  const handleDelete = async (record: SysConfig) => {
    await deleteConfig(record.id)
    message.success('配置已删除')
    actionRef.current?.reload()
  }

  const handleBatchSave = async () => {
    const edited = editedRef.current
    if (edited.size === 0) {
      message.info('没有待保存的修改')
      return
    }
    await batchUpdateConfigs([...edited].map(([key, value]) => ({ key, value })))
    edited.clear()
    message.success('修改已保存')
    actionRef.current?.reload()
  }

  const handleRefreshCache = async () => {
    await refreshConfigCache()
    message.success('缓存已刷新')
  }

  const columns: ProColumns<SysConfig>[] = [
    { title: '编号', valueType: 'indexBorder', width: 70 },
    { title: '配置名称', dataIndex: 'name', width: 160 },
    { title: '键', dataIndex: 'key', width: 220, copyable: true, ellipsis: true },
    {
      title: '值',
      dataIndex: 'value',
      width: 260,
      render: (_, record) => (
        <Input
          defaultValue={record.value}
          disabled={!record.editable}
          onChange={(e) => {
            const v = e.target.value
            if (v === record.value) {
              editedRef.current.delete(record.key)
            } else {
              editedRef.current.set(record.key, v)
            }
          }}
        />
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      width: 90,
      render: (_, record) => <Tag>{record.type || 'string'}</Tag>,
    },
    {
      title: '分组',
      dataIndex: 'group',
      width: 120,
      render: (_, record) => (record.group ? <Tag color="blue">{record.group}</Tag> : '-'),
    },
    {
      title: '公开',
      dataIndex: 'is_public',
      width: 70,
      render: (_, record) =>
        record.is_public ? <Tag color="green">公开</Tag> : <Tag>私有</Tag>,
    },
    {
      title: '内置',
      dataIndex: 'builtin',
      width: 70,
      render: (_, record) => (record.builtin ? <Tag color="orange">是</Tag> : <Tag>否</Tag>),
    },
    { title: '排序', dataIndex: 'sort', width: 70 },
    { title: '备注', dataIndex: 'remark', width: 160, ellipsis: true },
    {
      title: '操作',
      valueType: 'option',
      width: 140,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Auth perm="system:config:edit">
            <Button
              type="link"
              size="small"
              disabled={!record.editable}
              onClick={() => openEdit(record)}
            >
              编辑
            </Button>
          </Auth>
          <Auth perm="system:config:delete">
            <Popconfirm
              title="确认删除该配置?"
              okText="删除"
              okButtonProps={{ danger: true }}
              cancelText="取消"
              onConfirm={() => handleDelete(record)}
            >
              <Button type="link" size="small" danger disabled={record.builtin}>
                删除
              </Button>
            </Popconfirm>
          </Auth>
        </Space>
      ),
    },
  ]

  return (
    <>
      <ProTable<SysConfig>
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        scroll={{ x: 'max-content' }}
        search={false}
        pagination={false}
        request={async () => {
          const data = await listConfigs(currentGroup || undefined)
          if (!groupsLoadedRef.current) {
            groupsLoadedRef.current = true
            const all = await listConfigs()
            const groups = [...new Set(all.map((c) => c.group).filter(Boolean))]
            setGroupOptions(groups.map((g) => ({ label: g, value: g })))
          }
          return { data, success: true }
        }}
        toolBarRender={() => [
          <Select
            key="group"
            allowClear
            placeholder="全部分组"
            style={{ width: 160 }}
            options={groupOptions}
            value={currentGroup || undefined}
            onChange={(v) => {
              setCurrentGroup(v ?? '')
              actionRef.current?.reload()
            }}
          />,
          <Auth perm="system:config:add" key="add">
            <Button icon={<PlusOutlined />} onClick={openCreate}>
              新增配置
            </Button>
          </Auth>,
          <Auth perm="system:config:edit" key="save">
            <Button type="primary" onClick={handleBatchSave}>
              保存修改
            </Button>
          </Auth>,
          <Auth perm="system:config:edit" key="refresh">
            <Button onClick={handleRefreshCache}>刷新缓存</Button>
          </Auth>,
        ]}
        headerTitle="系统配置"
      />
      <ModalForm<ConfigFormValues>
        title={editing ? '编辑配置' : '新增配置'}
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
          label="配置名称"
          rules={[{ required: true, message: '请输入配置名称' }]}
          colProps={{ span: 12 }}
        />
        <ProFormText
          name="key"
          label="键"
          disabled={!!editing}
          rules={[{ required: true, message: '请输入配置键' }]}
          placeholder="如 site.name"
          colProps={{ span: 12 }}
        />
        <ProFormSelect
          name="type"
          label="类型"
          options={typeOptions}
          placeholder="值类型"
          colProps={{ span: 12 }}
        />
        <ProFormText name="group" label="分组" placeholder="如 system" colProps={{ span: 12 }} />
        <ProFormTextArea name="value" label="值" placeholder="配置值" colProps={{ span: 24 }} />
        <ProFormTextArea name="options" label="选项" placeholder="选项定义(可选)" colProps={{ span: 24 }} />
        <Col span={12}>
          <ProForm.Item name="is_public" label="公开" valuePropName="checked">
            <Switch checkedChildren="公开" unCheckedChildren="私有" />
          </ProForm.Item>
        </Col>
        <ProFormDigit
          name="sort"
          label="排序"
          min={0}
          fieldProps={{ precision: 0 }}
          colProps={{ span: 12 }}
        />
        <ProFormTextArea name="remark" label="备注" colProps={{ span: 24 }} />
      </ModalForm>
    </>
  )
}
