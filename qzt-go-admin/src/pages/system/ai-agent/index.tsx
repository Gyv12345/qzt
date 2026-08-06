import { useRef, useState } from 'react'
import { App, Button, Col, Form, Popconfirm, Space, Switch, Tag } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import {
  ModalForm,
  ProForm,
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
  createAgent,
  deleteAgent,
  listAgents,
  updateAgent,
} from '../../../services/ai'
import type { AiAgent, AiAgentPayload } from '../../../types/ai'

/** scene 中文映射 */
const SCENE_OPTIONS = [
  { label: '回访话术', value: 'script' },
  { label: '跟进记录', value: 'follow' },
  { label: '日报周报', value: 'report' },
]

const sceneLabel = (scene: string) =>
  SCENE_OPTIONS.find((o) => o.value === scene)?.label ?? scene

interface AgentFormValues {
  name: string
  code?: string
  scene: string
  system_prompt: string
  user_prompt?: string
  model?: string
  temperature?: number
  status?: boolean
  sort?: number
}

export default function AiAgentPage() {
  const { message } = App.useApp()
  const actionRef = useRef<ActionType>(null)
  const [form] = Form.useForm<AgentFormValues>()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<AiAgent | null>(null)
  const [sceneFilter, setSceneFilter] = useState<string | undefined>(undefined)

  const openCreate = () => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({
      scene: 'script',
      temperature: 0.7,
      status: true,
      sort: 0,
    } as Partial<AgentFormValues>)
    setModalOpen(true)
  }

  const openEdit = (record: AiAgent) => {
    setEditing(record)
    form.setFieldsValue({
      name: record.name,
      code: record.code,
      scene: record.scene,
      system_prompt: record.system_prompt,
      user_prompt: record.user_prompt,
      model: record.model ?? undefined,
      temperature: record.temperature ?? undefined,
      status: record.status === 1,
      sort: record.sort,
    })
    setModalOpen(true)
  }

  const handleSubmit = async (values: AgentFormValues) => {
    const base = {
      name: values.name,
      scene: values.scene,
      system_prompt: values.system_prompt,
      user_prompt: values.user_prompt ?? '',
      model: values.model || null,
      temperature: values.temperature ?? null,
      status: values.status ? 1 : 0,
      sort: values.sort ?? 0,
    }
    if (editing) {
      await updateAgent(editing.id, base)
      message.success('Agent 已更新')
    } else {
      const payload: AiAgentPayload = { ...base, code: values.code }
      await createAgent(payload)
      message.success('Agent 已创建')
    }
    actionRef.current?.reload()
    return true
  }

  const handleDelete = async (record: AiAgent) => {
    await deleteAgent(record.id)
    message.success('Agent 已删除')
    actionRef.current?.reload()
  }

  const columns: ProColumns<AiAgent>[] = [
    { title: '编号', valueType: 'indexBorder', width: 70 },
    { title: '名称', dataIndex: 'name', width: 160 },
    {
      title: '场景',
      dataIndex: 'scene',
      width: 110,
      render: (_, record) => <Tag color="blue">{sceneLabel(record.scene)}</Tag>,
    },
    {
      title: '系统提示词',
      dataIndex: 'system_prompt',
      width: 240,
      ellipsis: true,
      render: (_, record) => record.system_prompt || '-',
    },
    { title: '模型', dataIndex: 'model', width: 140, render: (_, r) => r.model || '-' },
    {
      title: 'Temperature',
      dataIndex: 'temperature',
      width: 110,
      render: (_, r) => (r.temperature == null ? '-' : r.temperature),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      render: (_, record) =>
        record.status === 1 ? <Tag color="green">启用</Tag> : <Tag>停用</Tag>,
    },
    { title: '排序', dataIndex: 'sort', width: 70 },
    {
      title: '操作',
      valueType: 'option',
      width: 130,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Auth perm="ai:agent:edit">
            <Button type="link" size="small" onClick={() => openEdit(record)}>
              编辑
            </Button>
          </Auth>
          <Auth perm="ai:agent:delete">
            <Popconfirm
              title="确认删除该 Agent?"
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
        </Space>
      ),
    },
  ]

  return (
    <>
      <ProTable<AiAgent>
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        scroll={{ x: 'max-content' }}
        search={false}
        pagination={false}
        request={async () => {
          const data = await listAgents(sceneFilter)
          return { data: data.list ?? [], success: true }
        }}
        toolBarRender={() => [
          <ProForm
            key="scene-filter"
            form={form}
            layout="horizontal"
            submitter={false}
            style={{ marginBottom: 0 }}
          >
            <ProFormSelect
              name="scene"
              placeholder="按场景过滤"
              allowClear
              options={SCENE_OPTIONS}
              fieldProps={{
                style: { width: 160 },
                value: sceneFilter,
                onChange: (v: string | undefined) => {
                  setSceneFilter(v)
                  actionRef.current?.reload()
                },
              }}
            />
          </ProForm>,
          <Auth perm="ai:agent:add" key="add">
            <Button icon={<PlusOutlined />} onClick={openCreate}>
              新增 Agent
            </Button>
          </Auth>,
        ]}
        headerTitle="Agent 管理"
      />
      <ModalForm<AgentFormValues>
        title={editing ? '编辑 Agent' : '新增 Agent'}
        form={form}
        open={modalOpen}
        onOpenChange={setModalOpen}
        modalProps={{ destroyOnHidden: true, maskClosable: false }}
        onFinish={handleSubmit}
        width={720}
        grid
      >
        <ProFormText
          name="name"
          label="名称"
          rules={[{ required: true, message: '请输入名称' }]}
          colProps={{ span: 12 }}
        />
        <ProFormText
          name="code"
          label="编码"
          disabled={!!editing}
          rules={[{ required: !editing, message: '请输入编码' }]}
          placeholder="唯一编码,创建后不可修改"
          colProps={{ span: 12 }}
        />
        <ProFormSelect
          name="scene"
          label="场景"
          options={SCENE_OPTIONS}
          rules={[{ required: true, message: '请选择场景' }]}
          colProps={{ span: 12 }}
        />
        <ProFormText name="model" label="模型" placeholder="留空则用默认模型" colProps={{ span: 12 }} />
        <ProFormDigit
          name="temperature"
          label="Temperature"
          min={0}
          max={2}
          step={0.1}
          fieldProps={{ precision: 2 }}
          colProps={{ span: 12 }}
        />
        <ProFormDigit
          name="sort"
          label="排序"
          min={0}
          fieldProps={{ precision: 0 }}
          colProps={{ span: 12 }}
        />
        <Col span={12}>
          <ProForm.Item name="status" label="状态" valuePropName="checked">
            <Switch checkedChildren="启用" unCheckedChildren="停用" />
          </ProForm.Item>
        </Col>
        <ProFormTextArea
          name="system_prompt"
          label="系统提示词"
          rules={[{ required: true, message: '请输入系统提示词' }]}
          fieldProps={{ autoSize: { minRows: 3, maxRows: 8 } }}
          colProps={{ span: 24 }}
        />
        <ProFormTextArea
          name="user_prompt"
          label="用户提示词"
          fieldProps={{ autoSize: { minRows: 3, maxRows: 8 } }}
          colProps={{ span: 24 }}
        />
      </ModalForm>
    </>
  )
}
