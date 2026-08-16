import type { Node, Edge } from '@xyflow/react'
import dagre from 'dagre'

// ── 节点类型样式 ──
export const NODE_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  START: { bg: '#52c41a', color: '#fff', label: '开始' },
  APPROVER: { bg: '#1890ff', color: '#fff', label: '审批' },
  CONDITION: { bg: '#faad14', color: '#fff', label: '条件' },
  DEFAULT: { bg: '#8c8c8c', color: '#fff', label: '默认' },
  END: { bg: '#ff4d4f', color: '#fff', label: '结束' },
}

/** 节点 data 类型 */
export interface ApprovalNodeData {
  name: string
  nodeType: string
  executeTiming?: string
  approverConfig?: Record<string, unknown>
  conditionConfig?: string
  [key: string]: unknown
}

// ── dagre 自动布局 ──
export function layoutNodes(nodes: Node[], edges: Edge[], direction = 'LR'): Node[] {
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
export function genNumber(prefix: string): string {
  nodeSeq++
  return `${prefix}_${Date.now()}_${nodeSeq}`
}
