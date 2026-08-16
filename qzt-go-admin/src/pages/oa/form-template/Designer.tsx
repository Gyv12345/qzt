import { useEffect, useState } from 'react'
import { App, Button, Col, Form, Input, Row, Select, Steps } from 'antd'
import { createFormTemplate, getFormTemplate, updateFormTemplate } from '../../../services/oa'
import type { FormField } from '../../../types/oa'
import FieldDesignPanel from './FieldDesignPanel'

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

/** OA 自定义表单模板设计器:步骤 1 基础信息 + 步骤 2 表单设计(三栏) */
export default function FormTemplateDesigner({ open, editingId, onClose, onSuccess }: DesignerProps) {
  const { message } = App.useApp()
  const [current, setCurrent] = useState(0)
  const [basicForm] = Form.useForm<BasicFormValues>()
  const [fields, setFields] = useState<FormField[]>([])
  const [saving, setSaving] = useState(false)

  // 加载数据
  useEffect(() => {
    if (!open) return
    setCurrent(0)
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

      {/* 基础信息表单始终挂载(切到第 2 步时仅隐藏),否则 Form 卸载后字段注销,保存时取不到值 */}
      <div style={{ maxWidth: 600, display: current === 0 ? 'block' : 'none' }}>
        <Form<BasicFormValues> form={basicForm} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="form_key"
                label="表单标识"
                rules={[{ required: true, message: '请输入表单标识' }]}
              >
                <Input placeholder="如 seal_apply(英文唯一)" />
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
            <Input.TextArea rows={3} placeholder="表单用途说明(选填)" />
          </Form.Item>
        </Form>
      </div>

      {current === 1 && (
        <FieldDesignPanel
          fields={fields}
          onFieldsChange={setFields}
          formName={basicForm.getFieldValue('name')}
        />
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
