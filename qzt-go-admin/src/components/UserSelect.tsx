import { Select, type SelectProps } from 'antd'
import { useUserStore } from '../stores/users'

/** 系统用户下拉选择(用于负责人/转移对象等) */
export default function UserSelect(props: Omit<SelectProps, 'options'>) {
  const options = useUserStore((s) => s.options)()
  return (
    <Select
      allowClear
      showSearch
      optionFilterProp="label"
      placeholder="选择用户"
      options={options}
      {...props}
    />
  )
}
