import {
  Handle,
  Position,
  useReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from '@xyflow/react'
import { CloseOutlined, PlusOutlined } from '@ant-design/icons'
import { NODE_STYLE, genNumber, type ApprovalNodeData } from './graphShared'

/** 审批流节点视图:类型标签 + 名称,选中时可删除(START/END 除外);条件节点可追加平行分支 */
function ApprovalNodeComponent({ id, data, selected }: NodeProps<Node<ApprovalNodeData>>) {
  const style = NODE_STYLE[data.nodeType] ?? NODE_STYLE.DEFAULT
  const { deleteElements, getNodes, getEdges, setNodes, setEdges } = useReactFlow()
  const canDelete = data.nodeType !== 'START' && data.nodeType !== 'END'

  // 在当前条件节点的分支组里追加一个平行分支(同源同汇)。
  // 新分支连线 append 到边列表末尾 = 后端求值优先级最低,且位置放在最右,与"从左到右=优先级"一致。
  const addParallelBranch = () => {
    const edges = getEdges()
    const inEdge = edges.find((e) => e.target === id)
    const outEdge = edges.find((e) => e.source === id)
    if (!inEdge || !outEdge) return

    const nodes = getNodes()
    const me = nodes.find((n) => n.id === id)
    if (!me) return

    // 兄弟条件节点 = 与当前节点同 source 的 CONDITION 节点
    const siblings = nodes.filter(
      (n) =>
        n.id !== id &&
        (n.data as ApprovalNodeData).nodeType === 'CONDITION' &&
        edges.some((e) => e.source === inEdge.source && e.target === n.id),
    )
    const rightmostX = Math.max(me.position.x, ...siblings.map((s) => s.position.x))

    // 命名:沿用"条件A/B"序列,取现有最大字母递增;超过 Z 退化为序号
    const letters = nodes
      .map((n) => /^条件([A-Z])$/.exec((n.data as ApprovalNodeData).name || '')?.[1])
      .filter((c): c is string => !!c)
      .sort()
    const maxLetter = letters[letters.length - 1]
    const nextName =
      maxLetter && maxLetter < 'Z'
        ? `条件${String.fromCharCode(maxLetter.charCodeAt(0) + 1)}`
        : `条件${letters.length + 1}`

    const newCond: Node<ApprovalNodeData> = {
      id: genNumber('cond'),
      type: 'approval',
      position: { x: rightmostX + 200, y: me.position.y },
      data: {
        name: nextName,
        nodeType: 'CONDITION',
        conditionConfig: JSON.stringify({ logic: 'AND', conditions: [] }),
      },
    }
    const newEdges: Edge[] = [
      { id: genNumber('e'), source: inEdge.source, target: newCond.id, type: 'clickable' },
      { id: genNumber('e'), source: newCond.id, target: outEdge.target, type: 'clickable' },
    ]
    setNodes([...nodes, newCond])
    setEdges([...edges, ...newEdges])
  }

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
      <Handle type="target" position={Position.Top} style={{ background: '#fff' }} />
      <div style={{ fontSize: 11, opacity: 0.8 }}>{style.label}</div>
      <div>{data.name}</div>
      <Handle type="source" position={Position.Bottom} style={{ background: '#fff' }} />
      {data.nodeType === 'CONDITION' && selected && (
        <button
          title="添加平行分支"
          onClick={(e) => {
            e.stopPropagation()
            addParallelBranch()
          }}
          style={{
            position: 'absolute',
            top: -8,
            right: canDelete ? 14 : -8,
            width: 18,
            height: 18,
            borderRadius: '50%',
            border: 'none',
            background: '#1677ff',
            color: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 10,
          }}
        >
          <PlusOutlined style={{ fontSize: 9 }} />
        </button>
      )}
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

export const nodeTypes = { approval: ApprovalNodeComponent }
