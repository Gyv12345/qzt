// Canvas.tsx 工作流画布(P27):ReactFlow 外壳 + 三类自定义节点 + 连线即分支语义。
// 受控组件:nodes/edges 状态由父组件持有,交互变更通过回调上抛。
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  Handle,
  Position,
  type Connection,
  type NodeProps,
  type OnNodesChange,
  type OnEdgesChange,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import {
  AuditOutlined,
  ThunderboltOutlined,
  NodeIndexOutlined,
  ApiOutlined,
  RobotOutlined,
} from '@ant-design/icons'
import type { WFNodeData } from './canvasMeta'

// truncHint / actionLabel 辅助。
function truncHint(s: string, n: number) {
  const r = Array.from(s)
  return r.length > n ? r.slice(0, n).join('') + '…' : s
}
const ACTION_LABELS: Record<string, string> = {
  notify: '发送通知',
  field_update: '更新字段',
  http: 'HTTP 请求',
  llm: 'AI 生成',
}
function actionLabel(action?: string) {
  return ACTION_LABELS[action ?? ''] ?? '未配置'
}

// nodeTypes 注册表(模块级,避免重挂载)。
const nodeTypes = { trigger: TriggerNodeView, action: ActionNodeView, condition: ConditionNodeView }

// ── 画布主组件(受控) ──
export interface CanvasProps {
  nodes: import('@xyflow/react').Node<WFNodeData>[]
  edges: import('@xyflow/react').Edge[]
  onNodesChange: OnNodesChange<import('@xyflow/react').Node<WFNodeData>>
  onEdgesChange: OnEdgesChange<import('@xyflow/react').Edge>
  onSelect: (id: string | null) => void
  onConnectEdge: (conn: Connection) => void
}

function FlowInner(props: CanvasProps) {
  return (
    <ReactFlow
      nodes={props.nodes}
      edges={props.edges}
      nodeTypes={nodeTypes}
      onNodesChange={props.onNodesChange}
      onEdgesChange={props.onEdgesChange}
      onConnect={props.onConnectEdge}
      onNodeClick={(_, n) => props.onSelect(n.id)}
      onPaneClick={() => props.onSelect(null)}
      onNodesDelete={() => props.onSelect(null)}
      fitView
      deleteKeyCode={['Backspace', 'Delete']}
      proOptions={{ hideAttribution: true }}
      defaultEdgeOptions={{ type: 'smoothstep' }}
    >
      <Background gap={24} />
      <Controls showInteractive={false} />
      <MiniMap pannable zoomable style={{ width: 120, height: 80 }} />
    </ReactFlow>
  )
}

// Canvas 对外组件(ReactFlowProvider 包裹,fitView 调用)。
export default function Canvas(props: CanvasProps) {
  return (
    <ReactFlowProvider>
      <FlowInner {...props} />
    </ReactFlowProvider>
  )
}
// ── 节点视图 ──

// NodeHandles 节点连接点(目标在顶,源头在底;无 handle 则边不渲染也无法拖线)。
function NodeHandles() {
  return (
    <>
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </>
  )
}

// actionIcon 动作类型图标。
function actionIcon(action?: string) {
  switch (action) {
    case 'notify':
      return <ThunderboltOutlined />
    case 'field_update':
      return <AuditOutlined />
    case 'http':
      return <ApiOutlined />
    case 'llm':
      return <RobotOutlined />
    default:
      return <ThunderboltOutlined />
  }
}

// TriggerNodeView 触发器节点(绿色)。
function TriggerNodeView(props: NodeProps) {
  const d = props.data as unknown as WFNodeData
  const hint = String(
    (d.config as { cron?: string }).cron || (d.config as { event?: string }).event || '手动',
  )
  return (
    <div style={{
      width: 180, padding: '10px 12px', borderRadius: 10, background: '#f6ffed',
      border: '2px solid #b7eb8f', textAlign: 'center', fontSize: 13,
    }}>
      <div><ThunderboltOutlined style={{ color: '#52c41a' }} /> <b>{d.name || '触发器'}</b></div>
      <div style={{ color: '#999', fontSize: 11, marginTop: 4 }}>{truncHint(hint, 26)}</div>
      <NodeHandles />
    </div>
  )
}

// ActionNodeView 动作节点(蓝色)。
function ActionNodeView(props: NodeProps) {
  const d = props.data as unknown as WFNodeData
  const action = String((d.config as { action?: string }).action || '')
  return (
    <div style={{
      width: 180, padding: '10px 12px', borderRadius: 10, background: '#e6f4ff',
      border: '2px solid #91caff', fontSize: 13,
    }}>
      <div>
        {actionIcon(action)} <b>{d.name || '动作'}</b>
      </div>
      <div style={{ color: '#999', fontSize: 11, marginTop: 4 }}>{truncHint(actionLabel(action), 28)}</div>
      <NodeHandles />
    </div>
  )
}

// ConditionNodeView 条件分支节点(黄色,显示分支数)。
function ConditionNodeView(props: NodeProps) {
  const d = props.data as unknown as WFNodeData
  const branches = ((d.config as { branches?: unknown[] }).branches as unknown[] | undefined) ?? []
  return (
    <div style={{
      width: 180, padding: '10px 12px', borderRadius: 10, background: '#fffbe6',
      border: '2px solid #ffe58f', textAlign: 'center', fontSize: 13,
    }}>
      <div><NodeIndexOutlined style={{ color: '#faad14' }} /> <b>{d.name || '条件'}</b></div>
      <div style={{ color: '#999', fontSize: 11, marginTop: 4 }}>{branches.length} 分支 + 兜底</div>
      <NodeHandles />
    </div>
  )
}