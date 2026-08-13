import { useCallback, useState } from 'react'
import { InfiniteScroll, NavBar, PullToRefresh, Tag, FloatingBubble, Card, Button, Dialog, Toast } from 'antd-mobile'
import { AddOutline } from 'antd-mobile-icons'
import { useNavigate } from 'react-router-dom'
import { createWorkLog, deleteWorkLog, listWorkLogs, updateWorkLog } from '../../services/oa'
import { useInfiniteList } from '../../hooks/useInfiniteList'
import FormSheet, { type FormField } from '../../components/FormSheet'

const LOG_TYPE: Record<string, string> = { DAILY: '日报', WEEKLY: '周报', MONTHLY: '月报' }

const FIELDS: FormField[] = [
  {
    name: 'log_type', label: '类型', type: 'select',
    options: [{ label: '日报', value: 'DAILY' }, { label: '周报', value: 'WEEKLY' }, { label: '月报', value: 'MONTHLY' }],
  },
  { name: 'log_date', label: '日期', type: 'date', datePrecision: 'date', required: true },
  { name: 'content', label: '今日完成', type: 'textarea' },
  { name: 'plan', label: '明日计划', type: 'textarea' },
  { name: 'problems', label: '遇到问题', type: 'textarea' },
]

export default function WorkLogList() {
  const navigate = useNavigate()
  const [showNew, setShowNew] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const fetcher = useCallback((params: { page: number; page_size: number }) => listWorkLogs(params), [])
  const { list, hasMore, loadMore, refresh } = useInfiniteList<any>(fetcher, { page_size: 20 })

  const onDelete = async (log: any) => {
    const ok = await Dialog.confirm({ content: '确定删除该日志?' })
    if (!ok) return
    try {
      await deleteWorkLog(log.id)
      Toast.show({ icon: 'success', content: '已删除' })
      refresh()
    } catch {
    }
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%' }}>
      <NavBar onBack={() => navigate(-1)}>工作日志</NavBar>
      <PullToRefresh onRefresh={refresh}>
        <div style={{ padding: 8 }}>
          {list.map((log) => (
            <Card key={log.id} style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontWeight: 600 }}>{log.log_date?.slice(0, 10)}</span>
                <Tag color="primary" fill="outline">{LOG_TYPE[log.log_type] || log.log_type}</Tag>
              </div>
              {log.content && <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>✅ {log.content?.slice(0, 50)}</div>}
              {log.plan && <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>📋 {log.plan?.slice(0, 50)}</div>}
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <Button size="mini" color="primary" fill="none" onClick={() => setEditing(log)}>编辑</Button>
                <Button size="mini" color="danger" fill="none" onClick={() => onDelete(log)}>删除</Button>
              </div>
            </Card>
          ))}
          {list.length === 0 && <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: 40 }}>暂无日志</div>}
        </div>
        <InfiniteScroll loadMore={loadMore} hasMore={hasMore} />
      </PullToRefresh>

      <FloatingBubble style={{ '--size': '48px' } as any} onClick={() => setShowNew(true)}>
        <AddOutline fontSize={24} />
      </FloatingBubble>

      <FormSheet
        visible={showNew || !!editing}
        title={editing ? '编辑工作日志' : '写工作日志'}
        fields={FIELDS}
        initialValues={
          editing
            ? { log_type: editing.log_type, log_date: editing.log_date?.slice(0, 10), content: editing.content, plan: editing.plan, problems: editing.problems }
            : undefined
        }
        onClose={() => {
          setShowNew(false)
          setEditing(null)
        }}
        onSubmit={async (vals) => {
          const payload = {
            log_type: vals.log_type,
            log_date: vals.log_date,
            content: vals.content || undefined,
            plan: vals.plan || undefined,
            problems: vals.problems || undefined,
          }
          if (editing) await updateWorkLog(editing.id, payload)
          else await createWorkLog(payload as any)
          setEditing(null)
          refresh()
        }}
      />
    </div>
  )
}
