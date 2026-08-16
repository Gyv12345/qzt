import {
  Handle,
  Position,
  useReactFlow,
  type Node,
  type NodeProps,
} from '@xyflow/react'
import { CloseOutlined } from '@ant-design/icons'
import { NODE_STYLE, type ApprovalNodeData } from './graphShared'

/** 审批流节点视图:类型标签 + 名称,选中时可删除(START/END 除外) */
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
      <Handle type="target" position={Position.Top} style={{ background: '#fff' }} />
      <div style={{ fontSize: 11, opacity: 0.8 }}>{style.label}</div>
      <div>{data.name}</div>
      <Handle type="source" position={Position.Bottom} style={{ background: '#fff' }} />
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
