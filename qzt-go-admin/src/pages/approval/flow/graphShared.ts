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

// ── 保存前图形校验(与后端 ValidateDesignGraph 同规则) ──
// 规则:恰好 1 个开始/≥1 个结束;结束无出边;条件节点必须配满规则且恰好 1 条出边;
// 分叉(出边≥2)必须由条件节点驱动,非条件目标至多 1 条(兜底分支)。
export function validateDesignGraph(nodes: Node[], edges: Edge[]): string | null {
  if (nodes.length === 0) return '流程设计为空'
  const starts = nodes.filter((n) => (n.data as ApprovalNodeData).nodeType === 'START')
  if (starts.length !== 1) return `流程必须恰好有 1 个开始节点,当前 ${starts.length} 个`
  if (!nodes.some((n) => (n.data as ApprovalNodeData).nodeType === 'END')) return '流程缺少结束节点'

  const byId = new Map(nodes.map((n) => [n.id, n]))
  const outs = new Map<string, Edge[]>()
  for (const e of edges) {
    if (!byId.has(e.source)) return `连线引用了不存在的节点:${e.source}`
    if (!byId.has(e.target)) return `连线引用了不存在的节点:${e.target}`
    const list = outs.get(e.source) ?? []
    list.push(e)
    outs.set(e.source, list)
  }

  for (const n of nodes) {
    const d = n.data as ApprovalNodeData
    const nodeOuts = outs.get(n.id) ?? []

    if (d.nodeType === 'END' && nodeOuts.length > 0) return `结束节点「${d.name}」不允许有出边`

    if (d.nodeType === 'CONDITION') {
      if (nodeOuts.length !== 1)
        return `条件节点「${d.name}」必须恰好连出 1 条线(一个条件只指向一个分支),当前 ${nodeOuts.length} 条`
      let rules: { field?: string; op?: string; value?: string }[] = []
      try {
        const cfg = d.conditionConfig ? JSON.parse(d.conditionConfig) : null
        rules = cfg?.conditions ?? []
      } catch {
        return `条件节点「${d.name}」的规则配置无法解析,请重新配置`
      }
      if (rules.length === 0) return `条件节点「${d.name}」未配置任何条件规则,请选中节点在右侧添加`
      for (let i = 0; i < rules.length; i++) {
        const r = rules[i]
        if (!r.field) return `条件节点「${d.name}」第 ${i + 1} 条规则未选择字段`
        if (!r.op) return `条件节点「${d.name}」第 ${i + 1} 条规则未选择比较方式`
        if (r.value === undefined || r.value === null || String(r.value).trim() === '')
          return `条件节点「${d.name}」第 ${i + 1} 条规则未填写比较值`
      }
    }

    if (nodeOuts.length >= 2 && d.nodeType !== 'CONDITION') {
      let condTargets = 0
      let plainTargets = 0
      for (const e of nodeOuts) {
        if ((byId.get(e.target)?.data as ApprovalNodeData)?.nodeType === 'CONDITION') condTargets++
        else plainTargets++
      }
      if (condTargets === 0)
        return `节点「${d.name}」分出 ${nodeOuts.length} 条线但没有条件分支——普通节点分叉必须由条件节点决定走向,请把分支改为条件节点`
      if (plainTargets > 1)
        return `节点「${d.name}」的分叉中非条件分支有 ${plainTargets} 条,至多 1 条(作为兜底),否则无法判断走哪条`
    }
  }
  return null
}
