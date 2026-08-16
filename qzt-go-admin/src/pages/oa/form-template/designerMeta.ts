/** 字段类型 → 中文名 + 图标 */
export const FIELD_META: Record<string, { label: string; icon: string }> = {
  text: { label: '单行文本', icon: '📝' },
  textarea: { label: '多行文本', icon: '📄' },
  number: { label: '数字', icon: '🔢' },
  date: { label: '日期', icon: '📅' },
  datetime: { label: '日期时间', icon: '🕓' },
  select: { label: '下拉选择', icon: '📋' },
  radio: { label: '单选', icon: '🔘' },
  checkbox: { label: '多选', icon: '☑️' },
}

/** 分组 */
export const GROUPS: { title: string; types: string[] }[] = [
  { title: '常用', types: ['text', 'textarea', 'number', 'date', 'datetime'] },
  { title: '选项', types: ['select', 'radio', 'checkbox'] },
]

/** 需要选项配置的类型 */
export const OPTION_TYPES = new Set(['select', 'radio', 'checkbox'])
