import { useEffect, useState } from 'react'
import { Select, type SelectProps } from 'antd'
import { listContracts } from '../services/crm'

interface ContractSelectProps extends Omit<SelectProps, 'options' | 'loading'> {
  /** 按客户过滤(跟进计划:先选客户再选该客户的合同) */
  customerId?: number
}

/** 合同下拉选择(可按客户过滤,本地搜索) */
export default function ContractSelect({ customerId, ...props }: ContractSelectProps) {
  const [options, setOptions] = useState<{ label: string; value: number }[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    listContracts({ page: 1, page_size: 200, customer_id: customerId })
      .then((res) => {
        setOptions(
          (res.list ?? []).map((c) => ({
            label: c.contract_no ? `${c.name}(${c.contract_no})` : c.name,
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
      placeholder={customerId ? '选择该客户的合同' : '选择合同(可先选客户过滤)'}
      loading={loading}
      options={options}
      {...props}
    />
  )
}
