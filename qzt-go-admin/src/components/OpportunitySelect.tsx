import { useEffect, useState } from 'react'
import { Select, type SelectProps } from 'antd'
import { listOpportunities } from '../services/crm'

interface OpportunitySelectProps extends Omit<SelectProps, 'options' | 'loading'> {
  /** 按客户过滤(合同表单:先选客户再选该客户的商机) */
  customerId?: number
}

/** 商机下拉选择(可按客户过滤,本地搜索) */
export default function OpportunitySelect({ customerId, ...props }: OpportunitySelectProps) {
  const [options, setOptions] = useState<{ label: string; value: number }[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    listOpportunities({ page: 1, page_size: 200, customer_id: customerId })
      .then((res) => {
        setOptions(
          (res.list ?? []).map((o) => ({
            label: o.opportunity_no ? `${o.name}(${o.opportunity_no})` : o.name,
            value: o.id,
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
      placeholder={customerId ? '选择该客户的商机' : '选择商机(可先选客户过滤)'}
      loading={loading}
      options={options}
      {...props}
    />
  )
}
