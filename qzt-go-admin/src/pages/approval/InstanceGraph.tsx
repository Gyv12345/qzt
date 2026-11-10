import { useMemo } from 'react'
import { Background, Controls, Handle, Position, ReactFlow } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import type { Edge, Node, NodeProps } from '@xyflow/react'
import { Tag, Tooltip, Typography } from 'antd'
import { NODE_STYLE, layoutNodes } from './flow/graphShared'
import type { ApprovalInstanceGraph } from '../../types/approval'

// InstanceGraph.tsx 审批实例流程轨迹图(只读)。
// 按实例绑定的流程版本渲染节点图,已走节点(绿)/当前节点(蓝,呼吸动画)描边高亮;
// 连线上「当前进入」的边加流动动画。数据来自 GET /approval/instances/:id/graph。

/** 节点轨迹状态 */
type NodeState = 'visited' | 'current' | 'future'

/** 节点 data */
interface GraphNodeData {
  name: string
  nodeType: string
  approverText: string
  state: NodeState
  [key: string]: unknown
}

/** 状态描边 */
const STATE_STYLE: Record<NodeState, { border: string; boxShadow: string }> = {
  visited: { border: '2px solid #52c41a', boxShadow: '0 0 0 2px rgba(82, 196, 26, 0.25)' },
  current: { border: '2px solid #1677ff', boxShadow: '0 0 0 3px rgba(22, 119, 255, 0.3)' },
  future: { border: '2px solid transparent', boxShadow: '0 2px 6px rgba(0,0,0,0.15)' },
}

/** 只读节点(按轨迹状态描边,审批中节点带呼吸动画) */
function InstanceNode({ data }: NodeProps<Node<GraphNodeData>>) {
  const style = NODE_STYLE[data.nodeType] ?? NODE_STYLE.DEFAULT
  const s = STATE_STYLE[data.state]
  return (
    <div
      style={{
        position: 'relative',
        background: style.bg,
        color: style.color,
        padding: '8px 14px',
        borderRadius: 8,
        minWidth: 110,
        maxWidth: 180,
        textAlign: 'center',
        fontSize: 12,
        fontWeight: 500,
        ...s,
        animation: data.state === 'current' ? 'approvalCurrentPulse 1.6s ease-in-out infinite' : undefined,
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: '#fff' }} />
      <div style={{ fontSize: 10, opacity: 0.85 }}>{style.label}</div>
      <div>{data.name}</div>
      {data.approverText && (
        <div style={{ fontSize: 10, fontWeight: 400, opacity: 0.9, marginTop: 2 }}>
          <Tooltip title={data.approverText}>{data.approverText}</Tooltip>
        </div>
      )}
      <Handle type="source" position={Position.Bottom} style={{ background: '#fff' }} />
    </div>
  )
}

const nodeTypes = { instance: InstanceNode }

/** 只读轨迹图 */
export default function InstanceGraph({ graph }: { graph: ApprovalInstanceGraph }) {
  const { nodes, edges } = useMemo(() => {
    const visited = new Set(graph.visited_node_ids ?? [])
    const currentId = graph.current_node_id != null ? String(graph.current_node_id) : null

    const flowNodes: Node<GraphNodeData>[] = (graph.nodes ?? []).map((n) => {
      const id = String(n.id)
      const state: NodeState = currentId === id ? 'current' : visited.has(n.id) ? 'visited' : 'future'
      return {
        id,
        type: 'instance' as const,
        position: { x: 0, y: 0 }, // 占位,layoutNodes 会重算
        data: {
          name: n.name,
          nodeType: n.node_type,
          approverText: n.approver_text,
          state,
        },
      }
    })
    const flowEdges: Edge[] = (graph.links ?? []).map((l) => ({
      id: `e${l.id}`,
      source: String(l.from_node_id),
      target: String(l.to_node_id),
      // 进入当前节点的边加流动动画,直观看到"走到哪了"
      animated: graph.current_node_id != null && l.to_node_id === graph.current_node_id,
    }))
    return { nodes: layoutNodes(flowNodes, flowEdges), edges: flowEdges }
  }, [graph])

  if (!graph.nodes?.length) {
    return <Typography.Text type="secondary">该实例暂无流程图数据(可能为旧版本流程)</Typography.Text>
  }

  return (
    <>
      <style>{`
        @keyframes approvalCurrentPulse {
          0%, 100% { box-shadow: 0 0 0 3px rgba(22, 119, 255, 0.3); }
          50% { box-shadow: 0 0 0 6px rgba(22, 119, 255, 0.15); }
        }
      `}</style>
      <div style={{ height: 300 }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          minZoom={0.4}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          proOptions={{ hideAttribution: true }}
        >
          <Background />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
      <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
        <Tag color="green">已走节点</Tag>
        <Tag color="blue">当前节点</Tag>
        <Tag>未走节点</Tag>
      </div>
    </>
  )
}
