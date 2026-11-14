// index.tsx 自动化工作流定义页(P27):ProTable 列表 + 画布编辑 Drawer。
import { useEffect, useRef, useState } from 'react'
import {
  App,
  Button,
  Drawer,
  Form,
  Input,
  Popconfirm,
  Select,
  Space,
  Switch,
  Tag,
} from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import type { ActionType, ProColumns } from '@ant-design/pro-components'
import { PageContainer, ProTable } from '@ant-design/pro-components'
import {
  useNodesState,
  useEdgesState,
  type Connection,
  type Node,
} from '@xyflow/react'
import {
  createDefinition,
  deleteDefinition,
  enableDefinition,
  getDefinition,
  listEvents,
  listDefinitions,
  runDefinition,
  updateDefinition,
} from '../../../services/workflow'
import type { EventItem, WorkflowDefinition } from '../../../types/workflow'
import Canvas from './Canvas'
import ConfigPanel from './ConfigPanel'
import {
  ACTION_OPTIONS,
  genNumber,
  graphToRF,
  layoutNodes,
  rfToGraph,
  validateWF,
  type WFEdge,
  type WFNodeData,
} from './canvasMeta'

// seedGraph 初始画布:仅一个手动触发器。
function seedGraph(): { nodes: Node<WFNodeData>[]; edges: WFEdge[] } {
  const n = genNumber('start')
  return {
    nodes: [{
      id: n, type: 'trigger', position: { x: 0, y: 0 },
      data: { number: n, name: '手动触发', nodeType: 'TRIGGER', config: {} },
    }],
    edges: [],
  }
}

export default function WorkflowDefinitionPage() {
  const { message, modal } = App.useApp()
  const actionRef = useRef<ActionType>(null)
  const [events, setEvents] = useState<EventItem[]>([])
  const [editing, setEditing] = useState<WorkflowDefinition | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [panelOpen, setPanelOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [formRef] = Form.useForm()
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<WFNodeData>>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<WFEdge>([])

  // 画布编辑器打开时拉事件目录。
  useEffect(() => {
    if (editorOpen && events.length === 0) {
      listEvents().then((r) => setEvents(r.events ?? []))
    }
  }, [editorOpen, events.length])

  // openEditor 打开画布编辑器。
  const openEditor = async (id: number) => {
    const def = await getDefinition(id)
    setEditing(def)
    const rf = graphToRF(def.graph)
    setNodes(rf.nodes)
    setEdges(rf.edges)
    let cron = ''
    let event = ''
    try {
      const cfg = JSON.parse(def.trigger_config || '{}')
      cron = cfg.cron || ''
      event = cfg.event || ''
    } catch { /* 忽略 */ }
    formRef.setFieldsValue({
      name: def.name,
      description: def.description,
      trigger_type: def.trigger_type,
      cron,
      event,
      enabled: def.enabled === 1,
    })
    setEditorOpen(true)
  }

  // handleSelect 选中节点 → 打开配置面板。
  const handleSelect = (id: string | null) => {
    setSelectedId(id)
    setPanelOpen(id != null)
  }

  // insertNode 在选中节点后方插入动作/条件节点。
  const insertNode = (kind: 'action' | 'condition') => {
    // 未选中时默认锚到触发节点(加号直接从触发器追加,无需先手选节点)
    let anchorId = selectedId
    if (!anchorId) {
      const trigger = nodes.find((n) => n.data.nodeType === 'TRIGGER')
      anchorId = trigger?.id ?? null
      if (!anchorId) {
        message.warning('先在画布上点选一个节点')
        return
      }
      setSelectedId(anchorId)
    }
    const src = nodes.find((n) => n.id === anchorId)
    if (!src) return
    const num = genNumber(kind === 'action' ? 'a' : 'c')
    const cfg: Record<string, unknown> =
      kind === 'action'
        ? { ...ACTION_OPTIONS[0].defaultConfig }
        : { logic: 'AND', branches: [{ label: '分支 1', logic: 'AND', conditions: [] }] }
    const newNode: Node<WFNodeData> = {
      id: num,
      type: kind === 'action' ? 'action' : 'condition',
      position: { x: 0, y: 0 },
      data: {
        number: num,
        name: kind === 'action' ? '动作' : '条件',
        nodeType: kind === 'action' ? 'ACTION' : 'CONDITION',
        config: cfg,
      },
    }
    let newEdge: WFEdge = { id: `e_${src.id}_${num}`, source: src.id, target: num }
    // 从 CONDITION 出发:已有分支边数 < 分支数 → 分支边(when=序号),否则兜底(when='')
    if (src.data.nodeType === 'CONDITION') {
      const cfg2 = src.data.config as { branches?: unknown[] }
      const branchCount = Array.isArray(cfg2.branches) ? cfg2.branches.length : 0
      const branchEdges = edges.filter((e) => e.source === src.id && e.when)
      newEdge.when = branchEdges.length < branchCount ? String(branchEdges.length) : ''
    }
    const nextNodes = [...nodes, newNode]
    const nextEdges = [...edges, newEdge]
    setNodes(layoutNodes(nextNodes, nextEdges))
    setEdges(nextEdges)
    setSelectedId(num)
    setPanelOpen(true)
  }

  // handleConnect 手动连线(CONDITION 出边按已有分支边数自动标 when)。
  const handleConnect = (conn: Connection) => {
    const src = nodes.find((n) => n.id === conn.source)
    let when = ''
    if (src?.data.nodeType === 'CONDITION') {
      const cfg2 = src.data.config as { branches?: unknown[] }
      const branchCount = Array.isArray(cfg2.branches) ? cfg2.branches.length : 0
      const branchEdges = edges.filter((e) => e.source === conn.source && e.when)
      when = branchEdges.length < branchCount ? String(branchEdges.length) : ''
      if (when === '' && branchEdges.length === 0) {
        message.warning('该条件节点的分支边已连满,这条将作为兜底边')
      }
    }
    const newEdge: WFEdge = { id: `e_${conn.source}_${conn.target}_${edges.length}`, ...conn, when }
    setEdges([...edges, newEdge])
  }

  // handleConfigSave 配置面板保存 → 写回节点数据。
  const handleConfigSave = (name: string, config: Record<string, unknown>) => {
    setNodes(nodes.map((n) => (n.id === selectedId ? { ...n, data: { ...n.data, name, config } } : n)))
  }

  // handleDeleteSelected 删除选中节点及其关联边。
  const handleDeleteSelected = () => {
    if (!selectedId) return
    setNodes(nodes.filter((n) => n.id !== selectedId))
    setEdges(edges.filter((e) => e.source !== selectedId && e.target !== selectedId))
    setSelectedId(null)
    setPanelOpen(false)
  }

  // handleSaveEditor 保存工作流(顶层表单 + 画布图)。
  const handleSaveEditor = async (values: {
    name: string
    description: string
    trigger_type: string
    cron?: string
    event?: string
    enabled: number
  }) => {
    const err = validateWF(nodes, edges)
    if (err) {
      message.error(err)
      return
    }
    let triggerConfig = ''
    if (values.trigger_type === 'CRON') {
      if (!values.cron) {
        message.error('定时触发需要 cron 表达式(6 段式:秒 分 时 日 月 周)')
        return
      }
      triggerConfig = JSON.stringify({ cron: values.cron })
    } else if (values.trigger_type === 'EVENT') {
      if (!values.event) {
        message.error('事件触发需要选择事件')
        return
      }
      triggerConfig = JSON.stringify({ event: values.event })
    }
    const payload = {
      id: editing?.id,
      name: values.name,
      description: values.description,
      trigger_type: values.trigger_type,
      trigger_config: triggerConfig,
      graph: JSON.stringify(rfToGraph(nodes, edges)),
      enabled: values.enabled ? 1 : 0,
    }
    if (editing?.id) {
      await updateDefinition(editing.id, payload)
      message.success('已保存')
    } else {
      const created = await createDefinition(payload)
      setEditing(created)
      message.success('已创建')
    }
    actionRef.current?.reload()
  }

  // handleRun 手动运行并展示结果。
  const handleRun = async (id: number) => {
    try {
      const run = await runDefinition(id)
      modal.info({
        title: `执行完成:${run.status}`,
        content: `耗时 ${run.cost_ms}ms${run.error ? `,失败:${run.error}` : ''}`,
      })
    } catch (e) {
      message.error(`执行失败:${(e as Error).message}`)
    }
  }

  // handleDelete 删除定义。
  const handleDelete = async (id: number) => {
    await deleteDefinition(id)
    message.success('已删除')
    actionRef.current?.reload()
  }

  // ── 列表列定义 ──
  const TRIGGER_LABELS: Record<string, string> = { MANUAL: '手动', CRON: '定时', EVENT: '事件' }
  const columns: ProColumns<WorkflowDefinition>[] = [
    {
      title: '名称',
      dataIndex: 'name',
      render: (_, r) => (
        <Space>
          <a onClick={() => openEditor(r.id)}>{r.name}</a>
          <Tag color={r.enabled === 1 ? 'green' : 'default'}>{r.enabled === 1 ? '启用' : '停用'}</Tag>
        </Space>
      ),
    },
    { title: '描述', dataIndex: 'description', ellipsis: true },
    {
      title: '触发器',
      dataIndex: 'trigger_type',
      width: 200,
      render: (_, r) => {
        let hint = ''
        try {
          const cfg = JSON.parse(r.trigger_config || '{}')
          hint = cfg.cron || cfg.event || ''
        } catch { /* 忽略 */ }
        return (
          <Space>
            <Tag>{TRIGGER_LABELS[r.trigger_type] ?? r.trigger_type}</Tag>
            <span style={{ color: '#999', fontSize: 12 }}>{hint}</span>
          </Space>
        )
      },
    },
    {
      title: '运行',
      dataIndex: 'run_count',
      width: 150,
      render: (_, r) => (
        <span>
          {r.run_count} 次{r.last_run_at ? `(最近 ${String(r.last_run_at).slice(0, 19)})` : ''}
        </span>
      ),
    },
    {
      title: '操作',
      valueType: 'option',
      width: 220,
      render: (_, r) => [
        <a key="edit" onClick={() => openEditor(r.id)}>设计</a>,
        <a key="run" onClick={() => handleRun(r.id)}>运行</a>,
        <Switch
          key="enable"
          size="small"
          checked={r.enabled === 1}
          onChange={(v: boolean) => enableDefinition(r.id, v ? 1 : 0).then(() => actionRef.current?.reload())}
        />,
        <Popconfirm key="del" title="确认删除该工作流?" onConfirm={() => handleDelete(r.id)}>
          <a style={{ color: '#ff4d4f' }}>删除</a>
        </Popconfirm>,
      ],
    },
  ]

  // ── 渲染 ──
  const selectedNode = nodes.find((n) => n.id === selectedId) ?? null
  return (
    <PageContainer>
      <ProTable<WorkflowDefinition>
        headerTitle="自动化工作流"
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        search={false}
        request={async ({ current, pageSize }) => {
          const r = await listDefinitions({ page: current, page_size: pageSize })
          return { data: r.list, total: r.total, success: true }
        }}
        toolBarRender={() => [
          <Button key="add" type="primary" icon={<PlusOutlined />} onClick={() => {
            const seed = seedGraph()
            setEditing(null)
            setNodes(seed.nodes)
            setEdges(seed.edges)
            setSelectedId(null)
            setPanelOpen(false)
            formRef.resetFields()
            setEditorOpen(true)
          }}>
            新建工作流
          </Button>,
        ]}
      />

      {/* 画布编辑 Drawer */}
      <Drawer
        title={editing ? `设计:${editing.name}` : '新建工作流'}
        width="90%"
        open={editorOpen}
        destroyOnClose
        onClose={() => setEditorOpen(false)}
        extra={
          <Button
            type="primary"
            onClick={() =>
              formRef.validateFields().then((v) => handleSaveEditor(v))
            }
          >
            保存
          </Button>
        }
      >
        <Form
          form={formRef}
          layout="inline"
          initialValues={{ trigger_type: 'MANUAL', enabled: 0 }}
        >
          <Form.Item name="name" rules={[{ required: true, message: '请输入名称' }]}>
            <Input placeholder="工作流名称" style={{ width: 220 }} />
          </Form.Item>
          <Form.Item name="description">
            <Input placeholder="描述(可选)" style={{ width: 260 }} />
          </Form.Item>
          <Form.Item name="trigger_type">
            <Select
              style={{ width: 110 }}
              options={[
                { value: 'MANUAL', label: '手动触发' },
                { value: 'CRON', label: '定时触发' },
                { value: 'EVENT', label: '事件触发' },
              ]}
            />
          </Form.Item>
          <Form.Item noStyle shouldUpdate={(a, b) => a.trigger_type !== b.trigger_type}>
            {({ getFieldValue }) =>
              getFieldValue('trigger_type') === 'CRON' ? (
                <Form.Item name="cron" rules={[{ required: true }]}>
                  <Input placeholder="0 0 9 * * * (秒 分 时 日 月 周)" style={{ width: 240 }} />
                </Form.Item>
              ) : getFieldValue('trigger_type') === 'EVENT' ? (
                <Form.Item name="event" rules={[{ required: true }]}>
                  <Select
                    style={{ width: 180 }}
                    placeholder="选择触发事件"
                    options={events.map((e) => ({ value: e.event, label: `${e.label}(${e.event})` }))}
                  />
                </Form.Item>
              ) : null
            }
          </Form.Item>
          <Form.Item name="enabled" label="启用" valuePropName="checked">
            <Switch checkedChildren="启" unCheckedChildren="停" />
          </Form.Item>
        </Form>
        <div style={{ marginBottom: 8, marginTop: 12 }}>
          <Space>
            <Button size="small" type="primary" ghost onClick={() => insertNode('action')}>
              + 动作节点
            </Button>
            <Button size="small" type="primary" ghost onClick={() => insertNode('condition')}>
              + 条件节点
            </Button>
            <Button size="small" danger onClick={handleDeleteSelected}>
              删除选中
            </Button>
            <span style={{ color: '#999', fontSize: 12 }}>
              点选节点配置参数;拖拽连线;条件节点的前 N 条出边为分支,最后一条为兜底
            </span>
          </Space>
        </div>
        <div style={{ height: 'calc(100vh - 260px)', border: '1px solid #eee', borderRadius: 8 }}>
          <Canvas
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onSelect={handleSelect}
            onConnectEdge={handleConnect}
          />
        </div>
      </Drawer>

      {/* 节点配置面板 */}
      <ConfigPanel
        open={panelOpen}
        node={selectedNode}
        onSave={handleConfigSave}
        onClose={() => setPanelOpen(false)}
      />
    </PageContainer>
  )
}


