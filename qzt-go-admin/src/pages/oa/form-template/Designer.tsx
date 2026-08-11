import { useEffect, useState } from 'react'
import {
  App,
  Button,
  Col,
  Empty,
  Form,
  Input,
  Popconfirm,
  Row,
  Select,
  Space,
  Steps,
  Switch,
  Tag,
  Typography,
} from 'antd'
import { ArrowDownOutlined, ArrowUpOutlined, DeleteOutlined } from '@ant-design/icons'
import { createFormTemplate, getFormTemplate, updateFormTemplate } from '../../../services/oa'
import type { FormField } from '../../../types/oa'

const { Text } = Typography

/** 字段类型 → 中文名 + 图标 */
const FIELD_META: Record<string, { label: string; icon: string }> = {
  text: { label: '单行文本', icon: '📝' },
  textarea: { label: '多行文本', icon: '📄' },
  number: { label: '数字', icon: '🔢' },
  date: { label: '日期', icon: '📅' },
  datetime: { label: '日期时间', icon: '🕓' },
  select: { label: '下拉选择', icon: '📋' },
  radio: { label: '单选', icon: '🔘' },
  checkbox: { label: '多选', icon: '☑️' },
}

/** 分组 */
const GROUPS: { title: string; types: string[] }[] = [
  { title: '常用', types: ['text', 'textarea', 'number', 'date', 'datetime'] },
  { title: '选项', types: ['select', 'radio', 'checkbox'] },
]

/** 需要选项配置的类型 */
const OPTION_TYPES = new Set(['select', 'radio', 'checkbox'])

interface DesignerProps {
  open: boolean
  editingId: number | null
  onClose: () => void
  onSuccess: () => void
}

interface BasicFormValues {
  form_key: string
  name: string
  category: string
  description?: string
}

export default function FormTemplateDesigner({ open, editingId, onClose, onSuccess }: DesignerProps) {
  const { message } = App.useApp()
  const [current, setCurrent] = useState(0)
  const [basicForm] = Form.useForm<BasicFormValues>()
  const [fields, setFields] = useState<FormField[]>([])
  const [selectedIdx, setSelectedIdx] = useState<number | undefined>(undefined)
  const [saving, setSaving] = useState(false)
  const [propForm] = Form.useForm()

  // 加载数据
  useEffect(() => {
    if (!open) return
    setCurrent(0)
    setSelectedIdx(undefined)
    if (editingId) {
      getFormTemplate(editingId).then((r) => {
        basicForm.setFieldsValue({
          form_key: r.form_key,
          name: r.name,
          category: r.category,
          description: r.description,
        })
        try {
          setFields(JSON.parse(r.fields_config || '[]'))
        } catch {
          setFields([])
        }
      })
    } else {
      basicForm.resetFields()
      basicForm.setFieldsValue({ category: 'non-business' })
      setFields([])
    }
  }, [open, editingId, basicForm])

  // 选中字段变化时回填属性表单
  useEffect(() => {
    if (selectedIdx === undefined || !fields[selectedIdx]) {
      propForm.resetFields()
      return
    }
    const f = fields[selectedIdx]
    propForm.setFieldsValue({
      title: f.title,
      key: f.key,
      placeholder: f.placeholder || '',
      default: f.default ?? '',
      required: !!f.required,
      optionsText: OPTION_TYPES.has(f.type)
        ? (f.options || []).map((o) => (o.label === o.value ? o.label : `${o.label}:${o.value}`)).join('\n')
        : '',
    })
  }, [selectedIdx, fields, propForm])

  // ── 字段操作 ──

  const handleAdd = (type: string) => {
    const newField: FormField = {
      key: `field_${Date.now()}`,
      title: FIELD_META[type]?.label || '新字段',
      type,
      required: false,
    }
    const next = [...fields, newField]
    setFields(next)
    setSelectedIdx(next.length - 1)
  }

  const handleMove = (idx: number, dir: 'up' | 'down') => {
    const target = dir === 'up' ? idx - 1 : idx + 1
    if (target < 0 || target >= fields.length) return
    const next = [...fields]
    ;[next[idx], next[target]] = [next[target], next[idx]]
    setFields(next)
    setSelectedIdx(target)
  }

  const handleDelete = (idx: number) => {
    const next = fields.filter((_, i) => i !== idx)
    setFields(next)
    if (selectedIdx === idx) setSelectedIdx(undefined)
    else if (selectedIdx !== undefined && selectedIdx > idx) setSelectedIdx(selectedIdx - 1)
  }

  const handleSaveProp = async () => {
    if (selectedIdx === undefined) return
    const values = await propForm.validateFields()
    const f = fields[selectedIdx]
    const patch: Partial<FormField> = {
      title: values.title,
      key: values.key,
      placeholder: values.placeholder || undefined,
      default: values.default || undefined,
      required: !!values.required,
    }
    if (OPTION_TYPES.has(f.type) && values.optionsText) {
      patch.options = (values.optionsText as string)
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
        .map((line) => {
          const sep = line.indexOf(':')
          if (sep > 0) return { label: line.slice(0, sep).trim(), value: line.slice(sep + 1).trim() }
          return { label: line, value: line }
        })
    } else if (OPTION_TYPES.has(f.type)) {
      patch.options = []
    }
    setFields(fields.map((fld, i) => (i === selectedIdx ? { ...fld, ...patch } : fld)))
    message.success('属性已保存')
  }

  // ── 提交 ──

  const handleSave = async () => {
    const basic = await basicForm.validateFields().catch(() => {
      message.error('请先完善第一步的基础信息')
      setCurrent(0)
      return null
    })
    if (!basic) return
    // 校验字段
    for (const f of fields) {
      if (!f.key?.trim() || !f.title?.trim()) {
        message.error(`字段"${f.title || '未命名'}"缺少标识或标题`)
        setCurrent(1)
        return
      }
    }
    setSaving(true)
    try {
      const payload = {
        form_key: basic.form_key,
        name: basic.name,
        description: basic.description || '',
        fields_config: JSON.stringify(fields),
        category: basic.category || 'non-business',
        status: 1,
      }
      if (editingId) {
        await updateFormTemplate(editingId, payload)
        message.success('表单已更新')
      } else {
        await createFormTemplate(payload)
        message.success('表单已创建')
      }
      onSuccess()
    } finally {
      setSaving(false)
    }
  }

  const selectedField = selectedIdx !== undefined ? fields[selectedIdx] : null

  return (
    <div style={{ padding: 24, minHeight: 'calc(100vh - 55px)' }}>
      <style>{`
        .oa-field-tile { transition: all .15s; cursor: pointer; }
        .oa-field-tile:hover { border-color: #1677ff !important; color: #1677ff !important; background: #e6f4ff !important; }
        .oa-preview-item .oa-field-actions { opacity: 0; transition: opacity .15s; pointer-events: none; }
        .oa-preview-item:hover .oa-field-actions,
        .oa-preview-item.is-selected .oa-field-actions { opacity: 1; pointer-events: auto; }
      `}</style>

      <Steps
        current={current}
        onChange={setCurrent}
        items={[{ title: '基础信息' }, { title: '表单设计' }]}
        style={{ marginBottom: 24 }}
      />

      {/* 基础信息表单始终挂载（切到第 2 步时仅隐藏），否则 Form 卸载后字段注销，保存时取不到值 */}
      <div style={{ maxWidth: 600, display: current === 0 ? 'block' : 'none' }}>
          <Form<BasicFormValues> form={basicForm} layout="vertical">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="form_key"
                  label="表单标识"
                  rules={[{ required: true, message: '请输入表单标识' }]}
                >
                  <Input placeholder="如 seal_apply（英文唯一）" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="name"
                  label="表单名称"
                  rules={[{ required: true, message: '请输入表单名称' }]}
                >
                  <Input placeholder="如 用印申请" />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="category" label="分类">
              <Select
                options={[
                  { label: '非业务审批', value: 'non-business' },
                  { label: '业务审批', value: 'business' },
                ]}
              />
            </Form.Item>
            <Form.Item name="description" label="描述">
              <Input.TextArea rows={3} placeholder="表单用途说明（选填）" />
            </Form.Item>
          </Form>
        </div>

      {current === 1 && (
        <Row gutter={16}>
          {/* 左栏：字段类型 */}
          <Col span={6}>
            <div
              style={{
                background: '#fff',
                borderRadius: 8,
                padding: 16,
                border: '1px solid #f0f0f0',
              }}
            >
              <Text strong style={{ display: 'block', marginBottom: 12 }}>
                字段类型
              </Text>
              {GROUPS.map((g) => (
                <div key={g.title} style={{ marginBottom: 16 }}>
                  <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
                    {g.title}
                  </Text>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                    {g.types.map((t) => (
                      <div
                        key={t}
                        className="oa-field-tile"
                        onClick={() => handleAdd(t)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '8px 10px',
                          border: '1px solid #f0f0f0',
                          borderRadius: 6,
                          fontSize: 13,
                          background: '#fafafa',
                        }}
                      >
                        <span style={{ fontSize: 14 }}>{FIELD_META[t]?.icon}</span>
                        <span>{FIELD_META[t]?.label || t}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Col>

          {/* 中栏：表单预览 */}
          <Col span={11}>
            <div
              style={{
                background: '#fff',
                borderRadius: 8,
                padding: 16,
                border: '1px solid #f0f0f0',
              }}
            >
              <Text strong style={{ display: 'block', marginBottom: 12 }}>
                {basicForm.getFieldValue('name') || '表单'}预览
              </Text>
              {fields.length === 0 ? (
                <Empty description="点击左侧字段类型添加字段" style={{ marginTop: 100 }} />
              ) : (
                <Row gutter={[12, 12]}>
                  {fields.map((f, idx) => {
                    const selected = selectedIdx === idx
                    return (
                      <Col span={24} key={f.key + idx}>
                        <div
                          className={`oa-preview-item${selected ? ' is-selected' : ''}`}
                          onClick={() => setSelectedIdx(idx)}
                          style={{
                            padding: '12px 14px',
                            border: selected ? '1px solid #1677ff' : '1px solid #f0f0f0',
                            background: selected ? '#e6f4ff' : '#fafafa',
                            borderRadius: 6,
                            cursor: 'pointer',
                            transition: 'border-color .15s',
                          }}
                        >
                          {/* 字段名 + 类型 */}
                          <div style={{ marginBottom: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div>
                              <span style={{ fontSize: 13, fontWeight: 500 }}>{f.title || '(未命名)'}</span>
                              {f.required && <span style={{ color: '#ff4d4f', marginLeft: 4 }}>*</span>}
                              <Tag style={{ marginLeft: 8, fontSize: 11 }}>
                                {FIELD_META[f.type]?.label || f.type}
                              </Tag>
                            </div>
                            {/* 操作按钮 */}
                            <div
                              className="oa-field-actions"
                              style={{ display: 'flex', gap: 4 }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Button
                                size="small"
                                icon={<ArrowUpOutlined />}
                                disabled={idx === 0}
                                onClick={() => handleMove(idx, 'up')}
                              />
                              <Button
                                size="small"
                                icon={<ArrowDownOutlined />}
                                disabled={idx === fields.length - 1}
                                onClick={() => handleMove(idx, 'down')}
                              />
                              <Popconfirm title="删除字段?" onConfirm={() => handleDelete(idx)}>
                                <Button size="small" danger icon={<DeleteOutlined />} />
                              </Popconfirm>
                            </div>
                          </div>
                          {/* 预览控件 */}
                          <FieldPreview field={f} />
                        </div>
                      </Col>
                    )
                  })}
                </Row>
              )}
            </div>
          </Col>

          {/* 右栏：属性编辑 */}
          <Col span={7}>
            <div
              style={{
                background: '#fff',
                borderRadius: 8,
                padding: 16,
                border: '1px solid #f0f0f0',
              }}
            >
              <Text strong style={{ display: 'block', marginBottom: 12 }}>
                属性编辑
              </Text>
              {!selectedField ? (
                <Empty description="点击中间字段编辑属性" style={{ marginTop: 60 }} />
              ) : (
                <Form form={propForm} layout="vertical" requiredMark={false}>
                  <Form.Item label="字段类型">
                    <Tag color="blue">{FIELD_META[selectedField.type]?.label || selectedField.type}</Tag>
                  </Form.Item>
                  <Form.Item
                    name="title"
                    label="字段标题"
                    rules={[{ required: true, message: '请输入字段标题' }]}
                  >
                    <Input placeholder="如 印章类型" />
                  </Form.Item>
                  <Form.Item
                    name="key"
                    label="字段标识"
                    rules={[{ required: true, message: '请输入字段标识' }]}
                  >
                    <Input placeholder="如 seal_type（英文）" />
                  </Form.Item>
                  <Form.Item name="placeholder" label="占位提示">
                    <Input placeholder="输入框占位文字" />
                  </Form.Item>
                  {!OPTION_TYPES.has(selectedField.type) && (
                    <Form.Item name="default" label="默认值">
                      <Input placeholder="默认值（选填）" />
                    </Form.Item>
                  )}
                  <Form.Item name="required" label="必填" valuePropName="checked">
                    <Switch size="small" />
                  </Form.Item>
                  {OPTION_TYPES.has(selectedField.type) && (
                    <Form.Item
                      name="optionsText"
                      label="选项配置"
                      tooltip="每行一个选项，格式：标签:值（值可省略）"
                    >
                      <Input.TextArea
                        rows={5}
                        placeholder={'选项A\n选项B\n或 标签:值'}
                      />
                    </Form.Item>
                  )}
                  <Button type="primary" block onClick={handleSaveProp}>
                    保存属性
                  </Button>
                </Form>
              )}
            </div>
          </Col>
        </Row>
      )}

      {/* 底部按钮 */}
      <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        {current > 0 && <Button onClick={() => setCurrent(current - 1)}>上一步</Button>}
        {current < 1 && (
          <Button type="primary" onClick={() => basicForm.validateFields().then(() => setCurrent(1))}>
            下一步
          </Button>
        )}
        {current === 1 && (
          <Button type="primary" loading={saving} onClick={handleSave}>
            保存表单
          </Button>
        )}
        <Button onClick={onClose}>取消</Button>
      </div>
    </div>
  )
}

/** 字段预览控件（轻量渲染，不绑定值） */
function FieldPreview({ field }: { field: FormField }) {
  switch (field.type) {
    case 'textarea':
      return <Input.TextArea rows={2} placeholder={field.placeholder} disabled size="small" />
    case 'number':
      return <Input type="number" placeholder={field.placeholder} disabled size="small" />
    case 'date':
      return <Input placeholder="📅 选择日期" disabled size="small" />
    case 'datetime':
      return <Input placeholder="🕓 选择日期时间" disabled size="small" />
    case 'select':
      return (
        <Select
          size="small"
          disabled
          placeholder={field.placeholder || '请选择'}
          style={{ width: '100%' }}
          options={field.options}
        />
      )
    case 'radio':
      return (
        <Space size={4} wrap>
          {(field.options || []).map((o, i) => (
            <Tag key={i} style={{ fontSize: 11 }}>
              ⊙ {o.label}
            </Tag>
          ))}
          {(!field.options || field.options.length === 0) && <Text type="secondary" style={{ fontSize: 12 }}>配置选项后显示</Text>}
        </Space>
      )
    case 'checkbox':
      return (
        <Space size={4} wrap>
          {(field.options || []).map((o, i) => (
            <Tag key={i} style={{ fontSize: 11 }}>
              ☑ {o.label}
            </Tag>
          ))}
          {(!field.options || field.options.length === 0) && <Text type="secondary" style={{ fontSize: 12 }}>配置选项后显示</Text>}
        </Space>
      )
    default:
      return <Input placeholder={field.placeholder} disabled size="small" />
  }
}
