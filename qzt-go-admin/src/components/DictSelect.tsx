import { Select, Tag, type SelectProps } from 'antd'
import { useDictStore } from '../stores/dict'

interface DictSelectProps extends Omit<SelectProps, 'options'> {
  /** 字典 code,如 CUSTOMER_LEVEL */
  code: string
}

/** 字典下拉选择 */
export default function DictSelect({ code, ...rest }: DictSelectProps) {
  const options = useDictStore((s) => s.options)(code)
  return <Select allowClear showSearch optionFilterProp="label" options={options} {...rest} />
}

interface DictTagProps {
  code: string
  value: string | number | null | undefined
  color?: string
}

/** 字典值显示(标签) */
export function DictTag({ code, value, color }: DictTagProps) {
  const label = useDictStore((s) => s.label)(code, value)
  if (label === '-') return <>-</>
  return <Tag color={color}>{label}</Tag>
}
