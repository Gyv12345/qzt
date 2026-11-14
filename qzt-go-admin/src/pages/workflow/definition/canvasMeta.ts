// canvasMeta.ts 工作流画布的节点元数据/序列化/布局/校验(P27)。
import dagre from 'dagre'
import type { Edge, Node } from '@xyflow/react'

// WFEdge 带分支标记的边。
export type WFEdge = Edge & { when?: string }

// ── 节点类型 ──
export type WFNodeType = 'TRIGGER' | 'ACTION' | 'CONDITION'

// 节点携带的数据。
export interface WFNodeData extends Record<string, unknown> {
  number: string
  name: string
  nodeType: WFNodeType
  config: Record<string, unknown>
}

// ── 动作目录(与后端 ActionCatalog 对齐;config 默认模板) ──
export interface ActionMeta {
  action: string
  label: string
  desc: string
  defaultConfig: Record<string, unknown>
}

export const ACTION_OPTIONS: ActionMeta[] = [
  {
    action: 'notify',
    label: '发送通知',
    desc: '站内信+SSE+企微/服务号全通道',
    defaultConfig: { action: 'notify', receiver: '{{payload.owner_id}}', title: '', content: '', path: '' },
  },
  {
    action: 'field_update',
    label: '更新字段',
    desc: '按白名单更新业务表字段',
    defaultConfig: { action: 'field_update', table: 'crm_lead', where_field: 'id', where_value: '{{payload.lead_id}}', field: 'status', value: '' },
  },
  {
    action: 'http',
    label: 'HTTP 请求',
    desc: '出站调用,支持可选 HMAC 签名',
    defaultConfig: { action: 'http', url: '', method: 'POST', headers: {}, body: {}, sign_secret: '' },
  },
  {
    action: 'llm',
    label: 'AI 生成',
    desc: '调内部 LLM 网关生成文本',
    defaultConfig: { action: 'llm', prompt: '', max_tokens: 500 },
  },
]

// 触发器类型与事件/动作的展示辅助。
export const TRIGGER_LABELS: Record<string, string> = {
  MANUAL: '手动触发',
  CRON: '定时触发',
  EVENT: '事件触发',
}

// graphToRF:后端 graph JSON 字符串 → ReactFlow nodes/edges(坐标 dagre 自动布局)。
export function graphToRF(graphJSON: string): { nodes: Node<WFNodeData>[]; edges: Edge[] } {
  const empty = { nodes: [] as Node<WFNodeData>[], edges: [] as Edge[] }
  if (!graphJSON) return empty
  try {
    const g = JSON.parse(graphJSON) as {
      nodes: { number: string; name: string; node_type: string; config: Record<string, unknown> }[]
      links: { from: string; to: string; sort: number; when?: string }[]
    }
    const rfNodes = (g.nodes ?? []).map((n) => ({
      id: n.number,
      type: n.node_type.toLowerCase(),
      position: { x: 0, y: 0 },
      data: { number: n.number, name: n.name, nodeType: n.node_type, config: n.config ?? {} } as WFNodeData,
    }))
    const rfEdges = (g.links ?? []).map((l, i) => ({
      id: `e_${l.from}_${l.to}_${i}`,
      source: l.from,
      target: l.to,
      sort: l.sort,
      when: l.when ?? '',
    }))
    return { nodes: layoutNodes(rfNodes, rfEdges), edges: rfEdges }
  } catch {
    return empty
  }
}

// rfToGraph:ReactFlow nodes/edges → 后端 graph JSON 对象。
export function rfToGraph(
  nodes: Node<WFNodeData>[],
  edges: Edge[],
): { nodes: unknown[]; links: unknown[] } {
  const links = edges.map((e, i) => {
    const src = nodes.find((n) => n.id === e.source)
    const when = src?.data.nodeType === 'CONDITION' && typeof (e as { when?: string }).when === 'string'
      ? (e as { when?: string }).when
      : ''
    return { from: e.source, to: e.target, sort: i, when }
  })
  return {
    nodes: nodes.map((n) => ({
      number: n.data.number,
      name: n.data.name,
      node_type: n.data.nodeType,
      config: n.data.config,
    })),
    links,
  }
}

// layoutNodes dagre 竖向自动布局。
export function layoutNodes(nodes: Node<WFNodeData>[], edges: Edge[]): Node<WFNodeData>[] {
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: 'TB', nodesep: 70, ranksep: 90 })
  nodes.forEach((n) => g.setNode(n.id, { width: 180, height: 56 }))
  edges.forEach((e) => g.setEdge(e.source, e.target))
  dagre.layout(g)
  return nodes.map((n) => {
    const pos = g.node(n.id)
    return { ...n, position: { x: pos.x - 90, y: pos.y - 28 } }
  })
}

// genNumber 生成节点编号。
let nodeSeq = 0
export function genNumber(prefix: string): string {
  nodeSeq++
  return `${prefix}_${Date.now()}_${nodeSeq}`
}

// validateWF 保存前校验(镜像后端 ValidateGraph 规则)。
// 返回错误文案,null=通过。
export function validateWF(
  nodes: Node<WFNodeData>[],
  edges: Edge[],
): string | null {
  if (nodes.length === 0) return '画布为空'
  const triggers = nodes.filter((n) => n.data.nodeType === 'TRIGGER')
  if (triggers.length !== 1) return 'TRIGGER 节点必须恰好 1 个'
  const triggers2 = nodes.filter((n) => n.data.nodeType === 'ACTION' && !(n.data.config as { action?: string }).action)
  if (triggers2.length > 0) return '存在未配置动作类型的 ACTION 节点'
  const outOf = (id: string) => edges.filter((e) => e.source === id)
  for (const n of nodes) {
    const outs = outOf(n.id)
    if (n.data.nodeType === 'TRIGGER' && nodes.length > 1 && outs.length !== 1) return 'TRIGGER 出边必须为 1'
    if (n.data.nodeType === 'ACTION' && outs.length > 1) return 'ACTION 出边必须 ≤1'
    if (n.data.nodeType === 'CONDITION') {
      if (outs.length < 2) return 'CONDITION 至少 2 条出边(含兜底)'
      const withWhen = outs.filter((e) => (e as { when?: string }).when)
      if (withWhen.length !== outs.length - 1) return 'CONDITION 出边必须有恰好一条兜底边'
    }
  }
  // 连线完整性
  const ids = new Set(nodes.map((n) => n.id))
  for (const e of edges) {
    if (!ids.has(e.source) || !ids.has(e.target)) return '存在指向不存在节点的连线'
  }
  return null
}
