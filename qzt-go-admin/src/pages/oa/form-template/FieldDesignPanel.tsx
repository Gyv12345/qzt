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
  Switch,
  Tag,
  Typography,
} from 'antd'
import { ArrowDownOutlined, ArrowUpOutlined, DeleteOutlined } from '@ant-design/icons'
import type { FormField } from '../../../types/oa'
import { FIELD_META, GROUPS, OPTION_TYPES } from './designerMeta'
import FieldPreviewControl from './FieldPreviewControl'

const { Text } = Typography

interface FieldDesignPanelProps {
  fields: FormField[]
  onFieldsChange: (fields: FormField[]) => void
  /** 表单名(预览标题) */
  formName?: string
}

/** 表单设计第二步:字段类型面板 + 表单预览 + 属性编辑三栏 */
export default function FieldDesignPanel({ fields, onFieldsChange, formName }: FieldDesignPanelProps) {
  const { message } = App.useApp()
  const [selectedIdx, setSelectedIdx] = useState<number | undefined>(undefined)
  const [propForm] = Form.useForm()

  const selectedField = selectedIdx !== undefined ? fields[selectedIdx] : null

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

  const handleAdd = (type: string) => {
    const newField: FormField = {
      // eslint-disable-next-line react-hooks/purity -- Date.now() 生成唯一 key,handleAdd 仅由按钮 onClick 调用,不在渲染期执行
      key: `field_${Date.now()}`,
      title: FIELD_META[type]?.label || '新字段',
      type,
      required: false,
    }
    const next = [...fields, newField]
    onFieldsChange(next)
    setSelectedIdx(next.length - 1)
  }

  const handleMove = (idx: number, dir: 'up' | 'down') => {
    const target = dir === 'up' ? idx - 1 : idx + 1
    if (target < 0 || target >= fields.length) return
    const next = [...fields]
    ;[next[idx], next[target]] = [next[target], next[idx]]
    onFieldsChange(next)
    setSelectedIdx(target)
  }

  const handleDelete = (idx: number) => {
    const next = fields.filter((_, i) => i !== idx)
    onFieldsChange(next)
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
    onFieldsChange(fields.map((fld, i) => (i === selectedIdx ? { ...fld, ...patch } : fld)))
    message.success('属性已保存')
  }

  return (
    <Row gutter={16}>
      {/* 左栏:字段类型 */}
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

      {/* 中栏:表单预览 */}
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
            {formName || '表单'}预览
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
                      <FieldPreviewControl field={f} />
                    </div>
                  </Col>
                )
              })}
            </Row>
          )}
        </div>
      </Col>

      {/* 右栏:属性编辑 */}
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
                <Input placeholder="如 seal_type(英文)" />
              </Form.Item>
              <Form.Item name="placeholder" label="占位提示">
                <Input placeholder="输入框占位文字" />
              </Form.Item>
              {!OPTION_TYPES.has(selectedField.type) && (
                <Form.Item name="default" label="默认值">
                  <Input placeholder="默认值(选填)" />
                </Form.Item>
              )}
              <Form.Item name="required" label="必填" valuePropName="checked">
                <Switch size="small" />
              </Form.Item>
              {OPTION_TYPES.has(selectedField.type) && (
                <Form.Item
                  name="optionsText"
                  label="选项配置"
                  tooltip="每行一个选项,格式:标签:值(值可省略)"
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
  )
}
