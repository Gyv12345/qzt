import { useEffect, useState } from 'react'
import { App, Button, Card, Input, Popconfirm, Select, Space, Switch, Tag } from 'antd'
import { ModalForm, ProForm, ProFormSelect, ProFormText, ProFormTextArea } from '@ant-design/pro-components'
import { PlusOutlined, DeleteOutlined, ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons'
import { createFormTemplate, getFormTemplate, updateFormTemplate } from '../../../services/oa'
import { FIELD_TYPE_OPTIONS, type FormField } from '../../../types/oa'

interface EditModalProps {
  open: boolean
  editingId: number | null
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export default function FormTemplateEditModal({ open, editingId, onOpenChange, onSuccess }: EditModalProps) {
  const { message } = App.useApp()
  const [form] = ProForm.useForm()
  const [fields, setFields] = useState<FormField[]>([])

  useEffect(() => {
    if (!open) return
    if (editingId) {
      getFormTemplate(editingId).then((r) => {
        form.setFieldsValue({
          form_key: r.form_key,
          name: r.name,
          icon: r.icon,
          description: r.description,
          category: r.category,
          status: r.status,
          sort: r.sort,
        })
        try {
          setFields(JSON.parse(r.fields_config || '[]'))
        } catch {
          setFields([])
        }
      })
    } else {
      form.resetFields()
      form.setFieldsValue({ category: 'non-business', status: 1, sort: 0 })
      setFields([])
    }
  }, [open, editingId])

  // 字段操作
  const addField = () => {
    setFields([...fields, { key: `field_${Date.now()}`, title: '', type: 'text', required: false }])
  }

  const removeField = (idx: number) => {
    setFields(fields.filter((_, i) => i !== idx))
  }

  const moveField = (idx: number, dir: 'up' | 'down') => {
    const newFields = [...fields]
    const target = dir === 'up' ? idx - 1 : idx + 1
    if (target < 0 || target >= newFields.length) return
    ;[newFields[idx], newFields[target]] = [newFields[target], newFields[idx]]
    setFields(newFields)
  }

  const updateField = (idx: number, patch: Partial<FormField>) => {
    setFields(fields.map((f, i) => (i === idx ? { ...f, ...patch } : f)))
  }

  // 选项编辑(用于 select/radio/checkbox)
  const updateFieldOptions = (idx: number, optionsText: string) => {
    const options = optionsText
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const [label, value] = line.split(':')
        return { label: label.trim(), value: (value || label).trim() }
      })
    updateField(idx, { options })
  }

  const handleSubmit = async (values: any) => {
    // 校验字段
    for (const f of fields) {
      if (!f.key || !f.title) {
        message.error('请填写所有字段的标识和标题')
        return false
      }
    }
    const payload = {
      form_key: values.form_key,
      name: values.name,
      icon: values.icon || '',
      description: values.description || '',
      fields_config: JSON.stringify(fields),
      category: values.category || 'non-business',
      status: values.status ?? 1,
      sort: values.sort ?? 0,
    }
    if (editingId) {
      await updateFormTemplate(editingId, payload)
      message.success('已更新')
    } else {
      await createFormTemplate(payload)
      message.success('已创建')
    }
    onSuccess()
    return true
  }

  const hasOptions = (type: string) => ['select', 'radio', 'checkbox'].includes(type)

  return (
    <ModalForm
      title={editingId ? '编辑表单模板' : '新建表单模板'}
      form={form}
      open={open}
      onOpenChange={onOpenChange}
      modalProps={{ destroyOnHidden: true, maskClosable: false, width: 800 }}
      onFinish={handleSubmit}
      width={800}
      grid
    >
      <ProFormText name="form_key" label="表单标识" rules={[{ required: true, message: '请输入' }]} placeholder="如 seal_apply" colProps={{ span: 8 }} />
      <ProFormText name="name" label="表单名称" rules={[{ required: true, message: '请输入' }]} placeholder="如 用印申请" colProps={{ span: 8 }} />
      <ProFormSelect name="category" label="分类" options={[{ label: '非业务审批', value: 'non-business' }, { label: '业务审批', value: 'business' }]} colProps={{ span: 8 }} />
      <ProFormTextArea name="description" label="描述" colProps={{ span: 24 }} fieldProps={{ autoSize: { minRows: 1 } }} />

      {/* 字段设计器 */}
      <Card
        size="small"
        title="表单字段设计"
        style={{ marginTop: 16 }}
        extra={<Button type="dashed" size="small" icon={<PlusOutlined />} onClick={addField}>添加字段</Button>}
      >
        {fields.length === 0 && <div style={{ color: '#999', textAlign: 'center', padding: 20 }}>点击"添加字段"开始设计表单</div>}
        {fields.map((f, idx) => (
          <Card key={idx} size="small" style={{ marginBottom: 8 }} type="inner">
            <Space wrap align="start" style={{ width: '100%' }}>
              <div style={{ width: 200 }}>
                <div style={{ fontSize: 12, marginBottom: 4 }}>字段标题</div>
                <Input value={f.title} onChange={(e) => updateField(idx, { title: e.target.value })} placeholder="如 印章类型" size="small" />
              </div>
              <div style={{ width: 150 }}>
                <div style={{ fontSize: 12, marginBottom: 4 }}>字段标识</div>
                <Input value={f.key} onChange={(e) => updateField(idx, { key: e.target.value })} placeholder="如 seal_type" size="small" />
              </div>
              <div style={{ width: 120 }}>
                <div style={{ fontSize: 12, marginBottom: 4 }}>类型</div>
                <Select value={f.type} onChange={(v) => updateField(idx, { type: v })} options={FIELD_TYPE_OPTIONS} size="small" style={{ width: '100%' }} />
              </div>
              <div style={{ width: 80, paddingTop: 18 }}>
                <Space>
                  <span style={{ fontSize: 12 }}>必填</span>
                  <Switch size="small" checked={!!f.required} onChange={(v) => updateField(idx, { required: v })} />
                </Space>
              </div>
              <div style={{ paddingTop: 18 }}>
                <Space>
                  <Button size="small" icon={<ArrowUpOutlined />} onClick={() => moveField(idx, 'up')} disabled={idx === 0} />
                  <Button size="small" icon={<ArrowDownOutlined />} onClick={() => moveField(idx, 'down')} disabled={idx === fields.length - 1} />
                  <Popconfirm title="删除字段?" onConfirm={() => removeField(idx)}>
                    <Button size="small" icon={<DeleteOutlined />} danger />
                  </Popconfirm>
                </Space>
              </div>
            </Space>
            {hasOptions(f.type) && (
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 12, marginBottom: 4 }}>选项(每行一个,格式: 标签:值 或只写标签)</div>
                <Input.TextArea
                  value={(f.options || []).map((o) => (o.label === o.value ? o.label : `${o.label}:${o.value}`)).join('\n')}
                  onChange={(e) => updateFieldOptions(idx, e.target.value)}
                  placeholder={'选项A\n选项B'}
                  autoSize={{ minRows: 2 }}
                  size="small"
                />
              </div>
            )}
            <div style={{ marginTop: 8 }}>
              <Tag color={f.required ? 'red' : 'default'}>{f.required ? '必填' : '选填'}</Tag>
              <Tag>{FIELD_TYPE_OPTIONS.find((t) => t.value === f.type)?.label || f.type}</Tag>
              {f.options && f.options.length > 0 && <Tag color="blue">{f.options.length}个选项</Tag>}
            </div>
          </Card>
        ))}
      </Card>
    </ModalForm>
  )
}
