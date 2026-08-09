import { Popup, Form, Input, TextArea, Selector, Button, Toast } from 'antd-mobile'
import { useState } from 'react'

export interface FormField {
  name: string
  label: string
  type: 'text' | 'textarea' | 'number' | 'select' | 'date'
  required?: boolean
  placeholder?: string
  options?: { label: string; value: string | number }[]
  defaultValue?: string | number
}

interface FormSheetProps {
  visible: boolean
  title: string
  fields: FormField[]
  onClose: () => void
  onSubmit: (values: Record<string, any>) => Promise<void>
}

/** 通用底部弹出表单(antd-mobile Popup + Form) */
export default function FormSheet({ visible, title, fields, onClose, onSubmit }: FormSheetProps) {
  const [form] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)

  const handleFinish = async (rawValues: Record<string, any>) => {
    setSubmitting(true)
    try {
      // Selector 返回数组,展开为单值(取第一个元素)
      const values: Record<string, any> = {}
      for (const [k, v] of Object.entries(rawValues)) {
        values[k] = Array.isArray(v) ? v[0] ?? null : v
      }
      await onSubmit(values)
      Toast.show({ icon: 'success', content: '提交成功' })
      onClose()
    } catch {
      // 错误由 request 拦截器 Toast
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Popup
      visible={visible}
      onMaskClick={onClose}
      bodyStyle={{
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
        maxHeight: '85vh',
        overflowY: 'auto',
      }}
      destroyOnClose
    >
      <div style={{ padding: '16px 16px 24px' }}>
        <div style={{ fontSize: 17, fontWeight: 600, textAlign: 'center', marginBottom: 16 }}>{title}</div>
        <Form
          form={form}
          layout="horizontal"
          onFinish={handleFinish}
          footer={
            <Button block color="primary" size="large" loading={submitting} onClick={() => form.submit()}>
              提交
            </Button>
          }
        >
          {fields.map((f) => (
            <Form.Item
              key={f.name}
              name={f.name}
              label={f.label}
              rules={f.required ? [{ required: true, message: `请输入${f.label}` }] : undefined}
            >
              {f.type === 'textarea' ? (
                <TextArea placeholder={f.placeholder || `请输入${f.label}`} rows={3} />
              ) : f.type === 'number' ? (
                <Input type="number" placeholder={f.placeholder || `请输入${f.label}`} />
              ) : f.type === 'select' ? (
                <Selector
                  options={f.options || []}
                  columns={f.options && f.options.length <= 3 ? f.options.length : 3}
                />
              ) : (
                <Input placeholder={f.placeholder || `请输入${f.label}`} />
              )}
            </Form.Item>
          ))}
        </Form>
      </div>
    </Popup>
  )
}
