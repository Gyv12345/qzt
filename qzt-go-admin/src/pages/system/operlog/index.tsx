import { useRef, useState } from 'react'
import { App, Badge, Button, Descriptions, Drawer, Popconfirm, Space, Tag, Typography } from 'antd'
import { ClearOutlined } from '@ant-design/icons'
import { ProTable, type ActionType, type ProColumns } from '@ant-design/pro-components'
import dayjs from 'dayjs'
import Auth from '../../../components/Auth'
import {
  clearOperationLogs,
  deleteOperationLog,
  listOperationLogs,
} from '../../../services/system'
import type { OperationLogQuery, SysOperationLog } from '../../../types'

const LongText = ({ text }: { text: string }) =>
  text ? (
    <Typography.Paragraph
      copyable={{ text }}
      style={{
        maxHeight: 200,
        overflow: 'auto',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-all',
        marginBottom: 0,
      }}
    >
      {text}
    </Typography.Paragraph>
  ) : (
    <span>-</span>
  )

export default function OperLogPage() {
  const { message } = App.useApp()
  const actionRef = useRef<ActionType>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [current, setCurrent] = useState<SysOperationLog | null>(null)

  const openDetail = (record: SysOperationLog) => {
    setCurrent(record)
    setDetailOpen(true)
  }

  const handleDelete = async (record: SysOperationLog) => {
    await deleteOperationLog(record.id)
    message.success('日志已删除')
    actionRef.current?.reload()
  }

  const handleClear = async () => {
    await clearOperationLogs()
    message.success('操作日志已清空')
    actionRef.current?.reload()
  }

  const columns: ProColumns<SysOperationLog>[] = [
    { title: '编号', valueType: 'indexBorder', width: 70, search: false },
    { title: '用户名', dataIndex: 'username', hideInTable: true },
    { title: '模块', dataIndex: 'module', hideInTable: true },
    { title: 'IP', dataIndex: 'client_ip', hideInTable: true },
    { title: '关键字', dataIndex: 'keyword', hideInTable: true },
    {
      title: '结果',
      dataIndex: 'success',
      hideInTable: true,
      valueType: 'select',
      valueEnum: {
        true: { text: '成功' },
        false: { text: '失败' },
      },
    },
    {
      title: '操作时间',
      dataIndex: 'time_range',
      hideInTable: true,
      valueType: 'dateTimeRange',
    },
    { title: '用户名', dataIndex: 'username', width: 100, search: false },
    {
      title: '模块',
      dataIndex: 'module',
      width: 110,
      search: false,
      render: (_, r) => <Tag>{r.module}</Tag>,
    },
    { title: '操作', dataIndex: 'action', width: 160, search: false },
    {
      title: '请求',
      dataIndex: 'method',
      width: 200,
      search: false,
      render: (_, r) => (
        <span>
          <Tag color="blue">{r.method}</Tag>
          {r.path}
        </span>
      ),
    },
    { title: 'IP', dataIndex: 'client_ip', width: 120, search: false },
    {
      title: '结果',
      dataIndex: 'success',
      search: false,
      width: 80,
      render: (_, r) =>
        r.success ? <Badge status="success" text="成功" /> : <Badge status="error" text="失败" />,
    },
    { title: 'HTTP 状态', dataIndex: 'status', search: false, width: 80 },
    { title: '业务码', dataIndex: 'biz_code', search: false, width: 80 },
    {
      title: '耗时',
      dataIndex: 'latency_ms',
      search: false,
      width: 90,
      render: (_, r) => `${r.latency_ms} ms`,
    },
    { title: '操作时间', dataIndex: 'created_at', valueType: 'dateTime', search: false, width: 170 },
    {
      title: '操作',
      valueType: 'option',
      width: 130,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" onClick={() => openDetail(record)}>
            详情
          </Button>
          <Auth perm="system:operlog:delete">
            <Popconfirm
              title="确认删除该日志?"
              okText="删除"
              okButtonProps={{ danger: true }}
              cancelText="取消"
              onConfirm={() => handleDelete(record)}
            >
              <Button type="link" size="small" danger>
                删除
              </Button>
            </Popconfirm>
          </Auth>
        </Space>
      ),
    },
  ]

  return (
    <>
      <ProTable<SysOperationLog, OperationLogQuery & { time_range?: string[] }>
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        scroll={{ x: 'max-content' }}
        request={async ({ current: page, pageSize, time_range, ...rest }) => {
          const params: OperationLogQuery = { page, page_size: pageSize, ...rest }
          if (time_range?.length === 2) {
            params.start_time = dayjs(time_range[0]).format('YYYY-MM-DD HH:mm:ss')
            params.end_time = dayjs(time_range[1]).format('YYYY-MM-DD HH:mm:ss')
          }
          const res = await listOperationLogs(params)
          return { data: res.list, total: res.total, success: true }
        }}
        pagination={{ defaultPageSize: 10, showSizeChanger: true }}
        toolBarRender={() => [
          <Auth perm="system:operlog:clear" key="clear">
            <Popconfirm
              title="确认清空全部操作日志?"
              okText="清空"
              okButtonProps={{ danger: true }}
              cancelText="取消"
              onConfirm={handleClear}
            >
              <Button danger icon={<ClearOutlined />}>
                清空日志
              </Button>
            </Popconfirm>
          </Auth>,
        ]}
        headerTitle="操作日志"
      />
      <Drawer
        title="日志详情"
        width={640}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        destroyOnHidden
      >
        {current && (
          <>
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="ID">{current.id}</Descriptions.Item>
              <Descriptions.Item label="Trace ID">
                <Typography.Text copyable>{current.trace_id}</Typography.Text>
              </Descriptions.Item>
              <Descriptions.Item label="用户">
                {current.username} (ID: {current.user_id})
              </Descriptions.Item>
              <Descriptions.Item label="模块/操作">
                {current.module} / {current.action}
              </Descriptions.Item>
              <Descriptions.Item label="请求">
                <Tag color="blue">{current.method}</Tag>
                {current.route}
              </Descriptions.Item>
              <Descriptions.Item label="路径">{current.path}</Descriptions.Item>
              <Descriptions.Item label="IP">{current.client_ip}</Descriptions.Item>
              <Descriptions.Item label="User-Agent">{current.user_agent || '-'}</Descriptions.Item>
              <Descriptions.Item label="结果">
                {current.success ? (
                  <Badge status="success" text="成功" />
                ) : (
                  <Badge status="error" text="失败" />
                )}
              </Descriptions.Item>
              <Descriptions.Item label="HTTP 状态">{current.status}</Descriptions.Item>
              <Descriptions.Item label="业务码">{current.biz_code}</Descriptions.Item>
              <Descriptions.Item label="耗时">{current.latency_ms} ms</Descriptions.Item>
              <Descriptions.Item label="目标 ID">{current.target_id || '-'}</Descriptions.Item>
              <Descriptions.Item label="操作时间">{current.created_at}</Descriptions.Item>
            </Descriptions>
            <Typography.Title level={5} style={{ marginTop: 16 }}>
              请求参数
            </Typography.Title>
            <LongText text={current.req_params} />
            <Typography.Title level={5} style={{ marginTop: 16 }}>
              响应参数
            </Typography.Title>
            <LongText text={current.resp_params} />
            <Typography.Title level={5} style={{ marginTop: 16 }}>
              错误信息
            </Typography.Title>
            <LongText text={current.error_msg} />
          </>
        )}
      </Drawer>
    </>
  )
}
