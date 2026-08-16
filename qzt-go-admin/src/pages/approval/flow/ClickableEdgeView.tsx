import {
  useReactFlow,
  BaseEdge,
  getBezierPath,
  EdgeLabelRenderer,
  type Node,
  type Edge,
  type EdgeProps,
} from '@xyflow/react'
import { Dropdown } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { genNumber, type ApprovalNodeData } from './graphShared'

/** 可点击的连线:中点 + 按钮下拉插入审批/条件节点 */
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
      // 插入两个条件节点(竖版流程:左右并排,从左到右为匹配优先级)
      const condA: Node<ApprovalNodeData> = {
        id: genNumber('cond'),
        type: 'approval',
        position: { x: midX - 80, y: midY },
        data: {
          name: '条件A',
          nodeType: 'CONDITION',
          conditionConfig: JSON.stringify({ logic: 'AND', conditions: [] }),
        },
      }
      const condB: Node<ApprovalNodeData> = {
        id: genNumber('cond'),
        type: 'approval',
        position: { x: midX + 80, y: midY },
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

export const edgeTypes = { clickable: ClickableEdge }
