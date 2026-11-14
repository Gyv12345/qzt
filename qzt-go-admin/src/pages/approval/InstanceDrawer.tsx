import { useEffect, useState, type ReactNode } from 'react'
import {
  App,
  Button,
  Collapse,
  Descriptions,
  Drawer,
  Empty,
  Popconfirm,
  Space,
  Spin,
  Table,
  Tag,
  Timeline,
  Tooltip,
  Typography,
} from 'antd'
import {
  getApprovalInstance,
  getInstanceGraph,
  getInstanceResource,
  removeSignTask,
} from '../../services/approval'
import { useAuthStore } from '../../stores/auth'
import { useDictStore } from '../../stores/dict'
import { useUserStore } from '../../stores/users'
import type {
  ApprovalInstanceDetail,
  ApprovalInstanceGraph,
  ApprovalTask,
  ResourceSummary,
  ReturnableNode,
} from '../../types/approval'
import InstanceGraph from './InstanceGraph'
import AddSignModal from './AddSignModal'
import ReturnBackModal from './ReturnBackModal'

interface InstanceDrawerProps {
  instanceId: number | null
  open: boolean
  onClose: () => void
  /** 详情内操作(加签/退回/减签)成功后回调,供列表页刷新表格 */
  onChanged?: () => void
}

interface InstanceDrawerProps {
  instanceId: number | null
  open: boolean
  onClose: () => void
}

const STATUS_TAG: Record<string, { color: string; text: string }> = {
  PENDING: { color: 'processing', text: '审批中' },
  APPROVING: { color: 'processing', text: '审批中' },
  APPROVED: { color: 'success', text: '已通过' },
  REJECTED: { color: 'error', text: '已驳回' },
  UNAPPROVED: { color: 'error', text: '已驳回' },
  REVOKED: { color: 'default', text: '已撤回' },
}

const RESULT_TAG: Record<string, { color: string; text: string }> = {
  APPROVE: { color: 'success', text: '通过' },
  REJECT: { color: 'error', text: '已驳回' },
  AUTO_PASS: { color: 'default', text: '自动通过' },
  TRANSFER: { color: 'gold', text: '转办' },
  DELEGATE: { color: 'purple', text: '委托' },
}

const TASK_STATUS_TAG: Record<string, { color: string; text: string }> = {
  PENDING: { color: 'processing', text: '待审批' },
  APPROVING: { color: 'processing', text: '审批中' },
  APPROVED: { color: 'success', text: '已通过' },
  UNAPPROVED: { color: 'error', text: '已驳回' },
  REVOKED: { color: 'default', text: '已撤销' },
}

const ADD_SIGN_TAG: Record<string, { color: string; text: string }> = {
  before: { color: 'purple', text: '前加签' },
  after: { color: 'gold', text: '后加签' },
}

/** 字典值 → 中文(dict store 已在应用启动时预载) */
function dictLabel(code?: string, value?: string) {
  if (!code || value === undefined || value === '') return value
  return useDictStore.getState().label(code, value)
}

/** 原单摘要:字段键值 + 可选明细表 */
function ResourceSummarySection({ summary }: { summary: ResourceSummary | null }) {
  if (!summary) return null
  if (!summary.found) {
    return (
      <>
        <Typography.Title level={5} style={{ marginTop: 24 }}>
          原单内容
        </Typography.Title>
        <Typography.Text type="secondary">原单不存在或已删除</Typography.Text>
      </>
    )
  }
  return (
    <>
      <Typography.Title level={5} style={{ marginTop: 24 }}>
        原单内容
      </Typography.Title>
      <Descriptions column={1} bordered size="small">
        {summary.fields.map((f) => (
          <Descriptions.Item key={f.label} label={f.label}>
            {dictLabel(f.dict, f.value) || '-'}
          </Descriptions.Item>
        ))}
      </Descriptions>
      {summary.items && summary.items.rows.length > 0 && (
        <Table
          style={{ marginTop: 12 }}
          size="small"
          pagination={false}
          dataSource={summary.items.rows.map((row, i) => ({ key: i, ...row }))}
          columns={summary.items.columns.map((c) => ({
            title: c.label,
            dataIndex: c.key,
            render: (v: string) => dictLabel(c.dict, v) || '-',
          }))}
        />
      )}
    </>
  )
}

/** 审批实例详情抽屉:基本信息 + 原单摘要 + 审批任务 + 操作(加签/退回/减签) + 审批记录时间线 */
export default function InstanceDrawer({
  instanceId,
  open,
  onClose,
  onChanged,
}: InstanceDrawerProps) {
  const { message } = App.useApp()
  const [loading, setLoading] = useState(false)
  const [detail, setDetail] = useState<ApprovalInstanceDetail | null>(null)
  const [summary, setSummary] = useState<ResourceSummary | null>(null)
  const [graph, setGraph] = useState<ApprovalInstanceGraph | null>(null)
  const [addSignOpen, setAddSignOpen] = useState(false)
  const [returnOpen, setReturnOpen] = useState(false)
  const [activeTask, setActiveTask] = useState<ApprovalTask | null>(null)

  // 订阅 users 数组:用户缓存异步加载完成后触发重渲染,昵称能及时显示
  useUserStore((s) => s.users)
  const myId = useAuthStore((s) => s.profile?.id)
  const nickname = (id?: number | null) => useUserStore.getState().nickname(id)

  useEffect(() => {
    if (!open || !instanceId) return
    setLoading(true)
    setDetail(null)
    setSummary(null)
    setGraph(null)
    Promise.all([
      getApprovalInstance(instanceId).catch(() => null),
      getInstanceResource(instanceId).catch(() => null),
      getInstanceGraph(instanceId).catch(() => null),
    ]).then(([d, s, g]) => {
      setDetail(d)
      setSummary(s)
      setGraph(g)
      setLoading(false)
    })
  }, [open, instanceId])

  /** 操作成功后仅刷新详情(不重置原单摘要/流程图,减少闪烁),并通知列表页 */
  const refreshDetail = () => {
    if (!instanceId) return
    getApprovalInstance(instanceId)
      .then((d) => setDetail(d))
      .catch(() => null)
    onChanged?.()
  }

  const handleActionSuccess = () => {
    setAddSignOpen(false)
    setReturnOpen(false)
    refreshDetail()
  }

  const handleRemoveSign = async (task: ApprovalTask) => {
    await removeSignTask(task.id)
    message.success('已减签')
    refreshDetail()
  }

  const status = detail?.approval_status
  const statusTag = status ? STATUS_TAG[status] : undefined

  // ── 操作区:当前登录人是某待办任务的审批人且实例在审批中时,显示加签/退回 ──
  const tasks = detail?.tasks || []
  const myPendingTask =
    detail && (status === 'PENDING' || status === 'APPROVING')
      ? tasks.find(
          (t) =>
            myId !== undefined &&
            t.approver_id === myId &&
            (t.status === 'PENDING' || t.status === 'APPROVING'),
        ) || null
      : null
  const returnableNodes: ReturnableNode[] = detail?.returnable_nodes || []

  /** 减签入口:加签任务且仍在待审;有发起人 ID 时仅发起人可见,无 ID 时按状态展示、由后端校验兜底 */
  const canRemoveSign = (t: ApprovalTask): boolean => {
    if (!t.add_sign_mode) return false
    if (t.status && t.status !== 'PENDING' && t.status !== 'APPROVING') return false
    if (t.add_sign_by !== undefined && t.add_sign_by !== null) {
      return myId !== undefined && t.add_sign_by === myId
    }
    return true
  }

  // 审批记录时间线:以「提交审批」为起点,追加每条审批操作(通过/驳回)。
  // 避免审批中的实例因暂无操作记录而显示「暂无审批记录」,看起来像异常。
  const recordItems: { color: string; children: ReactNode }[] = []
  if (detail?.submit_time) {
    recordItems.push({
      color: 'blue',
      children: (
        <>
          <div>提交审批</div>
          <Typography.Text type="secondary">{detail.submit_time}</Typography.Text>
        </>
      ),
    })
  }
  ;(detail?.records || []).forEach((r) => {
    const tag = RESULT_TAG[r.result]
    recordItems.push({
      color: r.result === 'REJECT' ? 'red' : r.result === 'TRANSFER' || r.result === 'DELEGATE' ? 'gray' : 'green',
      children: (
        <>
          <div>
            第 {r.node_round} 轮审批{' '}
            {tag ? <Tag color={tag.color}>{tag.text}</Tag> : <Tag>{r.result}</Tag>}
          </div>
          {r.comment ? <div>意见:{r.comment}</div> : null}
          <Typography.Text type="secondary">{r.created_at}</Typography.Text>
        </>
      ),
    })
  })

  return (
    <Drawer title="审批详情" width={520} open={open} onClose={onClose} destroyOnHidden>
      <Spin spinning={loading}>
        {detail ? (
          <>
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="类型">{detail.form_type_label || detail.type || '-'}</Descriptions.Item>
              <Descriptions.Item label="标题">{detail.resource_title || '-'}</Descriptions.Item>
              <Descriptions.Item label="状态">
                {statusTag ? <Tag color={statusTag.color}>{statusTag.text}</Tag> : status || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="提交时间">{detail.submit_time || '-'}</Descriptions.Item>
              <Descriptions.Item label="完成时间">{detail.approval_time || '-'}</Descriptions.Item>
              <Descriptions.Item label="备注">{detail.comment || '-'}</Descriptions.Item>
            </Descriptions>
            {myPendingTask && (
              <Space style={{ marginTop: 12 }} wrap>
                <Button
                  size="small"
                  onClick={() => {
                    setActiveTask(myPendingTask)
                    setAddSignOpen(true)
                  }}
                >
                  加签
                </Button>
                <Tooltip title={returnableNodes.length === 0 ? '当前无可退回节点' : undefined}>
                  <Button
                    size="small"
                    danger
                    disabled={returnableNodes.length === 0}
                    onClick={() => {
                      setActiveTask(myPendingTask)
                      setReturnOpen(true)
                    }}
                  >
                    退回
                  </Button>
                </Tooltip>
              </Space>
            )}
            <ResourceSummarySection summary={summary} />
            {graph && (
              <Collapse
                ghost
                style={{ marginTop: 16 }}
                items={[
                  {
                    key: 'graph',
                    label: '流程轨迹图',
                    children: <InstanceGraph graph={graph} />,
                  },
                ]}
                defaultActiveKey={['graph']}
              />
            )}
            {tasks.length > 0 && (
              <>
                <Typography.Title level={5} style={{ marginTop: 24 }}>
                  审批任务
                </Typography.Title>
                {tasks.map((t) => {
                  const taskStatus = t.status ? TASK_STATUS_TAG[t.status] : undefined
                  const addSign = t.add_sign_mode ? ADD_SIGN_TAG[t.add_sign_mode] : undefined
                  return (
                    <div
                      key={t.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 8,
                        padding: '4px 0',
                      }}
                    >
                      <Typography.Text>{nickname(t.approver_id)}</Typography.Text>
                      {taskStatus ? (
                        <Tag color={taskStatus.color}>{taskStatus.text}</Tag>
                      ) : (
                        <Tag>{t.status || '-'}</Tag>
                      )}
                      <Typography.Text type="secondary">第 {t.node_round} 轮</Typography.Text>
                      {addSign && (
                        <Tag color={addSign.color}>
                          {addSign.text}
                          {t.add_sign_by_name ? ` · 来自 ${t.add_sign_by_name}` : ''}
                        </Tag>
                      )}
                      {canRemoveSign(t) && (
                        <Popconfirm
                          title="确认减签该加签任务?"
                          okText="减签"
                          cancelText="取消"
                          onConfirm={() => handleRemoveSign(t)}
                        >
                          <Tooltip
                            title={
                              t.add_sign_by === undefined || t.add_sign_by === null
                                ? '仅加签发起人可减签,以后端校验为准'
                                : undefined
                            }
                          >
                            <Button type="link" size="small" danger>
                              减签
                            </Button>
                          </Tooltip>
                        </Popconfirm>
                      )}
                    </div>
                  )
                })}
              </>
            )}
            <Typography.Title level={5} style={{ marginTop: 24 }}>
              审批记录
            </Typography.Title>
            {recordItems.length > 0 ? (
              <Timeline items={recordItems} />
            ) : (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无审批记录" />
            )}
          </>
        ) : null}
      </Spin>
      <AddSignModal
        open={addSignOpen}
        task={addSignOpen ? activeTask : null}
        onClose={() => setAddSignOpen(false)}
        onSuccess={handleActionSuccess}
      />
      <ReturnBackModal
        open={returnOpen}
        task={returnOpen ? activeTask : null}
        nodes={returnableNodes}
        onClose={() => setReturnOpen(false)}
        onSuccess={handleActionSuccess}
      />
    </Drawer>
  )
}
