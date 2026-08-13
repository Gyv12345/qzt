import { useEffect, useState } from 'react'
import { Dialog, FloatingBubble, List, NavBar, PullToRefresh, Tag, Toast } from 'antd-mobile'
import { AddOutline } from 'antd-mobile-icons'
import { useNavigate } from 'react-router-dom'
import { createPosition, deletePosition, listDepartments, listPositions, updatePosition } from '../../../services/hrm'
import type { HrmDepartment, HrmPosition } from '../../../types/hrm'
import FormSheet from '../../../components/FormSheet'

export default function PositionList() {
  const navigate = useNavigate()
  const [list, setList] = useState<HrmPosition[]>([])
  const [showNew, setShowNew] = useState(false)
  const [editing, setEditing] = useState<HrmPosition | null>(null)
  const [depts, setDepts] = useState<HrmDepartment[]>([])

  const reload = () => listPositions().then((r) => setList(r.list || [])).catch(() => {})
  useEffect(() => {
    reload()
  }, [])

  const openForm = (pos?: HrmPosition) => {
    listDepartments()
      .then((r) => setDepts(r.list || []))
      .catch(() => {})
    setEditing(pos || null)
    setShowNew(true)
  }

  const onDelete = async (p: HrmPosition) => {
    const ok = await Dialog.confirm({ content: `确定删除岗位「${p.name}」?` })
    if (!ok) return
    try {
      await deletePosition(p.id)
      Toast.show({ icon: 'success', content: '已删除' })
      reload()
    } catch {
    }
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%' }}>
      <NavBar onBack={() => navigate(-1)}>岗位管理</NavBar>
      <PullToRefresh onRefresh={reload}>
        <List>
          {list.map((p) => (
            <List.Item
              key={p.id}
              description={<span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{p.code} · {p.department_name || '-'}</span>}
              extra={
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  <Tag color={p.status === 1 ? 'success' : 'default'} fill="outline">{p.status === 1 ? '正常' : '禁用'}</Tag>
                  <div style={{ fontSize: 12 }}>
                    <a style={{ color: 'var(--brand)' }} onClick={(e) => { e.stopPropagation(); openForm(p) }}>编辑</a>
                    <span style={{ color: 'var(--text-tertiary)', margin: '0 6px' }}>/</span>
                    <a style={{ color: '#ff4d4f' }} onClick={(e) => { e.stopPropagation(); onDelete(p) }}>删除</a>
                  </div>
                </div>
              }
            >
              {p.name}
            </List.Item>
          ))}
          {list.length === 0 && <List.Item><span style={{ color: 'var(--text-tertiary)' }}>暂无岗位</span></List.Item>}
        </List>
      </PullToRefresh>

      <FloatingBubble style={{ '--size': '48px' } as any} onClick={() => openForm()}>
        <AddOutline fontSize={24} />
      </FloatingBubble>

      <FormSheet
        visible={showNew}
        title={editing ? '编辑岗位' : '新建岗位'}
        fields={[
          { name: 'name', label: '名称', type: 'text', required: true },
          { name: 'code', label: '编码', type: 'text', required: true },
          { name: 'department_id', label: '所属部门', type: 'select', required: true, options: depts.map((d) => ({ label: d.name, value: d.id })) },
          { name: 'sort', label: '排序', type: 'number' },
          { name: 'status', label: '状态', type: 'select', options: [{ label: '正常', value: 1 }, { label: '禁用', value: 0 }] },
          { name: 'remark', label: '备注', type: 'textarea' },
        ]}
        initialValues={editing ? { name: editing.name, code: editing.code, department_id: editing.department_id || undefined, sort: editing.sort, status: editing.status, remark: editing.remark } : undefined}
        onClose={() => { setShowNew(false); setEditing(null) }}
        onSubmit={async (v) => {
          const payload = {
            name: v.name,
            code: v.code,
            department_id: Number(v.department_id),
            sort: v.sort ? Number(v.sort) : undefined,
            status: v.status != null ? Number(v.status) : undefined,
            remark: v.remark || undefined,
          }
          if (editing) await updatePosition(editing.id, payload)
          else await createPosition(payload)
          setEditing(null)
          reload()
        }}
      />
    </div>
  )
}
