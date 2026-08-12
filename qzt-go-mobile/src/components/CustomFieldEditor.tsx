import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import { DatePicker, Form, Input, Selector, TextArea } from 'antd-mobile'
import dayjs from 'dayjs'
import { listCustomFields } from '../services/customfield'
import { parseFieldOptions, type CrmCustomField } from '../types/crm'

export interface CustomFieldEditorHandle {
  /** 收集自定义字段值,过滤空值,多选已逗号拼接 */
  getValues: () => { field_id: string; value: string }[]
}

interface Props {
  formKey: string
  /** 编辑回填:field_id -> value(多选为逗号字符串) */
  values?: Record<string, string> | null
}

function renderControl(
  f: CrmCustomField,
  cur: string,
  setVal: (v: string) => void,
) {
  const opts = parseFieldOptions(f)
  switch (f.type) {
    case 'TEXTAREA':
      return <TextArea rows={2} placeholder="请输入" value={cur} onChange={(v) => setVal(v)} />
    case 'INPUT_NUMBER':
      return <Input type="number" placeholder="请输入" value={cur} onChange={(v) => setVal(v)} />
    case 'DATE_TIME':
      return (
        <Input
          readOnly
          placeholder="点击选择时间"
          value={cur ? dayjs(cur).format('YYYY-MM-DD HH:mm') : ''}
          onClick={async () => {
            const v = await DatePicker.prompt({
              defaultValue: cur ? new Date(cur) : new Date(),
              precision: 'minute',
              title: f.name,
            })
            if (v) setVal(dayjs(v).format('YYYY-MM-DD HH:mm:ss'))
          }}
        />
      )
    case 'RADIO':
    case 'SELECT':
      return opts ? (
        <Selector
          options={opts}
          columns={opts.length <= 3 ? opts.length : 3}
          value={cur ? [cur] : []}
          onChange={(arr) => setVal(arr[0] != null ? String(arr[0]) : '')}
        />
      ) : (
        <Input value={cur} onChange={(v) => setVal(v)} />
      )
    case 'SELECT_MULTIPLE':
    case 'CHECKBOX':
      return opts ? (
        <Selector
          options={opts}
          multiple
          columns={opts.length <= 3 ? opts.length : 3}
          value={cur ? cur.split(',').filter(Boolean) : []}
          onChange={(arr) => setVal(arr.map(String).join(','))}
        />
      ) : (
        <Input value={cur} onChange={(v) => setVal(v)} />
      )
    default:
      return <Input placeholder="请输入" value={cur} onChange={(v) => setVal(v)} />
  }
}

/** 可编辑的自定义字段控件(嵌入 Form 内,Form.Item 无 name,独立 state 管理)。通过 ref.getValues() 收集 */
const CustomFieldEditor = forwardRef<CustomFieldEditorHandle, Props>(({ formKey, values }, ref) => {
  const [fields, setFields] = useState<CrmCustomField[]>([])
  const [map, setMap] = useState<Record<string, string>>({})

  useEffect(() => {
    let cancelled = false
    listCustomFields(formKey)
      .then((defs) => {
        if (cancelled) return
        // 仅移动端可见 + 可编辑
        const visible = defs.filter((f) => f.mobile === 1 && f.editable !== 0)
        setFields(visible)
        const init: Record<string, string> = {}
        for (const f of visible) {
          if (values && values[f.id] !== undefined && values[f.id] !== '') init[f.id] = values[f.id]
        }
        setMap(init)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [formKey, values])

  useImperativeHandle(ref, () => ({
    getValues: () =>
      Object.entries(map)
        .filter(([, v]) => v !== '' && v != null)
        .map(([field_id, value]) => ({ field_id, value: String(value) })),
  }))

  if (fields.length === 0) return null

  const setVal = (id: string, v: string) => setMap((m) => ({ ...m, [id]: v }))

  return (
    <>
      {fields.map((f) => (
        <Form.Item key={f.id} label={f.name}>
          {renderControl(f, map[f.id] ?? '', (v) => setVal(f.id, v))}
        </Form.Item>
      ))}
    </>
  )
})

CustomFieldEditor.displayName = 'CustomFieldEditor'
export default CustomFieldEditor
