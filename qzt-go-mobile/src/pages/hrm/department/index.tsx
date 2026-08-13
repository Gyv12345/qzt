import { useEffect, useState } from 'react'
import { Dialog, FloatingBubble, List, NavBar, PullToRefresh, Toast } from 'antd-mobile'
import { AddOutline } from 'antd-mobile-icons'
import { useNavigate } from 'react-router-dom'
import { createDepartment, deleteDepartment, listDepartments, updateDepartment } from '../../../services/hrm'
import type { HrmDepartment } from '../../../types/hrm'
import FormSheet from '../../../components/FormSheet'

export default function DepartmentList() {
  const navigate = useNavigate()
  const [list, setList] = useState<HrmDepartment[]>([])
  const [showNew, setShowNew] = useState(false)
  const [editing, setEditing] = useState<HrmDepartment | null>(null)
  const [parents, setParents] = useState<HrmDepartment[]>([])

  const reload = () => listDepartments().then((r) => setList(r.list || [])).catch(() => {})
  useEffect(() => {
    reload()
  }, [])

  const openForm = (dept?: HrmDepartment) => {
    listDepartments()
      .then((r) => setParents(r.list || []))
      .catch(() => {})
    setEditing(dept || null)
    setShowNew(true)
  }

  const onDelete = async (d: HrmDepartment) => {
    const ok = await Dialog.confirm({ content: `确定删除部门「${d.name}」?` })
    if (!ok) return
    try {
      await deleteDepartment(d.id)
      Toast.show({ icon: 'success', content: '已删除' })
      reload()
    } catch {
    }
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%' }}>
      <NavBar onBack={() => navigate(-1)}>部门管理</NavBar>
      <PullToRefresh onRefresh={reload}>
        <List>
          {list.map((d) => (
            <List.Item
              key={d.id}
              description={<span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{d.code} · {d.status === 1 ? '正常' : '禁用'}</span>}
              extra={
                <div style={{ fontSize: 12 }}>
                  <a style={{ color: 'var(--brand)' }} onClick={(e) => { e.stopPropagation(); openForm(d) }}>编辑</a>
                  <span style={{ color: 'var(--text-tertiary)', margin: '0 6px' }}>/</span>
                  <a style={{ color: '#ff4d4f' }} onClick={(e) => { e.stopPropagation(); onDelete(d) }}>删除</a>
                </div>
              }
            >
              {d.name}
            </List.Item>
          ))}
          {list.length === 0 && <List.Item><span style={{ color: 'var(--text-tertiary)' }}>暂无部门</span></List.Item>}
        </List>
      </PullToRefresh>

      <FloatingBubble style={{ '--size': '48px' } as any} onClick={() => openForm()}>
        <AddOutline fontSize={24} />
      </FloatingBubble>

      <FormSheet
        visible={showNew}
        title={editing ? '编辑部门' : '新建部门'}
        fields={[
          { name: 'name', label: '名称', type: 'text', required: true },
          { name: 'code', label: '编码', type: 'text', required: true },
          { name: 'parent_id', label: '上级部门', type: 'select', options: parents.filter((p) => p.id !== editing?.id).map((p) => ({ label: p.name, value: p.id })) },
          { name: 'sort', label: '排序', type: 'number' },
          { name: 'status', label: '状态', type: 'select', options: [{ label: '正常', value: 1 }, { label: '禁用', value: 0 }] },
        ]}
        initialValues={editing ? { name: editing.name, code: editing.code, parent_id: editing.parent_id || undefined, sort: editing.sort, status: editing.status } : undefined}
        onClose={() => { setShowNew(false); setEditing(null) }}
        onSubmit={async (v) => {
          const payload = {
            name: v.name,
            code: v.code,
            parent_id: v.parent_id != null ? Number(v.parent_id) : undefined,
            sort: v.sort ? Number(v.sort) : undefined,
            status: v.status != null ? Number(v.status) : undefined,
          }
          if (editing) await updateDepartment(editing.id, payload)
          else await createDepartment(payload)
          setEditing(null)
          reload()
        }}
      />
    </div>
  )
}
