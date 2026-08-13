import { useCallback, useState } from 'react'
import { Dialog, FloatingBubble, InfiniteScroll, List, NavBar, PullToRefresh, SearchBar, Tag, Toast } from 'antd-mobile'
import { AddOutline } from 'antd-mobile-icons'
import { useNavigate } from 'react-router-dom'
import { createEmployee, deleteEmployee, listEmployees, updateEmployee } from '../../../services/hrm'
import type { HrmEmployee } from '../../../types/hrm'
import { EMPLOYEE_STATUS } from '../../../types/hrm'
import { useInfiniteList } from '../../../hooks/useInfiniteList'
import FormSheet from '../../../components/FormSheet'

const GENDER_OPTIONS = [
  { label: '男', value: 1 },
  { label: '女', value: 2 },
]
const STATUS_OPTIONS = [
  { label: '在职', value: 1 },
  { label: '试用', value: 2 },
  { label: '离职', value: 3 },
]

export default function EmployeeList() {
  const navigate = useNavigate()
  const [keyword, setKeyword] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [editing, setEditing] = useState<HrmEmployee | null>(null)
  const fetcher = useCallback(
    (params: { page: number; page_size: number }) => listEmployees({ ...params, keyword: keyword || undefined }),
    [keyword],
  )
  const { list, hasMore, loadMore, refresh } = useInfiniteList<HrmEmployee>(fetcher, { page_size: 20 })

  const onDelete = async (e: HrmEmployee) => {
    const ok = await Dialog.confirm({ content: `确定删除员工「${e.name}」?` })
    if (!ok) return
    try {
      await deleteEmployee(e.id)
      Toast.show({ icon: 'success', content: '已删除' })
      refresh()
    } catch {
    }
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%' }}>
      <NavBar onBack={() => navigate(-1)}>员工管理</NavBar>
      <div style={{ padding: 8, background: 'var(--bg-card)' }}>
        <SearchBar placeholder="搜索姓名/工号" value={keyword} onChange={setKeyword} onSearch={() => refresh()} onClear={() => { setKeyword(''); refresh() }} />
      </div>
      <PullToRefresh onRefresh={refresh}>
        <List>
          {list.map((e) => (
            <List.Item
              key={e.id}
              onClick={() => navigate(`/hrm/employee/${e.id}`)}
              description={<span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{e.emp_no} · {e.department_name || '-'} · {e.position_name || '-'}</span>}
              extra={
                <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Tag color={e.status === 1 ? 'success' : e.status === 2 ? 'warning' : 'default'} fill="outline">{EMPLOYEE_STATUS[e.status] || '未知'}</Tag>
                  <a style={{ color: 'var(--brand)', fontSize: 12 }} onClick={(ev) => { ev.stopPropagation(); setEditing(e) }}>编辑</a>
                  <a style={{ color: '#ff4d4f', fontSize: 12 }} onClick={(ev) => { ev.stopPropagation(); onDelete(e) }}>删除</a>
                </span>
              }
            >
              {e.name} {e.phone ? `· ${e.phone}` : ''}
            </List.Item>
          ))}
          {list.length === 0 && <List.Item><span style={{ color: 'var(--text-tertiary)' }}>暂无员工</span></List.Item>}
        </List>
        <InfiniteScroll loadMore={loadMore} hasMore={hasMore} />
      </PullToRefresh>

      <FloatingBubble style={{ '--size': '48px' } as any} onClick={() => setShowNew(true)}>
        <AddOutline fontSize={24} />
      </FloatingBubble>

      <FormSheet
        visible={showNew || !!editing}
        title={editing ? '编辑员工' : '新建员工'}
        fields={[
          { name: 'name', label: '姓名', type: 'text', required: true },
          { name: 'emp_no', label: '工号', type: 'text' },
          { name: 'phone', label: '手机号', type: 'text' },
          { name: 'gender', label: '性别', type: 'select', options: GENDER_OPTIONS },
          { name: 'status', label: '状态', type: 'select', options: STATUS_OPTIONS },
        ]}
        initialValues={editing ? { name: editing.name, emp_no: editing.emp_no, phone: editing.phone, gender: editing.gender, status: editing.status } : undefined}
        onClose={() => { setShowNew(false); setEditing(null) }}
        onSubmit={async (v) => {
          const payload = {
            name: v.name,
            emp_no: v.emp_no || undefined,
            phone: v.phone || undefined,
            gender: v.gender ? Number(v.gender) : undefined,
            status: v.status ? Number(v.status) : undefined,
          }
          if (editing) await updateEmployee(editing.id, payload)
          else await createEmployee(payload)
          setEditing(null)
          refresh()
        }}
      />
    </div>
  )
}
