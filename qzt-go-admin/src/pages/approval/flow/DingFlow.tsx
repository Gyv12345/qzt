import { Fragment, useEffect, useMemo, useState, type ComponentType, type ReactNode } from 'react'
import {
  App,
  Button,
  DatePicker,
  Drawer,
  Dropdown,
  Input,
  InputNumber,
  Popconfirm,
  Select,
  Space,
  Spin,
  Tag,
} from 'antd'
import {
  ApartmentOutlined,
  BranchesOutlined,
  CloseOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  StopOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import type { Edge, Node } from '@xyflow/react'
import UserSelect from '../../../components/UserSelect'
import { getApprovalFlow, getFormFields, saveApprovalFlowDesign } from '../../../services/approval'
import type { ApprovalFlowDetail, FormField, FormFieldType, SaveDesignRequest } from '../../../types/approval'
import { genNumber, validateDesignGraph, type ApprovalNodeData } from './graphShared'

// ─────────────────────────────────────────────────────────────────────────────
// DingFlow 钉钉式卡片流设计器(与画布模式 Designer.tsx 双模并存)。
//
// 图模型与后端 design_validate.go 严格对齐:
//   - 节点类型只有 START / APPROVER / CONDITION / END(后端无 DEFAULT 节点,
//     NodeTypeDefault 常量在运行时从未使用);
//   - 「条件分支」= 分叉点 P(START 或 APPROVER)的多条出边:
//       · 条件列:出边 P→C(C 为 CONDITION 节点,C 恰好 1 条出边进入分支链);
//       · 默认列(兜底):P 的 1 条非 CONDITION 出边(运行时 getNextNode 的 fallback);
//   - 分叉点出边 ≥2 时必须有 ≥1 个 CONDITION 目标,非 CONDITION 目标 ≤1 个;
//   - 每个 CONDITION 节点保存前必须配好非空规则(字段/操作符/值齐全)。
// 所有图操作直接在 nodes/links 平面数组上进行,渲染树由 useMemo 从图构建。
// ─────────────────────────────────────────────────────────────────────────────

type DingNodeType = 'START' | 'APPROVER' | 'CONDITION' | 'END'

/** 节点(前端标识 id = 后端 number) */
interface DingNode {
  id: string
  name: string
  nodeType: DingNodeType
  /** START 节点的触发时机 */
  executeTiming?: string
  /** APPROVER 节点审批人配置(键与后端 ApproversDesign 对齐) */
  approverConfig?: Record<string, unknown>
  /** CONDITION 节点规则 JSON:{"logic":"AND","conditions":[{field,op,value}]} */
  conditionConfig?: string
}

/** 连线(平面边) */
interface DingLink {
  from: string
  to: string
}

interface DingGraph {
  nodes: DingNode[]
  links: DingLink[]
}

// ── 渲染树视图模型 ──

/** 分支列:分叉点的一条出边(条件列或默认列)+ 列内子链 */
interface BranchCol {
  /** 该列对应 links 数组中的边下标 */
  edgeIdx: number
  kind: 'condition' | 'default'
  /** 条件列的 CONDITION 节点 id */
  condId?: string
  /** 列内第一个链节点 id(空串=空链,直连汇合点) */
  headId: string
  /** 列内子链(不含列头卡,到汇合点为止) */
  items: FlowItem[]
}

type FlowItem =
  | { kind: 'node'; node: DingNode }
  | { kind: 'branch'; forkId: string; joinId: string; cols: BranchCol[] }

// ── 图上下文(只读查询) ──

interface GraphCtx {
  nodeMap: Map<string, DingNode>
  /** from → [{to, 边下标}] */
  outs: Map<string, { to: string; idx: number }[]>
  /** 节点是否 CONDITION */
  isCond: (id: string) => boolean
  /** 分叉点的汇合点 id(各分支链首次共同到达的节点) */
  joinOfFork: (forkId: string) => string
  /** 从某节点出发沿链收集节点序列(嵌套分叉处跳到其汇合点继续) */
  branchSeq: (entry: string) => string[]
  /** 从 entry 开始收集链上渲染项,到 stopAt(不含)或链尾为止 */
  chainItems: (entry: string, stopAt: string | null) => FlowItem[]
}

function buildCtx(nodes: DingNode[], links: DingLink[]): GraphCtx {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]))
  const outs = new Map<string, { to: string; idx: number }[]>()
  links.forEach((l, idx) => {
    const arr = outs.get(l.from) ?? []
    arr.push({ to: l.to, idx })
    outs.set(l.from, arr)
  })
  const isCond = (id: string) => nodeMap.get(id)?.nodeType === 'CONDITION'
  const joinCache = new Map<string, string>()

  const branchSeq = (entry: string): string[] => {
    const seq: string[] = []
    let cur: string | undefined = entry
    const guard = new Set<string>()
    while (cur && !guard.has(cur)) {
      guard.add(cur)
      const n = nodeMap.get(cur)
      if (!n) break
      seq.push(cur)
      if (n.nodeType === 'END') break
      const out: { to: string; idx: number }[] = outs.get(cur) ?? []
      if (out.length >= 2 && out.some((o) => isCond(o.to))) {
        cur = joinOfFork(cur) // 嵌套分叉:跳到其汇合点继续
        continue
      }
      cur = out[0]?.to
    }
    return seq
  }

  function joinOfFork(forkId: string): string {
    const cached = joinCache.get(forkId)
    if (cached) return cached
    const outE = outs.get(forkId) ?? []
    const seqs = outE.map((e) => branchSeq(e.to))
    let join = seqs[0]?.[seqs[0].length - 1] ?? forkId
    const sets = seqs.map((s) => new Set(s))
    for (const id of seqs[0] ?? []) {
      if (sets.every((st) => st.has(id))) {
        join = id
        break
      }
    }
    joinCache.set(forkId, join)
    return join
  }

  const chainItems = (entry: string, stopAt: string | null): FlowItem[] => {
    const items: FlowItem[] = []
    let cur: string | undefined = entry
    const guard = new Set<string>()
    while (cur && !guard.has(cur)) {
      guard.add(cur)
      if (stopAt && cur === stopAt) break
      const n = nodeMap.get(cur)
      if (!n) break
      const out: { to: string; idx: number }[] = outs.get(cur) ?? []
      if (out.length >= 2 && out.some((o) => isCond(o.to))) {
        const join = joinOfFork(cur)
        items.push({ kind: 'branch', forkId: cur, joinId: join, cols: buildCols(cur, join) })
        cur = join
        continue
      }
      items.push({ kind: 'node', node: n })
      if (n.nodeType === 'END') break
      cur = out[0]?.to
    }
    return items
  }

  const buildCols = (forkId: string, joinId: string): BranchCol[] => {
    const outE = outs.get(forkId) ?? []
    return outE.map((e) => {
      const cond = isCond(e.to)
      const headId = cond ? outs.get(e.to)?.[0]?.to ?? '' : e.to
      return {
        edgeIdx: e.idx,
        kind: cond ? 'condition' : 'default',
        condId: cond ? e.to : undefined,
        headId,
        items: chainItems(headId, joinId),
      }
    })
  }

  return { nodeMap, outs, isCond, joinOfFork, branchSeq, chainItems }
}

// ── 选项与文案常量(与 NodeConfigPanel 保持一致) ──

const EXECUTE_TIMING_OPTIONS = [
  { label: '创建时(CREATE)', value: 'CREATE' },
  { label: '更新时(UPDATE)', value: 'UPDATE' },
  { label: '删除时(DELETE)', value: 'DELETE' },
]

const APPROVER_TYPE_OPTIONS = [
  { label: '指定成员(MEMBER)', value: 'MEMBER' },
  { label: '角色(ROLE)', value: 'ROLE' },
  { label: '直属上级(SUPERIOR)', value: 'SUPERIOR' },
  { label: '多级上级(MULTIPLE_SUPERIOR)', value: 'MULTIPLE_SUPERIOR' },
  { label: '部门负责人(DEPT_HEAD)', value: 'DEPT_HEAD' },
  { label: '多级部门负责人(MULTIPLE_DEPT_HEAD)', value: 'MULTIPLE_DEPT_HEAD' },
]

const MULTI_MODE_OPTIONS = [
  { label: '会签(全员同意)', value: 'ALL' },
  { label: '或签(任一同意)', value: 'ANY' },
  { label: '依次审批', value: 'SEQUENTIAL' },
]

const EMPTY_ACTION_OPTIONS = [
  { label: '自动通过(AUTO_PASS)', value: 'AUTO_PASS' },
  { label: '转交指定人(ASSIGN_SPECIFIC)', value: 'ASSIGN_SPECIFIC' },
  { label: '转交管理员(ASSIGN_ADMIN)', value: 'ASSIGN_ADMIN' },
]

const SAME_SUBMITTER_OPTIONS = [
  { label: '自动跳过(SKIP)', value: 'SKIP' },
  { label: '允许审批(ALLOW)', value: 'ALLOW' },
]

const OPS_BY_TYPE: Record<FormFieldType, { label: string; value: string }[]> = {
  number: [
    { label: '等于', value: 'EQ' },
    { label: '不等于', value: 'NE' },
    { label: '大于', value: 'GT' },
    { label: '大于等于', value: 'GTE' },
    { label: '小于', value: 'LT' },
    { label: '小于等于', value: 'LTE' },
  ],
  date: [
    { label: '等于', value: 'EQ' },
    { label: '晚于', value: 'GT' },
    { label: '早于', value: 'LT' },
  ],
  enum: [
    { label: '等于', value: 'EQ' },
    { label: '不等于', value: 'NE' },
  ],
  string: [
    { label: '等于', value: 'EQ' },
    { label: '不等于', value: 'NE' },
  ],
}

const OP_LABEL: Record<string, string> = { EQ: '=', NE: '≠', GT: '>', GTE: '≥', LT: '<', LTE: '≤' }

const APPROVER_TYPE_LABEL: Record<string, string> = {
  MEMBER: '指定成员',
  ROLE: '角色',
  SUPERIOR: '直属上级',
  MULTIPLE_SUPERIOR: '多级上级',
  DEPT_HEAD: '部门负责人',
  MULTIPLE_DEPT_HEAD: '多级部门负责人',
}

const MULTI_MODE_LABEL: Record<string, string> = { ALL: '会签', ANY: '或签', SEQUENTIAL: '依次审批' }

const TIMING_LABEL: Record<string, string> = { CREATE: '创建时', UPDATE: '更新时', DELETE: '删除时' }

const CARD_META: Record<string, { label: string; color: string; icon: ComponentType }> = {
  START: { label: '发起人', color: '#52c41a', icon: UserOutlined },
  APPROVER: { label: '审批', color: '#1890ff', icon: TeamOutlined },
  CONDITION: { label: '条件', color: '#faad14', icon: ApartmentOutlined },
  END: { label: '结束', color: '#ff4d4f', icon: StopOutlined },
}

// ── 条件配置解析/序列化 ──

interface ConditionItem {
  field: string
  op: string
  value: string
}

interface ConditionConfig {
  logic: 'AND' | 'OR'
  conditions: ConditionItem[]
}

function parseCondition(json?: string): ConditionConfig {
  if (!json) return { logic: 'AND', conditions: [] }
  try {
    const obj: unknown = JSON.parse(json)
    if (Array.isArray(obj)) return { logic: 'AND', conditions: obj as ConditionItem[] }
    const o = obj as Partial<ConditionConfig>
    return { logic: o.logic === 'OR' ? 'OR' : 'AND', conditions: o.conditions ?? [] }
  } catch {
    return { logic: 'AND', conditions: [] }
  }
}

/** "[1,2]" → [1,2];解析失败返回空数组 */
function parseIds(json?: unknown): number[] {
  if (typeof json !== 'string' || !json) return []
  try {
    const arr: unknown = JSON.parse(json)
    return Array.isArray(arr) ? arr.map(Number).filter((n) => Number.isInteger(n)) : []
  } catch {
    return []
  }
}

function approverSummary(n: DingNode): string {
  const cfg = n.approverConfig ?? {}
  const t = (cfg.approver_type as string) || 'MEMBER'
  let s = APPROVER_TYPE_LABEL[t] ?? t
  if (t === 'MEMBER') {
    const ids = parseIds(cfg.approver_list)
    s += ids.length ? `(${ids.length} 人)` : '(未选择)'
  }
  const mode = (cfg.multi_approver_mode as string) || 'ANY'
  s += ` · ${MULTI_MODE_LABEL[mode] ?? mode}`
  const ccIds = parseIds(cfg.cc_list)
  if (ccIds.length > 0) s += ` · 抄送 ${ccIds.length} 人`
  return s
}

function conditionSummary(n: DingNode, fields: FormField[]): string {
  const cfg = parseCondition(n.conditionConfig)
  if (cfg.conditions.length === 0) return '未设置条件'
  const label = (key: string) => fields.find((f) => f.key === key)?.label ?? key
  const joiner = cfg.logic === 'OR' ? ' 或 ' : ' 且 '
  return cfg.conditions
    .map((c) => `${label(c.field)} ${OP_LABEL[c.op] ?? c.op} ${c.value}`)
    .join(joiner)
}

/** 新建审批节点(默认配置与画布模式 Designer 的序列化兜底一致,不配置也可保存) */
function makeApproverNode(): DingNode {
  return {
    id: genNumber('n'),
    name: '审批',
    nodeType: 'APPROVER',
    approverConfig: {
      approval_type: 'AUTO_PASS',
      multi_approver_mode: 'ANY',
      empty_approver_action: 'AUTO_PASS',
      same_submitter_action: 'SKIP',
      approver_type: 'MEMBER',
      approver_direction: '',
      cc_type: '',
      cc_list: '[]',
      approver_list: '[]',
    },
  }
}

function makeConditionNode(name = '条件分支'): DingNode {
  return {
    id: genNumber('n'),
    name,
    nodeType: 'CONDITION',
    conditionConfig: '{"logic":"AND","conditions":[]}',
  }
}

// ── 组件内样式(卡片流布局,连接线用伪元素/border 画) ──

const DING_CSS = `
.ding-flow-wrap { width: max-content; min-width: 100%; margin: 0 auto; display: flex; flex-direction: column; align-items: center; padding: 28px 48px 64px; }
.ding-conn { position: relative; width: 2px; min-height: 44px; background: #d9d9d9; flex: none; }
.ding-conn-short { min-height: 16px; height: 16px; }
.ding-conn-btn { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); }
.ding-branch { position: relative; display: flex; align-items: stretch; gap: 16px; padding: 20px 12px; }
.ding-branch::before, .ding-branch::after { content: ''; position: absolute; left: 12px; right: 12px; height: 2px; background: #d9d9d9; }
.ding-branch::before { top: 0; }
.ding-branch::after { bottom: 0; }
.ding-col { position: relative; display: flex; flex-direction: column; align-items: center; min-width: 252px; border: 1px solid #e8e8e8; border-radius: 8px; background: #fff; padding: 12px; }
.ding-col::before, .ding-col::after { content: ''; position: absolute; left: 50%; width: 2px; height: 20px; background: #d9d9d9; }
.ding-col::before { top: -20px; }
.ding-col::after { bottom: -20px; }
.ding-col-bar { display: flex; align-items: center; justify-content: space-between; width: 100%; margin-bottom: 8px; min-height: 24px; }
.ding-col-tools { display: flex; align-items: center; }
.ding-card { position: relative; width: 228px; box-sizing: border-box; background: #fff; border: 1px solid #e8e8e8; border-left: 3px solid #1890ff; border-radius: 8px; padding: 10px 12px; cursor: pointer; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04); text-align: left; }
.ding-card-muted { background: #fafafa; border-left: 3px solid #8c8c8c; color: #555; }
.ding-card-head { display: flex; align-items: center; gap: 6px; }
.ding-card-icon { width: 20px; height: 20px; border-radius: 4px; color: #fff; font-size: 12px; display: inline-flex; align-items: center; justify-content: center; flex: none; }
.ding-card-badge { font-size: 12px; font-weight: 600; flex: none; }
.ding-card-title { font-size: 13px; font-weight: 500; color: #333; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ding-card-summary { margin-top: 6px; font-size: 12px; color: #999; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ding-card-actions { position: absolute; top: 4px; right: 4px; display: flex; visibility: hidden; background: #fff; border-radius: 4px; }
.ding-card:hover .ding-card-actions { visibility: visible; }
`

// ── 主组件 ──

interface DingFlowProps {
  flowId: number
  onClose: () => void
}

export default function DingFlow({ flowId, onClose }: DingFlowProps) {
  const { message } = App.useApp()
  const [graph, setGraph] = useState<DingGraph>({ nodes: [], links: [] })
  const [detail, setDetail] = useState<ApprovalFlowDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  // ── 加载流程设计(反序列化,与 Designer 同构) ──
  useEffect(() => {
    let alive = true
    setLoading(true)
    getApprovalFlow(flowId)
      .then((res) => {
        if (!alive) return
        setDetail(res)
        const rawNodes = res.nodes ?? []
        const rawLinks = res.links ?? []
        if (rawNodes.length === 0) {
          // 空流程:初始化 START → END 最小图
          setGraph({
            nodes: [
              { id: 'start', name: '发起人', nodeType: 'START', executeTiming: 'CREATE' },
              { id: 'end', name: '结束', nodeType: 'END' },
            ],
            links: [{ from: 'start', to: 'end' }],
          })
          return
        }
        const rawApprovers = res.approvers ?? []
        const rawConds = (res.conditions ?? []) as { node_id?: number; condition_config?: string }[]
        const approverMap = new Map(rawApprovers.map((a) => [String(a.id), a]))
        const condMap = new Map(rawConds.map((c) => [String(c.node_id ?? ''), c.condition_config]))
        const numById = new Map(rawNodes.map((n) => [n.id, n.number || String(n.id)]))
        const nodes: DingNode[] = rawNodes.map((n) => {
          const idStr = n.number || String(n.id)
          const appr = n.node_type === 'APPROVER' ? approverMap.get(String(n.id)) : undefined
          const cond = n.node_type === 'CONDITION' ? condMap.get(String(n.id)) : undefined
          return {
            id: idStr,
            name: n.name,
            nodeType: n.node_type as DingNodeType,
            executeTiming: n.execute_timing,
            approverConfig: appr ? (appr as unknown as Record<string, unknown>) : undefined,
            conditionConfig: cond,
          }
        })
        const links: DingLink[] = rawLinks.map((l) => ({
          from: numById.get(l.from_node_id) ?? String(l.from_node_id),
          to: numById.get(l.to_node_id) ?? String(l.to_node_id),
        }))
        setGraph({ nodes, links })
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flowId])

  // ── 渲染树(useMemo 从平面图构建) ──
  const view = useMemo(() => {
    const start = graph.nodes.find((n) => n.nodeType === 'START')
    if (!start) return null
    const ctx = buildCtx(graph.nodes, graph.links)
    return { ctx, items: ctx.chainItems(start.id, null) }
  }, [graph])

  // 条件字段元数据(卡片摘要与配置抽屉共用,流程加载后取一次)
  const [fields, setFields] = useState<FormField[]>([])
  useEffect(() => {
    if (!detail?.form_type) return
    getFormFields(detail.form_type, detail.form_key || undefined)
      .then((res) => setFields(res.fields ?? []))
      .catch(() => setFields([]))
  }, [detail])

  const editingNode = useMemo(
    () => graph.nodes.find((n) => n.id === editingId) ?? null,
    [graph, editingId],
  )

  // ── 节点/配置更新 ──
  const updateNode = (id: string, patch: Partial<DingNode>) => {
    setGraph((g) => ({
      ...g,
      nodes: g.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)),
    }))
  }

  const updateApproverField = (id: string, field: string, value: unknown) => {
    setGraph((g) => ({
      ...g,
      nodes: g.nodes.map((n) =>
        n.id === id
          ? { ...n, approverConfig: { ...(n.approverConfig ?? {}), [field]: value } }
          : n,
      ),
    }))
  }

  const patchEditing = (patch: Partial<DingNode>) => {
    if (editingId) updateNode(editingId, patch)
  }
  const patchEditingApprover = (field: string, value: unknown) => {
    if (editingId) updateApproverField(editingId, field, value)
  }

  // ── 图操作 ──

  /** 在 from→to 边之间插入节点(A→B 变 A→N、N→B) */
  const insertNode = (from: string, to: string) => {
    const idx = graph.links.findIndex((l) => l.from === from && l.to === to)
    if (idx < 0) return
    const nn = makeApproverNode()
    const links = [...graph.links]
    links.splice(idx, 1, { from, to: nn.id }, { from: nn.id, to })
    setGraph({ nodes: [...graph.nodes, nn], links })
    setEditingId(nn.id)
  }

  /** 在 from→to 边之间插入条件分支容器:条件列(空规则待配置)+ 默认列(兜底) */
  const insertContainer = (from: string, to: string) => {
    const idx = graph.links.findIndex((l) => l.from === from && l.to === to)
    if (idx < 0) return
    const cn = makeConditionNode()
    const links = [...graph.links]
    // 顺序即优先级:条件边在前,默认(兜底)边在后
    links.splice(idx, 1, { from, to: cn.id }, { from: cn.id, to }, { from, to })
    setGraph({ nodes: [...graph.nodes, cn], links })
    setEditingId(cn.id)
  }

  /** 给分叉点加一条分支(条件分支插到默认列之前,保持默认列兜底语义) */
  const addBranch = (forkId: string, mode: 'condition' | 'default') => {
    const isNonCondTarget = (x: string) =>
      graph.nodes.find((n) => n.id === x)?.nodeType !== 'CONDITION'
    const target = joinTarget(graph, forkId)
    const links = [...graph.links]
    if (mode === 'default') {
      const hasDefault = graph.links.some((l) => l.from === forkId && isNonCondTarget(l.to))
      if (hasDefault) return
      let insertAt = links.length
      for (let i = links.length - 1; i >= 0; i--) {
        if (links[i].from === forkId) {
          insertAt = i + 1
          break
        }
      }
      links.splice(insertAt, 0, { from: forkId, to: target })
      setGraph({ nodes: graph.nodes, links })
      return
    }
    const cn = makeConditionNode()
    const defIdx = graph.links.findIndex((l) => l.from === forkId && isNonCondTarget(l.to))
    const at = defIdx >= 0 ? defIdx : links.length
    links.splice(at, 0, { from: forkId, to: cn.id }, { from: cn.id, to: target })
    setGraph({ nodes: [...graph.nodes, cn], links })
    setEditingId(cn.id)
  }

  /** 分叉点的汇合点;退化(找不到)时回落到 END */
  const joinTarget = (g: DingGraph, forkId: string): string => {
    const join = buildCtx(g.nodes, g.links).joinOfFork(forkId)
    if (join && join !== forkId) return join
    const endNode = g.nodes.find((n) => n.nodeType === 'END')
    return endNode?.id ?? join
  }

  /** 删除分支(删该出边整链:从列头到汇合点之前的全部节点) */
  const deleteBranch = (forkId: string, col: BranchCol) => {
    setGraph((g) => {
      const ctx = buildCtx(g.nodes, g.links)
      const forkEdges = ctx.outs.get(forkId) ?? []
      if (forkEdges.length <= 1) return g
      const edge = g.links[col.edgeIdx]
      const target = col.condId ?? edge?.to
      if (!target) return g
      const join = ctx.joinOfFork(forkId)
      const doomed = new Set<string>()
      const stack = [target]
      while (stack.length > 0) {
        const id = stack.pop()
        if (id === undefined || id === join || doomed.has(id)) continue
        doomed.add(id)
        for (const o of ctx.outs.get(id) ?? []) stack.push(o.to)
      }
      return {
        nodes: g.nodes.filter((n) => !doomed.has(n.id)),
        links: g.links.filter((l) => !doomed.has(l.from) && !doomed.has(l.to)),
      }
    })
  }

  /** 删除链上节点:删 N 及其入边出边并重连 prev→next(链头/链中/链尾统一处理) */
  const deleteNode = (id: string) => {
    const node = graph.nodes.find((n) => n.id === id)
    if (!node) return
    const ins = graph.links.filter((l) => l.to === id)
    const outsL = graph.links.filter((l) => l.from === id)
    const isCondTarget = (x: string) =>
      graph.nodes.find((n) => n.id === x)?.nodeType === 'CONDITION'
    if (outsL.length >= 2 && outsL.some((l) => isCondTarget(l.to))) {
      message.warning('该节点下已挂条件分支,请先删除分支再删除节点')
      return
    }
    const rest = graph.links.filter((l) => l.from !== id && l.to !== id)
    const added: DingLink[] = []
    const seen = new Set<string>()
    for (const i of ins) {
      for (const o of outsL) {
        if (i.from === o.to) continue
        const key = `${i.from}->${o.to}`
        if (!seen.has(key)) {
          seen.add(key)
          added.push({ from: i.from, to: o.to })
        }
      }
    }
    setGraph({ nodes: graph.nodes.filter((n) => n.id !== id), links: [...rest, ...added] })
    if (editingId === id) setEditingId(null)
  }

  // ── 保存(validateDesignGraph 与后端 ValidateDesignGraph 同规则) ──
  const handleSave = async () => {
    const rfNodes: Node<ApprovalNodeData>[] = graph.nodes.map((n) => ({
      id: n.id,
      position: { x: 0, y: 0 },
      data: {
        name: n.name,
        nodeType: n.nodeType,
        executeTiming: n.executeTiming,
        approverConfig: n.approverConfig,
        conditionConfig: n.conditionConfig,
      },
    }))
    const rfEdges: Edge[] = graph.links.map((l) => ({
      id: genNumber('e'),
      source: l.from,
      target: l.to,
    }))
    const problem = validateDesignGraph(rfNodes, rfEdges)
    if (problem) {
      message.error(problem)
      return
    }

    const reqNodes = graph.nodes.map((n, i) => ({
      number: n.id,
      name: n.name,
      node_type: n.nodeType,
      execute_timing: n.executeTiming || '',
      sort: i + 1,
    }))
    const reqApprovers = graph.nodes
      .filter((n) => n.nodeType === 'APPROVER')
      .map((n) => {
        const cfg = n.approverConfig ?? {}
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
    const reqConditions = graph.nodes
      .filter((n) => n.nodeType === 'CONDITION')
      .map((n) => ({
        node_number: n.id,
        condition_config: n.conditionConfig || '{"logic":"AND","conditions":[]}',
      }))
    const reqLinks = graph.links.map((l, i) => ({
      from_node_number: l.from,
      to_node_number: l.to,
      sort: i + 1,
    }))

    const payload: SaveDesignRequest = {
      nodes: reqNodes,
      approvers: reqApprovers,
      conditions: reqConditions,
      links: reqLinks,
    }
    setSaving(true)
    try {
      await saveApprovalFlowDesign(flowId, payload)
      message.success('流程设计已保存(新建版本)')
    } finally {
      setSaving(false)
    }
  }

  // ── 渲染 ──

  const renderNodeCard = (node: DingNode, opts?: { deletable?: boolean; deleteTip?: string }) => {
    const meta = CARD_META[node.nodeType] ?? CARD_META.APPROVER
    const Icon = meta.icon
    const deletable = opts?.deletable ?? node.nodeType === 'APPROVER'
    let summary = ''
    if (node.nodeType === 'APPROVER') summary = approverSummary(node)
    else if (node.nodeType === 'CONDITION') summary = conditionSummary(node, fields)
    else if (node.nodeType === 'START')
      summary = `提交人提交(${TIMING_LABEL[node.executeTiming ?? 'CREATE'] ?? '创建时'})`
    else summary = '流程到此结束'
    const clickable = node.nodeType !== 'END'
    return (
      <div
        className="ding-card"
        style={{ borderLeftColor: meta.color }}
        onClick={clickable ? () => setEditingId(node.id) : undefined}
      >
        <div className="ding-card-head">
          <span className="ding-card-icon" style={{ background: meta.color }}>
            <Icon />
          </span>
          <span className="ding-card-badge" style={{ color: meta.color }}>
            {meta.label}
          </span>
          <span className="ding-card-title">{node.name}</span>
        </div>
        <div className="ding-card-summary" title={summary}>
          {summary}
        </div>
        <span className="ding-card-actions">
          {clickable && (
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={(e) => {
                e.stopPropagation()
                setEditingId(node.id)
              }}
            />
          )}
          {deletable && (
            <Popconfirm
              title={opts?.deleteTip ?? '删除该节点?前后的节点将自动相连'}
              onConfirm={() => deleteNode(node.id)}
            >
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={(e) => e.stopPropagation()}
              />
            </Popconfirm>
          )}
        </span>
      </div>
    )
  }

  const renderDefaultHead = () => (
    <div className="ding-card ding-card-muted" style={{ borderLeftColor: '#8c8c8c' }}>
      <div className="ding-card-head">
        <span className="ding-card-icon" style={{ background: '#8c8c8c' }}>
          <BranchesOutlined />
        </span>
        <span className="ding-card-badge" style={{ color: '#8c8c8c' }}>
          默认
        </span>
        <span className="ding-card-title">其他情况</span>
      </div>
      <div className="ding-card-summary">上述条件都不满足时进入</div>
    </div>
  )

  const itemEntryId = (it: FlowItem) => (it.kind === 'node' ? it.node.id : it.forkId)
  const itemExitId = (it: FlowItem) => (it.kind === 'node' ? it.node.id : it.joinId)

  const renderAddConn = (fromId: string, toId: string) => (
    <div className="ding-conn">
      <Dropdown
        trigger={['click']}
        menu={{
          items: [
            { key: 'approver', icon: <UserOutlined />, label: '审批节点' },
            { key: 'branch', icon: <ApartmentOutlined />, label: '条件分支' },
          ],
          onClick: ({ key }) => {
            if (key === 'approver') insertNode(fromId, toId)
            else insertContainer(fromId, toId)
          },
        }}
      >
        <Button
          size="small"
          shape="circle"
          icon={<PlusOutlined />}
          title="在此插入节点"
          className="ding-conn-btn"
        />
      </Dropdown>
    </div>
  )

  const renderBranch = (it: Extract<FlowItem, { kind: 'branch' }>): ReactNode => {
    let condNo = 0
    const hasDefaultCol = it.cols.some((c) => c.kind === 'default')
    return (
      <div className="ding-branch">
        {it.cols.map((col) => {
          const isCondCol = col.kind === 'condition'
          if (isCondCol) condNo++
          const condNode = isCondCol && col.condId ? view?.ctx.nodeMap.get(col.condId) : undefined
          return (
            <div className="ding-col" key={col.edgeIdx}>
              <div className="ding-col-bar">
                {isCondCol ? (
                  <Tag color="orange">优先级 {condNo}</Tag>
                ) : (
                  <Tag>默认分支</Tag>
                )}
                <span className="ding-col-tools">
                  <Dropdown
                    trigger={['click']}
                    menu={{
                      items: [
                        { key: 'condition', icon: <ApartmentOutlined />, label: '条件分支' },
                        {
                          key: 'default',
                          icon: <BranchesOutlined />,
                          label: '默认分支(兜底)',
                          disabled: hasDefaultCol,
                        },
                      ],
                      onClick: ({ key }) => addBranch(it.forkId, key as 'condition' | 'default'),
                    }}
                  >
                    <Button type="text" size="small" icon={<PlusOutlined />} title="添加分支" />
                  </Dropdown>
                  {it.cols.length > 1 && (
                    <Popconfirm
                      title="删除该分支及其下所有节点?"
                      onConfirm={() => deleteBranch(it.forkId, col)}
                    >
                      <Button type="text" size="small" danger icon={<CloseOutlined />} title="删除分支" />
                    </Popconfirm>
                  )}
                </span>
              </div>
              {isCondCol ? (
                condNode ? (
                  renderNodeCard(condNode, { deletable: false })
                ) : (
                  <div className="ding-card ding-card-muted" style={{ borderLeftColor: '#faad14' }}>
                    条件节点缺失
                  </div>
                )
              ) : (
                renderDefaultHead()
              )}
              {/* 列头卡与子链第一节点之间的插入点(条件列挂 CONDITION 出边,默认列挂分叉点出边) */}
              {renderAddConn(isCondCol ? col.condId ?? '' : it.forkId, col.headId || it.joinId)}
              {col.items.map((sub, si) => (
                <Fragment key={si}>
                  {si > 0 &&
                    (itemExitId(col.items[si - 1]) === itemEntryId(sub) ? (
                      <div className="ding-conn ding-conn-short" />
                    ) : (
                      renderAddConn(itemExitId(col.items[si - 1]), itemEntryId(sub))
                    ))}
                  {sub.kind === 'node' ? renderNodeCard(sub.node) : renderBranch(sub)}
                </Fragment>
              ))}
              {/* 链尾到汇合点的插入点(空链时列头卡下方那颗 ⊕ 已覆盖该边) */}
              {col.items.length > 0 &&
                renderAddConn(itemExitId(col.items[col.items.length - 1]), it.joinId)}
            </div>
          )
        })}
      </div>
    )
  }

  const renderItems = (items: FlowItem[]): ReactNode => (
    <>
      {items.map((it, idx) => {
        const prevExit = idx > 0 ? itemExitId(items[idx - 1]) : ''
        const entry = itemEntryId(it)
        return (
          <Fragment key={it.kind === 'node' ? `n_${it.node.id}` : `b_${it.forkId}`}>
            {idx > 0 &&
              (prevExit === entry ? (
                // 分支容器紧跟其分叉点卡片:无独立边,仅展示挂载短线
                <div className="ding-conn ding-conn-short" />
              ) : (
                renderAddConn(prevExit, entry)
              ))}
            {it.kind === 'node' ? renderNodeCard(it.node) : renderBranch(it)}
          </Fragment>
        )
      })}
    </>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <style>{DING_CSS}</style>
      {/* 顶栏 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 16px',
          borderBottom: '1px solid #f0f0f0',
          background: '#fff',
          flex: 'none',
        }}
      >
        <Space>
          <strong>{detail?.name || '流程设计'}</strong>
          <span style={{ color: '#999', fontSize: 12 }}>
            点击卡片编辑属性;连线中点 ⊕ 可插入审批节点或条件分支
          </span>
          <span style={{ color: '#999', fontSize: 12 }}>
            条件分支按从左到右顺序匹配,首个满足即走;都不满足走「默认分支」
          </span>
        </Space>
        <Space>
          <Button onClick={onClose}>关闭</Button>
          <Button type="primary" loading={saving} onClick={handleSave}>
            保存设计
          </Button>
        </Space>
      </div>

      {/* 卡片流画布 */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', background: '#fafafa' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <Spin />
          </div>
        ) : view ? (
          <div className="ding-flow-wrap">{renderItems(view.items)}</div>
        ) : (
          <div style={{ textAlign: 'center', color: '#999', paddingTop: 80 }}>
            未找到开始节点,请检查流程设计
          </div>
        )}
      </div>

      {/* 节点配置抽屉 */}
      <DingNodeDrawer
        open={editingId !== null}
        node={editingNode}
        fields={fields}
        onClose={() => setEditingId(null)}
        onName={(v) => patchEditing({ name: v })}
        onExecuteTiming={(v) => patchEditing({ executeTiming: v })}
        onApproverField={patchEditingApprover}
        onCondition={(cfg) => patchEditing({ conditionConfig: JSON.stringify(cfg) })}
      />
    </div>
  )
}

// ── 节点配置抽屉(钉钉模式右侧表单) ──

interface DingNodeDrawerProps {
  open: boolean
  node: DingNode | null
  /** 条件字段元数据(主组件已加载) */
  fields: FormField[]
  onClose: () => void
  onName: (v: string) => void
  onExecuteTiming: (v: string) => void
  onApproverField: (field: string, value: unknown) => void
  onCondition: (cfg: ConditionConfig) => void
}

function DingNodeDrawer({
  open,
  node,
  fields,
  onClose,
  onName,
  onExecuteTiming,
  onApproverField,
  onCondition,
}: DingNodeDrawerProps) {
  const isCondition = node?.nodeType === 'CONDITION'
  const fieldMap = useMemo(() => new Map(fields.map((f) => [f.key, f])), [fields])
  const fieldGroups = useMemo(() => {
    const fixed = fields.filter((f) => f.source === 'fixed')
    const custom = fields.filter((f) => f.source === 'custom')
    const groups: { label: string; options: { label: string; value: string }[] }[] = []
    if (fixed.length > 0)
      groups.push({ label: '固定字段', options: fixed.map((f) => ({ label: f.label, value: f.key })) })
    if (custom.length > 0)
      groups.push({ label: '自定义字段', options: custom.map((f) => ({ label: f.label, value: f.key })) })
    return groups
  }, [fields])

  const meta = node ? CARD_META[node.nodeType] ?? CARD_META.APPROVER : null
  const title = node ? `${meta?.label ?? '节点'}配置` : '节点配置'
  const approverCfg = (node?.approverConfig ?? {}) as Record<string, unknown>
  const approverType = (approverCfg.approver_type as string) || 'MEMBER'
  const emptyAction = (approverCfg.empty_approver_action as string) || 'AUTO_PASS'
  const condCfg = parseCondition(node?.conditionConfig)

  const updateConditionItem = (i: number, patch: Partial<ConditionItem>) => {
    if (!node) return
    const next = [...condCfg.conditions]
    next[i] = { ...next[i], ...patch }
    onCondition({ ...condCfg, conditions: next })
  }

  // 选中字段后,若当前操作符不被新字段类型支持则重置,并清空值
  const onFieldChange = (i: number, fieldKey: string) => {
    const fd = fieldMap.get(fieldKey)
    const allowed = fd ? OPS_BY_TYPE[fd.type].map((o) => o.value) : ['EQ']
    const keepOp = allowed.includes(condCfg.conditions[i]?.op ?? '') ? condCfg.conditions[i].op : 'EQ'
    updateConditionItem(i, { field: fieldKey, op: keepOp, value: '' })
  }

  return (
    <Drawer
      title={title}
      open={open}
      onClose={onClose}
      width={440}
      destroyOnHidden
      mask={false}
      styles={{ body: { paddingTop: 16 } }}
    >
      {!node ? null : (
        <Space direction="vertical" size={16} style={{ display: 'flex' }}>
          <div>
            <div style={{ marginBottom: 6, fontSize: 13, color: '#666' }}>节点名称</div>
            <Input
              value={node.name}
              onChange={(e) => onName(e.target.value)}
              placeholder="节点名称"
            />
          </div>

          {node.nodeType === 'START' && (
            <div>
              <div style={{ marginBottom: 6, fontSize: 13, color: '#666' }}>触发时机</div>
              <Select
                style={{ width: '100%' }}
                value={node.executeTiming || 'CREATE'}
                options={EXECUTE_TIMING_OPTIONS}
                onChange={(v) => onExecuteTiming(v as string)}
              />
            </div>
          )}

          {node.nodeType === 'APPROVER' && (
            <>
              <div>
                <div style={{ marginBottom: 6, fontSize: 13, color: '#666' }}>审批人类型</div>
                <Select
                  style={{ width: '100%' }}
                  value={approverType}
                  options={APPROVER_TYPE_OPTIONS}
                  onChange={(v) => onApproverField('approver_type', v)}
                />
              </div>
              {approverType === 'MEMBER' && (
                <div>
                  <div style={{ marginBottom: 6, fontSize: 13, color: '#666' }}>审批人</div>
                  <UserSelect
                    mode="multiple"
                    style={{ width: '100%' }}
                    placeholder="选择一个或多个审批人"
                    value={parseIds(approverCfg.approver_list)}
                    onChange={(ids) => onApproverField('approver_list', JSON.stringify(ids ?? []))}
                  />
                </div>
              )}
              <div>
                <div style={{ marginBottom: 6, fontSize: 13, color: '#666' }}>多审批人模式</div>
                <Select
                  style={{ width: '100%' }}
                  value={(approverCfg.multi_approver_mode as string) || 'ANY'}
                  options={MULTI_MODE_OPTIONS}
                  onChange={(v) => onApproverField('multi_approver_mode', v)}
                />
              </div>
              <div>
                <div style={{ marginBottom: 6, fontSize: 13, color: '#666' }}>
                  抄送人
                  <span style={{ color: '#bbb', marginLeft: 6 }}>仅知会,无需审批;清空则不抄送</span>
                </div>
                <UserSelect
                  mode="multiple"
                  style={{ width: '100%' }}
                  placeholder="选择抄送人(可空)"
                  value={parseIds(approverCfg.cc_list)}
                  onChange={(ids) => {
                    onApproverField('cc_list', JSON.stringify(ids ?? []))
                    onApproverField('cc_type', ids && ids.length > 0 ? 'MEMBER' : '')
                  }}
                />
              </div>
              <div>
                <div style={{ marginBottom: 6, fontSize: 13, color: '#666' }}>空审批人处理</div>
                <Select
                  style={{ width: '100%' }}
                  value={emptyAction}
                  options={EMPTY_ACTION_OPTIONS}
                  onChange={(v) => onApproverField('empty_approver_action', v)}
                />
              </div>
              {emptyAction === 'ASSIGN_SPECIFIC' && (
                <div>
                  <div style={{ marginBottom: 6, fontSize: 13, color: '#666' }}>兜底审批人</div>
                  <UserSelect
                    style={{ width: '100%' }}
                    placeholder="空审批人时转交的用户"
                    value={(approverCfg.fallback_approver as number | undefined) ?? undefined}
                    onChange={(v) => onApproverField('fallback_approver', v ?? undefined)}
                  />
                </div>
              )}
              <div>
                <div style={{ marginBottom: 6, fontSize: 13, color: '#666' }}>提交人本人为审批人时</div>
                <Select
                  style={{ width: '100%' }}
                  value={(approverCfg.same_submitter_action as string) || 'SKIP'}
                  options={SAME_SUBMITTER_OPTIONS}
                  onChange={(v) => onApproverField('same_submitter_action', v)}
                />
              </div>
            </>
          )}

          {isCondition && (
            <>
              <div>
                <div style={{ marginBottom: 6, fontSize: 13, color: '#666' }}>条件关系</div>
                <Select
                  style={{ width: '100%' }}
                  value={condCfg.logic}
                  options={[
                    { label: '满足所有条件(AND)', value: 'AND' },
                    { label: '满足任一条件(OR)', value: 'OR' },
                  ]}
                  onChange={(v) => onCondition({ ...condCfg, logic: v as 'AND' | 'OR' })}
                />
              </div>
              {condCfg.conditions.map((c, i) => {
                const fd = fieldMap.get(c.field)
                return (
                  <div key={i} style={{ border: '1px solid #f0f0f0', borderRadius: 8, padding: 10 }}>
                    <Select
                      style={{ width: '100%', marginBottom: 8 }}
                      placeholder="选择字段"
                      value={c.field || undefined}
                      options={fieldGroups}
                      onChange={(v) => onFieldChange(i, v)}
                    />
                    <Space size={8} style={{ display: 'flex' }}>
                      <Select
                        style={{ width: 110 }}
                        value={c.op}
                        options={fd ? OPS_BY_TYPE[fd.type] : OPS_BY_TYPE.string}
                        onChange={(v) => updateConditionItem(i, { op: v })}
                      />
                      <ConditionValueInput
                        field={fd}
                        value={c.value}
                        onChange={(val) => updateConditionItem(i, { value: val })}
                      />
                      <Button
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() =>
                          onCondition({
                            ...condCfg,
                            conditions: condCfg.conditions.filter((_, idx) => idx !== i),
                          })
                        }
                      />
                    </Space>
                  </div>
                )
              })}
              <Button
                type="dashed"
                block
                icon={<PlusOutlined />}
                onClick={() =>
                  onCondition({
                    ...condCfg,
                    conditions: [...condCfg.conditions, { field: '', op: 'EQ', value: '' }],
                  })
                }
              >
                添加条件
              </Button>
              {condCfg.conditions.length === 0 && (
                <div style={{ color: '#faad14', fontSize: 12 }}>
                  该分支保存前必须至少配置一条条件规则,否则请改用「默认分支」
                </div>
              )}
              {fields.length === 0 && (
                <div style={{ color: '#999', fontSize: 12 }}>该表单暂无可配置的条件字段</div>
              )}
            </>
          )}

          {node.nodeType === 'END' && (
            <div style={{ color: '#999', fontSize: 13 }}>结束节点无需配置</div>
          )}
        </Space>
      )}
    </Drawer>
  )
}

// ── 条件值输入(按字段类型联动,与 NodeConfigPanel 对齐) ──

function ConditionValueInput({
  field,
  value,
  onChange,
}: {
  field?: FormField
  value: string
  onChange: (val: string) => void
}) {
  if (!field) {
    return (
      <Input
        style={{ flex: 1, minWidth: 120 }}
        placeholder="值"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    )
  }
  switch (field.type) {
    case 'number':
      return (
        <InputNumber
          style={{ flex: 1, minWidth: 120 }}
          placeholder="数值"
          value={value === '' ? null : Number(value)}
          onChange={(v) => onChange(v == null ? '' : String(v))}
        />
      )
    case 'date':
      return (
        <DatePicker
          style={{ flex: 1, minWidth: 120 }}
          value={value ? dayjs(value) : null}
          onChange={(d) => onChange(d ? d.format('YYYY-MM-DD') : '')}
        />
      )
    case 'enum':
      return (
        <Select
          style={{ flex: 1, minWidth: 120 }}
          placeholder="选择值"
          value={value || undefined}
          options={field.options?.map((o) => ({ label: o.label, value: o.value }))}
          onChange={onChange}
        />
      )
    default:
      return (
        <Input
          style={{ flex: 1, minWidth: 120 }}
          placeholder="值"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )
  }
}
