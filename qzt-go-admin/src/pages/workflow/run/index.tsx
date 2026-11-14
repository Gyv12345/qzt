// index.tsx 工作流执行记录页(P27):ProTable + 详情 Drawer(节点轨迹时间线)。
import { useRef, useState } from 'react'
import { App, Descriptions, Drawer, Popconfirm, Space, Tag, Timeline } from 'antd'
import { PageContainer, ProTable } from '@ant-design/pro-components'
import type { ActionType, ProColumns } from '@ant-design/pro-components'
import { deleteRun, listRuns, retryRun } from '../../../services/workflow'
import type { WorkflowRun } from '../../../types/workflow'

// traceItem 节点轨迹项(与后端 NodeTrace JSON 对齐)。
interface TraceItem {
  number: string
  name: string
  status: string
  output?: Record<string, unknown>
  error?: string
}

// statusTag 状态标签。
function statusTag(status: string) {
  const map: Record<string, { color: string; text: string }> = {
    RUNNING: { color: 'blue', text: '运行中' },
    SUCCESS: { color: 'green', text: '成功' },
    FAILED: { color: 'red', text: '失败' },
  }
  const it = map[status] ?? { color: 'default', text: status }
  return <Tag color={it.color}>{it.text}</Tag>
}

export default function WorkflowRunPage() {
  const { message } = App.useApp()
  const actionRef = useRef<ActionType>(null)
  const [detail, setDetail] = useState<WorkflowRun | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  // parseTrace 解析节点轨迹。
  const parseTrace = (s: string): TraceItem[] => {
    try {
      return JSON.parse(s || '[]')
    } catch {
      return []
    }
  }

  const columns: ProColumns<WorkflowRun>[] = [
    { title: 'ID', dataIndex: 'id', width: 70 },
    { title: '工作流ID', dataIndex: 'definition_id', width: 90 },
    {
      title: '触发来源',
      dataIndex: 'trigger_source',
      width: 90,
      render: (_, r) => {
        const map: Record<string, string> = { MANUAL: '手动', CRON: '定时', EVENT: '事件' }
        return map[r.trigger_source] ?? r.trigger_source
      },
    },
    { title: '状态', dataIndex: 'status', width: 90, render: (_, r) => statusTag(r.status) },
    {
      title: '耗时',
      dataIndex: 'cost_ms',
      width: 90,
      render: (_, r) => `${r.cost_ms} ms`,
    },
    { title: '失败原因', dataIndex: 'error', ellipsis: true },
    { title: '时间', dataIndex: 'created_at', width: 170 },
    {
      title: '操作',
      valueType: 'option',
      width: 140,
      render: (_, r) => [
        <a key="detail" onClick={() => { setDetail(r); setDetailOpen(true) }}>详情</a>,
        <Popconfirm key="retry" title="以相同参数重跑一次?" onConfirm={() => retryRun(r.id).then(() => {
          message.success('已重新执行')
          actionRef.current?.reload()
        })}>
          <a>重跑</a>
        </Popconfirm>,
        <Popconfirm key="del" title="确认删除该执行记录?" onConfirm={() => deleteRun(r.id).then(() => {
          message.success('已删除')
          actionRef.current?.reload()
        })}>
          <a style={{ color: '#ff4d4f' }}>删除</a>
        </Popconfirm>,
      ],
    },
  ]

  return (
    <PageContainer>
      <ProTable<WorkflowRun>
        headerTitle="工作流执行记录"
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        search={false}
        request={async ({ current, pageSize }) => {
          const r = await listRuns({ page: current, page_size: pageSize })
          return { data: r.list, total: r.total, success: true }
        }}
      />

      <Drawer
        title={`执行详情 #${detail?.id ?? ''}`}
        width={560}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
      >
        {detail && (
          <>
            <Descriptions size="small" column={2} bordered>
              <Descriptions.Item label="工作流ID">{detail.definition_id}</Descriptions.Item>
              <Descriptions.Item label="触发来源">{detail.trigger_source}</Descriptions.Item>
              <Descriptions.Item label="状态">{statusTag(detail.status)}</Descriptions.Item>
              <Descriptions.Item label="耗时">{detail.cost_ms} ms</Descriptions.Item>
              <Descriptions.Item label="触发参数" span={2}>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: 12, maxWidth: 420 }}>
                  {detail.trigger_payload}
                </pre>
              </Descriptions.Item>
              {detail.error && (
                <Descriptions.Item label="失败原因" span={2}>
                  {detail.error}
                </Descriptions.Item>
              )}
            </Descriptions>
            <div style={{ margin: '16px 0 8px', fontWeight: 600 }}>节点轨迹</div>
            <Timeline
              items={parseTrace(detail.node_trace).map((t) => ({
                color: t.status === 'FAILED' ? 'red' : 'green',
                children: (
                  <div>
                    <Space>
                      <b>{t.name || t.number}</b>
                      {statusTag(t.status)}
                    </Space>
                    {t.error && <div style={{ color: '#ff4d4f', fontSize: 12 }}>{t.error}</div>}
                    {t.output && (
                      <pre style={{ margin: '4px 0 0', whiteSpace: 'pre-wrap', fontSize: 12, color: '#666', maxWidth: 460 }}>
                        {JSON.stringify(t.output, null, 2)}
                      </pre>
                    )}
                  </div>
                ),
              }))}
            />
          </>
        )}
      </Drawer>
    </PageContainer>
  )
}