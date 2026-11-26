import { useRef, useState } from 'react'
import { App, Button, Popconfirm, Space, Tag } from 'antd'
import { PlusOutlined, ThunderboltOutlined } from '@ant-design/icons'
import { ProTable, type ActionType, type ProColumns } from '@ant-design/pro-components'
import Auth from '../../../components/Auth'
import AiSceneModal from '../../../components/ai/AiSceneModal'
import { splitDailyReport } from '../../../components/ai/splitDailyReport'
import { useAiEnabled } from '../../../components/ai/useAiEnabled'
import { deleteWorkLog, listWorkLogs } from '../../../services/oa'
import { LOG_TYPE_MAP, type OaWorkLog } from '../../../types/oa'
import WorkLogEditModal from './EditModal'
import { pageIndexColumn } from '../../../components/IndexTag'

export default function WorkLogPage() {
  const { message } = App.useApp()
  const actionRef = useRef<ActionType>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [prefill, setPrefill] = useState<{ content?: string; plan?: string } | undefined>()
  const [aiOpen, setAiOpen] = useState(false)
  const aiEnabled = useAiEnabled()

  const handleDelete = async (id: number) => {
    await deleteWorkLog(id)
    message.success('已删除')
    actionRef.current?.reload()
  }

  const openCreate = (prefill?: { content?: string; plan?: string }) => {
    setPrefill(prefill)
    setEditingId(null)
    setEditOpen(true)
  }

  // AI 日报拆成「今日完成」「明日计划」两个表单字段,直接带进新建日志
  const fillFromAiReport = (output: string) => {
    setAiOpen(false)
    openCreate(splitDailyReport(output))
  }

  const columns: ProColumns<OaWorkLog>[] = [
    pageIndexColumn(actionRef, { width: 60 }),
    { title: '单号', dataIndex: 'log_no', width: 150, search: false },
    {
      title: '类型',
      dataIndex: 'log_type',
      width: 80,
      valueType: 'select',
      valueEnum: {
        DAILY: { text: '日报' },
        WEEKLY: { text: '周报' },
        MONTHLY: { text: '月报' },
      },
      render: (_, r) => <Tag>{LOG_TYPE_MAP[r.log_type] ?? r.log_type}</Tag>,
    },
    {
      title: '日期',
      dataIndex: 'log_date',
      width: 120,
      valueType: 'date',
      render: (_, r) => r.log_date?.slice(0, 10),
    },
    { title: '今日完成', dataIndex: 'content', width: 250, ellipsis: true, search: false },
    { title: '明日计划', dataIndex: 'plan', width: 250, ellipsis: true, search: false },
    { title: '遇到问题', dataIndex: 'problems', width: 200, ellipsis: true, search: false },
    {
      title: '操作',
      valueType: 'option',
      width: 140,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Auth perm="oa:worklog:edit">
            <Button type="link" size="small" onClick={() => { setEditingId(record.id); setEditOpen(true) }}>编辑</Button>
          </Auth>
          <Auth perm="oa:worklog:delete">
            <Popconfirm title="确认删除?" okText="删除" okButtonProps={{ danger: true }} cancelText="取消" onConfirm={() => handleDelete(record.id)}>
              <Button type="link" size="small" danger>删除</Button>
            </Popconfirm>
          </Auth>
        </Space>
      ),
    },
  ]

  return (
    <>
      <ProTable<OaWorkLog>
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        scroll={{ x: 'max-content' }}
        request={async (params) => {
          const { current, pageSize, ...rest } = params
          const data = await listWorkLogs({ page: current || 1, page_size: pageSize || 10, ...rest })
          return { data: data.list, total: data.total, success: true }
        }}
        toolBarRender={() => [
          aiEnabled && (
            <Button key="ai" icon={<ThunderboltOutlined />} onClick={() => setAiOpen(true)}>
              AI 日报
            </Button>
          ),
          <Auth perm="oa:worklog:add" key="add">
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openCreate()}>新增日志</Button>
          </Auth>,
        ]}
        headerTitle="工作日志"
      />
      <WorkLogEditModal
        open={editOpen}
        editingId={editingId}
        prefill={prefill}
        onOpenChange={setEditOpen}
        onSuccess={() => {
          setPrefill(undefined)
          actionRef.current?.reload()
        }}
      />
      <AiSceneModal
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        scenario="daily-report"
        title="AI 日报"
        description="根据你今日的跟进记录、新建客户、新建合同与已办审批生成,可填入新建日志后修改。"
        renderActions={(output) => (
          <Auth perm="oa:worklog:add">
            <Button type="primary" onClick={() => fillFromAiReport(output)}>
              填入新建日志
            </Button>
          </Auth>
        )}
      />
    </>
  )
}
