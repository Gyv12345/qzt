/** 字段类型 → 中文名 + 图标 */
export const FIELD_META: Record<string, { label: string; icon: string }> = {
  INPUT: { label: '单行文本', icon: '📝' },
  TEXTAREA: { label: '多行文本', icon: '📄' },
  INPUT_NUMBER: { label: '数字', icon: '🔢' },
  DATE_TIME: { label: '日期时间', icon: '📅' },
  RADIO: { label: '单选框', icon: '🔘' },
  CHECKBOX: { label: '多选框', icon: '☑️' },
  SELECT: { label: '下拉单选', icon: '📋' },
  SELECT_MULTIPLE: { label: '下拉多选', icon: '📑' },
  INPUT_MULTIPLE: { label: '标签输入', icon: '🏷️' },
  MEMBER: { label: '人员(单选)', icon: '👤' },
  MEMBER_MULTIPLE: { label: '人员(多选)', icon: '👥' },
  DEPARTMENT: { label: '部门(单选)', icon: '🏢' },
  DEPARTMENT_MULTIPLE: { label: '部门(多选)', icon: '🏬' },
  PICTURE: { label: '图片', icon: '🖼️' },
  ATTACHMENT: { label: '附件', icon: '📎' },
  LOCATION: { label: '地区', icon: '📍' },
  PHONE: { label: '电话', icon: '📞' },
  LINK: { label: '超链接', icon: '🔗' },
  INDUSTRY: { label: '行业', icon: '🏭' },
  FORMULA: { label: '公式', icon: 'ƒ' },
  SERIAL_NUMBER: { label: '自动编号', icon: '🔢' },
  DATA_SOURCE: { label: '关联记录(单选)', icon: '🔗' },
  DATA_SOURCE_MULTIPLE: { label: '关联记录(多选)', icon: '🔗' },
  SUB_PRODUCT: { label: '产品明细', icon: '📦' },
  SUB_PRICE: { label: '报价明细', icon: '💰' },
  DIVIDER: { label: '分隔线', icon: '➖' },
}

/** 类型分组(左栏面板展示) */
export const GROUPS: { title: string; types: string[] }[] = [
  {
    title: '常用',
    types: [
      'INPUT', 'TEXTAREA', 'INPUT_NUMBER', 'DATE_TIME',
      'RADIO', 'CHECKBOX', 'SELECT', 'SELECT_MULTIPLE', 'INPUT_MULTIPLE',
    ],
  },
  {
    title: '人员组织',
    types: ['MEMBER', 'MEMBER_MULTIPLE', 'DEPARTMENT', 'DEPARTMENT_MULTIPLE'],
  },
  {
    title: '高级',
    types: [
      'PICTURE', 'ATTACHMENT', 'LOCATION', 'PHONE', 'LINK', 'INDUSTRY',
      'FORMULA', 'SERIAL_NUMBER', 'DATA_SOURCE', 'DATA_SOURCE_MULTIPLE',
      'SUB_PRODUCT', 'SUB_PRICE', 'DIVIDER',
    ],
  },
]

/** 需要选项配置的类型 */
export const OPTION_TYPES = new Set(['RADIO', 'CHECKBOX', 'SELECT', 'SELECT_MULTIPLE'])

/** prop 中解析选项为可编辑文本(值|标签 每行一个) */
export function optionsToText(prop?: string): string {
  if (!prop) return ''
  try {
    const obj = JSON.parse(prop)
    const arr = obj.options ?? obj
    if (!Array.isArray(arr)) return ''
    return arr
      .map((o: { label?: string; value?: string }) => {
        const v = String(o.value ?? '')
        const l = String(o.label ?? '')
        return v && v !== l ? `${v}|${l}` : l
      })
      .join('\n')
  } catch {
    return ''
  }
}

/** 可编辑文本序列化回 prop JSON */
export function textToOptions(text: string): string {
  const options = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const sep = line.indexOf('|')
      if (sep > 0) {
        return { value: line.slice(0, sep).trim(), label: line.slice(sep + 1).trim() }
      }
      return { value: line, label: line }
    })
  return options.length ? JSON.stringify({ options }) : ''
}
