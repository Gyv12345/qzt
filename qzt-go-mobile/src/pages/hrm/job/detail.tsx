import { useEffect, useState } from 'react'
import { Card, Dialog, ErrorBlock, FloatingBubble, List, NavBar, SpinLoading, Tag, Toast } from 'antd-mobile'
import { AddOutline } from 'antd-mobile-icons'
import { useNavigate, useParams } from 'react-router-dom'
import { createCandidate, deleteCandidate, getJob, listCandidates, updateCandidate } from '../../../services/hrm'
import type { HrmCandidate, HrmJob } from '../../../types/hrm'
import { CANDIDATE_STATUS, JOB_STATUS } from '../../../types/hrm'
import FormSheet, { type FormField } from '../../../components/FormSheet'

const GENDER_OPTS = [{ label: '男', value: '男' }, { label: '女', value: '女' }]

const candFields: FormField[] = [
  { name: 'name', label: '姓名', type: 'text', required: true },
  { name: 'phone', label: '电话', type: 'text' },
  { name: 'email', label: '邮箱', type: 'text' },
  { name: 'gender', label: '性别', type: 'select', options: GENDER_OPTS },
  { name: 'age', label: '年龄', type: 'number' },
  { name: 'education', label: '学历', type: 'text' },
  { name: 'experience', label: '工作年限', type: 'text' },
  { name: 'company', label: '当前公司', type: 'text' },
  { name: 'source', label: '来源', type: 'text' },
  { name: 'status', label: '状态', type: 'select', options: Object.entries(CANDIDATE_STATUS).map(([k, v]) => ({ label: v.text, value: Number(k) })) },
  { name: 'remark', label: '备注', type: 'textarea' },
]

export default function JobDetail() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const jid = Number(id)
  const [job, setJob] = useState<HrmJob | null>(null)
  const [cands, setCands] = useState<HrmCandidate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<HrmCandidate | null>(null)

  const reloadCands = () =>
    listCandidates({ page: 1, page_size: 100, job_id: jid })
      .then((c) => setCands(c.list || []))
      .catch(() => {})

  useEffect(() => {
    if (!id) return
    setLoading(true)
    setError(false)
    Promise.all([getJob(jid), listCandidates({ page: 1, page_size: 100, job_id: jid })])
      .then(([j, c]) => {
        setJob(j)
        setCands(c.list || [])
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [id])

  const onDeleteCand = async (c: HrmCandidate) => {
    const ok = await Dialog.confirm({ content: `确定删除候选人「${c.name}」?` })
    if (!ok) return
    try {
      await deleteCandidate(c.id)
      Toast.show({ icon: 'success', content: '已删除' })
      reloadCands()
    } catch {
    }
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%' }}>
      <NavBar onBack={() => navigate(-1)}>职位详情</NavBar>
      {loading ? (
        <div style={{ textAlign: 'center', padding: 48 }}><SpinLoading /></div>
      ) : error || !job ? (
        <ErrorBlock status="empty" description="加载失败" />
      ) : (
        <div style={{ padding: 12, paddingBottom: 80 }}>
          <Card title="职位信息">
            <div style={{ fontSize: 14, lineHeight: 2 }}>
              <div>职位:{job.title}</div>
              <div>编号:{job.job_no}</div>
              <div>部门:{job.dept_name || '-'}</div>
              <div>招聘:{job.headcount}人{job.salary_range ? ` · ${job.salary_range}` : ''}</div>
              <div>状态:<Tag color={JOB_STATUS[job.status]?.color} fill="outline">{JOB_STATUS[job.status]?.text}</Tag></div>
              {job.education && <div>学历:{job.education}</div>}
              {job.experience && <div>经验:{job.experience}</div>}
              {job.description && <div>描述:{job.description}</div>}
            </div>
          </Card>

          <Card title={`候选人(${cands.length})`} style={{ marginTop: 12 }}>
            <List>
              {cands.map((c) => {
                const st = CANDIDATE_STATUS[c.status] || CANDIDATE_STATUS[1]
                return (
                  <List.Item
                    key={c.id}
                    description={<span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{c.phone || '-'}{c.company ? ` · ${c.company}` : ''}</span>}
                    extra={
                      <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                        <Tag color={st.color} fill="outline">{st.text}</Tag>
                        <div style={{ fontSize: 12 }}>
                          <a style={{ color: 'var(--brand)' }} onClick={(e) => { e.stopPropagation(); setEditing(c); setShowForm(true) }}>编辑</a>
                          <span style={{ color: 'var(--text-tertiary)', margin: '0 6px' }}>/</span>
                          <a style={{ color: '#ff4d4f' }} onClick={(e) => { e.stopPropagation(); onDeleteCand(c) }}>删除</a>
                        </div>
                      </span>
                    }
                  >
                    {c.name}{c.age ? ` · ${c.age}岁` : ''}
                  </List.Item>
                )
              })}
              {cands.length === 0 && <List.Item><span style={{ color: 'var(--text-tertiary)' }}>暂无候选人</span></List.Item>}
            </List>
          </Card>
        </div>
      )}

      <FloatingBubble style={{ '--size': '48px' } as any} onClick={() => { setEditing(null); setShowForm(true) }}>
        <AddOutline fontSize={24} />
      </FloatingBubble>

      <FormSheet
        visible={showForm}
        title={editing ? '编辑候选人' : '新增候选人'}
        fields={candFields}
        initialValues={
          editing
            ? { name: editing.name, phone: editing.phone, email: editing.email, gender: editing.gender || undefined, age: editing.age, education: editing.education, experience: editing.experience, company: editing.company, source: editing.source, status: editing.status, remark: editing.remark }
            : undefined
        }
        onClose={() => { setShowForm(false); setEditing(null) }}
        onSubmit={async (v) => {
          const payload = {
            name: v.name,
            phone: v.phone || undefined,
            email: v.email || undefined,
            gender: v.gender || undefined,
            age: v.age ? Number(v.age) : undefined,
            education: v.education || undefined,
            experience: v.experience || undefined,
            company: v.company || undefined,
            source: v.source || undefined,
            remark: v.remark || undefined,
          }
          if (editing) {
            await updateCandidate(editing.id, { ...payload, status: v.status != null ? Number(v.status) : undefined })
          } else {
            await createCandidate({ job_id: jid, ...payload })
          }
          setEditing(null)
          reloadCands()
        }}
      />
    </div>
  )
}
