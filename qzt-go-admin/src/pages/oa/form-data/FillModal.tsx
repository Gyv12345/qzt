import { useEffect, useMemo } from 'react'
import { App } from 'antd'
import {
  ModalForm,
  ProForm,
  ProFormDatePicker,
  ProFormDateTimePicker,
  ProFormDigit,
  ProFormSelect,
  ProFormText,
  ProFormTextArea,
  ProFormRadio,
  ProFormCheckbox,
} from '@ant-design/pro-components'
import { createFormData, getFormData, updateFormData } from '../../../services/oa'
import type { OaFormTemplate, FormField } from '../../../types/oa'

interface FillModalProps {
  open: boolean
  editingId: number | null
  template: OaFormTemplate
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

/** 根据 fields_config 动态渲染表单字段 */
function renderField(field: FormField) {
  const rules = field.required ? [{ required: true, message: `请填写${field.title}` }] : []
  const colProps = { span: 12 }
  const commonProps = {
    name: field.key,
    label: field.title,
    rules,
    colProps,
    placeholder: field.placeholder,
  }

  switch (field.type) {
    case 'textarea':
      return <ProFormTextArea key={field.key} {...commonProps} colProps={{ span: 24 }} fieldProps={{ autoSize: { minRows: 2 } }} />
    case 'number':
      return <ProFormDigit key={field.key} {...commonProps} />
    case 'date':
      return <ProFormDatePicker key={field.key} {...commonProps} fieldProps={{ style: { width: '100%' } }} />
    case 'datetime':
      return <ProFormDateTimePicker key={field.key} {...commonProps} fieldProps={{ style: { width: '100%' }, format: 'YYYY-MM-DD HH:mm:ss' }} />
    case 'select':
      return <ProFormSelect key={field.key} {...commonProps} options={field.options || []} />
    case 'radio':
      return <ProFormRadio.Group key={field.key} {...commonProps} options={field.options || []} />
    case 'checkbox':
      return <ProFormCheckbox.Group key={field.key} {...commonProps} options={field.options || []} />
    default:
      return <ProFormText key={field.key} {...commonProps} />
  }
}

export default function DynamicFormFillModal({ open, editingId, template, onOpenChange, onSuccess }: FillModalProps) {
  const { message } = App.useApp()
  const [form] = ProForm.useForm()

  // useMemo 稳定 fields 身份:每次渲染重新 JSON.parse 会产生新数组,放进 effect deps 会反复触发
  const fields = useMemo<FormField[]>(() => {
    try {
      return JSON.parse(template.fields_config || '[]')
    } catch {
      return []
    }
  }, [template.fields_config])

  useEffect(() => {
    if (!open) return
    form.resetFields()
    if (editingId) {
      getFormData(editingId).then((r) => {
        try {
          const values = JSON.parse(r.field_values || '{}')
          form.setFieldsValue(values)
        } catch {
          // ignore
        }
      })
    } else {
      // 设置默认值
      const defaults: Record<string, any> = {}
      fields.forEach((f) => {
        if (f.default !== undefined && f.default !== '') {
          defaults[f.key] = f.default
        }
      })
      if (Object.keys(defaults).length > 0) {
        form.setFieldsValue(defaults)
      }
    }
  }, [open, editingId, template.id, fields, form])

  const handleSubmit = async (values: any) => {
    const payload = {
      template_id: template.id,
      field_values: JSON.stringify(values),
    }
    if (editingId) {
      await updateFormData(editingId, payload)
      message.success('已更新')
    } else {
      await createFormData(payload)
      message.success('已提交')
    }
    onSuccess()
    return true
  }

  return (
    <ModalForm
      title={`${template.name}${editingId ? ' - 编辑' : ' - 填写'}`}
      form={form}
      open={open}
      onOpenChange={onOpenChange}
      modalProps={{ destroyOnHidden: true, maskClosable: false }}
      onFinish={handleSubmit}
      width={640}
      grid
    >
      {template.description && (
        <div style={{ marginBottom: 16, padding: 12, background: '#f5f5f5', borderRadius: 8 }}>
          {template.description}
        </div>
      )}
      {fields.map((f) => renderField(f))}
    </ModalForm>
  )
}
