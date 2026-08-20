import { useEffect, useState } from 'react'
import { App, Col, Row, Tabs } from 'antd'
import {
  createCustomField,
  deleteCustomField,
  listCustomFields,
  updateCustomField,
} from '../../../services/crm'
import { CRM_FORM_KEYS, type CrmCustomField } from '../../../types/crm'
import { FIELD_META } from './fieldMeta'
import TypePalette from './TypePalette'
import FieldPreview from './FieldPreview'
import PropEditor from './PropEditor'

/** CRM 自定义字段配置:类型面板 + 表单预览 + 属性编辑三栏 */
export default function CrmFieldPage() {
  const { message } = App.useApp()
  const [currentKey, setCurrentKey] = useState<string>(CRM_FORM_KEYS[0].value)
  const [fields, setFields] = useState<CrmCustomField[]>([])
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined)
  const [loading, setLoading] = useState(false)

  const selectedField = fields.find((f) => f.id === selectedId)
  const currentLabel = CRM_FORM_KEYS.find((f) => f.value === currentKey)?.label ?? currentKey

  const loadFields = async () => {
    setLoading(true)
    try {
      const data = await listCustomFields(currentKey)
      setFields(data.sort((a, b) => a.pos - b.pos))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadFields()
    setSelectedId(undefined)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentKey])

  // 左栏点击类型 → 新增字段
  const handleAdd = async (type: string) => {
    const maxPos = fields.reduce((mx, f) => Math.max(mx, f.pos), 0)
    try {
      await createCustomField({
        form_key: currentKey,
        name: FIELD_META[type]?.label || '新字段',
        type,
        pos: maxPos + 10,
      })
      message.success('字段已添加')
      await loadFields()
      // 选中新增的(最后一个)
      const data = await listCustomFields(currentKey)
      const sorted = data.sort((a, b) => a.pos - b.pos)
      setSelectedId(sorted[sorted.length - 1]?.id)
    } catch {
      // 拦截器已提示
    }
  }

  const handleDelete = async (id: string) => {
    await deleteCustomField(id)
    message.success('字段已删除')
    if (selectedId === id) setSelectedId(undefined)
    await loadFields()
  }

  // 上移/下移:交换相邻字段的 pos
  const handleMove = async (idx: number, dir: 'up' | 'down') => {
    const target = dir === 'up' ? idx - 1 : idx + 1
    if (target < 0 || target >= fields.length) return
    const a = fields[idx]
    const b = fields[target]
    await Promise.all([
      updateCustomField(a.id, { name: a.name, type: a.type, pos: b.pos, mobile: a.mobile }),
      updateCustomField(b.id, { name: b.name, type: b.type, pos: a.pos, mobile: b.mobile }),
    ])
    await loadFields()
  }

  return (
    <div style={{ padding: 0 }}>
      <style>{`
        .field-preview-item .field-actions { opacity: 0; transition: opacity .15s; }
        .field-preview-item:hover .field-actions,
        .field-preview-item.is-selected .field-actions { opacity: 1; }
        .field-type-tile { transition: all .15s; }
        .field-type-tile:hover { border-color: #1677ff !important; color: #1677ff !important; background: #e6f4ff !important; }
      `}</style>

      <Tabs
        activeKey={currentKey}
        onChange={setCurrentKey}
        items={CRM_FORM_KEYS.map((f) => ({ key: f.value, label: f.label }))}
        style={{ marginBottom: 16 }}
      />

      {/* 三栏随内容自然增高、由页面整体滚动;Col 用 flex 让三块面板高度对齐 */}
      <Row gutter={16}>
        {/* 左栏:字段类型面板 */}
        <Col span={6} style={{ display: 'flex' }}>
          <TypePalette loading={loading} onAdd={handleAdd} />
        </Col>

        {/* 中栏:表单预览 */}
        <Col span={11} style={{ display: 'flex' }}>
          <FieldPreview
            fields={fields}
            label={currentLabel}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onMove={handleMove}
            onDelete={handleDelete}
          />
        </Col>

        {/* 右栏:属性编辑 */}
        <Col span={7} style={{ display: 'flex' }}>
          <PropEditor field={selectedField} formKey={currentKey} onSaved={loadFields} />
        </Col>
      </Row>
    </div>
  )
}
