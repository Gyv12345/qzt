import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  Handle,
  Position,
  type Node,
  type Edge,
  type Connection,
  type NodeProps,
  type EdgeProps,
  BaseEdge,
  getBezierPath,
  EdgeLabelRenderer,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { App, Button, Dropdown, Space, Spin } from 'antd'
import { CloseOutlined, PlusOutlined } from '@ant-design/icons'
import dagre from 'dagre'
import { getApprovalFlow, saveApprovalFlowDesign } from '../../../services/approval'
import type { ApprovalFlowDetail, SaveDesignRequest } from '../../../types/approval'
import NodeConfigPanel from './NodeConfigPanel'

// ── 节点类型样式 ──
const NODE_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  START: { bg: '#52c41a', color: '#fff', label: '开始' },
  APPROVER: { bg: '#1890ff', color: '#fff', label: '审批' },
  CONDITION: { bg: '#faad14', color: '#fff', label: '条件' },
  DEFAULT: { bg: '#8c8c8c', color: '#fff', label: '默认' },
  END: { bg: '#ff4d4f', color: '#fff', label: '结束' },
}

/** 节点 data 类型 */
interface ApprovalNodeData {
  name: string
  nodeType: string
  executeTiming?: string
  approverConfig?: Record<string, unknown>
  conditionConfig?: string
  [key: string]: unknown
}

// ── 自定义节点组件 ──
function ApprovalNodeComponent({ id, data, selected }: NodeProps<Node<ApprovalNodeData>>) {
  const style = NODE_STYLE[data.nodeType] ?? NODE_STYLE.DEFAULT
  const { deleteElements } = useReactFlow()
  const canDelete = data.nodeType !== 'START' && data.nodeType !== 'END'

  return (
    <div
      style={{
        position: 'relative',
        background: style.bg,
        color: style.color,
        padding: '10px 18px',
        borderRadius: 8,
        minWidth: 100,
        textAlign: 'center',
        fontSize: 13,
        fontWeight: 500,
        border: selected ? '2px solid #fff' : '2px solid transparent',
        boxShadow: selected ? '0 0 0 2px #1677ff' : '0 2px 6px rgba(0,0,0,0.15)',
      }}
    >
      <Handle type="target" position={Position.Left} style={{ background: '#fff' }} />
      <div style={{ fontSize: 11, opacity: 0.8 }}>{style.label}</div>
      <div>{data.name}</div>
      <Handle type="source" position={Position.Right} style={{ background: '#fff' }} />
      {canDelete && selected && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            deleteElements({ nodes: [{ id }] })
          }}
          style={{
            position: 'absolute',
            top: -8,
            right: -8,
            width: 18,
            height: 18,
            borderRadius: '50%',
            border: 'none',
            background: '#ff4d4f',
            color: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 10,
          }}
        >
          <CloseOutlined style={{ fontSize: 9 }} />
        </button>
      )}
    </div>
  )
}

const nodeTypes = { approval: ApprovalNodeComponent }

// ── dagre 自动布局 ──
function layoutNodes(nodes: Node[], edges: Edge[], direction = 'LR'): Node[] {
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: direction, nodesep: 40, ranksep: 80 })
  nodes.forEach((n) => {
    g.setNode(n.id, { width: 140, height: 50 })
  })
  edges.forEach((e) => {
    g.setEdge(e.source, e.target)
  })
  dagre.layout(g)
  return nodes.map((n) => {
    const pos = g.node(n.id)
    return { ...n, position: { x: pos.x - 70, y: pos.y - 25 } }
  })
}

// ── 辅助:生成节点 number ──
let nodeSeq = 0
function genNumber(prefix: string): string {
  nodeSeq++
  return `${prefix}_${Date.now()}_${nodeSeq}`
}

// ── 自定义边组件(带插入按钮) ──
function ClickableEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })
  const { getNode, getEdges, setEdges, setNodes, getNodes } = useReactFlow()

  const insertNode = (nodeType: 'APPROVER' | 'CONDITION') => {
    const edges = getEdges()
    const nodes = getNodes()
    const edge = edges.find((e) => e.id === id)
    if (!edge) return

    const sourceNode = getNode(edge.source)
    const targetNode = getNode(edge.target)
    if (!sourceNode || !targetNode) return

    const midX = (sourceNode.position.x + targetNode.position.x) / 2
    const midY = (sourceNode.position.y + targetNode.position.y) / 2

    // 删除原边
    const remainingEdges = edges.filter((e) => e.id !== id)

    if (nodeType === 'CONDITION') {
      // 插入两个条件节点(Y 偏移)
      const condA: Node<ApprovalNodeData> = {
        id: genNumber('cond'),
        type: 'approval',
        position: { x: midX, y: midY - 70 },
        data: {
          name: '条件A',
          nodeType: 'CONDITION',
          conditionConfig: JSON.stringify({ logic: 'AND', conditions: [] }),
        },
      }
      const condB: Node<ApprovalNodeData> = {
        id: genNumber('cond'),
        type: 'approval',
        position: { x: midX, y: midY + 70 },
        data: {
          name: '条件B',
          nodeType: 'CONDITION',
          conditionConfig: JSON.stringify({ logic: 'AND', conditions: [] }),
        },
      }
      const newEdges: Edge[] = [
        { id: genNumber('e'), source: edge.source, target: condA.id, type: 'clickable' },
        { id: genNumber('e'), source: edge.source, target: condB.id, type: 'clickable' },
        { id: genNumber('e'), source: condA.id, target: edge.target, type: 'clickable' },
        { id: genNumber('e'), source: condB.id, target: edge.target, type: 'clickable' },
      ]
      setNodes([...nodes, condA, condB])
      setEdges([...remainingEdges, ...newEdges])
    } else {
      // 插入一个审批节点
      const newNode: Node<ApprovalNodeData> = {
        id: genNumber('approver'),
        type: 'approval',
        position: { x: midX, y: midY },
        data: {
          name: '审批节点',
          nodeType: 'APPROVER',
          approverConfig: {
            approver_type: 'MEMBER',
            multi_approver_mode: 'ANY',
            empty_approver_action: 'AUTO_PASS',
            same_submitter_action: 'SKIP',
            approver_list: '[]',
          },
        },
      }
      const newEdges: Edge[] = [
        { id: genNumber('e'), source: edge.source, target: newNode.id, type: 'clickable' },
        { id: genNumber('e'), source: newNode.id, target: edge.target, type: 'clickable' },
      ]
      setNodes([...nodes, newNode])
      setEdges([...remainingEdges, ...newEdges])
    }
  }

  return (
    <>
      <BaseEdge id={id} path={edgePath} style={style} />
      <EdgeLabelRenderer>
        <Dropdown
          trigger={['click']}
          menu={{
            items: [
              { key: 'APPROVER', label: '审批节点', icon: <PlusOutlined /> },
              { key: 'CONDITION', label: '条件节点', icon: <PlusOutlined /> },
            ],
            onClick: ({ key }) => insertNode(key as 'APPROVER' | 'CONDITION'),
          }}
        >
          <button
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'all',
              width: 22,
              height: 22,
              borderRadius: '50%',
              border: '1px solid #1677ff',
              background: '#fff',
              color: '#1677ff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
            }}
            className="edge-insert-btn"
          >
            <PlusOutlined style={{ fontSize: 10 }} />
          </button>
        </Dropdown>
      </EdgeLabelRenderer>
    </>
  )
}

const edgeTypes = { clickable: ClickableEdge }

// ── 主 Designer 组件 ──
interface DesignerProps {
  flowId: number
  onClose: () => void
}

function DesignerInner({ flowId, onClose }: DesignerProps) {
  const { message } = App.useApp()
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [detail, setDetail] = useState<ApprovalFlowDetail | null>(null)
  const { getNodes, getEdges } = useReactFlow()

  // 加载流程设计
  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const res = await getApprovalFlow(flowId)
        setDetail(res)
        const flowNodes = res.nodes ?? []
        const flowLinks = res.links ?? []
        const flowApprovers = res.approvers ?? []
        const flowConditions = (res.conditions ?? []) as { node_id?: number; condition_config?: string }[]

        if (flowNodes.length === 0) {
          // 空流程:seed START → END
          const startNode: Node<ApprovalNodeData> = {
            id: 'start',
            type: 'approval',
            position: { x: 0, y: 0 },
            data: { name: '开始', nodeType: 'START', executeTiming: 'CREATE' },
          }
          const endNode: Node<ApprovalNodeData> = {
            id: 'end',
            type: 'approval',
            position: { x: 300, y: 0 },
            data: { name: '结束', nodeType: 'END' },
          }
          const seedEdge: Edge = { id: 'e_start_end', source: 'start', target: 'end', type: 'clickable' }
          const laid = layoutNodes([startNode, endNode], [seedEdge])
          setNodes(laid)
          setEdges([seedEdge])
          return
        }

        // 转换后端数据 → React Flow
        const approverMap = new Map(flowApprovers.map((a) => [String(a.id), a]))
        const condMap = new Map(flowConditions.map((c) => [String(c.node_id ?? ''), c.condition_config]))

        const rfNodes: Node<ApprovalNodeData>[] = flowNodes.map((n) => {
          const numStr = String(n.id)
          const appr = n.node_type === 'APPROVER' ? approverMap.get(numStr) : undefined
          return {
            id: n.number || numStr,
            type: 'approval',
            position: { x: 0, y: 0 },
            data: {
              name: n.name,
              nodeType: n.node_type,
              executeTiming: n.execute_timing,
              approverConfig: appr ? (appr as unknown as Record<string, unknown>) : undefined,
              conditionConfig: n.node_type === 'CONDITION' ? condMap.get(numStr) : undefined,
            },
          }
        })

        const rfEdges: Edge[] = flowLinks.map((l, i) => ({
          id: `e_${l.from_node_id}_${l.to_node_id}_${i}`,
          source: rfNodes.find((n) => {
            const fn = flowNodes.find((fn) => fn.id === l.from_node_id)
            return fn && (n.id === fn.number || n.id === String(fn.id))
          })?.id || String(l.from_node_id),
          target: rfNodes.find((n) => {
            const tn = flowNodes.find((fn) => fn.id === l.to_node_id)
            return tn && (n.id === tn.number || n.id === String(tn.id))
          })?.id || String(l.to_node_id),
          type: 'clickable',
        }))

        // 尝试从 localStorage 读坐标
        const posKey = `flowPos:${flowId}`
        const savedPos = (() => {
          try {
            return JSON.parse(localStorage.getItem(posKey) || '{}')
          } catch {
            return {}
          }
        })()

        const hasAllPos = rfNodes.every((n) => savedPos[n.id])
        if (hasAllPos) {
          rfNodes.forEach((n) => {
            n.position = savedPos[n.id]
          })
          setNodes(rfNodes)
        } else {
          setNodes(layoutNodes(rfNodes, rfEdges))
        }
        setEdges(rfEdges)
      } finally {
        setLoading(false)
      }
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flowId])

  const onConnect = useCallback(
    (conn: Connection) =>
      setEdges((eds) => addEdge({ ...conn, type: 'clickable', id: genNumber('e') }, eds)),
    [setEdges],
  )

  // 删除节点时自动重连
  const onNodesDelete = useCallback(
    (deleted: Node[]) => {
      if (deleted.length === 0) return
      const deletedIds = new Set(deleted.map((n) => n.id))
      setEdges((eds) => {
        const incoming = eds.filter((e) => deletedIds.has(e.target))
        const outgoing = eds.filter((e) => deletedIds.has(e.source))
        const rest = eds.filter((e) => !deletedIds.has(e.source) && !deletedIds.has(e.target))
        const newEdges: Edge[] = []
        const seen = new Set<string>()
        for (const inc of incoming) {
          for (const out of outgoing) {
            const key = `${inc.source}->${out.target}`
            if (inc.source !== out.target && !seen.has(key)) {
              seen.add(key)
              newEdges.push({ id: genNumber('e'), source: inc.source, target: out.target, type: 'clickable' })
            }
          }
        }
        return [...rest, ...newEdges]
      })
      if (selectedId && deletedIds.has(selectedId)) setSelectedId(null)
    },
    [setEdges, selectedId],
  )

  // 保存
  const handleSave = async () => {
    setSaving(true)
    try {
      const allNodes = getNodes()
      const allEdges = getEdges()

      // 存坐标到 localStorage
      const posMap: Record<string, { x: number; y: number }> = {}
      allNodes.forEach((n) => {
        posMap[n.id] = n.position
      })
      localStorage.setItem(`flowPos:${flowId}`, JSON.stringify(posMap))

      // 序列化为 SaveDesignRequest
      const reqNodes = allNodes.map((n, i) => {
        const d = n.data as ApprovalNodeData
        return {
          number: n.id,
          name: d.name,
          node_type: d.nodeType,
          execute_timing: d.executeTiming || '',
          sort: i + 1,
        }
      })

      const reqApprovers = allNodes
        .filter((n) => (n.data as ApprovalNodeData).nodeType === 'APPROVER')
        .map((n) => {
          const cfg = ((n.data as ApprovalNodeData).approverConfig ?? {}) as Record<string, unknown>
          return {
            node_number: n.id,
            approval_type: (cfg.approval_type as string) || 'AUTO_PASS',
            multi_approver_mode: (cfg.multi_approver_mode as string) || 'ANY',
            empty_approver_action: (cfg.empty_approver_action as string) || 'AUTO_PASS',
            fallback_approver: cfg.fallback_approver as number | undefined,
            same_submitter_action: (cfg.same_submitter_action as string) || 'SKIP',
            approver_type: (cfg.approver_type as string) || 'MEMBER',
            approver_direction: (cfg.approver_direction as string) || '',
            cc_type: (cfg.cc_type as string) || '',
            cc_list: (cfg.cc_list as string) || '',
            approver_list: (cfg.approver_list as string) || '[]',
          }
        })

      const reqConditions = allNodes
        .filter((n) => (n.data as ApprovalNodeData).nodeType === 'CONDITION')
        .map((n) => ({
          node_number: n.id,
          condition_config: ((n.data as ApprovalNodeData).conditionConfig) || '{"logic":"AND","conditions":[]}',
        }))

      const reqLinks = allEdges.map((e, i) => ({
        from_node_number: e.source,
        to_node_number: e.target,
        sort: i + 1,
      }))

      const payload: SaveDesignRequest = {
        nodes: reqNodes,
        approvers: reqApprovers,
        conditions: reqConditions,
        links: reqLinks,
      }

      await saveApprovalFlowDesign(flowId, payload)
      message.success('流程设计已保存(新建版本)')
    } finally {
      setSaving(false)
    }
  }

  // 节点属性变更(从右栏回写)
  const handleNodeDataChange = useCallback(
    (nodeId: string, data: Partial<ApprovalNodeData>) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n)),
      )
    },
    [setNodes],
  )

  const selectedNode = useMemo(
    () => (nodes.find((n) => n.id === selectedId) as Node<ApprovalNodeData>) ?? null,
    [nodes, selectedId],
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* 顶栏 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 16px',
          borderBottom: '1px solid #f0f0f0',
          background: '#fff',
        }}
      >
        <Space>
          <strong>{detail?.name || '流程设计'}</strong>
          <span style={{ color: '#999', fontSize: 12 }}>
            点击连线上的 + 插入节点;点击节点编辑属性
          </span>
        </Space>
        <Space>
          <Button onClick={onClose}>关闭</Button>
          <Button type="primary" loading={saving} onClick={handleSave}>
            保存设计
          </Button>
        </Space>
      </div>

      <div style={{ flex: 1, display: 'flex', position: 'relative', minHeight: 0 }}>
        {loading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Spin />
          </div>
        ) : (
          <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodesDelete={onNodesDelete}
              onNodeClick={(_, n) => setSelectedId(n.id)}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              defaultEdgeOptions={{ type: 'clickable' }}
              fitView
              deleteKeyCode={['Backspace', 'Delete']}
              style={{ background: '#fafafa' }}
            >
              <Background />
              <Controls />
              <MiniMap />
            </ReactFlow>
          </div>
        )}

        {/* 右侧节点属性面板(浮动) */}
        {selectedNode && (
          <NodeConfigPanel
            node={selectedNode}
            formType={detail?.form_type}
            formKey={detail?.form_key || undefined}
            onChange={(data) => handleNodeDataChange(selectedNode.id, data)}
          />
        )}
      </div>
    </div>
  )
}

export default function Designer(props: DesignerProps) {
  return (
    <ReactFlowProvider>
      <DesignerInner {...props} />
    </ReactFlowProvider>
  )
}
