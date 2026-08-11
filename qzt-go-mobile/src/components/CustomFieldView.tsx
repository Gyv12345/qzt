import { useEffect, useState } from 'react'
import { Card, List } from 'antd-mobile'
import { listCustomFields } from '../services/customfield'
import { isMultipleFieldType, parseFieldOptions, type CrmCustomField } from '../types/crm'

interface Props {
  formKey: string
  values: Record<string, string> | undefined | null
}

/** 自定义字段只读展示(详情页用;无可展示字段时返回 null) */
export default function CustomFieldView({ formKey, values }: Props) {
  const [fields, setFields] = useState<CrmCustomField[]>([])

  useEffect(() => {
    listCustomFields(formKey)
      .then((defs) => setFields(defs.filter((f) => f.readable !== 0)))
      .catch(() => {})
  }, [formKey])

  if (fields.length === 0 || !values) return null

  const formatValue = (f: CrmCustomField, raw: string): string => {
    if (!raw) return '-'
    const opts = parseFieldOptions(f)
    if (opts) {
      const m = new Map(opts.map((o) => [o.value, o.label]))
      if (isMultipleFieldType(f.type)) {
        return raw.split(',').map((v) => m.get(v) || v).join(',')
      }
      return m.get(raw) || raw
    }
    return raw
  }

  const visible = fields.filter((f) => values[f.id] !== undefined && values[f.id] !== '')
  if (visible.length === 0) return null

  return (
    <Card title="更多信息" style={{ margin: 8 }}>
      <List>
        {visible.map((f) => (
          <List.Item key={f.id} extra={formatValue(f, values[f.id])}>
            {f.name}
          </List.Item>
        ))}
      </List>
    </Card>
  )
}
