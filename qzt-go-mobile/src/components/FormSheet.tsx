import { Popup, Form, Input, TextArea, Selector, Button, Toast, DatePicker } from 'antd-mobile'
import { useMemo, useState } from 'react'

export type FormFieldType = 'text' | 'textarea' | 'number' | 'select' | 'select-multiple' | 'date'

export interface FormField {
  name: string
  label: string
  type: FormFieldType
  required?: boolean
  placeholder?: string
  options?: { label: string; value: string | number }[]
  defaultValue?: string | number
  /** date 字段精度:日期或日期时间(默认 datetime) */
  datePrecision?: 'date' | 'datetime'
}

interface FormSheetProps {
  visible: boolean
  title: string
  fields: FormField[]
  /** 编辑回填初始值(键名与 fields.name 对应);不传则为新建模式 */
  initialValues?: Record<string, any>
  onClose: () => void
  onSubmit: (values: Record<string, any>) => Promise<void>
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

/** 把 Date 按精度格式化为字符串 */
function formatDate(d: Date, precision: 'date' | 'datetime') {
  const ymd = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  if (precision === 'date') return ymd
  return `${ymd} ${pad(d.getHours())}:${pad(d.getMinutes())}:00`
}

/** 日期选择字段:点击弹出 DatePicker。受控于 Form.Item 注入的 value/onChange */
function DateField({
  value,
  onChange,
  precision = 'datetime',
  placeholder,
}: {
  value?: string
  onChange?: (v: string) => void
  precision?: 'date' | 'datetime'
  placeholder?: string
}) {
  const [visible, setVisible] = useState(false)
  const dateValue = useMemo(() => {
    if (!value) return undefined
    const d = new Date(value.replace(' ', 'T'))
    return isNaN(d.getTime()) ? undefined : d
  }, [value])
  // antd-mobile DatePicker 的 precision 是单值(精确到哪一级):day=年月日,minute=年月日时分
  const dpPrecision: 'day' | 'minute' = precision === 'date' ? 'day' : 'minute'
  return (
    <>
      <div
        onClick={() => setVisible(true)}
        style={{
          fontSize: 15,
          color: value ? 'var(--text-primary)' : 'var(--text-tertiary)',
          padding: '4px 0',
        }}
      >
        {value || placeholder || '请选择'}
      </div>
      <DatePicker
        visible={visible}
        value={dateValue}
        precision={dpPrecision}
        onClose={() => setVisible(false)}
        onConfirm={(d) => {
          onChange?.(formatDate(d, precision))
          setVisible(false)
        }}
      />
    </>
  )
}

/** 通用底部弹出表单(antd-mobile Popup + Form)。支持新建(initialValues 不传)与编辑(传 initialValues 回填) */
export default function FormSheet({ visible, title, fields, initialValues, onClose, onSubmit }: FormSheetProps) {
  const [form] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)

  // Selector 回填需数组形式;编辑回填时把 select 类单值转成数组以便正确选中
  const formInitialValues = useMemo(() => {
    if (!initialValues) return undefined
    const v: Record<string, any> = { ...initialValues }
    for (const f of fields) {
      if ((f.type === 'select' || f.type === 'select-multiple') && v[f.name] != null && !Array.isArray(v[f.name])) {
        v[f.name] = [v[f.name]]
      }
    }
    return v
  }, [initialValues, fields])

  const handleFinish = async (rawValues: Record<string, any>) => {
    setSubmitting(true)
    try {
      const fieldByName = Object.fromEntries(fields.map((f) => [f.name, f]))
      const values: Record<string, any> = {}
      for (const [k, v] of Object.entries(rawValues)) {
        const f = fieldByName[k] as FormField | undefined
        // select-multiple 保留数组,其余(单选 Selector)取首元素
        if (f?.type === 'select-multiple') {
          values[k] = Array.isArray(v) ? v : v == null ? [] : [v]
        } else {
          values[k] = Array.isArray(v) ? v[0] ?? null : v
        }
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
          initialValues={formInitialValues}
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
              ) : f.type === 'select-multiple' ? (
                <Selector multiple options={f.options || []} />
              ) : f.type === 'date' ? (
                <DateField precision={f.datePrecision} placeholder={f.placeholder || `请选择${f.label}`} />
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
