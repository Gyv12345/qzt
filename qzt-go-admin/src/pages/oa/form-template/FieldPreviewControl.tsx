import { Input, Select, Space, Tag, Typography } from 'antd'
import type { FormField } from '../../../types/oa'

const { Text } = Typography

/** 字段预览控件(轻量渲染,不绑定值) */
export default function FieldPreview({ field }: { field: FormField }) {
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
