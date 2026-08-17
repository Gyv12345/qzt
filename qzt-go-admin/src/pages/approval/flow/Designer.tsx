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
  type Node,
  type Edge,
  type Connection,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { App, Button, Space, Spin } from 'antd'
import { getApprovalFlow, saveApprovalFlowDesign } from '../../../services/approval'
import type { ApprovalFlowDetail, SaveDesignRequest } from '../../../types/approval'
import NodeConfigPanel from './NodeConfigPanel'
import { layoutNodes, genNumber, validateDesignGraph, type ApprovalNodeData } from './graphShared'
import { nodeTypes } from './ApprovalNodeView'
import { edgeTypes } from './ClickableEdgeView'

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
          // 空流程:seed START → END(竖版:结束在开始正下方)
          const startNode: Node<ApprovalNodeData> = {
            id: 'start',
            type: 'approval',
            position: { x: 0, y: 0 },
            data: { name: '开始', nodeType: 'START', executeTiming: 'CREATE' },
          }
          const endNode: Node<ApprovalNodeData> = {
            id: 'end',
            type: 'approval',
            position: { x: 0, y: 280 },
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

        // 尝试从 localStorage 读坐标(key 带 tb 版本号:横版时代的坐标不兼容,强制重排竖版)
        const posKey = `flowPos:tb:${flowId}`
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

      // 保存前图形校验(与后端 ValidateDesignGraph 同规则,提前给出可读提示)
      const problem = validateDesignGraph(allNodes, allEdges)
      if (problem) {
        message.error(problem)
        return
      }

      // 存坐标到 localStorage
      const posMap: Record<string, { x: number; y: number }> = {}
      allNodes.forEach((n) => {
        posMap[n.id] = n.position
      })
      localStorage.setItem(`flowPos:tb:${flowId}`, JSON.stringify(posMap))

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
            点击连线上的 + 插入节点;点击节点编辑属性;选中条件节点可 + 追加平行分支
          </span>
          <span style={{ color: '#999', fontSize: 12 }}>
            条件分支按从左到右顺序匹配,首个满足即走;都不满足走兜底分支(未连条件的分支)
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
