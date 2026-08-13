import { useCallback, useState } from 'react'
import { Dialog, FloatingBubble, InfiniteScroll, List, NavBar, PullToRefresh, Tag, Toast } from 'antd-mobile'
import { AddOutline } from 'antd-mobile-icons'
import { useNavigate } from 'react-router-dom'
import { createJob, deleteJob, listDepartments, listJobs, updateJob } from '../../../services/hrm'
import type { HrmDepartment, HrmJob } from '../../../types/hrm'
import { JOB_STATUS } from '../../../types/hrm'
import { useInfiniteList } from '../../../hooks/useInfiniteList'
import FormSheet from '../../../components/FormSheet'

export default function JobList() {
  const navigate = useNavigate()
  const [showNew, setShowNew] = useState(false)
  const [editing, setEditing] = useState<HrmJob | null>(null)
  const [depts, setDepts] = useState<HrmDepartment[]>([])
  const fetcher = useCallback((params: { page: number; page_size: number }) => listJobs(params), [])
  const { list, hasMore, loadMore, refresh } = useInfiniteList<HrmJob>(fetcher, { page_size: 20 })

  const openForm = (job?: HrmJob) => {
    listDepartments()
      .then((r) => setDepts(r.list || []))
      .catch(() => {})
    setEditing(job || null)
    setShowNew(true)
  }

  const onDelete = async (j: HrmJob) => {
    const ok = await Dialog.confirm({ content: `确定删除职位「${j.title}」?` })
    if (!ok) return
    try {
      await deleteJob(j.id)
      Toast.show({ icon: 'success', content: '已删除' })
      refresh()
    } catch {
    }
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%' }}>
      <NavBar onBack={() => navigate(-1)}>招聘职位</NavBar>
      <PullToRefresh onRefresh={refresh}>
        <List>
          {list.map((j) => {
            const st = JOB_STATUS[j.status] || JOB_STATUS[1]
            return (
              <List.Item
                key={j.id}
                onClick={() => navigate(`/hrm/job/${j.id}`)}
                description={<span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{j.job_no} · {j.dept_name || '-'} · 招{j.headcount}人{j.salary_range ? ` · ${j.salary_range}` : ''}</span>}
                extra={
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    <Tag color={st.color} fill="outline">{st.text}</Tag>
                    <div style={{ fontSize: 12 }}>
                      <a style={{ color: 'var(--brand)' }} onClick={(e) => { e.stopPropagation(); openForm(j) }}>编辑</a>
                      <span style={{ color: 'var(--text-tertiary)', margin: '0 6px' }}>/</span>
                      <a style={{ color: '#ff4d4f' }} onClick={(e) => { e.stopPropagation(); onDelete(j) }}>删除</a>
                    </div>
                  </div>
                }
              >
                {j.title}
              </List.Item>
            )
          })}
          {list.length === 0 && <List.Item><span style={{ color: 'var(--text-tertiary)' }}>暂无职位</span></List.Item>}
        </List>
        <InfiniteScroll loadMore={loadMore} hasMore={hasMore} />
      </PullToRefresh>

      <FloatingBubble style={{ '--size': '48px' } as any} onClick={() => openForm()}>
        <AddOutline fontSize={24} />
      </FloatingBubble>

      <FormSheet
        visible={showNew}
        title={editing ? '编辑职位' : '新建职位'}
        fields={[
          { name: 'title', label: '职位名称', type: 'text', required: true },
          { name: 'dept_id', label: '所属部门', type: 'select', options: depts.map((d) => ({ label: d.name, value: d.id })) },
          { name: 'headcount', label: '招聘人数', type: 'number' },
          { name: 'salary_range', label: '薪资范围', type: 'text' },
          { name: 'education', label: '学历要求', type: 'text' },
          { name: 'experience', label: '经验要求', type: 'text' },
          { name: 'description', label: '职位描述', type: 'textarea' },
        ]}
        initialValues={editing ? { title: editing.title, dept_id: editing.dept_id || undefined, headcount: editing.headcount, salary_range: editing.salary_range, education: editing.education, experience: editing.experience, description: editing.description } : undefined}
        onClose={() => { setShowNew(false); setEditing(null) }}
        onSubmit={async (v) => {
          const dept = depts.find((d) => d.id === Number(v.dept_id))
          const payload = {
            title: v.title,
            dept_id: v.dept_id != null ? Number(v.dept_id) : undefined,
            dept_name: dept?.name,
            headcount: v.headcount ? Number(v.headcount) : undefined,
            salary_range: v.salary_range || undefined,
            education: v.education || undefined,
            experience: v.experience || undefined,
            description: v.description || undefined,
          }
          if (editing) await updateJob(editing.id, payload)
          else await createJob(payload)
          setEditing(null)
          refresh()
        }}
      />
    </div>
  )
}
