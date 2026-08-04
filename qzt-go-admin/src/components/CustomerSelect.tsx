import { useEffect, useState } from 'react'
import { Select, type SelectProps } from 'antd'
import { listCustomers } from '../services/crm'

interface CustomerSelectProps extends Omit<SelectProps, 'options' | 'loading'> {
  /** 额外过滤(如仅公海) */
}

/** 客户下拉选择(加载前 100 个客户,本地过滤) */
export default function CustomerSelect(props: CustomerSelectProps) {
  const [options, setOptions] = useState<{ label: string; value: number }[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    listCustomers({ page: 1, page_size: 100 })
      .then((res) => {
        setOptions((res.list ?? []).map((c) => ({ label: c.name, value: c.id })))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <Select
      allowClear
      showSearch
      optionFilterProp="label"
      placeholder="选择客户"
      loading={loading}
      options={options}
      {...props}
    />
  )
}
