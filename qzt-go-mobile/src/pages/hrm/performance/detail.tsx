import { useEffect, useState } from 'react'
import { Button, Card, ErrorBlock, List, NavBar, SpinLoading, Tag } from 'antd-mobile'
import { useNavigate, useParams } from 'react-router-dom'
import { getPerformance, reviewPerformance, selfReviewPerformance } from '../../../services/hrm'
import type { HrmPerformance, HrmPerfItem } from '../../../types/hrm'
import { PERF_STATUS } from '../../../types/hrm'
import FormSheet from '../../../components/FormSheet'

const GRADE_OPTIONS = [
  { label: 'A', value: 'A' },
  { label: 'B', value: 'B' },
  { label: 'C', value: 'C' },
  { label: 'D', value: 'D' },
]

export default function PerformanceDetail() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const pid = Number(id)
  const [perf, setPerf] = useState<HrmPerformance | null>(null)
  const [items, setItems] = useState<HrmPerfItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [showSelf, setShowSelf] = useState(false)
  const [showReview, setShowReview] = useState(false)

  const reload = () => {
    if (!id) return
    setLoading(true)
    setError(false)
    getPerformance(pid)
      .then((res) => {
        setPerf(res.performance)
        setItems(res.items || [])
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }
  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%' }}>
      <NavBar onBack={() => navigate(-1)}>考核详情</NavBar>
      {loading ? (
        <div style={{ textAlign: 'center', padding: 48 }}><SpinLoading /></div>
      ) : error || !perf ? (
        <ErrorBlock status="empty" description="加载失败" />
      ) : (
        <div style={{ padding: 12 }}>
          <Card title="基本信息">
            <div style={{ fontSize: 14, lineHeight: 2 }}>
              <div>标题:{perf.title}</div>
              <div>编号:{perf.perf_no}</div>
              <div>被考核人:{perf.employee_name}</div>
              <div>周期:{perf.period || '-'}</div>
              <div>状态:<Tag color={PERF_STATUS[perf.status]?.color} fill="outline">{PERF_STATUS[perf.status]?.text}</Tag></div>
              <div>时间:{perf.start_date?.slice(0, 10)} ~ {perf.end_date?.slice(0, 10)}</div>
            </div>
          </Card>

          {items.length > 0 && (
            <Card title={`考核项(${items.length})`} style={{ marginTop: 12 }}>
              <List>
                {items.map((it, i) => (
                  <List.Item
                    key={i}
                    description={`权重 ${it.weight || '-'}%${it.target_desc ? ` · ${it.target_desc}` : ''}`}
                    extra={<span style={{ fontSize: 12 }}>自评 {it.self_score || '-'} / 评审 {it.review_score || '-'}</span>}
                  >
                    {it.item_name}
                  </List.Item>
                ))}
              </List>
            </Card>
          )}

          <Card title="评分" style={{ marginTop: 12 }}>
            <div style={{ fontSize: 14, lineHeight: 2 }}>
              <div>自评得分:{perf.self_score || '-'}</div>
              {perf.self_comment && <div>自评说明:{perf.self_comment}</div>}
              <div>上级评分:{perf.review_score || '-'}</div>
              {perf.review_comment && <div>评审意见:{perf.review_comment}</div>}
              <div>最终得分:<span style={{ color: '#ff4d4f', fontWeight: 600 }}>{perf.final_score || '-'}</span> {perf.grade ? `· ${perf.grade}` : ''}</div>
            </div>
          </Card>

          {(perf.status === 1 || perf.status === 2) && (
            <Button block color="primary" fill="outline" style={{ marginTop: 12 }} onClick={() => setShowSelf(true)}>员工自评</Button>
          )}
          {(perf.status === 3 || perf.status === 4) && (
            <Button block color="primary" style={{ marginTop: 12 }} onClick={() => setShowReview(true)}>上级评分</Button>
          )}

          <FormSheet
            visible={showSelf}
            title="员工自评"
            fields={[
              { name: 'self_score', label: '自评得分', type: 'number', required: true },
              { name: 'self_comment', label: '自评说明', type: 'textarea' },
            ]}
            onClose={() => setShowSelf(false)}
            onSubmit={async (v) => {
              await selfReviewPerformance(pid, { self_score: String(v.self_score), self_comment: v.self_comment || undefined })
              reload()
            }}
          />
          <FormSheet
            visible={showReview}
            title="上级评分"
            fields={[
              { name: 'review_score', label: '上级评分', type: 'number', required: true },
              { name: 'final_score', label: '最终得分', type: 'number' },
              { name: 'grade', label: '等级', type: 'select', options: GRADE_OPTIONS },
              { name: 'review_comment', label: '评审意见', type: 'textarea' },
            ]}
            onClose={() => setShowReview(false)}
            onSubmit={async (v) => {
              await reviewPerformance(pid, {
                review_score: String(v.review_score),
                final_score: v.final_score ? String(v.final_score) : undefined,
                grade: v.grade || undefined,
                review_comment: v.review_comment || undefined,
              })
              reload()
            }}
          />
        </div>
      )}
    </div>
  )
}
