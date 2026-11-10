import { useEffect, useRef, useState } from 'react'
import { App, Button, Drawer, Descriptions, Popconfirm, Space, Tag } from 'antd'
import {
  ProTable,
  type ActionType,
  type ProColumns,
} from '@ant-design/pro-components'
import Auth from '../../../components/Auth'
import { listWebhooks, listWebhookEvents, retryWebhookEvent } from '../../../services/open'
import type { OpenWebhook, OpenWebhookEvent } from '../../../types/open'
import { pageIndexColumn } from '../../../components/IndexTag'

const statusMap: Record<number, { text: string; color: string }> = {
  0: { text: '待投递', color: 'default' },
  1: { text: '成功', color: 'green' },
  2: { text: '重试中', color: 'orange' },
  3: { text: '死信', color: 'red' },
  4: { text: '投递中', color: 'blue' },
}

export default function WebhookLogPage() {
  const { message } = App.useApp()
  const actionRef = useRef<ActionType>(null)
  const [detail, setDetail] = useState<OpenWebhookEvent | null>(null)
  const [webhooks, setWebhooks] = useState<OpenWebhook[]>([])

  const webhookName = (id: number) => webhooks.find((w) => w.id === id)?.name ?? `#${id}`

  useEffect(() => {
    listWebhooks().then((res) => setWebhooks(res?.list ?? [])).catch(() => undefined)
  }, [])

  const handleRetry = async (record: OpenWebhookEvent) => {
    await retryWebhookEvent(record.id)
    message.success('已置回待投递,由投递任务重新发送')
    actionRef.current?.reload()
  }

  const columns: ProColumns<OpenWebhookEvent>[] = [
    pageIndexColumn(actionRef),
    {
      title: 'Webhook',
      dataIndex: 'webhook_id',
      width: 140,
      render: (_, r) => webhookName(r.webhook_id),
    },
    { title: '事件', dataIndex: 'event_type', width: 200, render: (_, r) => <Tag color="blue">{r.event_type}</Tag> },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      valueType: 'select',
      fieldProps: {
        options: Object.entries(statusMap).map(([v, m]) => ({ label: m.text, value: Number(v) })),
      },
      render: (_, r) => {
        const m = statusMap[r.status] ?? { text: String(r.status), color: 'default' }
        return <Tag color={m.color}>{m.text}</Tag>
      },
    },
    {
      title: '重试',
      dataIndex: 'retry_count',
      width: 80,
      render: (_, r) => `${r.retry_count}/${r.max_retries}`,
    },
    {
      title: 'HTTP',
      dataIndex: 'last_http_status',
      width: 80,
      render: (_, r) => (r.last_http_status ? String(r.last_http_status) : '-'),
    },
    { title: '最近错误', dataIndex: 'last_error', width: 200, ellipsis: true, render: (_, r) => r.last_error || '-' },
    { title: '创建时间', dataIndex: 'created_at', valueType: 'dateTime', width: 170 },
    {
      title: '操作',
      valueType: 'option',
      width: 130,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" onClick={() => setDetail(record)}>
            详情
          </Button>
          {[2, 3].includes(record.status) && (
            <Auth perm="open:webhooklog:retry">
              <Popconfirm
                title="确认重试该投递?"
                okText="重试"
                cancelText="取消"
                onConfirm={() => handleRetry(record)}
              >
                <Button type="link" size="small">
                  重试
                </Button>
              </Popconfirm>
            </Auth>
          )}
        </Space>
      ),
    },
  ]

  return (
    <>
      <ProTable<OpenWebhookEvent>
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        scroll={{ x: 'max-content' }}
        request={async ({ current, pageSize, ...params }) => {
          const res = await listWebhookEvents({
            page: current,
            page_size: pageSize,
            webhook_id: params.webhook_id ? Number(params.webhook_id) : undefined,
            event_type: params.event_type,
            status: params.status !== undefined && params.status !== null ? Number(params.status) : undefined,
          })
          return { data: res?.list ?? [], total: res?.total ?? 0, success: true }
        }}
        pagination={{ defaultPageSize: 20, showSizeChanger: true }}
        headerTitle="Webhook 投递日志"
      />
      <Drawer
        title={`投递详情 #${detail?.id ?? ''}`}
        width={560}
        open={!!detail}
        onClose={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="Webhook">{webhookName(detail.webhook_id)}</Descriptions.Item>
              <Descriptions.Item label="事件">
                <Tag color="blue">{detail.event_type}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={(statusMap[detail.status] ?? { color: 'default' }).color}>
                  {(statusMap[detail.status] ?? { text: String(detail.status) }).text}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="尝试次数">
                {detail.retry_count}/{detail.max_retries}
              </Descriptions.Item>
              <Descriptions.Item label="HTTP 状态码">
                {detail.last_http_status ?? '-'}
              </Descriptions.Item>
              <Descriptions.Item label="最近错误">{detail.last_error || '-'}</Descriptions.Item>
              <Descriptions.Item label="投递成功时间">{detail.delivered_at ?? '-'}</Descriptions.Item>
            </Descriptions>
            <pre
              style={{
                marginTop: 16,
                background: '#f5f5f5',
                padding: 12,
                borderRadius: 6,
                fontSize: 12,
                maxHeight: 320,
                overflow: 'auto',
              }}
            >
              {(() => {
                try {
                  return JSON.stringify(JSON.parse(detail.payload), null, 2)
                } catch {
                  return detail.payload
                }
              })()}
            </pre>
          </>
        )}
      </Drawer>
    </>
  )
}
