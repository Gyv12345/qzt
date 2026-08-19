import { useEffect, useState } from 'react'
import { Select, type SelectProps } from 'antd'
import { listContacts } from '../services/crm'

interface ContactSelectProps extends Omit<SelectProps, 'options' | 'loading'> {
  /** 按客户过滤(跟进计划:先选客户再选该客户的联系人) */
  customerId?: number
}

/** 联系人下拉选择(可按客户过滤,本地搜索) */
export default function ContactSelect({ customerId, ...props }: ContactSelectProps) {
  const [options, setOptions] = useState<{ label: string; value: number }[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    listContacts({ page: 1, page_size: 200, customer_id: customerId })
      .then((res) => {
        setOptions(
          (res.list ?? []).map((c) => ({
            label: c.customer_name ? `${c.name}(${c.customer_name})` : c.name,
            value: c.id,
          })),
        )
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [customerId])

  return (
    <Select
      allowClear
      showSearch
      optionFilterProp="label"
      placeholder={customerId ? '选择该客户的联系人' : '选择联系人(可先选客户过滤)'}
      loading={loading}
      options={options}
      {...props}
    />
  )
}
