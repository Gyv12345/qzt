import { useCallback, useState } from 'react'
import { InfiniteScroll, NavBar, PullToRefresh, Tag, FloatingBubble, Card } from 'antd-mobile'
import { AddOutline } from 'antd-mobile-icons'
import { useNavigate } from 'react-router-dom'
import { listWorkLogs, createWorkLog } from '../../services/oa'
import { useInfiniteList } from '../../hooks/useInfiniteList'
import FormSheet from '../../components/FormSheet'

const LOG_TYPE: Record<string, string> = { DAILY: '日报', WEEKLY: '周报', MONTHLY: '月报' }

export default function WorkLogList() {
  const navigate = useNavigate()
  const [showNew, setShowNew] = useState(false)
  const fetcher = useCallback((params: { page: number; page_size: number }) => listWorkLogs(params), [])
  const { list, hasMore, loadMore, refresh } = useInfiniteList<any>(fetcher, { page_size: 20 })

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%' }}>
      <NavBar onBack={() => navigate(-1)}>工作日志</NavBar>
      <PullToRefresh onRefresh={refresh}>
        <div style={{ padding: 8 }}>
          {list.map((log) => (
            <Card key={log.id} style={{ marginBottom: 8 }} onClick={() => {}}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontWeight: 600 }}>{log.log_date?.slice(0, 10)}</span>
                <Tag color="primary" fill="outline">{LOG_TYPE[log.log_type] || log.log_type}</Tag>
              </div>
              {log.content && <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>✅ {log.content?.slice(0, 50)}</div>}
              {log.plan && <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>📋 {log.plan?.slice(0, 50)}</div>}
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
        visible={showNew}
        title="写工作日志"
        onClose={() => setShowNew(false)}
        fields={[
          { name: 'log_type', label: '类型', type: 'select', defaultValue: 'DAILY', options: [
            { label: '日报', value: 'DAILY' }, { label: '周报', value: 'WEEKLY' }, { label: '月报', value: 'MONTHLY' },
          ] },
          { name: 'log_date', label: '日期(YYYY-MM-DD)', type: 'text', required: true, defaultValue: new Date().toISOString().slice(0, 10) },
          { name: 'content', label: '今日完成', type: 'textarea' },
          { name: 'plan', label: '明日计划', type: 'textarea' },
          { name: 'problems', label: '遇到问题', type: 'textarea' },
        ]}
        onSubmit={async (vals) => {
          await createWorkLog(vals as any)
          refresh()
        }}
      />
    </div>
  )
}
