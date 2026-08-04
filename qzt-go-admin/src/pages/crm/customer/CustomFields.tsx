import { DatePicker, Input, InputNumber, Radio, Select } from 'antd'
import dayjs from 'dayjs'
import type { CrmCustomField, CrmFieldValue } from '../../../types/crm'

export interface FieldOption {
  label: string
  value: string
}

/**
 * 从 field.prop 防御性解析选项数组(元素可能是 {label,value} 或字符串),
 * 解析失败/没有选项返回 null,调用方降级为普通 Input
 */
export function parseFieldOptions(field: CrmCustomField): FieldOption[] | null {
  if (!field.prop) return null
  const findArray = (v: unknown): unknown[] | null => {
    if (Array.isArray(v)) return v
    if (v && typeof v === 'object') {
      for (const val of Object.values(v as Record<string, unknown>)) {
        const found = findArray(val)
        if (found) return found
      }
    }
    return null
  }
  try {
    const arr = findArray(JSON.parse(field.prop))
    if (!arr || arr.length === 0) return null
    return arr.map((item) => {
      if (item && typeof item === 'object') {
        const o = item as Record<string, unknown>
        return {
          label: String(o.label ?? o.value ?? ''),
          value: String(o.value ?? o.label ?? ''),
        }
      }
      return { label: String(item), value: String(item) }
    })
  } catch {
    return null
  }
}

const isMultiple = (type: string) => type === 'SELECT_MULTIPLE' || type === 'CHECKBOX'

/** 将服务端 fields map(field_id -> value 字符串)回填为表单控件值 Map */
export function buildFieldValueMap(
  defs: CrmCustomField[],
  values: Record<string, string>,
): Map<string, unknown> {
  const map = new Map<string, unknown>()
  defs.forEach((f) => {
    const raw = values?.[f.id]
    if (raw === undefined || raw === null || raw === '') return
    if (isMultiple(f.type)) map.set(f.id, raw.split(','))
    else if (f.type === 'INPUT_NUMBER') map.set(f.id, Number(raw))
    else map.set(f.id, raw)
  })
  return map
}

/** 将控件值 Map 序列化为提交用的 CrmFieldValue[] */
export function serializeFieldValues(map: Map<string, unknown>): CrmFieldValue[] {
  const result: CrmFieldValue[] = []
  map.forEach((v, k) => {
    if (v === undefined || v === null || v === '') return
    const str = Array.isArray(v) ? v.join(',') : String(v)
    if (str) result.push({ field_id: k, value: str })
  })
  return result
}

interface CustomFieldItemProps {
  field: CrmCustomField
  value?: unknown
  onChange?: (value: unknown) => void
}

/** 按字段类型渲染动态表单项控件(不走 Form 受控,由父组件 state Map 收集) */
export default function CustomFieldItem({ field, value, onChange }: CustomFieldItemProps) {
  const options = parseFieldOptions(field)
  switch (field.type) {
    case 'TEXTAREA':
      return (
        <Input.TextArea
          rows={3}
          value={(value as string) ?? ''}
          onChange={(e) => onChange?.(e.target.value)}
        />
      )
    case 'INPUT_NUMBER':
      return (
        <InputNumber
          style={{ width: '100%' }}
          value={typeof value === 'number' ? value : undefined}
          onChange={(v) => onChange?.(v ?? undefined)}
        />
      )
    case 'DATE_TIME':
      return (
        <DatePicker
          showTime
          style={{ width: '100%' }}
          value={typeof value === 'string' && value ? dayjs(value) : null}
          onChange={(d) => onChange?.(d ? d.format('YYYY-MM-DD HH:mm:ss') : undefined)}
        />
      )
    case 'RADIO':
      if (options) {
        return (
          <Radio.Group
            options={options}
            value={value as string}
            onChange={(e) => onChange?.(e.target.value)}
          />
        )
      }
      break
    case 'SELECT':
      if (options) {
        return (
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            options={options}
            value={(value as string) ?? undefined}
            onChange={(v) => onChange?.(v)}
          />
        )
      }
      break
    case 'SELECT_MULTIPLE':
    case 'CHECKBOX':
      if (options) {
        return (
          <Select
            mode="multiple"
            allowClear
            showSearch
            optionFilterProp="label"
            options={options}
            value={Array.isArray(value) ? (value as string[]) : []}
            onChange={(v) => onChange?.(v)}
          />
        )
      }
      break
    default:
      break
  }
  // INPUT/PHONE/LINK 及未识别类型一律普通 Input
  return <Input value={(value as string) ?? ''} onChange={(e) => onChange?.(e.target.value)} />
}
